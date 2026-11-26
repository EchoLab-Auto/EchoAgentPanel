//! 「设置 · 面板」二级菜单的契约（2026-11）：概览 / 外观 / 安全。
//!
//! ## 为什么值得钉
//!
//! 这一页原本是三块纵向堆叠（部署方式 + UI 扩展 + 安全）。分节之后有两条
//! 契约必须成立，而它们错了都**不会报错**：
//!
//! 1. **分节映射**：三节各渲染哪些组件。串了就是"点安全看到主题开关"，
//!    或者更隐蔽的——安全那节漏挂令牌面板，而 UI 上只表现为"少了一块"。
//! 2. **只有面板分类有这条带子**：`v-if` 写成 `v-show` 或漏了分类判据时，
//!    切到技能/工具页也会看到三个 chip，点了还会把 `panelSection` 改掉。
//!
//! 组件本身按需加载（`lazy()`），这里用 `flushPromises` 等它到位。

import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import SettingsView from '../SettingsView.vue';
import { state } from '../../store';

vi.mock('../../confirm', () => ({ confirmDialog: vi.fn(() => Promise.resolve(true)) }));

/** 进「面板」分类（一级菜单）。 */
async function openPanel(wrapper: ReturnType<typeof mount>) {
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('面板'));
  expect(nav, '一级菜单应有「面板」').toBeTruthy();
  await nav!.trigger('click');
  await flushPromises();
  await flushPromises();
  return nav!;
}

/** 二级菜单上的三个 chip（仅面板分类下存在）。 */
function subnavChips(wrapper: ReturnType<typeof mount>) {
  const bar = wrapper.find('.caps-subnav');
  if (!bar.exists()) return null;
  return bar.findAll('.caps-chip');
}

describe('设置 · 面板的二级菜单', () => {
  it('面板分类下出现「概览 / 外观 / 安全」三个 chip，默认选中概览', async () => {
    state.teams = [];
    state.skills = [];
    state.tools = [];
    state.modules = [];
    const wrapper = mount(SettingsView);
    await openPanel(wrapper);

    const chips = subnavChips(wrapper);
    expect(chips).not.toBeNull();
    expect(chips!.map((c) => c.text())).toEqual(['概览', '外观', '安全']);
    // 默认节：概览（部署方式 + UI 扩展）
    expect(chips![0]!.classes()).toContain('caps-chip--active');
    expect(wrapper.find('.panel-ui-ext').exists(), '概览节在').toBe(true);
    wrapper.unmount();
  });

  it('切到「外观」只渲染外观那一块（安全/扩展状态都不在）', async () => {
    state.teams = [];
    const wrapper = mount(SettingsView);
    await openPanel(wrapper);

    const appearance = subnavChips(wrapper)![1]!;
    await appearance.trigger('click');
    // 外观节是 `lazy()` 加载的（defineAsyncComponent）：`flushPromises` 只跑
    // 微任务，动态 import 要等真实的一轮事件循环，所以用 waitFor 等它挂上。
    await vi.waitFor(() => {
      expect(wrapper.find('.panel-appearance').exists(), '外观节在').toBe(true);
    });
    expect(wrapper.find('.panel-ui-ext').exists(), '概览节应卸载').toBe(false);
    expect(wrapper.find('.sec-page').exists(), '安全节应卸载').toBe(false);
    wrapper.unmount();
  });

  it('切到「安全」渲染令牌面板', async () => {
    const wrapper = mount(SettingsView);
    await openPanel(wrapper);

    const security = subnavChips(wrapper)![2]!;
    await security.trigger('click');
    // PanelSecuritySettings 的根类名是 `.sec-page`（与「面板」这节里其它块区分）。
    // 同样是 lazy 组件，等真实加载。
    await vi.waitFor(() => {
      expect(wrapper.find('.sec-page').exists(), '安全节在').toBe(true);
    });
    expect(wrapper.find('.panel-appearance').exists(), '外观节应卸载').toBe(false);
    wrapper.unmount();
  });

  it('二级菜单只属于面板分类（切到技能就消失）', async () => {
    state.skills = [];
    const wrapper = mount(SettingsView);
    await openPanel(wrapper);
    expect(subnavChips(wrapper)).not.toBeNull();

    const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('技能'));
    await nav!.trigger('click');
    await flushPromises();

    expect(subnavChips(wrapper), '其它分类不该有这条带子').toBeNull();
    wrapper.unmount();
  });
});
