// Phase 2（2026-10）：身份内建 + 复合键收尾。
// - 载荷内建 node_id 被学习为 core→NodeId 映射；
// - pending 等待态按目标 core 销账（多上游广播/竞态不误销）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state, dispatch } from '../store';
import type { BackendEvent, SessionInfo } from '../protocol';

describe('Phase 2：node_id', () => {
  beforeEach(() => {
    state.regions = {};
    state.teams = [];
  });

  it('载荷内建 node_id → 学习 core→NodeId 映射', () => {
    const session = {
      id: 'local:tui::local_user',
      node_id: 'node-abc',
      platform: 'local',
      scope: 'tui',
      user_id: 'u',
      nickname: '',
      group_name: null,
      last_active: 0,
      last_message: '',
    } as SessionInfo;
    dispatch({ SessionUpdated: { session } } as unknown as BackendEvent, 'core-a');
    expect(state.regions['core-a']?.id).toBe('node-abc');
  });
});

describe('Phase 2：pending 等待态按 core 销账', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('来自其他 core 的响应不销账本 core 的等待', async () => {
    const { trackRequest, resolvePendingEvent, usePending } = await import('../pending');
    trackRequest('k', 'RequestSkillsList', 'core-a');
    vi.advanceTimersByTime(200); // 进入可见 pending
    expect(usePending('k').phase.value).toBe('pending');
    resolvePendingEvent({ SkillsList: {} }, 'core-b');
    expect(usePending('k').phase.value).toBe('pending'); // 未销账
    resolvePendingEvent({ SkillsList: {} }, 'core-a');
    vi.advanceTimersByTime(500); // 最短可见时长后清空
    expect(usePending('k').phase.value).toBe('idle');
  });
});
