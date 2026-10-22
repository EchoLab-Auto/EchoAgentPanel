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

  // ── branches：运行中分支的重连重建 ─────────────────────────────
  // `ReplyBranchStarted` 只在分支开始那一刻发一次，且协议里没有"查运行
  // 分支"的命令。快照带 branches 后，重连/刷新才能把分支卡与任务卡补回来。
  function snapWithBranches(
    sessionIds: string[],
    branches: Array<{ session_id: string; branch_id: string; task: string }>,
  ): BackendEvent {
    return {
      ActiveTurnsSnapshot: {
        session_ids: sessionIds,
        team_id: null,
        branches: branches.map((b, i) => ({
          session_id: b.session_id,
          branch_id: b.branch_id,
          message_sequence: i + 1,
          task: b.task,
          target: '源会话',
          started_at_ms: 1_700_000_000_000 + i,
        })),
      },
    } as unknown as BackendEvent;
  }

  it('重连后按快照补建分支标签与任务（此前只能等下一次分支开始）', () => {
    // 模拟重连：connection.ts 已清空 branchTabs/tasks，然后收到快照。
    const state = initialState();
    expect(state.branchTabs).toEqual({});
    expect(state.tasks).toEqual([]);
    const next = reduce(
      state,
      snapWithBranches(['s1'], [{ session_id: 's1', branch_id: 'b1', task: '整理文档' }]),
    );
    const tab = next.branchTabs['b1'];
    expect(tab?.status).toBe('running');
    expect(tab?.task).toBe('整理文档');
    expect(tab?.branchId).toBe('b1');
    const task = next.tasks.find(t => t.id === 'b1');
    expect(task?.kind).toBe('reply');
    expect(task?.status).toBe('running');
    expect(task?.objective).toBe('整理文档');
  });

  it('快照里没有的分支被收尾（不留下永远的"运行中"僵尸标签）', () => {
    // 分支卡在本地仍 running，但 Core 的快照里没有它（分支已结束或 Core 重启）。
    let state = reduce(
      initialState(),
      snapWithBranches(['s1'], [{ session_id: 's1', branch_id: 'b1', task: '旧任务' }]),
    );
    expect(state.branchTabs['b1']?.status).toBe('running');
    state = reduce(state, snapWithBranches(['s1'], []));
    expect(state.branchTabs['b1']).toBeUndefined(); // 临时标签按实时路径同样删除
    expect(state.tasks.find(t => t.id === 'b1')?.status).toBe('completed');
  });

  it('旧 Core（不发 branches）不误删正在运行的分支', () => {
    // 兼容性：branches 缺省 = 空数组。此时不能把本地 running 的分支当成
    // "已结束"清掉——否则旧 Core + 新前端会把正在跑的分支卡抹掉。
    let state = reduce(
      initialState(),
      snapWithBranches(['s1'], [{ session_id: 's1', branch_id: 'b1', task: '任务' }]),
    );
    const legacy = { ActiveTurnsSnapshot: { session_ids: ['s1'], team_id: null } } as unknown as BackendEvent;
    state = reduce(state, legacy);
    expect(state.branchTabs['b1']?.status).toBe('running');
    expect(state.tasks.find(t => t.id === 'b1')?.status).toBe('running');
  });
});
