// AgentCompleted 兜底（2026-10 滚动 bug 修复）：
// - 判定从「最后一条不是 backend」改为「连一条 backend/branch 都没有」——
//   工具回合/系统行收尾时旧判定每轮对话结束都误触发；
// - 兜底请求必须带 since_seq（缓存游标）——不带时 Core 回 full 全量、
//   前端 trunk 整体替换、消息 key 全部重建，DOM 回顶（对话框滑到最上面）。
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../connection', () => ({ sendCommand: vi.fn() }));

import { sendCommand } from '../connection';
import { initialState, reduce } from '../state';
import type { BackendEvent } from '../protocol';

function completed(sessionId: string): BackendEvent {
  return { AgentCompleted: { session_id: sessionId } } as unknown as BackendEvent;
}

describe('AgentCompleted 兜底拉取', () => {
  beforeEach(() => vi.mocked(sendCommand).mockClear());

  it('会话已有 backend 时不兜底（工具/系统行收尾属正常，不误触发）', () => {
    let state = initialState();
    state.activeTeamId = 'bot';
    // trunk 里已有 backend（AgentOutput 到过），但**最后一条是系统行**
    // （工具回合/定时器收尾）——旧实现此时误触发全量兜底。
    state.trunk.push(
      { key: 'k1', role: 'backend', content: '回答', time: 1 },
      { key: 'k2', role: 'system', content: '（工具收尾）', time: 2 },
    );
    reduce(state, completed('local:tui::local_user'));
    expect(sendCommand).not.toHaveBeenCalled();
  });

  it('会话无任何 backend 时兜底，且请求带 since_seq（增量不重建）', () => {
    let state = initialState();
    state.activeTeamId = 'bot';
    state.trunk.push({ key: 'k1', role: 'tool', content: 'bash', time: 1 });
    // 缓存游标 42：兜底必须带它（否则 Core 回 full:true 全量重建 → 回顶）。
    state.teamTimelines['bot'] = { seq: 42, msgs: [] };
    reduce(state, completed('local:tui::local_user'));
    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand).toHaveBeenCalledWith({
      RequestTrunkTimeline: { team_id: 'bot', since_seq: 42 },
    });
  });

  it('无缓存游标时 since_seq 回退 0（首载场景等价于旧行为）', () => {
    let state = initialState();
    state.activeTeamId = 'bot';
    reduce(state, completed('local:tui::local_user'));
    expect(sendCommand).toHaveBeenCalledWith({
      RequestTrunkTimeline: { team_id: 'bot', since_seq: 0 },
    });
  });

  it('branch 合并块也算"已有回答"（临时分支收尾不兜底）', () => {
    let state = initialState();
    state.activeTeamId = 'bot';
    state.trunk.push({
      key: 'k1',
      role: 'branch',
      content: '',
      time: 1,
      branch: { branchId: 'b1', summary: 's', msgs: [] },
    });
    reduce(state, completed('local:tui::local_user'));
    expect(sendCommand).not.toHaveBeenCalled();
  });
});
