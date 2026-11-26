//! 「设置 · 面板 · 外观」的契约（2026-11）。
//!
//! ## 为什么这几条值得钉
//!
//! 这一节把**两处已有的状态**接进设置页：主题（`ThemeProvider` 的
//! `echo-panel-theme`）与侧边栏显隐（`rail-collapse` 的模块级单例）。接线错误
//! 不会报错——开关点下去一动不动，或者改了保存不下来。而这两个状态各自还有
//! 别的入口（顶栏主题开关、聊天页贴边把手），所以"两处是否同一份"也要钉住：
//! 两个真相就会互相打架（在设置页改了、顶栏图标不变）。

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import PanelAppearanceSettings from '../PanelAppearanceSettings.vue';
import { railCollapsed, resetRailCollapseForTests } from '../../rail-collapse';
import { BG_IMAGE_KEY, BG_META_KEY } from '../../panel-background';

/**
 * 主题替身。
 *
 * 形状必须与 ui-frame 的 `ThemeContext` 一致：`NeumorphismThemeToggle` 自己在
 * setup 里调 `useTheme()` 并读 `theme` / `setTheme`，只给 `theme` 会在挂载期
 * 抛 `setTheme is not a function`（不是本组件的错，但会连累整页）。
 */
const themeRef = ref<'auto' | 'light' | 'dark'>('auto');
vi.mock('@echolab-auto/ui-frame/composables/useTheme', () => ({
  useTheme: () => ({
    theme: themeRef,
    currentTheme: ref('light'),
    isDark: ref(false),
    setTheme: (next: 'auto' | 'light' | 'dark') => {
      themeRef.value = next;
    },
    toggleTheme: () => {
      themeRef.value = themeRef.value === 'dark' ? 'light' : 'dark';
    },
    dispose: () => {},
  }),
}));

describe('面板 · 外观', () => {
  afterEach(() => {
    resetRailCollapseForTests();
    themeRef.value = 'auto';
    localStorage.clear();
    document.documentElement.removeAttribute('data-panel-bg');
  });

  it('四块都在：主题 / 左侧栏 / 右侧栏 / 背景图片', () => {
    const wrapper = mount(PanelAppearanceSettings);
    const labels = wrapper.findAll('.panel-appearance__label').map((el) => el.text());
    expect(labels).toEqual(['主题', '左侧栏', '右侧栏', '背景图片']);
    wrapper.unmount();
  });

  it('背景块：没图时只有「选择图片…」，有图时给「更换 / 移除」与三个参数', async () => {
    localStorage.clear();
    const wrapper = mount(PanelAppearanceSettings);
    const block = wrapper.find('.panel-appearance__block');
    expect(block.exists(), '背景块应存在').toBe(true);

    // 没图：只有一个选图按钮，参数区不渲染（空参数没有意义）
    // 只取块头那两个动作钮：参数区里还有分段控件自己的按钮
    // （铺满 / 完整），混进来会让这条断言变成"分段控件的实现细节"。
    const idle = block.findAll('.panel-appearance__block-actions button').map((b) => b.text());
    expect(idle).toEqual(['选择图片…']);
    expect(block.find('.panel-appearance__control').exists()).toBe(false);

    // 造一个"已存图"的状态再挂一次（legacy data URL + 原始尺寸 meta）
    localStorage.setItem(
      BG_IMAGE_KEY,
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    );
    localStorage.setItem(BG_META_KEY, JSON.stringify({ width: 3200, height: 2000 }));
    const withImage = mount(PanelAppearanceSettings);
    const buttons = withImage
      .findAll('.panel-appearance__block-actions button')
      .map((b) => b.text());
    expect(buttons).toEqual(['更换图片…', '移除']);
    const labels = withImage
      .findAll('.panel-appearance__control-label')
      .map((el) => el.text());
    expect(labels, '适配 / 变暗 / 模糊').toEqual(['适配', '变暗', '模糊']);

    withImage.unmount();
    wrapper.unmount();
    localStorage.clear();
  });

  it('侧边栏开关读写的是 rail-collapse 那一份状态', async () => {
    const wrapper = mount(PanelAppearanceSettings);
    // 初始：两列都展开（开关为「显示」）
    expect(railCollapsed.left).toBe(false);
    expect(railCollapsed.right).toBe(false);

    const switches = wrapper.findAllComponents({ name: 'NeumorphismSwitch' });
    expect(switches.length, '左列 + 右列各一个开关').toBe(2);

    // 关掉左侧栏 → 单例记为收起（聊天页读同一份，贴边把手据此出现）
    switches[0]!.vm.$emit('update:modelValue', false);
    await wrapper.vm.$nextTick();
    expect(railCollapsed.left).toBe(true);
    expect(railCollapsed.right, '另一列不受影响').toBe(false);

    // 关掉右侧栏
    switches[1]!.vm.$emit('update:modelValue', false);
    await wrapper.vm.$nextTick();
    expect(railCollapsed.right).toBe(true);

    // 再打开
    switches[0]!.vm.$emit('update:modelValue', true);
    await wrapper.vm.$nextTick();
    expect(railCollapsed.left).toBe(false);
    wrapper.unmount();
  });

  it('已收起的列在挂载时显示为关闭（开关反映现状而不是常量）', () => {
    railCollapsed.left = true;
    const wrapper = mount(PanelAppearanceSettings);
    const switches = wrapper.findAllComponents({ name: 'NeumorphismSwitch' });
    expect(switches[0]!.props('modelValue')).toBe(false);
    expect(switches[1]!.props('modelValue')).toBe(true);
    wrapper.unmount();
  });

  it('主题行渲染三态开关，且绑定的是注入的那一份 theme', () => {
    const wrapper = mount(PanelAppearanceSettings);
    const toggle = wrapper.findComponent({ name: 'NeumorphismThemeToggle' });
    expect(toggle.exists(), '主题行应渲染三态开关').toBe(true);
    // 三态（浅色 / 自动 / 深色）：不是布尔开关，档位由 value 决定
    expect(toggle.props('modelValue')).toBe('auto');
    wrapper.unmount();
  });
});
