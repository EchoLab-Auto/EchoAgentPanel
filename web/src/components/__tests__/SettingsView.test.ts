//! 设置视图 - 智能体编辑器布局契约测试（2026-09 分区折叠改造）。
//! 结构：头部信息卡（NeumorphismCard）+ 四个可折叠分区
//! （基础信息 / 系统提示词 / 启用的能力 / 禁用的能力），
//! 每个分区标题行带摘要；能力分区内含 插件/包/工具/技能 四个子块。

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsView from '../SettingsView.vue';
import { state } from '../../store';

function seed() {
  state.teams = [
    {
      id: 'EchoCode',
      name: 'EchoCode',
          description: '项目级编程助手',
      enabled: true,
      sessions: 2,
      system_prompt: '',
      enabled_plugins: ['echo-agent.tools.builtin'],
      enabled_tools: [],
      enabled_skills: ['coding'],
      loop_mode: 'single',
    },
    {
      id: 'base',
      name: 'base',
      description: '纯对话',
      enabled: false,
      sessions: 0,
    },
  ] as typeof state.teams;
  state.skills = [
    { name: 'coding', description: 'd', keywords: [], always: false, enabled: true, category: '', content: '' },
    { name: 'calculator', description: 'd', keywords: [], always: false, enabled: true, category: '', content: '' },
  ] as typeof state.skills;
  state.tools = [
    { name: 'bash', description: 'd', parameters: null, category: 'builtin', enabled: true, package: 'echo-agent.tools.builtin' },
    { name: 'send_private_msg', description: 'd', parameters: null, category: 'builtin', enabled: true, package: 'echo-agent.adapter.qq' },
  ] as typeof state.tools;
  state.plugins = [
    { id: 'echo-agent.tools.builtin', name: '内置工具集', version: '1', kind: 'tool', description: '', entry: '', author: '', enabled: true, builtin: true, package: 'echo-agent.tools.builtin' },
    { id: 'echo-agent.adapter.qq', name: 'QQ 适配器', version: '1', kind: 'adapter', description: '', entry: '', author: '', enabled: true, builtin: true, package: 'echo-agent.adapter.qq' },
  ] as typeof state.plugins;
}

async function openTeamEditor() {
  const wrapper = mount(SettingsView);
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('智能体'));
  expect(nav).toBeTruthy();
  await nav!.trigger('click');
  // 列表按 id 排序（去主智能体后无置顶）；显式选中 EchoCode 保持断言稳定。
  const item = wrapper
    .findAll('.caps-list-item')
    .find((el) => el.text().includes('EchoCode'));
  expect(item).toBeTruthy();
  await item!.trigger('click');
  return wrapper;
}

describe('SettingsView 智能体编辑器', () => {
  beforeEach(seed);

  it('头部信息卡：名称 / 标识 / 启用状态（无「主 Agent」标签，去主智能体）', async () => {
    const wrapper = await openTeamEditor();
    const hero = wrapper.find('.team-hero');
    expect(hero.exists()).toBe(true);
    expect(hero.text()).toContain('EchoCode');
    expect(hero.text()).toContain('已启用');
    expect(hero.text()).not.toContain('主 Agent');
    // 头部卡片由 ui-frame NeumorphismCard 渲染
    expect(wrapper.find('.nm-card').exists()).toBe(true);
  });

  it('三个分区折叠：标题带摘要，默认展开基础与提示词（禁用能力分区已移除）', async () => {
    const wrapper = await openTeamEditor();
    const triggers = wrapper.findAll('.nm-collapse__trigger');
    const titles = triggers.map((t) => t.find('.sec-title').text());
    expect(titles).toEqual(['基础信息', '系统提示词', '启用的能力']);
    // 摘要存在
    expect(triggers[0].text()).toContain('启用');
    expect(triggers[1].text()).toContain('继承全局');
    expect(triggers[2].text()).toContain('1 插件');
    // 插件黑名单（禁用能力分区）已移除
    expect(wrapper.text()).not.toContain('黑名单');

    // 默认展开 basic + prompt（面板未折叠）
    const panels = wrapper.findAll('.nm-collapse__panel');
    expect(panels[0].classes()).not.toContain('nm-collapse__panel--collapsed');
    expect(panels[1].classes()).not.toContain('nm-collapse__panel--collapsed');
    expect(panels[2].classes()).toContain('nm-collapse__panel--collapsed');
  });

  it('能力分区：点击展开后包含 插件 / 包 / 工具 / 技能 四个子块', async () => {
    const wrapper = await openTeamEditor();
    const triggers = wrapper.findAll('.nm-collapse__trigger');
    await triggers[2].trigger('click');
    const capsPanel = wrapper.findAll('.nm-collapse__panel')[2];
    const subs = capsPanel.findAll('.sec-sub').map((s) => s.text());
    expect(subs).toContain('插件');
    expect(subs).toContain('包（Package）');
    expect(subs).toContain('工具');
    expect(subs).toContain('技能');
    // 包聚合显示 QQ 包成员
    expect(capsPanel.text()).toContain('QQ 适配器包');
    expect(capsPanel.text()).toContain('send_private_msg');
  });

  it('禁用能力分区已移除（插件黑名单不再可配置）', async () => {
    const wrapper = await openTeamEditor();
    // 不存在第 4 个折叠分区，也没有「禁用的能力」标题
    expect(wrapper.findAll('.nm-collapse__trigger').length).toBe(3);
    expect(wrapper.text()).not.toContain('禁用的能力');
  });

  it('取消编辑回到详情，详情头部有「编辑」按钮', async () => {
    const wrapper = await openTeamEditor();
    // 触发取消：找到粘性页脚中的「放弃更改」
    const cancel = wrapper
      .findAll('.nm-button')
      .find((b) => b.text().includes('放弃更改'));
    expect(cancel).toBeTruthy();
    await cancel!.trigger('click');
    // 详情视图出现且带编辑按钮
    const detail = wrapper.find('.caps-detail');
    expect(detail.text()).toContain('EchoCode');
    const editBtn = wrapper.findAll('.nm-button').find((b) => b.text().trim() === '编辑');
    expect(editBtn).toBeTruthy();
  });
});
