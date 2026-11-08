//! 上下文快照读取口径（2026-11）：写入键带事件 `core`、读取键带会话归属
//! `core`，两者不保证同时有值。旧实现只按精确键取 —— Core 明明回了，界面
//! 却一直停在「正在读取上下文」直到 20s 超时。本测试锁定：
//!   a) 精确键命中优先；
//!   b) core 不对称时退化为**唯一**的 (team, session) 命中；
//!   c) 多候选（多台 core 都回过）时**不猜**，返回 null。

import { beforeEach, describe, expect, it } from 'vitest';
import { contextSnapshotFor } from '../context-cache';
import { state } from '../store';
import { sessionScopedKey } from '../keys';
import type { ContextSnapshotData } from '../state';

function snapshot(total: number): ContextSnapshotData {
  return {
    session_id: 'local:tui::local_user',
    messages: [],
    blocks: [],
    total_tokens: total,
    limit_tokens: 800_000,
  };
}

describe('contextSnapshotFor', () => {
  beforeEach(() => {
    state.contexts = {};
    state.activeRegion = null;
  });

  it('a) 精确键优先', () => {
    state.contexts[sessionScopedKey('core-a', 't', 's1')] = snapshot(1);
    expect(contextSnapshotFor(state, 'core-a', 't', 's1')?.total_tokens).toBe(1);
  });

  it('b) core 不对称（写入无壳、读取带 upstream）时退化为唯一命中', () => {
    state.contexts[sessionScopedKey(null, 't', 's1')] = snapshot(42);
    expect(contextSnapshotFor(state, 'core-a', 't', 's1')?.total_tokens).toBe(42);
    // 反向：写入带 upstream、读取无壳
    state.contexts = { [sessionScopedKey('core-a', 't', 's1')]: snapshot(7) };
    expect(contextSnapshotFor(state, null, 't', 's1')?.total_tokens).toBe(7);
  });

  it('c) 多候选不猜（避免跨 core 串显）', () => {
    state.contexts[sessionScopedKey('core-a', 't', 's1')] = snapshot(1);
    state.contexts[sessionScopedKey('core-b', 't', 's1')] = snapshot(2);
    expect(contextSnapshotFor(state, null, 't', 's1')).toBeNull();
    expect(contextSnapshotFor(state, 'core-b', 't', 's1')?.total_tokens).toBe(2);
  });

  it('空 session 不做退化（全局口径请求不误命中别人的快照）', () => {
    state.contexts[sessionScopedKey('core-a', 't', 's1')] = snapshot(1);
    expect(contextSnapshotFor(state, null, 't', '')).toBeNull();
  });
});
