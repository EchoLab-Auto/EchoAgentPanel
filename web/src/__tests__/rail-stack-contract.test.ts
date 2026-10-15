//! 边栏卡片栈的堆叠/动画契约（2026-10 布局审查补充）。
//!
//! 锁定三条不变量（此前只存在于注释里，回归无声）：
//! 1. 列内放不下时**列自身滚动**（不能再用 overflow: hidden 裁掉底部卡片）；
//! 2. 移动端卡片抽屉传 `dragEnabled: false`：不渲染握把/「移到另一侧」，
//!    卡头恢复 `touch-action: pan-y`（否则卡头是列表滚动死区）；
//! 3. 动画只用 transform/opacity，且提供 `prefers-reduced-motion` 降级。

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mount } from '@vue/test-utils';
import RailStack from '../components/RailStack.vue';
import { __resetRailsForTest } from '../rail-drag';
import { resetRailLayout } from '../rail-layout';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'RailStack.vue'), 'utf-8');
const style = src.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
const chatView = readFileSync(join(here, '..', 'components', 'ChatView.vue'), 'utf-8');

const cards = [
  { id: 'shell', title: 'Shell' },
  { id: 'branches', title: '临时分支' },
];

describe('RailStack 堆叠与动画契约', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRailLayout();
    __resetRailsForTest();
  });

  it('列内溢出可滚动（不再裁掉底部卡片）+ 最小高度有单一来源', () => {
    const listRule = style.match(/\.rail-stack__list\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(listRule).toMatch(/overflow-y:\s*auto/);
    expect(style).toMatch(/--rail-card-min-h:\s*80px/);
    expect(style).toMatch(/min-height:\s*var\(--rail-card-min-h\)/);
  });

  it('动画只用 transform/opacity，且有 prefers-reduced-motion 降级', () => {
    expect(style).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    // 展开动画 = transform + opacity（不写 height/width 过渡）
    const bodyKeyframes = style.match(/@keyframes rail-body-in\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(bodyKeyframes).toMatch(/transform:/);
    expect(bodyKeyframes).toMatch(/opacity:/);
    // 列开合过渡同样带降级
    expect(chatView).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.chat-rail-enter-active/);
  });

  it('dragEnabled=false（移动端抽屉）：无握把/无换列按钮、分隔条不可拖、卡头可滚动', async () => {
    const wrapper = mount(RailStack, {
      props: { cards, side: 'right', dragEnabled: false },
    });
    expect(wrapper.find('.rail-stack__grip').exists()).toBe(false);
    expect(wrapper.find('.rail-stack__relocate').exists()).toBe(false);
    const head = wrapper.find('.rail-stack__head');
    expect(head.classes()).toContain('rail-stack__head--static');
    expect(style).toMatch(/\.rail-stack__head--static\s*\{[^}]*touch-action:\s*pan-y/);
    const divider = wrapper.find('.rail-stack__divider');
    expect(divider.classes()).not.toContain('rail-stack__divider--draggable');
    wrapper.unmount();
  });

  it('dragEnabled 缺省（桌面）：握把与换列按钮照常渲染', () => {
    const wrapper = mount(RailStack, { props: { cards, side: 'right' } });
    expect(wrapper.find('.rail-stack__grip').exists()).toBe(true);
    expect(wrapper.find('.rail-stack__relocate').exists()).toBe(true);
    expect(wrapper.find('.rail-stack__divider').classes()).toContain(
      'rail-stack__divider--draggable',
    );
    wrapper.unmount();
  });
});
