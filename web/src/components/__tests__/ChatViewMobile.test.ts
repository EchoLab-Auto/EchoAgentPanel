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
    // 连接状态卡（rail）门控依赖 instance 状态；清空即可（status 卡常驻）。
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.instances = [];
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
    // 右界 8px 且让开横屏刘海（max(8px, env(safe-area-inset-right, 0px))）
    expect(entryRules).toMatch(/right:\s*max\(8px,\s*env\(safe-area-inset-right/);
    expect(entryRules).toMatch(/v-bind\(keyboardInsetPx\)/);
    // 输入区贴底后不再叠加 safe-area（safe-area 已不参与纵向布局）
    expect(entryRules, '入口行纵向只跟 entryBottom + 键盘').toMatch(
      /bottom: calc\(v-bind\(entryBottom\) \+ v-bind\(keyboardInsetPx\)\)/,
    );
    // 输入区：安全区 + 键盘偏移 + 16px 防 iOS 聚焦缩放
    // （.chat-composer-float 同样有桌面/移动多个块，合并断言）
    const composerRules = [...styleBlock.matchAll(/\.chat-composer-float \{([\s\S]*?)\}/g)]
      .map((m) => m[1])
      .join('\n');
    // 等间隙：左右与底部共用同一个 --composer-inset（这是"角部间隙恒定"的前提）
    // 2026-10：留白随屏幕圆角走（clamp(14px, R−58, 20px)）——iPhone 17 的
    // R=74.5 下 14px 会让贴角区(60.5px)顶穿 68px 的条高，composerOutline 退化
    // 成胶囊。断言"下限 14 + 随 R 增长 + 有上限"三条，而不是钉死一个常数，
    // 否则每次重测屏角都要改测试。
    expect(composerRules, '左右/底部留白必须同源').toMatch(
      /--composer-inset:\s*clamp\(\s*14px\s*,\s*calc\(\s*var\(--panel-display-radius\)\s*-\s*58px\s*\)\s*,\s*20px\s*\)/,
    );
    expect(composerRules).toMatch(/left: max\(var\(--composer-inset\)/);
    expect(composerRules).toMatch(/right: max\(var\(--composer-inset\)/);
    expect(composerRules).toMatch(
      /bottom: calc\(var\(--composer-inset\) \+ v-bind\(keyboardInsetPx\)\)/,
    );
    expect(styleBlock).toMatch(/font-size:\s*16px/);
    // 圆角同心（移动口径，2026-10 二次修订）：同心关系只有一条——
    //   内层圆角 = 外框圆角 − padding − border
    // 由根变量 --composer-inner-radius 派生，内外各自不再写死数值。
    // （外框半径本身是「设备圆角 − 留白」再按半高封顶，那属于视觉上限，
    //   不是同心关系；详见 ChatView.vue 内注释里的两处几何硬约束。）
    const mobileStyle = styleBlock.slice(styleBlock.indexOf('@media (max-width: 767.98px)'));
    // 外框形状：移动端不再用 border-radius（圆弧贴不住超椭圆屏角，实测波动
    // 2.3px），改由 JS 算 clip-path；四层（发光/描边/玻璃）共用同一条轮廓。
    expect(mobileStyle, '移动端轮廓改由 clip-path 提供').not.toMatch(
      /--composer-radius: clamp\(/,
    );
    expect(styleBlock, '外框消费 clip 变量').toMatch(
      /\.chat-composer-float__surface \{[^}]*clip-path: var\(--composer-clip, none\)/,
    );
    expect(styleBlock, '玻璃层消费内轮廓（内缩 1px 空出描边）').toMatch(
      /\.chat-composer-float__glass \{[^}]*clip-path: var\(--composer-clip-inner, none\)/,
    );
    // 发光必须画在未被裁剪的父层上（clip-path 会裁掉 box-shadow），
    // 且该层不能挂 backdrop-filter（filter 祖先会让毛玻璃失效）
    expect(styleBlock, '发光层用 blur 而非 box-shadow').toMatch(
      /\.chat-composer-float__halo \{[^}]*filter: blur\(/,
    );
    const haloRules = styleBlock.match(/\.chat-composer-float__halo \{[\s\S]*?\}/)?.[0] ?? '';
    expect(haloRules, '发光层不得带 backdrop-filter').not.toMatch(/backdrop-filter/);
    // 内层一律消费派生变量（含 border 补偿）
    expect(styleBlock, '同心派生量必须减掉 padding 与 border').toMatch(
      /--composer-inner-radius: max\(\s*0px,\s*calc\(var\(--composer-corner-r\) - var\(--composer-padding\) - var\(--composer-border\)\)\s*\)/,
    );
    // 贴角半径：JS 写成「屏角 − 留白」；桌面兜底等于外框半径
    expect(styleBlock, '贴角半径默认回落外框半径').toMatch(
      /--composer-corner-r: var\(--composer-radius\)/,
    );
    // 源码里必须真的调用了轮廓计算（否则 clip 变量永远 none）
    expect(raw, '移动端必须调用 composerOutline').toMatch(/composerOutline\(\{/);
    expect(raw).toMatch(/--composer-clip-inner/);
    expect(raw, '读屏角/留白变量作为输入').toMatch(/'--panel-display-radius'/);
    expect(raw).toMatch(/'--composer-inset'/);
    expect(mobileStyle, '内框/按钮 = 外框 − padding − border（同心）').toMatch(
      /\.nm-textarea\.nm-textarea\) \{\s*border-radius: var\(--composer-inner-radius\)/,
    );
    expect(mobileStyle).toMatch(
      /\.chat-view__send\) \{\s*border-radius: var\(--composer-inner-radius\) !important/,
    );
    // 桌面口径：外框 24px / padding 12px / border 1px → 内层 11px
    expect(styleBlock).toMatch(/--composer-radius: 24px/);
    expect(styleBlock).toMatch(/--composer-padding: 12px/);
    expect(styleBlock).toMatch(/--composer-border: 1px/);
    // 输入行控件高度跟随字号：字号一变，取消/附件/发送同步重算（不写死 42px）
    expect(mobileStyle).toMatch(/--chat-field-font: 16px/);
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
