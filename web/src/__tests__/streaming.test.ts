//! 流式输出（2026-10）：主对话增量事件（AgentContentDelta / AgentReasoningDelta）
//! 与终值（AgentOutput / AgentReasoning 全量）的**对账**契约。
//!
//! 事件真实时序（Core probe 实测）：增量 → LlmResponse → AgentReasoning（全量）
//! → AgentCompleted → AgentOutput（全量）；工具步中断点为 ToolCall（该步为
//! 中间叙述，不再有终值）。
//!
//! 契约：
//! 1. 增量逐段进主时间线（一行内拼接，不逐帧建行）；
//! 2. 全量到达 → 就地替换该行内容并清除流式标记（丢帧/乱序可自愈）；
//! 3. 工具开始 → 冻结当前行（保留叙述）；下一步增量新建一行；
//! 4. AppCompleted 不干扰对账（其后 AgentOutput 仍替换）；
//! 5. 跨 team 增量不过滤泄漏（不串显）。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import type { BackendEvent, TeamInfo } from '../protocol';
import type { DisplayMessage } from '../state';

const SID = 'local:tui::local_user';
const BRANCH = 'branch-uuid-1';

function team(id: string): TeamInfo {
  return { id, name: id, description: '', enabled: true, sessions: 0 };
}

function contentDelta(text: string, opts: { session?: string; branch?: string; teamId?: string | null } = {}) {
  return {
    AgentContentDelta: {
      session_id: opts.session ?? SID,
      branch_id: opts.branch ?? BRANCH,
      delta: text,
      team_id: opts.teamId ?? 'Alice',
    },
  } as unknown as BackendEvent;
}

function reasoningDelta(text: string, opts: { session?: string; branch?: string } = {}) {
  return {
    AgentReasoningDelta: {
      session_id: opts.session ?? SID,
      branch_id: opts.branch ?? BRANCH,
      delta: text,
      team_id: 'Alice',
    },
  } as unknown as BackendEvent;
}

function agentOutput(content: string, opts: { session?: string; branchId?: string | null } = {}) {
  return {
    AgentOutput: {
      session_id: opts.session ?? SID,
      content,
      branch_id: opts.branchId ?? null,
      team_id: 'Alice',
    },
  } as unknown as BackendEvent;
}

function agentReasoning(content: string, opts: { session?: string; branch?: string } = {}) {
  return {
    AgentReasoning: {
      session_id: opts.session ?? SID,
      branch_id: opts.branch ?? BRANCH,
      content,
      team_id: 'Alice',
    },
  } as unknown as BackendEvent;
}

function toolCall(opts: { session?: string; branch?: string } = {}) {
  return {
    ToolCall: {
      session_id: opts.session ?? SID,
      tool_name: 'bash',
      arguments: '{}',
      tool_call_id: 'c1',
      branch_id: opts.branch ?? BRANCH,
      team_id: 'Alice',
    },
  } as unknown as BackendEvent;
}

const outputs = (): DisplayMessage[] => state.trunk.filter((m) => m.role === 'backend');
const reasonings = (): DisplayMessage[] => state.trunk.filter((m) => m.role === 'reasoning');

beforeEach(() => {
  state.trunk = [];
  state.teams = [team('Alice'), team('EchoCode')];
  state.activeTeamId = 'Alice';
  state.activeRegion = null;
  state.branchTabs = {};
});

describe('流式正文（AgentContentDelta → AgentOutput 对账）', () => {
  it('增量逐段拼接为一行；终值就地替换并清除流式标记（不建重复行）', () => {
    dispatch(contentDelta('你'));
    dispatch(contentDelta('好'));
    dispatch(contentDelta('世界'));

    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].content).toBe('你好世界');
    expect(outputs()[0].streamState).toBe('streaming');

    dispatch(agentOutput('你好世界'));
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].content).toBe('你好世界');
    expect(outputs()[0].streamState).toBeUndefined();
    expect(outputs()[0].streamBranch).toBeUndefined();
  });

  it('丢帧/乱序可自愈：终值以全量为准（覆盖增量拼接结果）', () => {
    dispatch(contentDelta('部分丢失的'));
    dispatch(agentOutput('完整的最终回复'));
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].content).toBe('完整的最终回复');
  });

  it('AgentCompleted（先于 AgentOutput 到达）不干扰对账', () => {
    dispatch(contentDelta('流式中'));
    dispatch({
      AgentCompleted: { session_id: SID },
    } as unknown as BackendEvent);
    dispatch(agentOutput('最终回答'));
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].content).toBe('最终回答');
    expect(outputs()[0].streamState).toBeUndefined();
  });

  it('无增量时（非流式路径）终值照常追加', () => {
    dispatch(agentOutput('整段回复'));
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].content).toBe('整段回复');
    expect(outputs()[0].streamState).toBeUndefined();
  });

  it('工具开始冻结中间叙述；下一步增量新建一行；终值只替换最新流式行', () => {
    dispatch(contentDelta('我先看看文件。'));
    dispatch(toolCall());
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].streamState).toBe('frozen');

    dispatch(contentDelta('看完了，结论是：'));
    dispatch(contentDelta('一切正常。'));
    expect(outputs()).toHaveLength(2);
    // 叙述行保留原文；新行继续拼接。
    expect(outputs()[0].content).toBe('我先看看文件。');
    expect(outputs()[1].content).toBe('看完了，结论是：一切正常。');
    expect(outputs()[1].streamState).toBe('streaming');

    // 终值（QQ 路径带分支 id）替换最新流式行；冻结的叙述行不受影响。
    dispatch(agentOutput('最终回答：一切正常。', { branchId: BRANCH }));
    expect(outputs()).toHaveLength(2);
    expect(outputs()[0].content).toBe('我先看看文件。');
    expect(outputs()[1].content).toBe('最终回答：一切正常。');
    expect(outputs()[1].streamState).toBeUndefined();
  });

  it('分支匹配：不同分支的增量互不拼接', () => {
    dispatch(contentDelta('分支A', { branch: 'branch-a' }));
    dispatch(contentDelta('分支B', { branch: 'branch-b' }));
    expect(outputs()).toHaveLength(2);
    expect(outputs()[0].content).toBe('分支A');
    expect(outputs()[1].content).toBe('分支B');
  });

  it('跨 team 增量不串显', () => {
    dispatch(contentDelta('Alice 的内容'));
    dispatch(contentDelta('EchoCode 的内容', { teamId: 'EchoCode' }));
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].content).toBe('Alice 的内容');
  });
});

describe('流式推理（AgentReasoningDelta → AgentReasoning 对账）', () => {
  it('增量拼接为一行；全量到达就地替换（不播第二遍打字）', () => {
    dispatch(reasoningDelta('想'));
    dispatch(reasoningDelta('一'));
    dispatch(reasoningDelta('想'));
    expect(reasonings()).toHaveLength(1);
    expect(reasonings()[0].content).toBe('想一想');
    expect(reasonings()[0].streamState).toBe('streaming');
    // 流式行不播打字动画（animate: false，文字实时生长）。
    expect(reasonings()[0].animate).toBe(false);

    dispatch(agentReasoning('想一想'));
    expect(reasonings()).toHaveLength(1);
    expect(reasonings()[0].content).toBe('想一想');
    expect(reasonings()[0].streamState).toBeUndefined();
  });

  it('多步推理：每步全量收敛后，下一步增量新建一行', () => {
    dispatch(reasoningDelta('第一步推理', { branch: BRANCH }));
    dispatch(agentReasoning('第一步推理', { branch: BRANCH }));
    dispatch(reasoningDelta('第二步推理', { branch: BRANCH }));
    dispatch(agentReasoning('第二步推理', { branch: BRANCH }));
    expect(reasonings()).toHaveLength(2);
    expect(reasonings()[0].content).toBe('第一步推理');
    expect(reasonings()[1].content).toBe('第二步推理');
    expect(reasonings().every((m) => m.streamState === undefined)).toBe(true);
  });
});

describe('取消/错误冻结', () => {
  it('Error 事件冻结该会话流式行（保留已显示文本）', () => {
    dispatch(contentDelta('写到一半'));
    dispatch({
      Error: { session_id: SID, message: '模型请求失败' },
    } as unknown as BackendEvent);
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0].streamState).toBe('frozen');
    expect(outputs()[0].content).toBe('写到一半');
  });

  it('会话级 API 切换回执（Core 走 Error 事件）不冻结流式行、按成功提示', () => {
    // Core `SetSessionApi` 用 `Error{session_id}` 回报结果（agent/commands.rs）：
    // 用户在回合进行中切换模型，回答不能因此被"冻住"（2026-10）。
    dispatch(contentDelta('还在输出'));
    const before = state.toasts.length;
    dispatch({
      Error: { session_id: SID, message: `会话 ${SID} 已切换到 API: kimi` },
    } as unknown as BackendEvent);

    expect(outputs()[0].streamState).toBe('streaming');
    expect(outputs()[0].content).toBe('还在输出');
    const toast = state.toasts[state.toasts.length - 1];
    expect(state.toasts.length).toBe(before + 1);
    expect(toast!.kind).toBe('success');
  });

  it('会话级 API 切换失败回执：红字提示但同样不打断流式', () => {
    dispatch(contentDelta('半截话'));
    dispatch({
      Error: { session_id: SID, message: `会话 ${SID} 切换 API 失败（profile 不存在或构建失败）` },
    } as unknown as BackendEvent);

    expect(outputs()[0].streamState).toBe('streaming');
    const toast = state.toasts[state.toasts.length - 1];
    expect(toast!.kind).toBe('error');
  });
});
