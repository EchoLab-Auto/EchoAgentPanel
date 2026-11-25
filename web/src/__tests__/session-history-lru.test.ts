//! 会话历史快照的 **LRU 缓存**契约（`state.sessionHistory`）。
//!
//! ## 为什么这条优化已经存在，却仍然要锁住
//!
//! 远程访问下"切会话要等一个 RTT"是最刺眼的卡顿：切走再切回来，若历史快照
//! 已被淘汰，就必须重新拉 300 条并等网络。而 `state.ts` 里早已有限额 12 份、
//! 按**最近使用**淘汰的实现（`SESSION_HISTORY_LIMIT` / `pruneSessionHistory`）。
//!
//! 问题在于这套语义是隐式的：
//! - 上限是 12（不是"永不淘汰"），超出的会话仍然要等 RTT；
//! - 淘汰顺序按"最近**写入**"，而写入由「切到该会话」触发——所以"读了但不写"
//!   的路径（未来的预取、多窗口只读）一旦引入，就会打乱这个语义。
//!
//! 因此这里把两条不变量钉死：**容量上限**、**写入即最近使用**。以后有人动
//! 淘汰策略，会先撞上这些断言。

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../store';
import { dispatch } from '../store';
import { SESSION_HISTORY_LIMIT } from '../state';
import type { BackendEvent } from '../protocol';

/** 构造一条只有元数据的 `SessionHistory`（内容对本测试无关）。 */
function historyEvent(sessionId: string): BackendEvent {
  return {
    SessionHistory: {
      session_id: sessionId,
      messages: [],
      total: 0,
      max_seq: 0,
    },
  } as unknown as BackendEvent;
}

const keys = () => Object.keys(state.sessionHistory);

beforeEach(() => {
  state.sessionHistory = {};
  state.trunk = [];
  state.activeRegion = null;
  state.activeTeamId = null;
  state.sessions = [];
  state.teams = [];
});

/** 会话来 id：**零填充**，否则 `sess-1` 是 `sess-10` 的子串，断言会互相误伤。 */
const sid = (n: number) => `sess-${String(n).padStart(2, '0')}`;

describe('容量与淘汰顺序', () => {
  it('上限就是 SESSION_HISTORY_LIMIT 份', () => {
    for (let i = 0; i < SESSION_HISTORY_LIMIT + 5; i++) {
      dispatch(historyEvent(sid(i)));
    }
    expect(keys()).toHaveLength(SESSION_HISTORY_LIMIT);
  });

  it('淘汰的是最久没写入的那份（不是最后写入的）', () => {
    for (let i = 0; i < SESSION_HISTORY_LIMIT; i++) {
      dispatch(historyEvent(sid(i)));
    }
    const firstKey = keys()[0]!;
    expect(firstKey).toContain(sid(0));

    // 再写一份新的 → 最旧的 sess-00 被淘汰。
    dispatch(historyEvent(sid(SESSION_HISTORY_LIMIT)));
    expect(keys()).not.toContain(firstKey);
    expect(keys()).toHaveLength(SESSION_HISTORY_LIMIT);
  });

  it('重新写入已有会话 → 它变成"最近使用"，不再被优先淘汰', () => {
    for (let i = 0; i < SESSION_HISTORY_LIMIT; i++) {
      dispatch(historyEvent(sid(i)));
    }
    const oldest = keys()[0]!;
    expect(oldest).toContain(sid(0));
    // 重新访问最旧的那个（模拟"切回去看一眼"）：写入即刷新它的位置。
    dispatch(historyEvent(sid(0)));
    const ordered = keys();
    expect(ordered[ordered.length - 1]).toBe(oldest);

    // 再挤进一个新的：被淘汰的应是现在的第一份（sess-01），不是 sess-00。
    dispatch(historyEvent('sess-new'));
    expect(keys()).toContain(oldest);
    expect(keys().some((k) => k.endsWith(sid(1)))).toBe(false);
  });

  it('同一个会话反复写入不会占多份', () => {
    for (let i = 0; i < 5; i++) dispatch(historyEvent('same-session'));
    expect(keys()).toHaveLength(1);
  });
});
