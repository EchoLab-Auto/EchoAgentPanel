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
    // 2026-10 三次修订（用户："移动端输入区上下圆角不相等" → "那你可以调整一下
    // 输入区的高度"）：三个量必须闭环，且**不能互相循环**。
    //   ① 留白只看屏角：clamp(14px, 0.3R, 22px) —— 一旦它再去读输入行高度，
    //      就与 ③ 形成 CSS 变量循环（浏览器会把两边都判成无效）；
    //   ② 跨度 = R − 留白，上下两角共用（上角是下角的镜像）；
    //   ③ 输入行高度取 max(基准, 2×跨度 − 3×padding − 状态行高)：卡片静止高
    //      H = 3P + controlH + statusH 必须 ≥ 2×跨度，否则上下角放不下，
    //      只能靠"上角吃掉剩余高度"凑 —— 那正是上下角不等的老 bug。
    expect(composerRules, '留白只依赖屏角（不得引用输入行高度，否则变量循环）').toMatch(
      /--composer-inset:\s*clamp\(\s*14px\s*,\s*calc\(\s*0\.3\s*\*\s*var\(--panel-display-radius\)\s*\)\s*,\s*22px\s*\)/,
    );
    expect(composerRules, '跨度 = 屏角 − 留白，供上下两角共用').toMatch(
      /--composer-span:\s*calc\(\s*var\(--panel-display-radius\)\s*-\s*var\(--composer-inset\)\s*\)/,
    );
    // 基准项（字号派生）与保底项（让两角放得下）取 max —— 分两条断言，
    // 不硬啃嵌套括号的正则
    // 取**最后一处**：第一处是桌面基类的基准式，窄屏段才是 max(基准, 保底)
    const controlHRules = [...composerRules.matchAll(/--chat-control-h:([^;]+);/g)];
    const controlHRule = controlHRules[controlHRules.length - 1]?.[1] ?? '';
    expect(controlHRule, '输入行高度取 max(基准, 保底)').toMatch(/^\s*max\(/);
    expect(controlHRule, '基准项仍由字号派生').toMatch(/--chat-field-font/);
    expect(controlHRule, '保底项 = 2×跨度 − 3×padding − 状态行高').toMatch(
      /2\s*\*\s*var\(--composer-span\)\s*-\s*3\s*\*\s*var\(--composer-padding\)\s*-\s*var\(--chat-status-h\)/,
    );
    expect(composerRules, '留白不得再引用 --composer-rest-h（循环）').not.toMatch(
      /--composer-rest-h/,
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
    // 2026-10：外壳是 ui-frame NeumorphismCard，**轮廓也交给库**——
    //   移动端走 `:clip-path`（设备屏角偏移曲线），桌面走 `:squircle`（等半径超椭圆）。
    //   面板侧不再自己写 clip-path（卡片会读 border-radius 生成超椭圆）。
    expect(raw, '输入区外壳必须是 NeumorphismCard').toMatch(
      /<NeumorphismCard[\s\S]{0,200}class="chat-composer-float__card"[\s\S]{0,200}glass="float"/,
    );
    expect(raw, '移动端：轮廓以 clip-path prop 交给库卡片').toMatch(
      /:clip-path="composerClip === 'none' \? undefined : composerClip"/,
    );
    expect(raw, '桌面/直角屏：走库的 squircle prop').toMatch(
      /:squircle="composerClip === 'none' \? 2\.5 : false"/,
    );
    expect(styleBlock, '卡片样式不再自带 clip-path（归库）').not.toMatch(
      /\.chat-composer-float \.chat-composer-float__card \{[^}]*clip-path:/,
    );
    expect(styleBlock, '卡片不得再手写毛玻璃背景').not.toMatch(
      /\.chat-composer-float__glass \{/,
    );
    // halo（投影补层）仍需要同一条轮廓，走 CSS 变量（它不是卡片）
    expect(styleBlock, '投影补层复用同一轮廓变量').toMatch(
      /\.chat-composer-float__halo::before \{[^}]*clip-path: var\(--composer-clip, none\)/,
    );
    // 悬浮（2026-10 用户要求「输入区换成悬浮」）：外壳走库的 float 档 ——
    // 向外环境投影（0 4px 16px + 0 2px 4px）由 `nm-card--glass-float` 提供，
    // 面板侧不写 box-shadow。
    expect(raw, '卡片必须声明 glass="float"（库的悬浮档）').toMatch(
      /<NeumorphismCard[\s\S]{0,220}glass="float"/,
    );
    expect(raw, '输入器必须声明 focus-effect="glow"（库的聚焦内辉光）').toMatch(
      /<ChatComposer[\s\S]{0,300}focus-effect="glow"/,
    );
    const cardRules2 =
      styleBlock.match(
        /\.chat-composer-float \.chat-composer-float__card \{[\s\S]*?\n\}/,
      )?.[0] ?? '';
    expect(cardRules2, '面板侧不得手写卡片 box-shadow（悬浮投影归库）').not.toMatch(
      /box-shadow:/,
    );
    // 投影补层（移动端 clip 会裁掉卡片自身的外阴影，只能由未裁剪的兄弟层补）
    const haloRules2 =
      styleBlock.match(/\.chat-composer-float__halo \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(haloRules2, '补层必须用 blur 做柔化').toMatch(/filter:\s*blur\(/);
    expect(haloRules2, '补层默认隐藏（桌面不叠影）').toMatch(/display:\s*none/);
    expect(haloRules2, '补层不得挂 backdrop-filter（会破坏卡片毛玻璃）').not.toMatch(
      /backdrop-filter/,
    );
    expect(styleBlock, 'clip 生效时才显示补层').toMatch(
      /\.chat-composer-float--clipped \.chat-composer-float__halo \{[^}]*display:\s*block/,
    );
    // 内层一律消费派生变量（含 border 补偿）
    expect(styleBlock, '同心派生量必须减掉 padding 与 border').toMatch(
      /--composer-inner-radius: max\(\s*0px,\s*calc\(var\(--composer-corner-r\) - var\(--composer-padding\) - var\(--composer-border\)\)\s*\)/,
    );
    // 贴角半径：JS 写成「屏角 − 留白」；桌面兜底等于外框半径
    expect(styleBlock, '贴角半径默认回落外框半径').toMatch(
      /--composer-corner-r: var\(--composer-radius\)/,
    );
    // 源码里必须真的调用了轮廓计算（否则 clip 变量永远 none）
    expect(raw, '移动端必须调用 composerOutline').toMatch(/composerOutline\(/);
    // 四角等大（2026-10 用户报上下角不等）：跨度以「静止态半高」封顶，
    // 内层圆角读实际跨度而不是 R − inset
    expect(raw, '上下角尺寸按静止半高封顶').toMatch(/cornerMax:\s*restHalfHeight\(\)/);
    expect(raw, '内层圆角读实际生效的跨度').toMatch(/composerCornerSpan\(/);
    expect(raw, '静止半高由「卡片高 − 输入框长出来的高度」反推').toMatch(
      /const restH = cardH - Math\.max\(0, grew\)/,
    );
    // 单层卡片：不再写内轮廓变量（否则 JS 白算一份）
    expect(raw).not.toMatch(/--composer-clip-inner/);
    expect(raw, '读屏角/留白变量作为输入').toMatch(/'--panel-display-radius'/);
    expect(raw).toMatch(/'--composer-inset'/);
    expect(mobileStyle, '内框/按钮 = 外框 − padding − border（同心）').toMatch(
      /\.nm-textarea\.nm-textarea\) \{\s*border-radius: var\(--composer-inner-radius\)/,
    );
    expect(mobileStyle).toMatch(
      /\.chat-view__send\) \{\s*border-radius: var\(--composer-inner-radius\) !important/,
    );
    // 桌面口径：卡片圆角 24px / padding 12px / border 0（卡片无独立描边层，
    // 1px 边由 NeumorphismCard 的内高光承担）→ 内层 12px
    expect(styleBlock).toMatch(/--composer-radius: 24px/);
    expect(styleBlock).toMatch(/--composer-padding: 12px/);
    expect(styleBlock).toMatch(/--composer-border: 0px/);
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
