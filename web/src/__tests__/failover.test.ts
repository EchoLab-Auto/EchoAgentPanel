//! 失效转移（P3，2026-11）——**换节点、换会话**的状态机契约。
//!
//! 这组测试守的是三条边界，缺一条都会出现"看起来很稳、实际错了"：
//! 1. **一次 WS 抖动绝不动 activeRegion**（阈值 ≥ 连续 3 轮）；
//! 2. **旧会话不可达必须明说**（切换后 toast 文案点名「旧节点上的会话暂不可达」，
//!    不是丢了）；
//! 3. **不自动切回**（恢复只提示，用户自己切——与地址漂移一键修复同取向）。
//!
//! 只测纯状态机（`evaluateFailover` / `promote` 的判定与副作用），不发网络请求
//! ——`sendCommand` 是模块级 import，这里通过观察 state 变化断言，而不是断言
//! "发了什么帧"（那属于协议层，已在 protocol-sync 契约里钉住）。
import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../store';
import {
  FAILURE_THRESHOLD,
  evaluateFailover,
  failoverEnabled,
  maybeNotifyRecover,
  pickCandidate,
  primaryFailedTimes,
  resetFailoverState,
  sessionUnreachable,
  setFailoverEnabled,
} from '../failover';
import type { UpstreamStatus } from '../state';

function upstream(name: string, connectivity: UpstreamStatus['connectivity'], source: 'manual' | 'discovered' = 'manual'): UpstreamStatus {
  return {
    name,
    url: `ws://${name}:3132`,
    token_set: true,
    access: 'direct',
    ssh: null,
    online: connectivity === 'online',
    connectivity,
    auth: connectivity === 'online' ? 'ok' : 'unknown',
    last_error: connectivity === 'online' ? null : 'down',
    last_checked: 0,
    source,
  };
}

/** 逐帧驱动：连续 N 轮同一个快照。 */
function tick(list: UpstreamStatus[], rounds: number): void {
  for (let i = 0; i < rounds; i += 1) evaluateFailover(list);
}

describe('失效转移（换节点、换会话）', () => {
  beforeEach(() => {
    resetFailoverState();
    state.upstreams = [];
    state.teams = [];
    state.activeRegion = null;
    state.activeTeamId = null;
    state.toasts = [];
    state.federation = null;
    state.federations = {};
    state.teamTimelines = {};
  });

  it('一次 WS 抖动绝不动 activeRegion（阈值 ≥ 3 轮）', () => {
    state.activeRegion = 'A';
    state.upstreams = [upstream('A', 'online'), upstream('B', 'online')];
    // 第 1、2 轮离线：低于阈值，不切。
    tick([upstream('A', 'offline'), upstream('B', 'online')], FAILURE_THRESHOLD - 1);
    expect(state.activeRegion).toBe('A');
    expect(primaryFailedTimes('A')).toBe(FAILURE_THRESHOLD - 1);
  });

  it('连续 ≥ 阈值且存在在线候选 → promote，activeRegion 指向候选', () => {
    state.activeRegion = 'A';
    state.activeTeamId = 'EchoCode';
    // 让它在 A、B 上都有同名人格（跨 core 同名人很常见：同名 = 同一逻辑人格）。
    state.teams = [
      { id: 'EchoCode', core: 'A' } as never,
      { id: 'EchoCode', core: 'B' } as never,
    ];
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'online')];

    tick([upstream('A', 'offline'), upstream('B', 'online')], FAILURE_THRESHOLD);

    expect(state.activeRegion).toBe('B');
    expect(state.activeTeamId).toBe('EchoCode'); // 同名人格必须优先切过去
  });

  it('切换后 toast 必须明说「旧会话不可达」（不是丢了）', () => {
    state.activeRegion = 'A';
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'online')];
    tick([upstream('A', 'offline'), upstream('B', 'online')], FAILURE_THRESHOLD);
    const toast = state.toasts.find(t => t.text.includes('已切到'));
    expect(toast).toBeDefined();
    expect(toast!.text).toContain('上的会话暂不可达');
  });

  it('没有在线候选时留在原地等恢复（不盲切）', () => {
    state.activeRegion = 'A';
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'offline')];
    tick([upstream('A', 'offline'), upstream('B', 'offline')], FAILURE_THRESHOLD + 2);
    expect(state.activeRegion).toBe('A');
  });

  it('候选选择排除失败节点本身（least_busy 平局也可能选回它）', () => {
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'online'), upstream('C', 'online')];
    state.federation = null; // 无联邦快照 → least_busy 退化
    expect(pickCandidate('A')).not.toBe('A');
    expect(['B', 'C']).toContain(pickCandidate('A'));
  });

  it('A 恢复后**不自动切回**，只提示一次', () => {
    state.activeRegion = 'A';
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'online')];
    tick([upstream('A', 'offline'), upstream('B', 'online')], FAILURE_THRESHOLD);
    expect(state.activeRegion).toBe('B');
    state.toasts = [];

    // 恢复：提示一次，activeRegion 不动。
    maybeNotifyRecover('A');
    maybeNotifyRecover('A'); // 第二次不再刷
    expect(state.activeRegion).toBe('B');
    const hints = state.toasts.filter(t => t.text.includes('已恢复在线'));
    expect(hints).toHaveLength(1);
  });

  it('failover 可关：开关关闭时阈值到了也不切', () => {
    setFailoverEnabled(false);
    state.activeRegion = 'A';
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'online')];
    tick([upstream('A', 'offline'), upstream('B', 'online')], FAILURE_THRESHOLD + 1);
    expect(state.activeRegion).toBe('A');
    expect(failoverEnabled()).toBe(false);
  });

  it('未选定 primary（activeRegion == null）不介入', () => {
    state.activeRegion = null;
    state.upstreams = [upstream('A', 'offline'), upstream('B', 'online')];
    tick([upstream('A', 'offline'), upstream('B', 'online')], FAILURE_THRESHOLD + 1);
    expect(state.activeRegion).toBeNull();
  });

  it('sessionUnreachable 只标旧节点会话，不标新节点', () => {
    expect(sessionUnreachable('B', 'A')).toBe(true);
    expect(sessionUnreachable('B', 'B')).toBe(false);
    expect(sessionUnreachable('B', null)).toBe(false);
    expect(sessionUnreachable(null, 'A')).toBe(false);
  });
});
