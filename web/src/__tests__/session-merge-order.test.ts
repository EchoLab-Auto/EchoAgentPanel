//! 会话区显示顺序（2026-10 拔根）。
//!
//! 现场故障（用户报「算法研究2 的会话区内容显示顺序出了很大的问题」）：
//! 同一条回答出现两次，其中一份插在列表靠后的位置；思考小方块跑到不相干
//! 的回合里。用真实 Core 响应（SessionHistory 483 条 + TrunkTimeline 里属于
//! 该会话的 313 条）跑合并函数复现：**10 条完全重复 + 3 处逆时序**，且三处
//! 逆序全部由重复行的"第二份"造成。
//!
//! 根因：`sessionMessagesFor` 用的身份是 `(role, time)`，而 Core 的两条投影
//! 路径时间口径不同——
//!
//! | 来源 | 谁给的 time | 代码 |
//! | --- | --- | --- |
//! | `SessionHistory`（派生） | backend / subagent 用 **carry-forward**（沿用最近一条带时间的事件） | `echo-plugin-management::history` |
//! | `TrunkTimeline` / 实时推送 | `Utc::now()`（**到达时刻**） | `echo-plugin-management::timeline` |
//!
//! 实测偏差 2251 秒（37 分钟）。身份落空 → 落进 rule 4「新条目」→ 追加到
//! 合并游标处 → 重复 + 逆序。
//!
//! 修法：`(role, time)` 落空时，对 `seq === 0` 的实时行按**归一化全文**认领
//! 尚未输出的快照条目（1:1 消费，天然保序）。短文本不作身份（语义上不可
//! 区分），这条边界由 `CONTENT_IDENTITY_MIN_CHARS` 守住。

import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { sessionMessagesFor } from '../state';
import type { DisplayMessage } from '../state';

const TEAM = 'EchoCode';
const SID = 'local:workspace:systemx/base:local_user';
const T0 = 1792880000;

/** 一段"够长、近似唯一"的回答（真实故障里重复的就是这种）。 */
const LONG_A =
  '已继续完成检查。300 轮实验、独立加载评估和多种子复评都已完成，GPU 当前空闲。训练正常结束，评估指标见下表。';
const LONG_B =
  '收到。后续审查进一步确认了几个重要点：WM 确实在同一批 2048 个窗口上连续更新 10 次，不是每轮重新采样。';
const LONG_C =
  '精确复制一个小文本文件并校验：本机 /tmp/termfix_b64_1，目标远端 /root/arx_dyna_sync/，逐字节比对 SHA256。';

type HistKind = 'user' | 'backend' | 'reasoning' | 'tool' | 'system';

/** 历史快照条目（派生形状：seq=0、time 为 carry-forward）。 */
function hist(kind: HistKind, content: string, time: number, extra: Record<string, unknown> = {}) {
  return { kind, content, session_id: SID, time, seq: 0, ord: 0, ...extra };
}

function toolHist(name: string, callId: string, time: number) {
  return hist('tool', name, time, {
    tool: { name, input: 'ls', output: 'ok', status: 'succeeded', tool_call_id: callId },
  });
}

/** 实时推送行（Panel 形状：无条目级 seq，time 为到达时刻）。 */
function live(
  role: DisplayMessage['role'],
  content: string,
  time: number,
  extra: Partial<DisplayMessage> = {},
): DisplayMessage {
  return { key: `live-${role}-${time}-${content.slice(0, 6)}`, role, content, time, sessionId: SID, ...extra };
}

function pushHistory(messages: unknown[], maxSeq: number, total = messages.length, truncated = false) {
  dispatch(
    {
      SessionHistory: { team_id: TEAM, session_id: SID, messages, total, truncated, max_seq: maxSeq },
    } as never,
    null,
  );
}

function mergedNow(): DisplayMessage[] {
  return sessionMessagesFor(state, SID, TEAM);
}

/** 逆时序处数（时间单调性自检）。 */
function inversions(rows: DisplayMessage[]): number {
  let n = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const a = rows[i - 1]!.time ?? 0;
    const b = rows[i]!.time ?? 0;
    if (a && b && b < a) n += 1;
  }
  return n;
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

describe('sessionMessagesFor：历史快照 ⊕ 实时行（两侧时间口径不同）', () => {
  it('时间对不上但内容相同 → 不重复显示，也不插到后面（本次故障的正例）', () => {
    // 派生把两段 backend 的时间踩成了 carry-forward（= 上一个工具的开始时刻），
    // 实时行是到达时刻 —— 差 2251 秒，正是线上实测的偏差。
    pushHistory(
      [hist('user', '检查一下好了吗？请你继续。', T0), toolHist('bash', 'c1', T0 + 10), hist('backend', LONG_A, T0 + 10), hist('backend', LONG_B, T0 + 20)],
      16,
    );
    state.trunk = [
      live('backend', LONG_A, T0 + 10 + 2251),
      live('backend', LONG_B, T0 + 20 + 2251),
    ];

    const rows = mergedNow();
    expect(rows.map((r) => r.content)).toEqual([
      '检查一下好了吗？请你继续。',
      'bash',
      LONG_A,
      LONG_B,
    ]);
    expect(inversions(rows)).toBe(0);
  });

  it('真正的新回答（内容不同）照常落在末尾', () => {
    pushHistory([hist('user', '你好', T0), hist('backend', LONG_A, T0)], 16);
    state.trunk = [
      live('backend', LONG_A, T0 + 900), // 已覆盖
      live('user', '再问一句', T0 + 1000),
      live('backend', LONG_B, T0 + 1001), // 新
    ];

    const rows = mergedNow();
    expect(rows.map((r) => r.content)).toEqual(['你好', LONG_A, '再问一句', LONG_B]);
    expect(inversions(rows)).toBe(0);
  });

  it('同一段长文又出现一次（第 2 次真实输出）→ 快照那份已铺出后仍保留新的一份', () => {
    // 快照只有一条 LONG_A。第一行实时副本认领它（1:1 消费），第二行没有可
    // 认领的候选 → 作为新回答保留。确保兜底不会"吃掉第二条"。
    pushHistory([hist('user', '问', T0), hist('backend', LONG_A, T0)], 16);
    state.trunk = [live('backend', LONG_A, T0 + 500), live('backend', LONG_A, T0 + 900)];

    const rows = mergedNow();
    expect(rows.filter((r) => r.content === LONG_A).length).toBe(2);
  });

  it('快照有两条同样的长文、实时也有两条 → 一一配对，各留一条', () => {
    pushHistory(
      [
        hist('user', '问一', T0),
        hist('backend', LONG_A, T0 + 100),
        hist('user', '问二', T0 + 200),
        hist('backend', LONG_A, T0 + 300),
      ],
      16,
    );
    state.trunk = [live('backend', LONG_A, T0 + 1000), live('backend', LONG_A, T0 + 1100)];

    const rows = mergedNow();
    expect(rows.filter((r) => r.content === LONG_A).length).toBe(2);
    expect(rows.length).toBe(4);
  });

  it('短文本不作身份：同文短回答是两次真实输出 → 两条都留（不误吞）', () => {
    // 'ok' / '收到' 这类短文本在数据上不可区分（同角色、同正文、时间不可信）。
    // 取舍：宁可界面上有两条可见的短回答，也不能吞掉一条真实回答。
    pushHistory([hist('user', '请回复：ok', T0), hist('backend', 'ok', T0)], 16);
    state.trunk = [live('backend', 'ok', T0 + 500)];

    const rows = mergedNow();
    expect(rows.filter((r) => r.content === 'ok').length).toBe(2);
  });

  it('带 seq 的条目仍由水位线判定，不走内容兜底（同文重复的新回答不被吞）', () => {
    pushHistory([hist('user', '问', T0), hist('backend', LONG_A, T0 + 10)], 16);
    state.trunk = [
      { ...live('backend', LONG_A, T0 + 10), seq: 15 } as DisplayMessage, // 水位线内 → 丢弃
      { ...live('backend', LONG_A, T0 + 20), seq: 17 } as DisplayMessage, // 水位线外 → 保留
    ];

    const rows = mergedNow();
    expect(rows.filter((r) => r.content === LONG_A).length).toBe(2);
  });

  it('工具行不参与内容兜底（同名工具连排是常态，配对靠 tool_call_id）', () => {
    pushHistory([toolHist('bash', 'c1', T0), toolHist('bash', 'c2', T0 + 5)], 16);
    state.trunk = [
      live('tool', 'bash', T0 + 100, {
        tool: { name: 'bash', input: '', output: null, status: 'running' },
      }),
      live('tool', 'bash', T0 + 101, {
        tool: { name: 'bash', input: '', output: null, status: 'running' },
      }),
    ];

    const rows = mergedNow();
    expect(rows.length).toBe(4);
  });

  it('subagent 回报（同属长文本）同样去重 —— 故障里的 4 条重复就是它', () => {
    pushHistory(
      [hist('user', '派个子代理', T0), hist('user', `<subagent_event>\n{"task":"${LONG_C}","success":true}`, T0 + 30)],
      16,
    );
    state.trunk = [
      live('subagent', LONG_C, T0 + 30 + 1382),
    ];

    const rows = mergedNow();
    expect(rows.filter((r) => r.role === 'subagent').length).toBe(1);
  });
});
