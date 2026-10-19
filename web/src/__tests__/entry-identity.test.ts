//! 条目身份（`entry`）的 Panel 侧消费契约（2026-10 条目身份化 P1 第一步）。
//!
//! ## 背景
//!
//! Core 在事件帧的**信封层**附加 `entry`（与 `seq` 同一手法，
//! 见 Core 的 `core/src/entry_identity.rs`）：同一条逻辑条目的所有事件共享
//! 同一个 id——一段流式输出的全部增量与它的终值同 id，工具调用与它的结果
//! 同 id。
//!
//! 在此之前 Panel 只能靠启发式对齐实时行与权威条目：
//! - 流式行：按 `(role, session, branch)` 找"当前流式行"；
//! - 终值对账：分支缺失（后端路径）时"取该会话最新的流式行"；
//! - 工具配对：`tool_call_id` 优先，缺失时"按工具名猜最后一个 running"。
//!
//! 这三条在并行分支 / 同名工具并发 / 交错输出下都会配错行——历史上表现为
//! "思考 chip 堆到正文后面""工具行一直读秒""同一条回答显示两遍"。
//!
//! ## 灰度双读
//!
//! 本文件锁定两条路径的结果一致：
//! - **有 entry**（新版 Core）→ 精确命中；
//! - **无 entry**（旧版 Core）→ 回退原有启发式，行为不变。
//!
//! 这是双读灰度的前提：新字段上线不得改变旧 Core 下的任何行为。

import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { appendStreamDelta, settleStream, finishToolMessage } from '../state_domains/timeline';
import type { DisplayMessage } from '../state';

const SID = 'local:tui::local_user';

const contents = (list: DisplayMessage[]) => list.map((m) => m.content);

beforeEach(() => {
  state.trunk = [];
  state.activeRegion = null;
  state.activeTeamId = null;
  state.sessions = [];
  state.teams = [];
  state.activities = {};
});

describe('流式行的条目身份（entry 精确命中）', () => {
  it('同一 entry 的增量追加到同一行；不同 entry 各开一行', () => {
    appendStreamDelta(state, 'backend', SID, 'b1', 'he', 'backend:s:b1:1');
    appendStreamDelta(state, 'backend', SID, 'b1', 'llo', 'backend:s:b1:1');
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].content).toBe('hello');
    // 另一个 entry（例如工具调用之后的新一段）→ 新行，不并进上一行
    appendStreamDelta(state, 'backend', SID, 'b1', 'next', 'backend:s:b1:2');
    expect(state.trunk).toHaveLength(2);
    expect(state.trunk[1].content).toBe('next');
  });

  it('分支相同的两段不同 entry 不会被合并（旧启发式会并错）', () => {
    // 场景：同一 branch 下，工具开始前的一段中间叙述 + 工具后的一段正文。
    // 旧逻辑只按 (role, session, branch) 找流式行，会把第二段并进第一段。
    appendStreamDelta(state, 'backend', SID, 'b1', '先说明一下', 'backend:s:b1:1');
    state.trunk[0].streamState = 'frozen'; // freezeStreams 的效果
    appendStreamDelta(state, 'backend', SID, 'b1', '真正要做的是', 'backend:s:b1:2');
    expect(state.trunk).toHaveLength(2);
    expect(contents(state.trunk)).toEqual(['先说明一下', '真正要做的是']);
  });

  it('终值按 entry 精确收敛到对应行（分支缺失也不会配错）', () => {
    appendStreamDelta(state, 'backend', SID, 'b1', '第一段', 'backend:s:b1:1');
    state.trunk[0].streamState = 'frozen';
    appendStreamDelta(state, 'backend', SID, 'b1', '第二段', 'backend:s:b1:2');
    // 终值带第二段的 entry、分支缺失（后端路径）→ 必须收敛到第二行
    const settled = settleStream(state, 'backend', SID, null, '第二段完整正文', 'backend:s:b1:2');
    expect(settled).toBe(true);
    expect(state.trunk).toHaveLength(2);
    expect(state.trunk[1].content).toBe('第二段完整正文');
    expect(state.trunk[1].streamState).toBeUndefined();
    // 第一行（frozen）未被误改
    expect(state.trunk[0].content).toBe('第一段');
  });

  it('终值的 entry 找不到对应流式行 → 返回 false（调用方走整段 push）', () => {
    const settled = settleStream(state, 'backend', SID, null, '整段回答', 'backend:s:b1:9');
    expect(settled).toBe(false);
    expect(state.trunk).toHaveLength(0);
  });
});

describe('工具行的条目身份（entry 精确配对）', () => {
  it('ToolCall/ToolResult 同 entry → 就地回填，不新增行', () => {
    dispatch(
      {
        ToolCall: {
          session_id: SID,
          tool_name: 'bash',
          arguments: '{"cmd":"ls"}',
          tool_call_id: 'c1',
          started_at_ms: 1000,
        },
      },
      null,
      'tool:s:c1',
    );
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].entry).toBe('tool:s:c1');
    dispatch(
      { ToolResult: { session_id: SID, tool_name: 'bash', result: 'ok', tool_call_id: 'c1', elapsed_ms: 12 } },
      null,
      'tool:s:c1',
    );
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].tool?.output).toBe('ok');
    expect(state.trunk[0].tool?.status).toBe('succeeded');
    expect(state.trunk[0].tool?.elapsedMs).toBe(12);
  });

  it('同名工具并发：靠 entry 区分，不会配错（旧逻辑可能配错）', () => {
    // 两条同名 bash，不同 call id / 不同 entry
    dispatch(
      { ToolCall: { session_id: SID, tool_name: 'bash', arguments: '{"cmd":"a"}', tool_call_id: 'cA' } },
      null,
      'tool:s:cA',
    );
    dispatch(
      { ToolCall: { session_id: SID, tool_name: 'bash', arguments: '{"cmd":"b"}', tool_call_id: 'cB' } },
      null,
      'tool:s:cB',
    );
    expect(state.trunk).toHaveLength(2);
    // cB 先完成：entry 精确指向第二行
    dispatch(
      { ToolResult: { session_id: SID, tool_name: 'bash', result: 'B done', tool_call_id: 'cB' } },
      null,
      'tool:s:cB',
    );
    expect(state.trunk[0].tool?.status).toBe('running');
    expect(state.trunk[1].tool?.output).toBe('B done');
  });

  it('无 tool_call_id 的旧式事件：靠 entry 仍能精确配对', () => {
    dispatch(
      { ToolCall: { session_id: SID, tool_name: 'bash', arguments: '{}' } },
      null,
      'tool:s:x1',
    );
    // 结果不带 tool_call_id（旧 Core 风格），但带同一个 entry
    finishToolMessage(state, 'bash', 'done', undefined, false, 7, 'tool:s:x1');
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].tool?.output).toBe('done');
  });

  it('结果找不到对应行（中途接入/被挤出）→ 追加一条完成行，不丢内容', () => {
    finishToolMessage(state, 'bash', 'orphan result', 'cX', false, 5, 'tool:s:cX');
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].tool?.status).toBe('succeeded');
    expect(state.trunk[0].tool?.output).toBe('orphan result');
    // 身份也写进新行（后续同 entry 的事件可继续命中）
    expect(state.trunk[0].entry).toBe('tool:s:cX');
  });
});

describe('无 entry 时回退旧行为（灰度双读）', () => {
  it('流式行仍按 (role, session, branch) 合并', () => {
    appendStreamDelta(state, 'backend', SID, 'b1', 'he');
    appendStreamDelta(state, 'backend', SID, 'b1', 'llo');
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].content).toBe('hello');
    expect(state.trunk[0].entry).toBeUndefined();
  });

  it('终值仍按分支 / 最新流式行收敛', () => {
    appendStreamDelta(state, 'backend', SID, 'b1', 'streamed');
    expect(settleStream(state, 'backend', SID, null, 'final text')).toBe(true);
    expect(state.trunk[0].content).toBe('final text');
  });

  it('工具仍按 tool_call_id 配对', () => {
    dispatch({ ToolCall: { session_id: SID, tool_name: 'bash', arguments: '{}', tool_call_id: 'c1' } });
    dispatch({ ToolResult: { session_id: SID, tool_name: 'bash', result: 'ok', tool_call_id: 'c1' } });
    expect(state.trunk).toHaveLength(1);
    expect(state.trunk[0].tool?.output).toBe('ok');
    expect(state.trunk[0].entry).toBeUndefined();
  });
});
