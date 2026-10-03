// ActiveTurnsSnapshot（2026-10 刷新恢复）：Core 在 TrunkTimeline 之后补发
// 活跃 turn 快照，前端据此重建运行状态（活动浮条/取消按钮）。
import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../state';
import type { BackendEvent } from '../protocol';

function snap(sessionIds: string[]): BackendEvent {
  return { ActiveTurnsSnapshot: { session_ids: sessionIds, team_id: null } } as unknown as BackendEvent;
}

function thinking(state: AppState, sessionId: string): AppState {
  return reduce(state, { AgentThinking: { session_id: sessionId } } as unknown as BackendEvent);
}

describe('ActiveTurnsSnapshot', () => {
  it('重建 running 集合：快照中的会话保持/恢复 thinking', () => {
    let state = initialState();
    state = thinking(state, 'local:tui::local_user');
    // 模拟刷新后 phase 丢失（本地状态被重置为新 state）
    let fresh = initialState();
    expect(fresh.activities['local:tui::local_user']).toBeUndefined();
    fresh = reduce(fresh, snap(['local:tui::local_user']));
    expect(fresh.activities['local:tui::local_user']?.phase).toBe('thinking');
  });

  it('快照外的运行中 activity 置 completed（刷新前已结束的残留）', () => {
    let state = initialState();
    state = thinking(state, 'qq:group:1:2');
    expect(state.activities['qq:group:1:2']?.phase).toBe('thinking');
    state = reduce(state, snap([]));
    expect(state.activities['qq:group:1:2']?.phase).toBe('completed');
  });

  it('快照中的 completed activity 复活为 thinking（先结束标记后到快照的乱序）', () => {
    let state = initialState();
    state = thinking(state, 'local:tui::local_user');
    state = reduce(state, { AgentCompleted: { session_id: 'local:tui::local_user' } } as unknown as BackendEvent);
    expect(state.activities['local:tui::local_user']?.phase).toBe('completed');
    state = reduce(state, snap(['local:tui::local_user']));
    expect(state.activities['local:tui::local_user']?.phase).toBe('thinking');
  });
  it('team 维度快照不误杀其他 team 的运行中活动', () => {
    // 快照带 team_id=a：只收尾 team a 的残留；team b 正在运行的活动
    // 不得被误置 completed（此前全局清扫会误杀）。
    let state = initialState();
    state.activeTeamId = 'a';
    state.sessions.push(
      { id: 'sa1', team_id: 'a', platform: 'p', scope: 's', user_id: 'u', nickname: '', group_name: null, last_active: 0, last_message: '' },
      { id: 'sb1', team_id: 'b', platform: 'p', scope: 's', user_id: 'u', nickname: '', group_name: null, last_active: 0, last_message: '' },
    );
    state = thinking(state, 'sa1');
    state = thinking(state, 'sb1');
    state = reduce(state, { ActiveTurnsSnapshot: { session_ids: [], team_id: 'a' } } as unknown as BackendEvent);
    expect(state.activities['sa1']?.phase).toBe('completed'); // team a 残留收尾
    expect(state.activities['sb1']?.phase).toBe('thinking'); // team b 不受影响
  });
});
