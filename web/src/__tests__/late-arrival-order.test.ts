//! 迟到条目的落位（2026-11 顺序修复第二轮）：**早开始的工具排在晚输出后面**。
//!
//! ## 现场故障
//!
//! 会话区里一条 `started_at_ms` 更早的工具卡，显示在一段更晚的正文之后。
//! 实测数据（`echo-sessions-EchoCode.json`，14026 事件 → 6105 派生条目）：
//! 有 68 处时间递减、5 条只有 `ToolResult` 没有 `ToolCall`（压缩吃掉调用），
//! 同一秒内最多 8 条条目。
//!
//! ## 根因
//!
//! 合并是「快照 ⊕ 窗口」的两路归并，落位靠 `timeInsertIndexFrom(out, w, snap)`
//! ——它**只在尚未输出的快照区间 `[snap, len)` 里**找锚点。一旦游标越过该在
//! 的位置（同秒并列 / 快照时间非单调 / 条目已被 `flushThrough` 成批铺出），
//! 找不到锚点就退化成 `list.length` → 直接 append 到末尾，**没有任何回退**。
//!
//! 修法：合并期只**标记**迟到条目（`time` 比已输出的更早），合并结束后由
//! `reorderLateArrivals` 逐个「摘出 → 向前找第一个不更晚的位置」。快照条目
//! 只被插入、从不重排，权威顺序不变。
//!
//! ## 为什么不能整体按 time 排序
//!
//! 快照内部顺序是**权威的**（Core 事件日志 append 顺序），而它的 `time` 列
//! 不单调（`AssistantMessage` 用落盘时刻、工具行用 `started_at_ms`、旧事件用
//! carry-forward）。整体排序会把权威顺序换成另一堆错乱。

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../store';
import { sessionMessagesFor } from '../state';
import { checklistKey } from '../keys';
import type { DisplayMessage } from '../state';

const SID = 'local:workspace:systemx/base:local_user';
const TEAM = 'EchoCode';
const T0 = 1792880000;

/** 快照条目（派生形状：无条目级 seq 也行，这里给 seq 便于水位线判定）。 */
function hist(
  role: DisplayMessage['role'],
  content: string,
  time: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { key: `h-${role}-${time}-${content.slice(0, 4)}`, role, content, time, session_id: SID, seq: 0, ord: 0, ...extra };
}

function toolHist(name: string, callId: string, time: number) {
  return hist('tool', name, time, {
    // 直接写 `state.sessionHistory` = 已转换的 DisplayMessage 形状（驼峰）；
    // 线上 `TimelineMessage` 是蛇形，由 `toDisplayMessages` 转换。
    tool: { name, input: 'ls', output: 'ok', status: 'succeeded', toolCallId: callId },
  });
}

/** 实时窗口条目（无条目级 seq、time 为到达/开始时刻）。 */
function live(
  role: DisplayMessage['role'],
  content: string,
  time: number,
  extra: Partial<DisplayMessage> = {},
): DisplayMessage {
  return {
    key: `l-${role}-${time}-${content.slice(0, 4)}`,
    role,
    content,
    time,
    sessionId: SID,
    ...extra,
  } as DisplayMessage;
}

function liveTool(name: string, callId: string, time: number, status: 'running' | 'succeeded' = 'succeeded') {
  return live('tool', name, time, {
    tool: { name, input: 'ls', output: status === 'running' ? null : 'ok', status, toolCallId: callId } as never,
  });
}

function seedHistory(messages: unknown[], baseSeq = 100) {
  state.sessionHistory[checklistKey(state.activeRegion, TEAM, SID)] = {
    baseSeq,
    messages,
  } as never;
}

function merged(): DisplayMessage[] {
  return sessionMessagesFor(state, SID, TEAM);
}

/** 列表里 role+内容的出现顺序（断言用）。 */
function order(rows: DisplayMessage[]): string[] {
  return rows.map((r) => `${r.role}:${r.content}`);
}

beforeEach(() => {
  state.activeRegion = null;
  state.activeTeamId = TEAM;
  state.trunk = [];
  state.trunkTeamId = null;
  state.teamTimelines = {};
  state.sessionHistory = {};
  state.timelineHasMore = {};
});

describe('迟到条目落位', () => {
  it('场景A：快照里没有的工具行（ToolCall 被压缩吃掉），开始时刻早于已铺出的回答', () => {
    // 快照：[用户@T0, 回答@T0+200]。实时：[用户, 回答(已覆盖), 工具@T0+110]。
    // 工具在快照里找不到对应条目（只有 ToolResult、无 tool_call_id），
    // 锚点又在已输出区间之外 → 旧实现 append 到末尾，排在回答之后。
    seedHistory([hist('user', '跑一下测试', T0), hist('backend', '我看下结果', T0 + 200)]);
    state.trunk = [
      live('user', '跑一下测试', T0),
      live('backend', '我看下结果', T0 + 200),
      liveTool('bash', '', T0 + 110),
    ];

    const rows = merged();
    expect(order(rows)).toEqual([
      `user:跑一下测试`,
      `tool:bash`,
      `backend:我看下结果`,
    ]);
  });

  it('不越过用户消息（回合边界）', () => {
    // 快照四条，实时来一条时间戳异常早的回答（T0+50，早于「第二问」的
    // T0+500）。游标已建立 → 先 append 到末尾 → 判为迟到 → 向前退。退到
    // 用户消息就停：宁可位置不完美，也不能让一条回答跑到用户提问之前。
    seedHistory([
      hist('user', '第一问', T0),
      hist('backend', '第一答', T0 + 100),
      hist('user', '第二问', T0 + 500),
      hist('backend', '第二答', T0 + 900),
    ]);
    state.trunk = [
      live('user', '第一问', T0),
      live('backend', '第一答', T0 + 100),
      live('user', '第二问', T0 + 500),
      live('backend', '第二答', T0 + 900),
      live('backend', '时间戳异常早的补充', T0 + 50),
    ];

    const rows = merged();
    expect(order(rows)).toEqual([
      'user:第一问',
      'backend:第一答',
      'user:第二问',
      'backend:时间戳异常早的补充',
      'backend:第二答',
    ]);
  });

  it('时间单调的迟到条目不动（正常路径零成本、顺序不变）', () => {
    seedHistory([hist('user', '开始', T0), hist('backend', '先看看', T0 + 10)]);
    state.trunk = [
      live('user', '开始', T0),
      live('backend', '先看看', T0 + 10),
      liveTool('bash', 'c1', T0 + 20),
      live('backend', '结论', T0 + 30),
    ];

    expect(order(merged())).toEqual([
      'user:开始',
      'backend:先看看',
      'tool:bash',
      'backend:结论',
    ]);
  });

  it('同秒不越过（稳定：后到的同秒条目排在先到之后）', () => {
    seedHistory([hist('user', '开始', T0), hist('backend', '同秒的回答', T0 + 50)]);
    state.trunk = [
      live('user', '开始', T0),
      liveTool('bash', 'c1', T0 + 50),
      liveTool('grep', 'c2', T0 + 50),
    ];

    const rows = merged();
    const names = rows.filter((r) => r.role === 'tool').map((r) => r.tool?.name);
    expect(names).toEqual(['bash', 'grep']);
  });

  it('搬移只插不排：快照的逆时序尾巴拦住回退，权威顺序不变', () => {
    // 快照自身时间非单调（真实数据里 68 处）：回答@T0+500 之后跟着 carry-
    // forward 的推理@T0+100。实时来一条 T0+400 —— 理想位置在回答之前，但
    // 那要跨过推理。**不跨**：只插不排，宁可这一条位置不完美。
    seedHistory([
      hist('user', '开始', T0),
      hist('backend', '回答', T0 + 500),
      hist('reasoning', 'carry-forward 的推理', T0 + 100),
    ]);
    state.trunk = [
      live('user', '开始', T0),
      live('backend', '回答', T0 + 500),
      live('reasoning', 'carry-forward 的推理', T0 + 100),
      live('backend', '补充', T0 + 400),
    ];

    const rows = merged();
    // 快照里「回答 在 推理 之前」这条权威顺序必须保住。
    expect(order(rows).indexOf('backend:回答')).toBeLessThan(
      order(rows).indexOf('reasoning:carry-forward 的推理'),
    );
    expect(order(rows)).toEqual([
      'user:开始',
      'backend:回答',
      'reasoning:carry-forward 的推理',
      'backend:补充',
    ]);
  });

  it('多条迟到条目按 trunk 顺序落位（互不越过）', () => {
    seedHistory([hist('user', '开始', T0), hist('backend', '最后的回答', T0 + 900)]);
    state.trunk = [
      live('user', '开始', T0),
      live('backend', '最后的回答', T0 + 900),
      liveTool('bash', 'c1', T0 + 100),
      liveTool('grep', 'c2', T0 + 200),
    ];

    expect(order(merged())).toEqual([
      'user:开始',
      'tool:bash',
      'tool:grep',
      'backend:最后的回答',
    ]);
  });

  it('工具行按 tool_call_id 就地修补，搬移不产生第二行', () => {
    // 快照里有同 id 的工具行（已完成），实时窗口里是它的最新态。
    seedHistory([hist('user', '开始', T0), toolHist('bash', 'c1', T0 + 100), hist('backend', '回答', T0 + 900)]);
    state.trunk = [
      live('user', '开始', T0),
      liveTool('bash', 'c1', T0 + 100, 'running'),
      live('backend', '回答', T0 + 900),
    ];

    const rows = merged();
    expect(rows.filter((r) => r.role === 'tool')).toHaveLength(1);
    expect(rows.find((r) => r.role === 'tool')?.tool?.status).toBe('running');
  });
});
