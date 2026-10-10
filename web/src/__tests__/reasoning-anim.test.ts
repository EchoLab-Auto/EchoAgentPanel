//! 推理行打字机准入（reasoning-anim）契约测试。
//!
//! 需求（2026-10）：只有「正在输出的思考」播打字动画；已经完成的思考
//! 卡片（重新）加载时直接全量显示。准入 = 实时到达 + 消息新鲜 + 会话
//! 仍在运行 + 仅播一次。

import { describe, it, expect, beforeEach } from 'vitest';
import {
  claimReasoningAnimation,
  REASONING_FRESH_MS,
  resetReasoningAnimForTests,
} from '../reasoning-anim';

/** 固定判定时刻（ms）与对应秒级时间戳。 */
const NOW_MS = 1_800_000_000_000;
const NOW_SEC = NOW_MS / 1000;

const base = {
  animate: true,
  key: 'm1',
  time: NOW_SEC,
  sessionRunning: true,
  nowMs: NOW_MS,
};

describe('claimReasoningAnimation 打字机准入', () => {
  beforeEach(() => resetReasoningAnimForTests());

  it('实时 + 新鲜 + 会话运行中：首次通过，之后同一 key 永不通过', () => {
    expect(claimReasoningAnimation(base)).toBe(true);
    expect(claimReasoningAnimation(base)).toBe(false);
    // 时间推移不改变结论（已登记）
    expect(claimReasoningAnimation({ ...base, nowMs: NOW_MS + 60_000 })).toBe(false);
  });

  it('历史回放（animate=false）不通过', () => {
    expect(claimReasoningAnimation({ ...base, animate: false })).toBe(false);
    // 不登记：不影响其他判定（同一 key 后续仍可申请）
    expect(claimReasoningAnimation(base)).toBe(true);
  });

  it('会话已完成（sessionRunning=false）不通过——已完成的思考卡片不播', () => {
    expect(claimReasoningAnimation({ ...base, sessionRunning: false })).toBe(false);
  });

  it('消息超过新鲜窗口不通过——迟到的旧消息不补播', () => {
    const stale = { ...base, time: NOW_SEC - REASONING_FRESH_MS / 1000 - 1 };
    expect(claimReasoningAnimation(stale)).toBe(false);
  });

  it('窗口边界内（恰好等于上限）仍可通过', () => {
    const edge = { ...base, time: NOW_SEC - REASONING_FRESH_MS / 1000 };
    expect(claimReasoningAnimation(edge)).toBe(true);
  });

  it('时钟回拨（age 为负）按新鲜处理', () => {
    const skewed = { ...base, time: NOW_SEC + 3600 };
    expect(claimReasoningAnimation(skewed)).toBe(true);
  });

  it('登记表 FIFO 淘汰：溢出后最旧 key 可重新申请', () => {
    for (let i = 0; i < 4001; i++) {
      claimReasoningAnimation({ ...base, key: `m${i}` });
    }
    // 最旧的 m0 已被淘汰 → 重新可申请（重复显示同一消息不受影响：
    // 实际使用中同一 key 不会二次进入准入路径）
    expect(claimReasoningAnimation({ ...base, key: 'm0' })).toBe(true);
    // 新的 key 仍正常
    expect(claimReasoningAnimation({ ...base, key: 'later' })).toBe(true);
  });
});
