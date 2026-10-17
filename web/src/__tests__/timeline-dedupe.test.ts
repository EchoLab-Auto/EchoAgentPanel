//! 时间线条目重复（2026-10）：「思考/工具小方块有时出现在主回复后面，刷新才消失」。
//!
//! 两条重复来源，都是**实时副本**与**权威副本**共存：
//!
//! 1. **会话历史（hist）合并**：`SessionHistory` 由 Core 从事件日志派生，
//!    包含当前回合已落盘的条目；而实时事件把同样的条目 push 进了 trunk，
//!    且实时条目**不带条目级 seq**（ToolCall 等事件只有帧级事件序号）。
//!    `hist.baseSeq` 因此对它们完全失效（`seq ?? 0` 恒 0）→ 一律 append 到
//!    末尾 → 小方块跑到主回复后面。刷新重建 hist 与 trunk 才消失。
//! 2. **TrunkTimeline 增量**：Core 对条目就地更新后带新 seq 重投权威版本；
//!    `patchToolMessage` 只认工具行，非工具条目（reasoning / backend）一律被
//!    当作新条目追加 → 同一段思考显示两次，第二次落在末尾。
//!
//! 契约：
//! - 已包含在快照里的实时副本 → 不重复追加；
//! - 权威条目到达 → **认领**实时孪生条目就地升级（保留 key），不新增；
//! - 真正的新条目 → 仍按到达顺序追加（顺序即真实时序）；
//! - 判据保守：宁可重复显示，也不丢内容。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { sessionMessagesFor } from '../state';
import { checklistKey } from '../keys';
import type { BackendEvent, TeamInfo } from '../protocol';
import type { DisplayMessage } from '../state';

const SID = 'local:tui::local_user';
const TEAM = 'Alice';
const BRANCH = 'b1';

function team(id: string): TeamInfo {
  return { id, name: id, description: '', enabled: true, sessions: 0 };
}

function msg(over: Partial<DisplayMessage>): DisplayMessage {
  return {
    key: over.key ?? 'x',
    role: over.role ?? 'backend',
    content: over.content ?? '',
    time: over.time ?? 0,
    sessionId: SID,
    ...over,
  } as DisplayMessage;
}

const histKey = () => checklistKey(null, TEAM, SID);

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

describe('hist 合并：实时副本不重复', () => {
  it('hist 已含的思考/工具/回答，不再追加到末尾', () => {
    state.sessionHistory[histKey()] = {
      messages: [
        msg({ key: 'h1', role: 'user', content: '问一句', time: 1 }),
        msg({ key: 'h2', role: 'reasoning', content: '思考…', time: 2 }),
        msg({
          key: 'h3',
          role: 'tool',
          time: 3,
          tool: { name: 'bash', input: '{}', output: 'ok', status: 'succeeded', toolCallId: 'c1' },
        }),
        msg({ key: 'h4', role: 'backend', content: '回答', time: 4 }),
      ],
      total: 4,
      truncated: false,
      baseSeq: 100,
    };
    // 实时副本（无条目 seq）
    state.trunk = [
      msg({ key: 'r2', role: 'reasoning', content: '思考…', time: 2 }),
      msg({
        key: 'r3',
        role: 'tool',
        time: 3,
        tool: { name: 'bash', input: '{}', output: 'ok', status: 'succeeded', toolCallId: 'c1' },
      }),
      msg({ key: 'r4', role: 'backend', content: '回答', time: 4 }),
    ];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(out.map((m) => m.role)).toEqual(['user', 'reasoning', 'tool', 'backend']);
  });

  it('流式未完成的实时副本（hist 是终值）也算已覆盖', () => {
    state.sessionHistory[histKey()] = {
      messages: [msg({ key: 'h1', role: 'backend', content: '完整回答文本', time: 10 })],
      total: 1,
      truncated: false,
      baseSeq: 5,
    };
    state.trunk = [
      // 实时行还停在中间片段（同一秒）
      msg({ key: 'r1', role: 'backend', content: '完整', time: 10 }),
    ];
    const out = sessionMessagesFor(state, SID, TEAM);
    expect(out).toHaveLength(1);
    expect(out[0]?.content).toBe('完整回答文本');
  });

  it('真正的新条目仍追加在末尾（顺序 = 时序）', () => {
    state.sessionHistory[histKey()] = {
      messages: [msg({ key: 'h1', role: 'user', content: '问一句', time: 1 })],
      total: 1,
      truncated: false,
      baseSeq: 100,
    };
    state.trunk = [
      msg({ key: 'r2', role: 'reasoning', content: '新思考', time: 20 }),
      msg({ key: 'r4', role: 'backend', content: '新回答', time: 21 }),
    ];
    const out = sessionMessagesFor(state, SID, TEAM);
    expect(out.map((m) => m.role)).toEqual(['user', 'reasoning', 'backend']);
  });

  it('同角色同时间但内容不同 → 不误判（宁可重复不丢内容）', () => {
    state.sessionHistory[histKey()] = {
      messages: [msg({ key: 'h1', role: 'backend', content: '第一条', time: 7 })],
      total: 1,
      truncated: false,
      baseSeq: 100,
    };
    state.trunk = [msg({ key: 'r1', role: 'backend', content: '完全不同的一条', time: 7 })];
    const out = sessionMessagesFor(state, SID, TEAM);
    expect(out).toHaveLength(2);
  });
});

describe('TrunkTimeline 增量：认领实时孪生而非追加', () => {
  it('reasoning 权威条目就地升级（不重复）', () => {
    // 建立增量缓存
    dispatch({ TrunkTimeline: { team_id: TEAM, full: true, seq: 10, messages: [] } } as unknown as BackendEvent);
    // 实时推理进 trunk（无条目 seq）
    dispatch({
      AgentReasoningDelta: { session_id: SID, team_id: TEAM, branch_id: BRANCH, delta: '思考' },
    } as unknown as BackendEvent);
    const liveKey = state.trunk.find((m) => m.role === 'reasoning')!.key;
    const time = state.trunk.find((m) => m.role === 'reasoning')!.time;

    // Core 推权威版本（同一段，带 seq）
    dispatch({
      TrunkTimeline: {
        team_id: TEAM,
        full: false,
        seq: 50,
        messages: [{ kind: 'reasoning', content: '思考', session_id: SID, time, seq: 50 }],
      },
    } as unknown as BackendEvent);

    const reasoning = state.trunk.filter((m) => m.role === 'reasoning');
    expect(reasoning).toHaveLength(1);
    expect(reasoning[0]!.content).toBe('思考');
    // seq 刻意保持 0：历史派生不含推理，带 seq 会被 `seq <= baseSeq` 判成
    // "已被快照覆盖"而整条消失（见 __tests__/reasoning-visibility.test.ts）。
    expect(reasoning[0]!.seq ?? 0).toBe(0);
    // 保留原 key（Vue keyed v-for 的稳定身份）
    expect(reasoning[0]!.key).toBe(liveKey);
  });

  it('实时片段是权威终值的前缀 → 升级为终值', () => {
    dispatch({ TrunkTimeline: { team_id: TEAM, full: true, seq: 10, messages: [] } } as unknown as BackendEvent);
    dispatch({
      AgentReasoningDelta: { session_id: SID, team_id: TEAM, branch_id: BRANCH, delta: '前一半' },
    } as unknown as BackendEvent);
    const time = state.trunk.find((m) => m.role === 'reasoning')!.time;

    dispatch({
      TrunkTimeline: {
        team_id: TEAM,
        full: false,
        seq: 51,
        messages: [{ kind: 'reasoning', content: '前一半后一半', session_id: SID, time, seq: 51 }],
      },
    } as unknown as BackendEvent);

    const reasoning = state.trunk.filter((m) => m.role === 'reasoning');
    expect(reasoning).toHaveLength(1);
    expect(reasoning[0]!.content).toBe('前一半后一半');
  });

  it('内容不同的权威条目 → 正常追加（新条目）', () => {
    dispatch({ TrunkTimeline: { team_id: TEAM, full: true, seq: 10, messages: [] } } as unknown as BackendEvent);
    dispatch({
      AgentReasoningDelta: { session_id: SID, team_id: TEAM, branch_id: BRANCH, delta: '第一步思考' },
    } as unknown as BackendEvent);
    const time = state.trunk.find((m) => m.role === 'reasoning')!.time;

    dispatch({
      TrunkTimeline: {
        team_id: TEAM,
        full: false,
        seq: 52,
        messages: [{ kind: 'reasoning', content: '第二步完全不同的思考', session_id: SID, time, seq: 52 }],
      },
    } as unknown as BackendEvent);

    expect(state.trunk.filter((m) => m.role === 'reasoning')).toHaveLength(2);
  });
});
