//! 会话标签组（2026-11）：身份是 `(core, team, session)` 三元组。
//!
//! 本测试锁定四件事：
//!   a) 同名会话跨 core/team 是**不同**标签（2026-10 串台事故的形状）；
//!   b) 任何到达某会话的路径都会登记标签（`syncActiveTab` 的 immediate 语义）；
//!   c) 关闭当前标签 → 落到右邻/左邻；关闭非当前标签不动当前；
//!   d) 超出上限时挤掉最久未激活的标签，当前标签永不被动。

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true), sendPending: vi.fn() };
});

import {
  MAX_CHAT_TABS,
  activeChatTabId,
  chatTabHint,
  chatTabId,
  chatTabLabel,
  chatTabs,
  closeChatTab,
  findChatTab,
  resetChatTabs,
  syncActiveTab,
} from '../chat-tabs';
import { state } from '../store';

const LOCAL = 'local:tui::local_user';

beforeEach(() => {
  resetChatTabs();
  state.sessions = [];
  state.teams = [];
});

describe('会话标签组', () => {
  it('a) 同名会话跨 core/team 是不同标签', () => {
    syncActiveTab('core-a', 'alice', LOCAL);
    syncActiveTab('core-b', 'alice', LOCAL);
    syncActiveTab('core-a', 'bob', LOCAL);
    expect(chatTabs.value).toHaveLength(3);
    expect(new Set(chatTabs.value.map((t) => t.id)).size).toBe(3);
    // 身份键包含三段：只按 session id 记会让三个标签塌成一个。
    expect(chatTabId('core-a', 'alice', LOCAL)).not.toBe(chatTabId('core-b', 'alice', LOCAL));
  });

  it('b) 引导期归属未知的标签被校正（不留重复），重复同步不新增', () => {
    // 真实时序：ChatView 先挂载（core/team 都还没到）→ 之后 TeamsList/会话到达。
    syncActiveTab(null, null, LOCAL);
    expect(chatTabs.value).toHaveLength(1);
    syncActiveTab('core-a', 'alice', LOCAL);
    expect(chatTabs.value).toHaveLength(1);
    expect(chatTabs.value[0]!.teamId).toBe('alice');
    syncActiveTab(null, 'alice', LOCAL);
    expect(chatTabs.value).toHaveLength(1);
    // core 由 TeamsList 校正后到达：同一个会话升级归属，而不是变成两个标签
    // （两个看起来一模一样的标签在用户视角就是"重复了"）。
    syncActiveTab('core-a', 'alice', LOCAL);
    expect(chatTabs.value).toHaveLength(1);
    expect(chatTabs.value[0]!.core).toBe('core-a');
    // 幂等
    syncActiveTab('core-a', 'alice', LOCAL);
    expect(chatTabs.value).toHaveLength(1);
    // 两个**已知但不同**的 core 仍是两个标签（同名会话跨节点）
    syncActiveTab('core-b', 'alice', LOCAL);
    expect(chatTabs.value).toHaveLength(2);
  });

  it('b2) global 会话不占标签（聚合视图不是可返回的去处）', () => {
    syncActiveTab('core-a', 'alice', LOCAL);
    syncActiveTab('core-a', 'alice', 'global');
    expect(activeChatTabId.value).toBeNull();
    expect(chatTabs.value).toHaveLength(1);
  });

  it('c) 关闭当前标签 → 右邻，其次左邻；关闭非当前不动当前', () => {
    syncActiveTab('core-a', 'alice', 's1');
    syncActiveTab('core-a', 'alice', 's2');
    syncActiveTab('core-a', 'alice', 's3');
    const [t1, t2, t3] = chatTabs.value;
    // 当前 = s3 时关掉 s1（非当前）→ 不切换
    expect(closeChatTab(t1!.id)).toBeNull();
    expect(activeChatTabId.value).toBe(t3!.id);
    // 关掉当前 s3 → 没有右邻，落左邻 s2
    const next = closeChatTab(t3!.id);
    expect(next?.sessionId).toBe('s2');
    expect(activeChatTabId.value).toBe(t2!.id);
    // 关掉最后一个 → 返回 null（调用方保持当前会话，不把用户踢走）
    expect(closeChatTab(t2!.id)).toBeNull();
    expect(chatTabs.value).toHaveLength(0);
  });

  it('c2) 关闭当前标签时有右邻 → 优先右邻', () => {
    syncActiveTab('core-a', 'alice', 's1');
    syncActiveTab('core-a', 'alice', 's2');
    syncActiveTab('core-a', 'alice', 's3');
    const [, t2] = chatTabs.value;
    // 把当前置回 s2（sync 只追加/激活，不重排）
    syncActiveTab('core-a', 'alice', 's2');
    const next = closeChatTab(t2!.id);
    expect(next?.sessionId).toBe('s3');
  });

  it('d) 超上限挤掉最久未激活的标签，当前标签保留', () => {
    for (let i = 0; i < MAX_CHAT_TABS; i += 1) {
      syncActiveTab('core-a', 'alice', `s${i}`);
    }
    expect(chatTabs.value).toHaveLength(MAX_CHAT_TABS);
    syncActiveTab('core-a', 'alice', 'fresh');
    expect(chatTabs.value).toHaveLength(MAX_CHAT_TABS);
    expect(findChatTab(chatTabId('core-a', 'alice', 'fresh'))).toBeTruthy();
    expect(findChatTab(chatTabId('core-a', 'alice', 's0'))).toBeNull();
  });

  it('e) 标签文案：优先昵称/群名，其次短 id；副标题带人格与 core', () => {
    syncActiveTab('core-a', 'alice', LOCAL);
    state.sessions = [
      { id: LOCAL, nickname: '本地主会话', team_id: 'alice', core: 'core-a' },
      { id: 'qq:group:123', group_name: '测试群', team_id: 'alice', core: 'core-a' },
    ] as never;
    state.teams = [
      { id: 'alice', name: 'Alice', core: 'core-a' },
    ] as never;
    const local = chatTabs.value[0]!;
    expect(chatTabLabel(local)).toBe('本地主会话');
    expect(chatTabHint(local)).toBe('Alice · core-a');
    // 会话不在列表里（Core 没推 / 已删）→ 退回短形，不显示整串
    syncActiveTab('core-a', 'alice', 'local:workspace:echo-agent/v:local_user');
    expect(chatTabLabel(chatTabs.value[1]!)).toBe('echo-agent/v');
    // 会话列表清空（Core 断线 / 会话被删）后，TUI 通道没有 channel 段：
    // 整串是噪声，退回一句人话而不是 `local:tui::local_user`。
    state.sessions = [];
    expect(chatTabLabel(chatTabs.value[0]!)).toBe('本地会话');
  });
});
