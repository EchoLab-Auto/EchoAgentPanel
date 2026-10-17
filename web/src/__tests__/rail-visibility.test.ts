//! 侧栏列显隐判据契约（2026-10，用户反馈「左侧栏莫名隐藏」）。
//!
//! 锁定一条不变量：**列的存在性由「登记卡片」（railLayout）决定，与卡片
//! 门控（当前是否可见）解耦**。
//!
//! 背景：修复前列显隐用「当前可见卡片数」（`railHasVisibleCards`）。门控
//! 依赖异步到达的 Core 状态（workspace 激活态 / loopMode / teams / 插件
//! 能力），切 agent、工作区会话结束、断连重连的瞬时窗口都会让门控短暂
//! 失败——左列若只放了条件性卡片（文件浏览器 / 临时分支），整列会跟着
//! 消失再重现（正文行的 324px 留白也在 0 与 324 之间闪）。
//!
//! 现在：登记非空 = 列保活，卡片进出只在列内部增删（空态由 RailStack 的
//! `.rail-stack__empty-hint` 提示）；只有「用户把最后一张卡拖走」才让列消失。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../components/ChatView.vue';
import { state } from '../store';
import { placeCard, resetRailLayout } from '../rail-layout';
import { railHasVisibleCards, railRegistered } from '../rail-cards';

// ── 库组件 stub（与 ChatViewMobile.test.ts 同法：不渲染真实 ui-frame/chat） ──
const MessageItemStub = defineComponent({
  name: 'MessageItem',
  setup: () => () => h('div'),
});
const ChatComposerStub = defineComponent({
  name: 'ChatComposer',
  setup: () => () => h('div', { class: 'stub-composer' }),
});
const DrawerStub = defineComponent({
  name: 'NeumorphismDrawer',
  props: ['modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { class: 'stub-drawer' }, slots.default?.()) : null);
  },
});

function mountChatView() {
  return mount(ChatView, {
    props: { sessionId: 'local:tui::local_user' },
    global: {
      stubs: {
        MessageItem: MessageItemStub,
        ChatComposer: ChatComposerStub,
        NeumorphismDrawer: DrawerStub,
      },
    },
  });
}

/** 造一个「workspace 已激活」的状态：文件浏览器卡门控全部满足。 */
function activateWorkspace() {
  state.workspaceTeamId = 'alix';
  state.workspaceActive = 'ws1';
  state.workspaceSessions = [{ id: 'ws1', name: 'demo' } as never];
}

/** 门控全部失效：workspace 会话结束（文件浏览器卡隐藏）。 */
function deactivateWorkspace() {
  state.workspaceTeamId = 'alix';
  state.workspaceActive = null;
  state.workspaceSessions = [];
}

describe('侧栏列显隐：登记（结构）与门控（内容）解耦', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    localStorage.clear();
    resetRailLayout();
    Object.defineProperty(window, 'innerWidth', {
      value: 1280,
      configurable: true,
      writable: true,
    });
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.adapters = [];
    state.branchTabs = {};
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalWidth,
      configurable: true,
      writable: true,
    });
    resetRailLayout();
  });

  it('railRegistered 只看登记，railHasVisibleCards 才看门控', () => {
    // 默认布局：卡片全在右列，左列无登记
    expect(railRegistered('right')).toBe(true);
    expect(railRegistered('left')).toBe(false);

    // 把条件性卡片（文件浏览器）放到左列，但门控不满足
    placeCard('files', 'left', 0);
    deactivateWorkspace();
    expect(railRegistered('left')).toBe(true); // 登记在 → 列该保活
    expect(railHasVisibleCards('left', 'alix')).toBe(false); // 但当前没有可见卡片

    // 门控满足后卡片"出现"——登记不变（列从未消失过）
    activateWorkspace();
    expect(railRegistered('left')).toBe(true);
    expect(railHasVisibleCards('left', 'alix')).toBe(true);
  });

  it('门控失效时左列仍在（保留占位与 324px 留白），并显示空态提示', async () => {
    placeCard('files', 'left', 0);
    deactivateWorkspace();
    const wrapper = mountChatView();
    await nextTick();

    // 列存在 —— 这正是修复点：此前这里会因为"可见卡片 0 张"整列消失
    expect(wrapper.find('.chat-rail--left').exists()).toBe(true);
    // 空态可见（不让用户看到一片空白以为边栏坏了）
    expect(wrapper.find('.rail-stack__empty-hint').exists()).toBe(true);
    // 空态文案可见：列保活应显式告知
    expect(wrapper.text()).toContain('当前无可用卡片');
    wrapper.unmount();
  });

  it('门控恢复后同一列内部长出卡片（列本身从未卸载）', async () => {
    placeCard('files', 'left', 0);
    deactivateWorkspace();
    const wrapper = mountChatView();
    await nextTick();
    expect(wrapper.find('.rail-stack__empty-hint').exists()).toBe(true);

    activateWorkspace();
    await nextTick();
    // 卡片出现、空态消失，列容器始终在
    expect(wrapper.find('.chat-rail--left').exists()).toBe(true);
    expect(wrapper.find('.rail-stack__empty-hint').exists()).toBe(false);
    expect(wrapper.text()).toContain('文件浏览器');
    wrapper.unmount();
  });

  it('登记为空（用户把最后一张卡拖走）时左列照常消失', async () => {
    placeCard('files', 'left', 0);
    deactivateWorkspace();
    const wrapper = mountChatView();
    await nextTick();
    expect(wrapper.find('.chat-rail--left').exists()).toBe(true);

    // 用户把卡片拖回右列：登记变空 → 列该消失（显式意图，非闪烁）
    placeCard('files', 'right', 0);
    await nextTick();
    expect(wrapper.find('.chat-rail--left').exists()).toBe(false);
    wrapper.unmount();
  });
});
