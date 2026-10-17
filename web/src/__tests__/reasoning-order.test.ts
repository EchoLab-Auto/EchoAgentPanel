//! 推理条目的**时序位置**（2026-10 回归）：「思考 chip 又堆到输出正文后面了」。
//!
//! ## 背景
//!
//! 合并会话历史与实时窗口时，代码是「先铺 hist，再把实时窗口里没覆盖到的
//! 条目**追加到末尾**」。对"新条目"这是对的，但对**推理**完全错：
//!
//! - **旧版 Core** 的历史派生不含推理（`history.rs`：活链路的
//!   `AssistantMessage.reasoning_content` 恒为 `None`，推理只在实时 timeline）；
//!   新版 Core（2026-10 根治）把推理落成 `SessionEvent::Reasoning`，派生已含；
//! - 旧 Core 下推理在 hist 里**永远找不到对应条目** → 每次都被当"新条目"追加；
//! - 于是历史回合的思考全部堆到正文后面，刷新（重建 hist/trunk）才消失。
//!
//! 上一轮修「看不到思考 chip」时让推理绕过 seq 水位线，恰好把这条路径暴露
//! 出来：从"整条消失"变成"全部堆在末尾"。
//!
//! ## 契约
//!
//! `state.trunk` 的顺序就是真实时序（实时投影按到达顺序 push，Core 的
//! timeline 也是同一顺序）。合并必须**按这个顺序插到对应位置**，而不是
//! 一律追加：
//! 1. 能定位（工具按 id / 其它按内容判据）→ 只前移插入游标，不插入；
//! 2. 定位不到的新条目 → 插入游标处；
//! 3. 游标还没建立（trunk 缺少前驱条目，例如已滚出窗口）→ 用**时间**兜底
//!    定位（找第一个 time 更大的条目）；时间缺失时退回追加。
import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../store';
import { sessionMessagesFor } from '../state';
import { checklistKey } from '../keys';
import type { DisplayMessage } from '../state';

const SID = 'local:tui::local_user';
const TEAM = 'Alice';

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

/** 造一份 hist（不含推理——与 Core 派生的形状一致）。 */
function seedHist(messages: DisplayMessage[], baseSeq = 100) {
  state.sessionHistory[histKey()] = {
    messages,
    total: messages.length,
    truncated: false,
    baseSeq,
  };
}

const roles = (list: DisplayMessage[]) => list.map((m) => m.role);

beforeEach(() => {
  state.trunk = [];
  state.teams = [{ id: TEAM, name: TEAM, description: '', enabled: true, sessions: 0 } as never];
  state.activeTeamId = TEAM;
  state.activeRegion = null;
  state.branchTabs = {};
  state.sessionHistory = {};
  state.teamTimelines = {};
  state.trunkTeamId = null;
  state.tasks = [];
  state.activities = {};
});

describe('推理的时序位置', () => {
  it('单段推理：插在 user 与 backend 之间，不堆到正文后面', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'backend', content: '回答', time: 110 }),
    ]);
    state.trunk = [
      msg({ key: 'r1', role: 'reasoning', content: '思考', time: 105 }),
      msg({ key: 'r2', role: 'backend', content: '回答', time: 110 }),
    ];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'reasoning', 'backend']);
    // 推理内容不能被吞
    expect(out.find((m) => m.role === 'reasoning')?.content).toBe('思考');
  });

  it('多段推理穿插工具：严格按 trunk 顺序落位', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({
        key: 'h2',
        role: 'tool',
        time: 110,
        content: 'bash',
        tool: { name: 'bash', input: '{}', output: 'ok', status: 'succeeded', toolCallId: 'c1' },
      }),
      // backend 的 time 是 Core 派生的 carry-forward（沿用最近带时间事件）
      msg({ key: 'h3', role: 'backend', content: '回答', time: 110 }),
    ]);
    state.trunk = [
      msg({ key: 'r1', role: 'reasoning', content: '第一段', time: 105 }),
      msg({
        key: 'r2',
        role: 'tool',
        time: 110,
        content: 'bash',
        tool: { name: 'bash', input: '{}', output: 'ok', status: 'succeeded', toolCallId: 'c1' },
      }),
      msg({ key: 'r3', role: 'reasoning', content: '第二段', time: 115 }),
      msg({ key: 'r4', role: 'backend', content: '回答', time: 110 }),
    ];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'reasoning', 'tool', 'reasoning', 'backend']);
  });

  it('trunk 缺少前驱（已滚出窗口）：用时间兜底，仍不堆到末尾', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'backend', content: '回答', time: 200 }),
    ]);
    // 只有推理，没有 backend 实时副本
    state.trunk = [msg({ key: 'r1', role: 'reasoning', content: '思考', time: 150 })];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'reasoning', 'backend']);
  });

  it('对照：真正的新回答仍追加在末尾（顺序 = 时序）', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'backend', content: '旧回答', time: 110 }),
    ]);
    state.trunk = [
      msg({ key: 'r1', role: 'reasoning', content: '新思考', time: 300 }),
      msg({ key: 'r2', role: 'backend', content: '新回答', time: 305 }),
    ];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'backend', 'reasoning', 'backend']);
    expect(out[3]!.content).toBe('新回答');
  });

  it('带 seq 的推理（TrunkTimeline 权威副本）同样按位置落位', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'backend', content: '回答', time: 110 }),
    ]);
    state.trunk = [
      // 推理带 seq，且落在水位线内（旧版 Core 的水位线含推理 seq）
      msg({ key: 'r1', role: 'reasoning', content: '思考', time: 105, seq: 40 }),
      msg({ key: 'r2', role: 'backend', content: '回答', time: 110, seq: 50 }),
    ];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'reasoning', 'backend']);
  });

  it('time 缺失（0）时不乱插：退回追加', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'backend', content: '回答', time: 110 }),
    ]);
    state.trunk = [msg({ key: 'r1', role: 'reasoning', content: '无时间戳的思考', time: 0 })];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'backend', 'reasoning']);
  });

describe('新版 Core：历史已含推理', () => {
  it('hist 与实时窗口都有同一段推理 → 只显示一条，位置不变', () => {
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'reasoning', content: '思考', time: 105 }),
      msg({ key: 'h3', role: 'backend', content: '回答', time: 110 }),
    ]);
    state.trunk = [
      msg({ key: 'r1', role: 'reasoning', content: '思考', time: 105 }),
      msg({ key: 'r2', role: 'backend', content: '回答', time: 110 }),
    ];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'reasoning', 'backend']);
  });

  it('线上瘦身（240 字 + 标记）与历史全文视为同一条', () => {
    const full = 'A'.repeat(400);
    seedHist([
      msg({ key: 'h1', role: 'user', content: '问题', time: 100 }),
      msg({ key: 'h2', role: 'reasoning', content: full, time: 105 }),
      msg({ key: 'h3', role: 'backend', content: '回答', time: 110 }),
    ]);
    // 线上条目被 elide_reasoning_for_wire 截断
    const elided = `${'A'.repeat(240)}…\n（较早的推理已截断：原文 400 字）`;
    state.trunk = [msg({ key: 'r1', role: 'reasoning', content: elided, time: 105 })];

    const out = sessionMessagesFor(state, SID, TEAM);
    expect(roles(out)).toEqual(['user', 'reasoning', 'backend']);
    // 保留历史里的全文（不被截断版覆盖）
    expect(out.find((m) => m.role === 'reasoning')?.content).toBe(full);
  });
});

});
