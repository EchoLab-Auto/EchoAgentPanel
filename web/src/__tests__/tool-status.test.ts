//! 工具行收尾契约（2026-10「工具行一直读秒到刷新」修复）。
//!
//! 现象：面板里工具 chip 的耗时读数一直往上走，刷新页面才好。
//! 根因链：
//! 1. `finishToolMessage` 只在 toolCallId 精确相等时回填——id 缺失/失配时
//!    直接跳过所有条目，原 running 行从此没人管（WorkRunGroup 的
//!    `hasRunning` 恒真 → 50ms ticker 一直读秒），同时又 fallback 追加一条
//!    完成行（重复行）。
//! 2. 回合结束（AgentCompleted / Error）没有任何收尾兜底：只要有一条
//!    ToolResult 丢帧，该行永久 running，只有刷新（全量重建 timeline、
//!    按 `output != null` 判完成）才恢复。
//! 3. ToolCall 不幂等：重放/乱序会让同一 id 出现两条行（一条完成、一条
//!    永远读秒）。
//!
//! 现契约：
//! - id 精确配对优先；id 缺失/失配时按名字兜底（同名多条并发时不猜）；
//! - 回合结束把残留 running 收尾为 `unknown`（不谎报失败、不再读秒）；
//! - 同 id 的 ToolCall 不重复建行（结果先到的乱序场景也不产生僵尸行）。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import type { BackendEvent, TeamInfo } from '../protocol';
import type { DisplayMessage } from '../state';

const SID = 'local:tui::local_user';
const BRANCH = 'branch-uuid-1';

function team(id: string): TeamInfo {
  return { id, name: id, description: '', enabled: true, sessions: 0 };
}

function toolCall(opts: { id?: string; name?: string; session?: string } = {}) {
  return {
    ToolCall: {
      session_id: opts.session ?? SID,
      tool_name: opts.name ?? 'bash',
      arguments: '{}',
      tool_call_id: opts.id,
      branch_id: BRANCH,
      team_id: 'Alice',
      started_at_ms: Date.now() - 5000,
    },
  } as unknown as BackendEvent;
}

function toolResult(opts: { id?: string; name?: string; result?: string; session?: string } = {}) {
  return {
    ToolResult: {
      session_id: opts.session ?? SID,
      tool_name: opts.name ?? 'bash',
      result: opts.result ?? 'ok',
      tool_call_id: opts.id,
      timed_out: false,
      branch_id: BRANCH,
      team_id: 'Alice',
      elapsed_ms: 1234,
    },
  } as unknown as BackendEvent;
}

function agentCompleted() {
  return {
    AgentCompleted: { session_id: SID, success: true, cancelled: false, team_id: 'Alice' },
  } as unknown as BackendEvent;
}

const tools = (): DisplayMessage[] => state.trunk.filter((m) => m.role === 'tool');
const running = (): DisplayMessage[] => tools().filter((m) => m.tool?.status === 'running');

beforeEach(() => {
  state.trunk = [];
  state.teams = [team('Alice'), team('EchoCode')];
  state.activeTeamId = 'Alice';
  state.activeRegion = null;
  state.branchTabs = {};
  state.tasks = [];
  state.activities = {};
});

describe('工具行收尾', () => {
  it('正常配对：id 精确命中，就地完成（不建重复行）', () => {
    dispatch(toolCall({ id: 'c1' }));
    dispatch(toolResult({ id: 'c1' }));
    expect(tools()).toHaveLength(1);
    expect(running()).toHaveLength(0);
    expect(tools()[0]?.tool?.status).toBe('succeeded');
    expect(tools()[0]?.tool?.elapsedMs).toBe(1234);
  });

  it('call/result 都没有 id：按名字兜底配对', () => {
    dispatch(toolCall({}));
    dispatch(toolResult({}));
    expect(tools()).toHaveLength(1);
    expect(running()).toHaveLength(0);
    expect(tools()[0]?.tool?.status).toBe('succeeded');
  });

  it('call 无 id、result 带 id：兜底命中并补回 id', () => {
    dispatch(toolCall({}));
    dispatch(toolResult({ id: 'c1' }));
    expect(tools()).toHaveLength(1);
    expect(running()).toHaveLength(0);
    expect(tools()[0]?.tool?.toolCallId).toBe('c1');
  });

  it('call 带 id、result 无 id：兜底命中', () => {
    dispatch(toolCall({ id: 'c1' }));
    dispatch(toolResult({}));
    expect(tools()).toHaveLength(1);
    expect(running()).toHaveLength(0);
  });

  it('同名并发两条 running：不猜配对（宁可追加，不配错）', () => {
    dispatch(toolCall({ id: 'c1' }));
    dispatch(toolCall({ id: 'c2' }));
    dispatch(toolResult({ id: 'c9' })); // 未知 id，且同名两条在跑
    // 不猜 → 追加一条完成行；两条原本的 running 保持（无法判断是谁的结果）
    expect(running()).toHaveLength(2);
    expect(tools().filter((m) => m.tool?.status === 'succeeded')).toHaveLength(1);
  });

  it('结果先于调用到达（乱序）：不产生僵尸 running 行', () => {
    dispatch(toolResult({ id: 'c1' }));
    dispatch(toolCall({ id: 'c1' }));
    expect(tools()).toHaveLength(1);
    expect(running()).toHaveLength(0);
    expect(tools()[0]?.tool?.status).toBe('succeeded');
  });

  it('ToolCall 重放（同 id）：不重复建行', () => {
    dispatch(toolCall({ id: 'c1' }));
    dispatch(toolCall({ id: 'c1' }));
    expect(tools()).toHaveLength(1);
  });

  it('结果事件丢失：回合结束时收尾为 unknown（不再读秒、不谎报失败）', () => {
    dispatch(toolCall({ id: 'c1' }));
    expect(running()).toHaveLength(1);
    // ToolResult 丢了，回合正常结束
    dispatch(agentCompleted());
    expect(running()).toHaveLength(0);
    const tool = tools()[0]?.tool;
    expect(tool?.status).toBe('unknown');
    expect(tool?.output).toContain('未收到执行回执');
    expect(typeof tool?.elapsedMs).toBe('number');
  });

  it('回合结束时仍有并发分支在跑：不收尾（避免掐掉子任务的时间线）', () => {
    dispatch(toolCall({ id: 'c1' }));
    state.tasks = [
      {
        id: 't1',
        sessionId: SID,
        core: null,
        kind: 'subagent',
        status: 'running',
      } as never,
    ];
    dispatch(agentCompleted());
    expect(running()).toHaveLength(1);
  });

  it('unknown 之后迟到的结果：修正为完成，不再多一条重复行', () => {
    dispatch(toolCall({ id: 'c1' }));
    dispatch(agentCompleted()); // 误收尾（并发 turn 场景）
    expect(tools()[0]?.tool?.status).toBe('unknown');
    dispatch(toolResult({ id: 'c1' })); // 结果迟到
    expect(tools()).toHaveLength(1);
    expect(tools()[0]?.tool?.status).toBe('succeeded');
    expect(tools()[0]?.tool?.output).toBe('ok');
  });

  it('错误中断：同样收尾残留 running', () => {
    dispatch(toolCall({ id: 'c1' }));
    dispatch({ Error: { session_id: SID, message: '连接中断' } } as unknown as BackendEvent);
    expect(running()).toHaveLength(0);
    expect(tools()[0]?.tool?.status).toBe('unknown');
  });
});
