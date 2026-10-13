//! ChatView 竖屏移动端契约（2026-10）。
//!
//! 锁定移动端（< 768px，与库 useTouchDevice.isMobile 同源）的关键行为：
//! - 双侧边栏 chat-rail 不渲染（卡片改经顶栏「卡片」抽屉访问）；
//! - 消息区留白归零（无 rail 时不预留 324px）；
//! - 移动端样式段存在（输入区安全区 / 入口行横滚）——防止桌面默认值回归。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state } from '../../store';

// ── 库组件 stub（不渲染真实 ui-frame/chat；2026-10-13 起无 ChatTray） ──
const MessageItemStub = defineComponent({
  name: 'MessageItem',
  setup: () => () => h('div'),
});
const ChatComposerStub = defineComponent({
  name: 'ChatComposer',
  props: {
    // 声明以读取父组件传入的占位文本（测试断言用）
    placeholder: { type: String, default: '' },
  },
  setup: () => () => h('div', { class: 'stub-composer' }),
});
const DrawerStub = defineComponent({
  name: 'NeumorphismDrawer',
  props: ['modelValue'],
  setup(props, { slots }) {
    return () => (props.modelValue ? h('div', { class: 'stub-drawer' }, slots.default?.()) : null);
  },
});

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true,
  });
}

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

describe('ChatView 竖屏移动端', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    // 连接状态卡（rail）门控依赖 adapter 状态；清空即可（status 卡常驻）。
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.adapters = [];
  });

  afterEach(() => {
    setViewportWidth(originalWidth);
  });

  it('桌面（>=768px）：rail 列渲染（有常驻卡片）', async () => {
    setViewportWidth(1280);
    const wrapper = mountChatView();
    // useTouchDevice 在 mounted 中读取 innerWidth 并更新响应式值，
    // 需等一次 nextTick 让依赖 isMobile 的 computed 重算。
    await nextTick();
    expect(wrapper.find('.chat-rail').exists()).toBe(true);
  });

  it('移动端（<768px）：rail 列不渲染、抽屉按需渲染', async () => {
    setViewportWidth(400);
    const wrapper = mountChatView();
    await nextTick();
    expect(wrapper.find('.chat-rail').exists()).toBe(false);
    // 抽屉（stub）仅在打开时渲染；关闭状态不存在
    expect(wrapper.find('.stub-drawer').exists()).toBe(false);
    // 打开模块级开关后抽屉出现（顶栏按钮的实际行为路径）
    const { mobileCardsDrawerOpen } = await import('../../mobile-cards');
    mobileCardsDrawerOpen.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.stub-drawer').exists()).toBe(true);
    mobileCardsDrawerOpen.value = false;
  });

  it('移动端样式段：输入区安全区/键盘偏移 + 入口行横向滚动契约', () => {
    // scoped 样式在 jsdom 中不生效，读源码锁定契约（与 ChatView.test.ts 同法）。
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    // 移动段存在且断点与库一致（767.98px = innerWidth < 768 的边界写法）
    expect(styleBlock).toMatch(/@media \(max-width: 767\.98px\)/);
    // 入口行：横向滚动 + 双边界（右界不可缺——否则右侧按钮超出屏外不可达）。
    // 注意 .entry-row 在样式里有多个块（令牌段 / 定位段），合并断言。
    const entryRules = [...styleBlock.matchAll(/\.entry-row \{([\s\S]*?)\}/g)]
      .map((m) => m[1])
      .join('\n');
    expect(entryRules).toMatch(/overflow-x:\s*auto/);
    expect(entryRules).toMatch(/right:\s*8px/);
    expect(entryRules).toMatch(/v-bind\(keyboardInsetPx\)/);
    // 输入区：安全区 + 键盘偏移 + 16px 防 iOS 聚焦缩放
    // （.chat-composer-float 同样有桌面/移动多个块，合并断言）
    const composerRules = [...styleBlock.matchAll(/\.chat-composer-float \{([\s\S]*?)\}/g)]
      .map((m) => m[1])
      .join('\n');
    expect(composerRules).toMatch(/env\(safe-area-inset-bottom/);
    expect(composerRules).toMatch(/v-bind\(keyboardInsetPx\)/);
    expect(styleBlock).toMatch(/font-size:\s*16px/);
  });

  it('软键盘适配：visualViewport 监听在源码中挂载/清理', () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    expect(raw).toMatch(/visualViewport\.addEventListener\('resize'/);
    expect(raw).toMatch(/visualViewport\.removeEventListener\('resize'/);
  });

  it('占位文本：移动端用短占位（防窄框折行截断）；桌面保持空串（库 locale 长占位）', async () => {
    // 移动端 + 已连接 → '输入消息…'
    setViewportWidth(400);
    state.connected = true;
    const wrapper = mountChatView();
    await nextTick();
    const composer = wrapper.findComponent({ name: 'ChatComposer' });
    expect(composer.exists()).toBe(true);
    expect(composer.props('placeholder')).toBe('输入消息…');
    wrapper.unmount();

    // 移动端 + 未连接 → 短断连文案
    state.connected = false;
    const wrapper2 = mountChatView();
    await nextTick();
    expect(wrapper2.findComponent({ name: 'ChatComposer' }).props('placeholder')).toBe(
      '未连接到 Core…',
    );
    wrapper2.unmount();

    // 桌面 + 已连接 → 空串（ChatComposer 回退到库 locale 默认长占位）
    state.connected = true;
    setViewportWidth(1280);
    const wrapper3 = mountChatView();
    await nextTick();
    expect(wrapper3.findComponent({ name: 'ChatComposer' }).props('placeholder')).toBe('');
    wrapper3.unmount();
  });
});
