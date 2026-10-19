//! 会话历史 ⊕ 实时窗口的**合并索引**契约（2026-10 P0 第二批）。
//!
//! ## 背景
//!
//! `sessionMessagesFor` 在每个流式 delta 都会被调用（`ChatView` 的
//! `sourceMessages` computed 依赖它）。它的匹配此前是「每条窗口消息 ×
//! 全表线性扫」——实测 3000 条历史 + 1024 条实时窗口时**单次 delta 622 ms**
//! （Profiler：55.7% 是 reactive Proxy get、35% 是匹配循环本身）。
//!
//! 现改为建一次索引（`role|time` / `tool_call_id` / 工具名→running），每次
//! 匹配变成一次 Map 查表 → 同规模 4.6 ms。
//!
//! ## 索引化必须守住的三条
//!
//! 1. **去重判据不变**：同 (role, time) 的候选可能多条（一回合里工具/正文的
//!    时间戳来自 Core 的 carry-forward，同一秒多条是常态），必须逐个按原判据
//!    判定，不能"一条候选命中就整组算覆盖"。
//! 2. **下标稳定**：第一版实现边匹配边 `splice`，插入一条后索引里的下标整体
//!    偏移 → 快照里的同一条 backend 被误判"未覆盖" → 同一条回答显示两遍。
//!    现分两阶段（判定用快照原始坐标、输出另用映射表），本文件锁定这一点。
//! 3. **写时复制**：补丁换对象，快照本体不得被污染（否则切会话/刷新后看到
//!    错误的工具状态）。

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../store';
import { sessionMessagesFor } from '../state';
import { checklistKey } from '../keys';
import type { DisplayMessage } from '../state';

const SID = 's1';
const TEAM = 't';
const KEY = checklistKey(null, TEAM, SID);

function msg(over: Partial<DisplayMessage> & { key: string }): DisplayMessage {
  return {
    role: 'backend',
    content: '',
    time: 0,
    sessionId: SID,
    ...over,
  } as DisplayMessage;
}

function seedHist(messages: DisplayMessage[], baseSeq: number) {
  state.sessionHistory[KEY] = { messages, total: messages.length, truncated: false, baseSeq };
}

beforeEach(() => {
  state.trunk = [];
  state.sessionHistory = {};
  state.activeRegion = null;
  state.activeTeamId = TEAM;
});

describe('合并索引：与逐条判定结果一致', () => {
  it('同 (role,time) 多候选：逐条比对去重，不重复也不丢', () => {
    const t = 200;
    seedHist(
      [
        msg({ key: 'h1', role: 'user', content: '问', time: t }),
        msg({ key: 'h2', content: '答一', time: t }),
        msg({ key: 'h3', content: '答二', time: t }),
        msg({ key: 'h4', content: '答三', time: t }),
      ],
      10,
    );
    // 三条同秒 backend 的实时副本（应全部判为已覆盖）+ 一条新回答
    state.trunk = [
      msg({ key: 'w1', content: '答一', time: t }),
      msg({ key: 'w2', content: '答二', time: t }),
      msg({ key: 'w3', content: '答三', time: t }),
      msg({ key: 'w4', content: '答四', time: t + 1 }),
    ];
    const merged = sessionMessagesFor(state, SID, TEAM);
    expect(merged.map((m) => m.content)).toEqual(['问', '答一', '答二', '答三', '答四']);
  });

  it('插入新条目后，后续匹配仍按快照原始坐标（不复判/不重复）', () => {
    // 这条守住"边匹配边 splice 会让下标偏移"的坑：新条目插在中间之后，
    // 快照里排在后面的 backend 仍必须被判为已覆盖。
    seedHist(
      [
        msg({ key: 'h1', role: 'user', content: '问', time: 100 }),
        msg({ key: 'h2', content: '答', time: 110 }),
      ],
      100,
    );
    state.trunk = [
      msg({ key: 'r1', role: 'reasoning', content: '思考', time: 105 }), // 新条目（快照不含推理）
      msg({ key: 'w2', content: '答', time: 110 }), // 快照已有 → 不得重复
    ];
    const merged = sessionMessagesFor(state, SID, TEAM);
    expect(merged.map((m) => m.role)).toEqual(['user', 'reasoning', 'backend']);
    expect(merged.filter((m) => m.content === '答')).toHaveLength(1);
  });

  it('工具行按 call id 修补，快照本体保持原状（写时复制）', () => {
    seedHist(
      [
        msg({ key: 'h1', role: 'user', content: '问', time: 300 }),
        msg({
          key: 'h2',
          role: 'tool',
          content: 'bash',
          time: 301,
          tool: { name: 'bash', input: '{}', output: null, status: 'running', toolCallId: 'cX' },
        }),
        msg({ key: 'h3', content: '答', time: 302 }),
      ],
      10,
    );
    state.trunk = [
      msg({
        key: 'w1',
        role: 'tool',
        content: 'bash',
        time: 301,
        tool: { name: 'bash', input: '{}', output: 'done', status: 'succeeded', toolCallId: 'cX' },
      }),
    ];
    const merged = sessionMessagesFor(state, SID, TEAM);
    expect(merged.map((m) => m.role)).toEqual(['user', 'tool', 'backend']);
    expect(merged[1].tool?.output).toBe('done');
    expect(merged[1].tool?.status).toBe('succeeded');
    // 快照本体不得被污染
    expect(state.sessionHistory[KEY].messages[1].tool?.status).toBe('running');
    expect(state.sessionHistory[KEY].messages[1].tool?.output).toBeNull();
  });

  it('大历史（1500 条）+ 200 条实时副本：不重复、不丢、新条目落在末尾', () => {
    const hist: DisplayMessage[] = [];
    for (let i = 0; i < 1500; i++) {
      hist.push(msg({ key: `h${i}`, role: i % 2 ? 'backend' : 'user', content: `m${i}`, time: 1000 + i }));
    }
    seedHist(hist, 10);
    const trunk: DisplayMessage[] = [];
    for (let i = 1300; i < 1500; i++) {
      trunk.push(msg({ key: `w${i}`, role: i % 2 ? 'backend' : 'user', content: `m${i}`, time: 1000 + i }));
    }
    for (let k = 0; k < 5; k++) {
      trunk.push(msg({ key: `n${k}`, content: `new${k}`, time: 3000 + k }));
    }
    state.trunk = trunk;
    const merged = sessionMessagesFor(state, SID, TEAM);
    expect(merged).toHaveLength(1505); // 1500 历史 + 5 新条目（200 条副本去重）
    expect(merged.slice(-5).map((m) => m.content)).toEqual(['new0', 'new1', 'new2', 'new3', 'new4']);
  });

  it('无 id 的工具完成态：按名字补到最后一个 running 条目', () => {
    seedHist(
      [
        msg({
          key: 'h1',
          role: 'tool',
          content: 'bash',
          time: 400,
          tool: { name: 'bash', input: '{}', output: null, status: 'running' },
        }),
      ],
      10,
    );
    state.trunk = [
      msg({
        key: 'w1',
        role: 'tool',
        content: 'bash',
        time: 400,
        tool: { name: 'bash', input: '{}', output: 'ok', status: 'succeeded' },
      }),
    ];
    const merged = sessionMessagesFor(state, SID, TEAM);
    expect(merged).toHaveLength(1);
    expect(merged[0].tool?.output).toBe('ok');
    expect(state.sessionHistory[KEY].messages[0].tool?.status).toBe('running');
  });
});
