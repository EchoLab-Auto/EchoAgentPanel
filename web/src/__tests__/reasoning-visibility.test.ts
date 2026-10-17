//! 推理条目可见性（2026-10 回归）：「看不到思考的 chip」。
//!
//! ## 背景不对称
//!
//! - 实时投影把推理作为独立条目发到 trunk（`AgentReasoning*`）；
//! - 历史派生**不产生推理条目**（`history.rs` 模块注释的已知差异：推理不单独
//!   落事件日志），但它计算 `max_seq` 时**统计了推理条目的 seq**；
//! - 前端 `sessionMessagesFor` 用 `seq > 0 && seq <= hist.baseSeq` 判定"已被
//!   快照覆盖"。
//!
//! 若把权威条目的 seq 复制到实时推理条目上，推理就会"自己把自己判成已覆盖"
//! 而整条消失。实测现场：该会话 trunk 里 190 条推理，`baseSeq = 93258`，
//! 推理 seq 93245/93252/93257 全部 `<= baseSeq` → 视图中 0 条。
//!
//! 契约：实时孪生被权威条目认领时**保留 key 与 seq=0**（"快照未覆盖"），
//! 内容升级为权威版本；去重由 `coveredBySnapshot` 按内容判定。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { sessionMessagesFor } from '../state';
import { checklistKey } from '../keys';
import type { BackendEvent, TeamInfo } from '../protocol';

const SID = 'local:tui::local_user';
const TEAM = 'Alice';

function team(id: string): TeamInfo {
  return { id, name: id, description: '', enabled: true, sessions: 0 };
}

beforeEach(() => {
  state.trunk = [];
  state.teams = [team(TEAM)];
  state.activeTeamId = TEAM;
  state.activeRegion = null;
  state.branchTabs = {};
  state.sessionHistory = {};
  state.teamTimelines = {};
  state.trunkTeamId = null;
  state.tasks = [];
  state.activities = {};
});

describe('推理条目不被 baseSeq 过滤掉', () => {
  it('历史在（baseSeq 很大）时，实时推理 + 权威增量 → 仍可见', () => {
    // 1) 会话历史先到：只有 user/backend/tool，**没有推理**（Core 派生如此）
    state.sessionHistory[checklistKey(null, TEAM, SID)] = {
      messages: [
        { key: 'h1', role: 'user', content: '问一句', time: 100, sessionId: SID } as never,
      ],
      total: 1,
      truncated: false,
      baseSeq: 9000,
    };

    // 2) 建立增量缓存
    dispatch({
      TrunkTimeline: { team_id: TEAM, full: true, seq: 9100, messages: [] },
    } as unknown as BackendEvent);

    // 3) 实时推理进 trunk（无条目 seq）
    dispatch({
      AgentReasoningDelta: { session_id: SID, team_id: TEAM, branch_id: 'b1', delta: '思考内容' },
    } as unknown as BackendEvent);
    const live = state.trunk.find((m) => m.role === 'reasoning')!;
    live.time = 200;

    // 4) Core 推权威条目（seq 小于 baseSeq —— 正是现场情形）
    dispatch({
      TrunkTimeline: {
        team_id: TEAM,
        full: false,
        seq: 9200,
        messages: [{ kind: 'reasoning', content: '思考内容', session_id: SID, time: 200, seq: 8000 }],
      },
    } as unknown as BackendEvent);

    // 认领后不得留下权威 seq（否则会被 baseSeq 判为已覆盖）
    const merged = state.trunk.filter((m) => m.role === 'reasoning');
    expect(merged).toHaveLength(1);
    expect(merged[0]!.seq ?? 0).toBe(0);

    // 视图里必须看得到（这正是「思考 chip」的数据来源）
    const view = sessionMessagesFor(state, SID, TEAM);
    const reasoning = view.filter((m) => m.role === 'reasoning');
    expect(reasoning).toHaveLength(1);
    expect(reasoning[0]!.content).toBe('思考内容');
  });

  it('带 seq 的推理即使 ≤ baseSeq 也**不**被过滤（旧版 Core 双保险）', () => {
    state.sessionHistory[checklistKey(null, TEAM, SID)] = {
      messages: [
        { key: 'h1', role: 'user', content: '问一句', time: 100, sessionId: SID } as never,
      ],
      total: 1,
      truncated: false,
      baseSeq: 9000,
    };
    // 旧版 Core 的水位线包含推理 seq（新版已排除）——前端仍须保留推理。
    state.trunk = [
      {
        key: 'r1',
        role: 'reasoning',
        content: '旧推理',
        time: 200,
        sessionId: SID,
        seq: 8000,
      } as never,
    ];
    const view = sessionMessagesFor(state, SID, TEAM);
    expect(view.filter((m) => m.role === 'reasoning')).toHaveLength(1);
  });

  it('对照：非推理条目仍按 seq 水位线过滤（去重语义未破）', () => {
    state.sessionHistory[checklistKey(null, TEAM, SID)] = {
      messages: [
        { key: 'h1', role: 'user', content: '问一句', time: 100, sessionId: SID } as never,
        { key: 'h2', role: 'backend', content: '回答', time: 101, sessionId: SID } as never,
      ],
      total: 2,
      truncated: false,
      baseSeq: 9000,
    };
    // 同一回答的实时副本（带 seq，≤ 水位线）→ 应被判为已覆盖
    state.trunk = [
      { key: 'r2', role: 'backend', content: '回答', time: 101, sessionId: SID, seq: 8000 } as never,
    ];
    const view = sessionMessagesFor(state, SID, TEAM);
    expect(view.filter((m) => m.role === 'backend')).toHaveLength(1);
  });
});
