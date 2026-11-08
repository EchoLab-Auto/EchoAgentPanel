//! 会话标签条组件契约（2026-11）。
//!
//! 锁定：
//!   a) 有标签才渲染（无标签时不留空白占位）；
//!   b) 点标签 emit `select`（父组件负责 core/team/session 三步切换）；
//!   c) `×` 关当前标签 → emit `select` 指向右邻；关非当前 → 不 emit；
//!   d) `+` emit `create`（复用既有「会话」面板，不新增选择器）。

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true), sendPending: vi.fn() };
});

import ChatTabs from '../ChatTabs.vue';
import { activeChatTabId, chatTabs, resetChatTabs, syncActiveTab } from '../../chat-tabs';
import { state } from '../../store';

beforeEach(() => {
  resetChatTabs();
  state.sessions = [];
  state.teams = [];
});

describe('ChatTabs 会话标签条', () => {
  it('a) 无标签不渲染', () => {
    const wrapper = mount(ChatTabs);
    expect(wrapper.find('.chat-tabs').exists()).toBe(false);
  });

  it('b) 点标签 emit select 带回 (session, team, core)', async () => {
    syncActiveTab('core-b', 'alice', 's2');
    syncActiveTab('core-a', 'alice', 's1');
    const wrapper = mount(ChatTabs);
    const tabs = wrapper.findAll('.chat-tabs__tab');
    expect(tabs).toHaveLength(2);
    // 激活的是最后一个 sync 的目标
    expect(tabs[1]!.attributes('data-active')).toBe('true');
    await tabs[0]!.trigger('click');
    const payload = wrapper.emitted('select')?.[0]?.[0] as { sessionId: string; teamId: string | null; core: string | null };
    expect([payload.sessionId, payload.teamId, payload.core]).toEqual(['s2', 'alice', 'core-b']);
  });

  it('c) 关闭当前标签 emit select 指向邻居；关闭非当前不切换', async () => {
    syncActiveTab('core-a', 'alice', 's1');
    syncActiveTab('core-a', 'alice', 's2');
    syncActiveTab('core-a', 'alice', 's3');
    const wrapper = mount(ChatTabs);
    const closeOf = (i: number) => wrapper.findAll('.chat-tabs__close')[i]!;
    // 关非当前（s1）：只少一个标签，不 emit select
    await closeOf(0).trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.findAll('.chat-tabs__tab')).toHaveLength(2);
    // 关当前（s3，现在是最后一个）：落左邻 s2
    await closeOf(1).trigger('click');
    const next = wrapper.emitted('select')?.[0]?.[0] as { sessionId: string };
    expect(next.sessionId).toBe('s2');
    expect(activeChatTabId.value).toContain('s2');
  });

  it('d) `+` emit create（复用既有会话面板）', async () => {
    syncActiveTab('core-a', 'alice', 's1');
    const wrapper = mount(ChatTabs);
    await wrapper.find('.chat-tabs__create').trigger('click');
    expect(wrapper.emitted('create')).toHaveLength(1);
    // 新增按钮不改变标签组
    expect(chatTabs.value).toHaveLength(1);
  });
});
