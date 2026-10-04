// Phase 2（2026-10）：身份内建 + 复合键收尾。
// - branchTabs 按 (core, branch_id) 键（分支 id 每 core 可重复）；
// - 载荷内建 node_id 被学习为 core→NodeId 映射；
// - pending 等待态按目标 core 销账（多上游广播/竞态不误销）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state, dispatch } from '../store';
import { scopedKey } from '../keys';
import type { BackendEvent, SessionInfo } from '../protocol';

const branchEvt = (branchId: string): BackendEvent =>
  ({
    ReplyBranchStarted: {
      session_id: 'local:tui::local_user',
      branch_id: branchId,
      message_sequence: 1,
      task: 't',
      target: 'x',
      started_at_ms: 0,
    },
  }) as unknown as BackendEvent;

describe('Phase 2：branchTabs / node_id', () => {
  beforeEach(() => {
    state.branchTabs = {};
    state.coreNodeIds = {};
    state.teams = [];
  });

  it('branchTabs 按 (core, branch_id) 键，同名分支跨 core 不互相覆盖', () => {
    dispatch(branchEvt('b1'), 'core-a');
    dispatch(branchEvt('b1'), 'core-b');
    expect(Object.keys(state.branchTabs).sort()).toEqual(
      [scopedKey('core-a', 'b1'), scopedKey('core-b', 'b1')].sort(),
    );
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
    expect(state.coreNodeIds['core-a']).toBe('node-abc');
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
