//! 时间线分页（2026-10）：首屏限窗 + 向上翻页 + 前插去重。
//!
//! ## 为什么需要
//!
//! 时间线上限 1024 条、压缩后约 0.6 MB。首屏/重连一次性收完既拖慢首帧，也让
//! 「只想看最后一屏」的场景白付传输与解析（实测全量转换 6.8 ms + 传输）。
//!
//! 现在：首屏 `RequestTrunkTimeline { limit: 200 }` 只收最新 200 条，更早的按
//! `RequestTimelineEarlier { before_seq }` 向上翻页。
//!
//! ## 本文件锁定四条不变量
//!
//! 1. `TrunkTimeline.has_more` 落到 `state.timelineHasMore[key]`（缺字段 = false，
//!    旧版 Core 不需要翻页）；
//! 2. `TimelineEarlier` **前插**到已加载列表头部，且**不动同步游标**
//!    （`teamTimelines[key].seq` 仍是"最新进度"——若被写成老条目的 seq，
//!    下次增量同步会重复拉整段）；
//! 3. 前插**去重**：同一页被重复请求/重连重放时不得出现重复行；
//! 4. 只前插"比已加载最老条目更早"的条目（防乱序/回退页污染）；
//! 5. 翻页锚点用 **`ord`**（Core push 时分配、永不变更）：既不是 `seq`
//!    （因就地更新而乱序），也不是「已加载条数」（分页期间的新增会让它错位）。

import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { teamKey } from '../keys';
import type { TimelineMessage } from '../protocol';

const TEAM = 'Alice';
const SID = 'local:tui::local_user';
const KEY = teamKey(null, TEAM);

function timelineMessage(i: number): TimelineMessage {
  return {
    kind: 'backend',
    content: `m${i}`,
    session_id: SID,
    time: 1700000000 + i,
    seq: 100 + i,
  };
}

/** 灌一份"最新 N 条"的快照（模拟 Core 的分页全量响应）。 */
function seedFullSnapshot(count: number, hasMore: boolean, startSeq = 100) {
  const messages: TimelineMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      kind: 'backend',
      content: `m${startSeq + i - 100}`,
      session_id: SID,
      time: 1700000000 + i,
      seq: startSeq + i,
    });
  }
  dispatch(
    {
      TrunkTimeline: {
        messages,
        seq: startSeq + count - 1,
        team_id: TEAM,
        full: true,
        has_more: hasMore,
      },
    },
    null,
  );
}

beforeEach(() => {
  state.trunk = [];
  state.teamTimelines = {};
  state.timelineHasMore = {};
  state.trunkTeamId = null;
  state.activeRegion = null;
  state.activeTeamId = TEAM;
  state.sessionHistory = {};
});

describe('首屏限窗（TrunkTimeline.has_more）', () => {
  it('has_more=true 落到 timelineHasMore，供「加载更早」判断', () => {
    seedFullSnapshot(200, true);
    expect(state.timelineHasMore[KEY]).toBe(true);
    expect(state.teamTimelines[KEY]?.msgs.length).toBe(200);
  });

  it('缺 has_more 字段（旧版 Core）= 不需要翻页', () => {
    dispatch(
      {
        TrunkTimeline: {
          messages: [timelineMessage(0)],
          seq: 100,
          team_id: TEAM,
          full: true,
        },
      },
      null,
    );
    expect(state.timelineHasMore[KEY]).toBe(false);
  });
});

describe('向上翻页（TimelineEarlier）', () => {
  it('前插到头部，且不动同步游标', () => {
    seedFullSnapshot(20, true, 200); // seq 200..219
    const seqBefore = state.teamTimelines[KEY]!.seq;
    expect(seqBefore).toBe(219);

    // 请求更早的一页：seq 190..199（都在已加载最老条目 200 之前）
    const page: TimelineMessage[] = [];
    for (let i = 0; i < 10; i++) {
      page.push({ kind: 'backend', content: `old${i}`, session_id: SID, time: 1700000000, seq: 190 + i });
    }
    dispatch({ TimelineEarlier: { team_id: TEAM, messages: page, has_more: true } }, null);

    const msgs = state.teamTimelines[KEY]!.msgs;
    expect(msgs.length).toBe(30);
    // 前插：更早的在头部、原有的仍按原顺序在尾部（时间升序不变）
    expect(msgs[0].content).toBe('old0');
    expect(msgs[9].content).toBe('old9');
    expect(msgs[10].content).toBe('m100');
    expect(msgs[msgs.length - 1].content).toBe('m119');
    // **同步游标不动**（否则下次增量会把整段重复拉一遍）
    expect(state.teamTimelines[KEY]!.seq).toBe(219);
  });

  it('重复请求同一页不产生重复行（去重）', () => {
    seedFullSnapshot(5, true, 200);
    const page: TimelineMessage[] = [];
    for (let i = 0; i < 5; i++) page.push({ ...timelineMessage(i), seq: 190 + i });
    dispatch({ TimelineEarlier: { team_id: TEAM, messages: page, has_more: true } }, null);
    const afterFirst = state.teamTimelines[KEY]!.msgs.length;
    // 同一页再来一次（重连重放 / 双击）
    dispatch({ TimelineEarlier: { team_id: TEAM, messages: page, has_more: true } }, null);
    expect(state.teamTimelines[KEY]!.msgs.length).toBe(afterFirst);
  });

  it('不接收"不比已加载最老条目更早"的条目（防乱序/回退页）', () => {
    seedFullSnapshot(5, true, 200); // 已加载 seq 200..204
    // 一页更**新**的条目（异常响应）：必须被忽略，否则会插到头部造成倒序
    const newer: TimelineMessage[] = [
      { ...timelineMessage(0), seq: 210 },
      { ...timelineMessage(1), seq: 211 },
    ];
    dispatch({ TimelineEarlier: { team_id: TEAM, messages: newer, has_more: true } }, null);
    expect(state.teamTimelines[KEY]!.msgs.length).toBe(5);
  });

  it('翻到底（has_more=false）后入口可据此隐藏', () => {
    seedFullSnapshot(5, true, 200);
    dispatch(
      { TimelineEarlier: { team_id: TEAM, messages: [], has_more: false } },
      null,
    );
    expect(state.timelineHasMore[KEY]).toBe(false);
  });

  it('只对当前查看的 team 更新 trunk；其它 team 仅更新缓存', () => {
    seedFullSnapshot(5, true, 200); // trunkTeamId = KEY
    state.trunk = state.teamTimelines[KEY]!.msgs.slice();
    expect(state.trunkTeamId).toBe(KEY);

    // 当前 team：缓存与 trunk 都前插
    const page: TimelineMessage[] = [{ ...timelineMessage(0), seq: 190 }];
    dispatch({ TimelineEarlier: { team_id: TEAM, messages: page, has_more: true } }, null);
    expect(state.teamTimelines[KEY]!.msgs.length).toBe(6);
    expect(state.trunk.length).toBe(6);

    // 切到别的 team：缓存更新，trunk 不动
    state.trunkTeamId = teamKey(null, 'Other');
    const page2: TimelineMessage[] = [{ ...timelineMessage(0), seq: 180 }];
    dispatch({ TimelineEarlier: { team_id: TEAM, messages: page2, has_more: true } }, null);
    expect(state.teamTimelines[KEY]!.msgs.length).toBe(7);
    expect(state.trunk.length).toBe(6);
  });

  it('多上游：非当前区域的响应被忽略（防串台）', () => {
    state.activeRegion = 'core-a';
    seedFullSnapshot(5, true, 200);
    const before = state.teamTimelines[KEY]!.msgs.length;
    dispatch(
      { TimelineEarlier: { team_id: TEAM, messages: [{ ...timelineMessage(0), seq: 190 }], has_more: true } },
      'core-b',
    );
    expect(state.teamTimelines[KEY]!.msgs.length).toBe(before);
  });
});
