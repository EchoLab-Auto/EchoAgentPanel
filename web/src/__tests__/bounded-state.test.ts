//! 内存治理契约（2026-10 下一批）：常驻集合必须**有界**。
//!
//! ## 背景
//!
//! 渲染成本已在前面几批治平（常数 200 行窗口、单次 delta ~1 ms）。剩下的
//! 问题是**随使用时长增长**的常驻数据——用户的体感是"开了几小时/逛了很多
//! 会话后越来越卡"，而刷新一次就好。逐项量化后确认了四个只增不减的集合：
//!
//! | 集合 | 改前 | 问题 |
//! | --- | --- | --- |
//! | `sessionHistory` | 最多 **64** 份快照（每份 ≤1000 条） | 按**插入序**淘汰，与"最近用过"无关；逛得多就几十 MB 常驻 |
//! | `sessions` | 只增不减 | QQ 群多时持续增长，`SessionSwitcher` 全量渲染 |
//! | `browseDirectories` | 只增不减 | 目录选择器每进一个目录留一条（含该目录全部文件项） |
//! | `trunk-cache` 落盘 | 每 10s 一次 JSON.parse + stringify + setItem | 2 team × 1024 条 = **24 ms/次**（4× CPU ≈ 96 ms）→ 每 10 秒卡一下 |
//!
//! 本文件锁定前三个的**边界**与淘汰语义；trunk-cache 的签名短路与瘦身在
//! `trunk-cache.test.ts` 里。

import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { SESSION_HISTORY_LIMIT, SESSIONS_LIMIT, BROWSE_CACHE_LIMIT } from '../state';
import { checklistKey } from '../keys';

function historyEvent(sessionId: string, count = 2) {
  return {
    SessionHistory: {
      team_id: 't',
      session_id: sessionId,
      messages: Array.from({ length: count }, (_, i) => ({
        kind: 'user' as const,
        content: `${sessionId}#${i}`,
        session_id: sessionId,
        time: 1000 + i,
        seq: i + 1,
      })),
      total: count,
      truncated: false,
      max_seq: count,
    },
  };
}

beforeEach(() => {
  state.trunk = [];
  state.sessionHistory = {};
  state.sessions = [];
  state.browseDirectories = {};
  state.activeRegion = null;
  state.activeTeamId = 't';
});

describe('sessionHistory 有界（常驻上限 + 最近使用语义）', () => {
  it(`超过 ${SESSION_HISTORY_LIMIT} 份后淘汰最旧的，且不淘汰本次写入的那份`, () => {
    const overflow = 6;
    for (let i = 0; i < SESSION_HISTORY_LIMIT + overflow; i++) {
      dispatch(historyEvent(`sess-${i}`));
      // 每次写入后总量都不超上限
      expect(Object.keys(state.sessionHistory).length).toBeLessThanOrEqual(SESSION_HISTORY_LIMIT);
      // 刚写入的会话一定还在（不能被自己刚触发的裁剪删掉）
      expect(state.sessionHistory[checklistKey(null, 't', `sess-${i}`)]).toBeTruthy();
    }
    // 最旧的若干份被淘汰
    expect(state.sessionHistory[checklistKey(null, 't', 'sess-0')]).toBeUndefined();
    // 最新的在
    const last = `sess-${SESSION_HISTORY_LIMIT + overflow - 1}`;
    expect(state.sessionHistory[checklistKey(null, 't', last)]).toBeTruthy();
  });

  it('重新写入已有会话 = 刷新其"最近使用"位置（不会被当成最旧淘汰）', () => {
    for (let i = 0; i < SESSION_HISTORY_LIMIT; i++) dispatch(historyEvent(`s-${i}`));
    // 重新拉一次最旧的那个
    dispatch(historyEvent('s-0'));
    // 再塞入两份新的：被淘汰的应是 s-1 / s-2 而不是刚用过的 s-0
    dispatch(historyEvent('s-new-1'));
    dispatch(historyEvent('s-new-2'));
    expect(state.sessionHistory[checklistKey(null, 't', 's-0')]).toBeTruthy();
    expect(state.sessionHistory[checklistKey(null, 't', 's-1')]).toBeUndefined();
  });
});

describe('sessions 有界', () => {
  it(`超过 ${SESSIONS_LIMIT} 条后按 last_active 保留最近的`, () => {
    const total = SESSIONS_LIMIT + 20;
    for (let i = 0; i < total; i++) {
      dispatch({
        SessionUpdated: {
          session: {
            id: `sess-${i}`,
            platform: 'qq',
            scope: 'group',
            user_id: 'u',
            nickname: 'n',
            group_name: `g${i}`,
            last_active: i, // 越大越新
            last_message: '',
          },
        } as never,
      });
    }
    expect(state.sessions.length).toBeLessThanOrEqual(SESSIONS_LIMIT);
    // 最旧的被淘汰、最新的保留
    expect(state.sessions.some((s) => s.id === 'sess-0')).toBe(false);
    expect(state.sessions.some((s) => s.id === `sess-${total - 1}`)).toBe(true);
  });
});

describe('browseDirectories 有界', () => {
  it(`超过 ${BROWSE_CACHE_LIMIT} 条后淘汰最旧的浏览结果`, () => {
    for (let i = 0; i < BROWSE_CACHE_LIMIT + 8; i++) {
      dispatch({
        BrowseDirectories: {
          path: `/p/${i}`,
          roots: [],
          entries: [{ name: `f${i}`, path: `/p/${i}/f`, kind: 'file', size: 0 }],
          error: null,
        },
      } as never);
      expect(Object.keys(state.browseDirectories).length).toBeLessThanOrEqual(BROWSE_CACHE_LIMIT);
    }
    expect(Object.keys(state.browseDirectories).length).toBe(BROWSE_CACHE_LIMIT);
  });
});
