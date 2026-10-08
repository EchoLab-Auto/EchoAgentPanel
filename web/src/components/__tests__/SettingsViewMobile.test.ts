//! SettingsView 竖屏移动端契约（2026-10）：Master-Detail 二级导航。
//!
//! 锁定：
//! - 移动端选中条目 → 工作台根节点挂 `caps-workspace--mobile-detail` 类
//!   （详情态：列表隐藏、详情全宽，CSS 见组件移动段）且出现「← 返回」按钮；
//! - 点击返回 → 清空选中、回到列表态（`caps-workspace--mobile-list`）；
//! - 桌面（>=768px）类不挂（零回归）。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

vi.mock('../../confirm', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

import SettingsView from '../SettingsView.vue';
import { state } from '../../store';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true,
  });
}

function seed() {
  state.skills = [
    {
      name: 'qq-transport',
      description: 'QQ 消息收发闭环',
      keywords: ['qq'],
      always: true,
      enabled: true,
      category: '',
      package: 'echo-agent.adapter.qq',
      content: '# QQ 传输',
      system: false,
    },
  ] as never;
}

async function openSkills(width: number) {
  setViewportWidth(width);
  const wrapper = mount(SettingsView);
  await nextTick();
  // 切到技能分类（默认分类是 api）
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('技能'));
  await nav!.trigger('click');
  await nextTick();
  return wrapper;
}

describe('SettingsView 移动端 Master-Detail', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    seed();
  });

  afterEach(() => {
    setViewportWidth(originalWidth);
  });

  it('移动端：列表态默认挂 mobile-list 类；选中条目后切详情态并出现返回按钮', async () => {
    const wrapper = await openSkills(400);
    const workspace = wrapper.find('.caps-workspace');
    expect(workspace.classes()).toContain('caps-workspace--mobile-list');
    // 列表态：无返回按钮
    expect(wrapper.find('.caps-mobile-back').exists()).toBe(false);

    // 点选技能条目 → 详情态
    const row = wrapper.findAll('.caps-skill-item')[0];
    await row.trigger('click');
    await nextTick();
    expect(workspace.classes()).toContain('caps-workspace--mobile-detail');
    expect(wrapper.find('.caps-mobile-back').exists()).toBe(true);
  });

  it('移动端：点击「← 返回」清空选中回列表态', async () => {
    const wrapper = await openSkills(400);
    const row = wrapper.findAll('.caps-skill-item')[0];
    await row.trigger('click');
    await nextTick();
    await wrapper.find('.caps-mobile-back').trigger('click');
    await nextTick();
    const workspace = wrapper.find('.caps-workspace');
    expect(workspace.classes()).toContain('caps-workspace--mobile-list');
    expect(wrapper.find('.caps-mobile-back').exists()).toBe(false);
  });

  it('桌面（>=768px）：工作台不挂移动类、无返回按钮（零回归）', async () => {
    const wrapper = await openSkills(1280);
    const row = wrapper.findAll('.caps-skill-item')[0];
    await row.trigger('click');
    await nextTick();
    const workspace = wrapper.find('.caps-workspace');
    expect(workspace.classes()).not.toContain('caps-workspace--mobile-detail');
    expect(workspace.classes()).not.toContain('caps-workspace--mobile-list');
    expect(wrapper.find('.caps-mobile-back').exists()).toBe(false);
  });
});
