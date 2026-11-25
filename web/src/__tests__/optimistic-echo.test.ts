//! 乐观回显的**前端契约**（2026-11 远程访问优化）。
//!
//! ## 要解决的问题
//!
//! `SendMessage` → Core 处理 → `UserInput`（`MessageReceived`）回推，是一个
//! 完整往返。局域网下几十毫秒看不见；远程（隧道 / 广域网）就是 100~300ms
//! 的空白——输入框已经清空、屏幕什么都没有，用户以为没发出去，于是同一条
//! 消息发两遍。
//!
//! 做法：发送成功后立刻插一条 `pending` 用户行，真实事件到达时**就地认领**
//! （保留 Vue key → DOM 节点复用，视觉零跳变）。
//!
//! ## 本文件锁定的四件事
//!
//! 1. **认领是就地升级**，不产生第二行（否则用户看到自己的消息出现两次）；
//! 2. **内容被 Core 规范化时仍能认领**（该会话只有一条 pending 时兜底）——
//!    图片会被换成 `[图片#n]` 占位，精确比较必然失败；
//! 3. **多行 pending 时不猜**（宁可多一行，也不把别人的消息认成自己的）；
//! 4. **超时清理**：`UserInput` 彻底丢失时不留一条永远"发送中"的幽灵行。

import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import {
  PENDING_TTL_MS,
  claimOptimisticUser,
  expirePendingMessages,
  pushOptimisticUser,
} from '../state_domains/timeline';
import type { DisplayMessage } from '../state';
import type { BackendEvent } from '../protocol';

const SID = 'local:tui::local_user';

/** 构造一条 `MessageReceived`（Core 回推的用户消息）。 */
function userInput(content: string, sessionId = SID, timestamp = 1_700_000_000): BackendEvent {
  return {
    MessageReceived: {
      session_id: sessionId,
      instance_name: 'local',
      platform: 'local',
      user_id: 'local_user',
      user_name: 'local_user',
      channel: 'local',
      group_name: null,
      content,
      timestamp,
      received_at_ms: timestamp * 1000,
      message_sequence: 1,
      team_id: null,
    },
  } as unknown as BackendEvent;
}

const userRows = (): DisplayMessage[] => state.trunk.filter((m) => m.role === 'user');

beforeEach(() => {
  state.trunk = [];
  state.activeRegion = null;
  state.activeTeamId = null;
  state.sessions = [];
  state.teams = [];
});

describe('插入', () => {
  it('带 pending 标记，且不标记为流式', () => {
    const msg = pushOptimisticUser(state, { sessionId: SID, content: '你好' });
    expect(msg.pending).toBe(true);
    expect(msg.pendingSinceMs).toBeTypeOf('number');
    expect(msg.streamState).toBeUndefined();
    expect(state.trunk).toHaveLength(1);
  });

  it('附件一并带上（用户发送后立刻能看到文件名，而不是等落盘）', () => {
    pushOptimisticUser(state, {
      sessionId: SID,
      content: '看这个',
      files: [{ name: 'report.pdf', size: 1024, path: null }],
    });
    expect(state.trunk[0].files?.[0]?.name).toBe('report.pdf');
  });
});

describe('认领（真实事件到达）', () => {
  it('内容相同 → 就地认领，不新增行', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '你好' });
    const keyBefore = state.trunk[0].key;
    dispatch(userInput('你好'));
    expect(userRows()).toHaveLength(1);
    expect(state.trunk[0].key).toBe(keyBefore); // 同一个 DOM 节点
    expect(state.trunk[0].pending).toBeUndefined();
    expect(state.trunk[0].source?.user_name).toBe('local_user');
  });

  it('内容被 Core 规范化（图片占位）→ 单条 pending 兜底认领', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '看这张图 ![x]' });
    dispatch(userInput('看这张图 [图片#1]'));
    expect(userRows()).toHaveLength(1);
    expect(state.trunk[0].pending).toBeUndefined();
    expect(state.trunk[0].content).toBe('看这张图 [图片#1]');
  });

  it('认领后不重播入场动画', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '你好' });
    expect(state.trunk[0].animate).toBe(true);
    dispatch(userInput('你好'));
    expect(state.trunk[0].animate).toBeUndefined();
  });

  it('没有 pending 行时正常追加（旧行为不变）', () => {
    dispatch(userInput('来自别处'));
    expect(userRows()).toHaveLength(1);
    expect(state.trunk[0].pending).toBeUndefined();
  });

  it('会话不同 → 不认领（不把 A 会话的乐观行认成 B 会话的回推）', () => {
    pushOptimisticUser(state, { sessionId: 'other:session', content: '同文' });
    dispatch(userInput('同文', SID));
    expect(userRows()).toHaveLength(2);
    // 原本那条仍是 pending（它的回推还没到）
    expect(state.trunk.filter((m) => m.pending)).toHaveLength(1);
  });

  it('多条 pending 且内容都对不上 → 不猜（宁可多一行）', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '第一条' });
    pushOptimisticUser(state, { sessionId: SID, content: '第二条' });
    dispatch(userInput('完全不同的第三条'));
    expect(userRows()).toHaveLength(3);
    expect(state.trunk.filter((m) => m.pending)).toHaveLength(2);
  });

  it('连发两条相同内容 → 各自认领一条，不会两条都指向同一行', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '重复' });
    pushOptimisticUser(state, { sessionId: SID, content: '重复' });
    dispatch(userInput('重复'));
    // 第一条被认领，第二条仍 pending
    expect(state.trunk.filter((m) => m.pending)).toHaveLength(1);
    expect(userRows()).toHaveLength(2);
  });
});

describe('超时清理', () => {
  it('未到 TTL 不动', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '你好', nowMs: 1000 });
    expect(expirePendingMessages(state, 1000 + PENDING_TTL_MS)).toBe(0);
    expect(state.trunk).toHaveLength(1);
  });

  it('超过 TTL → 移除（不留永远"发送中"的幽灵行）', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '你好', nowMs: 1000 });
    expect(expirePendingMessages(state, 1000 + PENDING_TTL_MS + 1)).toBe(1);
    expect(state.trunk).toHaveLength(0);
  });

  it('已认领的行不会被清理', () => {
    pushOptimisticUser(state, { sessionId: SID, content: '你好', nowMs: 1000 });
    claimOptimisticUser(state, SID, '你好');
    expect(expirePendingMessages(state, 1000 + PENDING_TTL_MS + 1)).toBe(0);
    expect(state.trunk).toHaveLength(1);
  });

  it('只清理用户行（工具/系统行不受影响）', () => {
    state.trunk.push({
      key: 'tool-1',
      role: 'tool',
      content: 'bash',
      time: 1,
      tool: { name: 'bash', input: '', output: null, status: 'running' },
    });
    pushOptimisticUser(state, { sessionId: SID, content: '你好', nowMs: 1000 });
    expect(expirePendingMessages(state, 1000 + PENDING_TTL_MS + 1)).toBe(1);
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].role).toBe('tool');
  });
});
