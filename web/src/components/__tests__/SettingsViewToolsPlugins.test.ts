//! 设置视图 - 工具 / 插件工作台契约（2026-09-23 重排版）。
//!
//! 锁定的交互契约：
//! - 工具：默认按包分组、双行行卡 + hover 快速启停、搜索/状态 chips、
//!   详情分区（能力说明 / 被谁使用 / 所属包 / 参数表）；
//! - 插件：默认按门控语义分组（门控 / 通道 / 模式 / 其它）、包规模徽标、
//!   受保护插件不给开关、详情四分区（带来什么 / 被谁使用 / 启停影响 / 技术信息）；
//! - 交叉跳转：插件成员 chip → 工具/技能分类并选中；工具「所属包」→ 插件分类。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
}));

import SettingsView from '../SettingsView.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';

function seed() {
  state.tools = [
    {
      name: 'bash',
      description: 'Run a shell command',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: '命令' } },
        required: ['command'],
      },
      category: 'builtin',
      enabled: true,
      package: 'echo-agent.tools.builtin',
    },
    {
      name: 'send_group_msg',
      description: 'Send a text message to a QQ group',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'integer', description: 'QQ group ID' },
          content: { type: 'string', description: 'Message content' },
        },
        required: ['group_id', 'content'],
      },
      category: 'builtin',
      enabled: false,
      package: 'echo-agent.adapter.qq',
    },
    {
      name: 'standalone_tool',
      description: '独立工具',
      parameters: null,
      category: '',
      enabled: true,
    },
  ] as typeof state.tools;
  state.skills = [
    {
      name: 'qq-transport',
      description: 'd',
      keywords: [],
      always: false,
      enabled: true,
      category: '',
      package: 'echo-agent.adapter.qq',
      content: '',
    },
  ] as typeof state.skills;
  state.plugins = [
    {
      id: 'echo-agent.tools.builtin',
      name: '内置工具集',
      version: '1',
      kind: 'tool',
      description: '内置工具',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.tools.builtin',
    },
    {
      id: 'echo-agent.adapter.qq',
      name: 'QQ 适配器',
      version: '1',
      kind: 'adapter',
      description: 'QQ 平台',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.adapter.qq',
    },
    {
      id: 'echo-agent.management.panel',
      name: '管理面',
      version: '1',
      kind: 'management',
      description: 'Panel 通道',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.management.panel',
    },
    {
      id: 'echo-agent.loop.single',
      name: '单会话循环',
      version: '1',
      kind: 'loop',
      description: '单会话',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.loop.single',
    },
    {
      id: 'echo-agent.provider.llm',
      name: 'LLM Provider',
      version: '1',
      kind: 'provider',
      description: 'provider',
      entry: '',
      author: '',
      enabled: true,
      builtin: true,
      package: 'echo-agent.provider.llm',
    },
  ] as typeof state.plugins;
  state.teams = [
    { id: 'alix', name: 'Alix', enabled: true, sessions: 0, enabled_plugins: ['echo-agent.adapter.qq'] },
  ] as typeof state.teams;
}

async function openCategory(label: string) {
  const wrapper = mount(SettingsView);
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes(label));
  expect(nav).toBeTruthy();
  await nav!.trigger('click');
  return wrapper;
}

function rowNames(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.caps-skill-item').map((r) => r.find('.caps-list-item__name').text());
}

describe('SettingsView 工具工作台', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
  });

  it('默认按包分组 + 副标题统计 + 状态 chips', async () => {
    const wrapper = await openCategory('工具');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['QQ 适配器包', '内置工具集', '独立工具']);
    // 独立工具排最后
    expect(groups[groups.length - 1]).toBe('独立工具');
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 3 项');
    // 2 个包（内置工具集 + QQ 适配器包），独立工具无包归属不计入
    expect(subtitle).toContain('2 个包');
    expect(subtitle).toContain('1 已禁用');
    const chips = wrapper.findAll('.caps-chip').map((c) => c.text());
    expect(chips.length).toBe(3);
    expect(chips[0]).toContain('全部');
    expect(chips[2]).toContain('1');
  });

  it('搜索 + 状态筛选 + 行内快速启停（ToggleTool，不改变选中）', async () => {
    const wrapper = await openCategory('工具');
    await wrapper.find('.caps-filters__search input').setValue('group');
    expect(rowNames(wrapper)).toEqual(['send_group_msg']);
    await wrapper.find('.caps-filters__search input').setValue('');
    const chip = (label: string) => wrapper.findAll('.caps-chip').find((c) => c.text().includes(label))!;
    await chip('已禁用').trigger('click');
    expect(rowNames(wrapper)).toEqual(['send_group_msg']);
    await chip('全部').trigger('click');
    // hover 快速开关 → ToggleTool
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('bash'))!;
    expect(row.find('.caps-skill-item__desc').text()).toContain('Run a shell command');
    const input = row.find('.caps-skill-item__quick input');
    expect(input.exists()).toBe(true);
    await input.setValue(false);
    expect(vi.mocked(sendCommand).mock.calls.map((c) => c[0])).toContainEqual({
      ToggleTool: { name: 'bash', enabled: false },
    });
    expect(wrapper.find('.caps-detail').exists()).toBe(false);
  });

  it('工具详情：分区 + 参数表（必填标记）+ 所属包跳转入口', async () => {
    const wrapper = await openCategory('工具');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('send_group_msg'))!;
    await row.trigger('click');
    const titles = wrapper.findAll('.detail-section__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('能力说明'))).toBe(true);
    expect(titles.some((t) => t.includes('被谁使用'))).toBe(true);
    expect(titles.some((t) => t.includes('所属包'))).toBe(true);
    expect(titles.some((t) => t.includes('参数 Schema'))).toBe(true);
    // 参数表：group_id / content 均必填
    expect(wrapper.find('.nm-table').exists()).toBe(true);
    const text = wrapper.find('.detail-section--grow').text();
    expect(text).toContain('group_id');
    expect(text).toContain('必填');
    // 所属包 + 跳转按钮
    expect(wrapper.find('.skill-source').text()).toContain('echo-agent.adapter.qq');
    expect(wrapper.find('.skill-source__actions').exists()).toBe(true);
  });

  it('工具详情：包被禁用时显示警示横幅', async () => {
    // QQ 包插件改为禁用
    (state.plugins as typeof state.plugins)[1].enabled = false;
    const wrapper = await openCategory('工具');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('send_group_msg'))!;
    await row.trigger('click');
    expect(wrapper.find('.skill-banner--warn').text()).toContain('QQ 适配器包');
    // 列表行标记「包已禁用」
    expect(wrapper.findAll('.caps-mark--warn').length).toBeGreaterThan(0);
  });
});

describe('SettingsView 插件工作台', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
  });

  it('默认按门控语义分组（门控 → 通道 → 模式 → 其它）+ 副标题统计', async () => {
    const wrapper = await openCategory('插件');
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['包维度门控', '平台通道', '模式插件（互斥）', '其它']);
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 5 项');
    expect(subtitle).toContain('1 包维度门控');
    expect(subtitle).toContain('1 模式插件');
    // 语义提示行（门控/通道/模式各一条）
    expect(wrapper.findAll('.caps-list-group__hint').length).toBe(3);
  });

  it('行内：包规模徽标 / 受保护锁 / 模式标记；受保护项无开关', async () => {
    const wrapper = await openCategory('插件');
    const qqRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 适配器'))!;
    // 包规模：1 工具 · 1 技能
    expect(qqRow.text()).toContain('1 工具 · 1 技能');
    const mgmtRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    expect(mgmtRow.text()).toContain('受保护');
    expect(mgmtRow.find('.caps-skill-item__quick input').exists()).toBe(false);
    const loopRow = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('单会话循环'))!;
    expect(loopRow.text()).toContain('模式');
    // 普通插件有开关 → TogglePlugin
    const input = qqRow.find('.caps-skill-item__quick input');
    await input.setValue(false);
    expect(vi.mocked(sendCommand).mock.calls.map((c) => c[0])).toContainEqual({
      TogglePlugin: { id: 'echo-agent.adapter.qq', enabled: false },
    });
  });

  it('插件详情：四分区 + 成员 chips + 启停影响文案', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 适配器'))!;
    await row.trigger('click');
    const titles = wrapper.findAll('.detail-section__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('这个插件带来什么'))).toBe(true);
    expect(titles.some((t) => t.includes('被谁使用'))).toBe(true);
    expect(titles.some((t) => t.includes('启停影响'))).toBe(true);
    expect(titles.some((t) => t.includes('技术信息'))).toBe(true);
    // 成员 chips：工具 + 技能
    const chips = wrapper.findAll('.plugin-member-chip').map((c) => c.text());
    expect(chips).toContain('send_group_msg');
    expect(chips).toContain('qq-transport');
    // 通道类影响文案
    expect(wrapper.find('.plugin-impact').text()).toContain('平台通道');
    // 使用面：Alix 在白名单 → 已启用
    expect(wrapper.find('.skill-usage').text()).toContain('Alix');
    expect(wrapper.find('.skill-usage').text()).toContain('已启用');
  });

  it('插件详情：受保护插件显示警示影响文案且不给开关', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('管理面'))!;
    await row.trigger('click');
    const impact = wrapper.find('.plugin-impact');
    expect(impact.classes()).toContain('plugin-impact--warn');
    expect(impact.text()).toContain('自锁');
    // 详情头部无启停开关
    expect(wrapper.find('.detail-actions input').exists()).toBe(false);
  });

  it('交叉跳转：插件成员 chip → 工具/技能分类并选中；工具「所属包」→ 插件', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 适配器'))!;
    await row.trigger('click');
    // 点工具 chip → 工具分类并选中
    const toolChip = wrapper.findAll('.plugin-member-chip').find((c) => c.text() === 'send_group_msg')!;
    await toolChip.trigger('click');
    expect(wrapper.find('.caps-nav-item--active').text()).toContain('工具');
    expect(wrapper.find('.skill-detail h3').text()).toBe('send_group_msg');
    // 工具详情的「所属包」按钮 → 插件分类并选中
    const jumpBtn = wrapper
      .findAll('.skill-source__actions .nm-button')
      .find((b) => b.text().includes('在「插件」中查看'))!;
    await jumpBtn.trigger('click');
    expect(wrapper.find('.caps-nav-item--active').text()).toContain('插件');
    expect(wrapper.find('.skill-detail h3').text()).toBe('QQ 适配器');
  });

  it('技术信息折叠：默认收起，点击展开显示 ID/Package/Entry', async () => {
    const wrapper = await openCategory('插件');
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('QQ 适配器'))!;
    await row.trigger('click');
    expect(wrapper.find('.plugin-info__head').text()).toContain('技术信息');
    expect(wrapper.find('.skill-source').exists()).toBe(false);
    await wrapper.find('.plugin-info__head').trigger('click');
    expect(wrapper.find('.skill-source').text()).toContain('echo-agent.adapter.qq');
    expect(wrapper.find('.skill-source').text()).toContain('adapter');
  });
});
