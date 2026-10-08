//! 技能工作台契约测试（2026-09-23 重排版）。
//!
//! 锁定的交互契约：
//! - 筛选栏（搜索 / 状态 chips / 分组维度）与副标题统计；
//! - 默认按「包」分组（package 是真实门控单位；category 缺省时不再出现
//!   单一「未分类」组）；切到「按分类」时才回到 category 分组；
//! - 行卡双行结构 + 行内快速启停（不改变选中）；
//! - 详情分区「生效方式 / 被谁使用 / 来源 / 内容」；
//! - 包禁用提示（所属插件 disabled → 技能不可用）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发，
    // 调用记录并入 sendCommand 的 mock，请求类断言无需两处查。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

vi.mock('../../confirm', () => ({
  // 确认框服务（2026-10 审计：window.confirm 已替换为全局 Modal 确认）。
  // 默认同意——多数用例不受影响；需要"拒绝"的用例再覆盖返回值。
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

import SettingsView from '../SettingsView.vue';
import { confirmDialog } from '../../confirm';
import { state } from '../../store';
import { sendCommand } from '../../connection';

function seed() {
  state.skills = [
    {
      name: 'qq-transport',
      description: 'QQ 消息收发闭环',
      keywords: ['qq', '消息'],
      always: true,
      enabled: true,
      category: '',
      package: 'echo-agent.adapter.qq',
      content: '# QQ 传输\n正文',
      system: false,
    },
    {
      name: 'qq-management',
      description: 'QQ 管理',
      keywords: [],
      always: false,
      enabled: false,
      category: '',
      package: 'echo-agent.adapter.qq',
      content: '',
      system: false,
    },
    {
      name: 'coding',
      description: '读写代码',
      keywords: ['代码', '文件'],
      always: false,
      enabled: true,
      category: '',
      content: '',
      system: false,
    },
    {
      name: 'old-skill',
      description: '外部技能',
      keywords: [],
      always: false,
      enabled: true,
      category: '信息检索',
      source: { url: 'https://example.com/skill.git', rev: 'abc1234' },
      content: '',
      system: false,
    },
  ] as typeof state.skills;
  // QQ 适配器包插件被禁用 → 包内技能应显示「包已禁用」
  state.plugins = [
    {
      id: 'echo-agent.adapter.qq',
      name: 'QQ 适配器',
      version: '1',
      kind: 'adapter',
      description: '',
      entry: '',
      author: '',
      enabled: false,
      builtin: true,
      package: 'echo-agent.adapter.qq',
    },
  ] as typeof state.plugins;
  state.teams = [
    { id: 'alix', name: 'Alix', enabled: true, sessions: 0, system_skills: ['qq-transport'] },
    { id: 'writer', name: 'Writer', enabled: true, sessions: 0, disabled_skills: ['coding'] },
  ] as typeof state.teams;
  state.tools = [];
}

async function openSkills() {
  const wrapper = mount(SettingsView);
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('技能'));
  expect(nav).toBeTruthy();
  await nav!.trigger('click');
  return wrapper;
}

function rowNames(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.caps-skill-item').map((r) => r.find('.caps-list-item__name').text());
}

describe('SettingsView 技能工作台', () => {
  beforeEach(() => {
    seed();
    vi.mocked(sendCommand).mockClear();
  });

  it('筛选栏：搜索 / 状态 chips（带计数）/ 分组维度', async () => {
    const wrapper = await openSkills();
    expect(wrapper.find('.caps-filters').exists()).toBe(true);
    const chips = wrapper.findAll('.caps-chip').map((c) => c.text());
    expect(chips.length).toBe(6);
    expect(chips[0]).toContain('全部');
    expect(chips[0]).toContain('4');
    expect(chips[2]).toContain('已禁用');
    expect(chips[2]).toContain('1');
    expect(chips[3]).toContain('常驻');
    expect(chips[3]).toContain('1');
    // 副标题：构成统计
    const subtitle = wrapper.find('.caps-toolbar-title .muted').text();
    expect(subtitle).toContain('共 4 项');
    expect(subtitle).toContain('1 已禁用');
    expect(subtitle).toContain('1 常驻');
    expect(subtitle).toContain('1 Git 来源');
  });

  it('默认按「包」分组：已知门控包用中文名，无包技能归「独立技能」', async () => {
    const wrapper = await openSkills();
    const groups = wrapper.findAll('.caps-list-group__name').map((g) => g.text());
    expect(groups).toEqual(['QQ 适配器包', '独立技能']);
    // 包内 2 个，独立 2 个
    const counts = wrapper.findAll('.caps-count--soft').map((c) => c.text());
    expect(counts).toEqual(['2', '2']);
    // 包插件被禁用 → 组头提示 + 行内「包已禁用」标记
    expect(wrapper.text()).toContain('所属包已禁用');
    expect(wrapper.findAll('.caps-mark--warn').length).toBe(2);
  });

  it('分组维度：切到「按分类」按 category 分组；「平铺」单组', async () => {
    const wrapper = await openSkills();
    const items = wrapper.findAll('.caps-filters .nm-segmented__item');
    expect(items.length).toBe(3);
    // 按分类
    await items[1].trigger('click');
    // 组名按名称排序（localeCompare 下「信息检索」先于「未分类」）
    expect(wrapper.findAll('.caps-list-group__name').map((g) => g.text()).sort()).toEqual([
      '信息检索',
      '未分类',
    ]);
    // 平铺
    await items[2].trigger('click');
    expect(wrapper.findAll('.caps-list-group__name').map((g) => g.text())).toEqual(['全部技能']);
    expect(rowNames(wrapper).length).toBe(4);
  });

  it('搜索：命中名称 / 描述 / 触发词', async () => {
    const wrapper = await openSkills();
    const search = wrapper.find('.caps-filters__search input');
    await search.setValue('qq');
    expect(rowNames(wrapper)).toEqual(['qq-management', 'qq-transport']);
    // 触发词命中也算（'代码' 在 coding 的 keywords）
    await search.setValue('代码');
    expect(rowNames(wrapper)).toEqual(['coding']);
    // 无结果：出现清除筛选入口
    await search.setValue('不存在的技能');
    expect(rowNames(wrapper)).toEqual([]);
    expect(wrapper.text()).toContain('无匹配技能');
    expect(wrapper.text()).toContain('清除筛选');
  });

  it('筛选 chip：常驻 / 已禁用 / Git 来源', async () => {
    const wrapper = await openSkills();
    const chip = (label: string) => wrapper.findAll('.caps-chip').find((c) => c.text().includes(label))!;
    await chip('常驻').trigger('click');
    expect(rowNames(wrapper)).toEqual(['qq-transport']);
    await chip('已禁用').trigger('click');
    expect(rowNames(wrapper)).toEqual(['qq-management']);
    await chip('Git 来源').trigger('click');
    expect(rowNames(wrapper)).toEqual(['old-skill']);
    await chip('全部').trigger('click');
    expect(rowNames(wrapper).length).toBe(4);
  });

  it('行卡双行 + 行内快速启停（不改变选中）', async () => {
    const wrapper = await openSkills();
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('qq-management'))!;
    // 状态点（禁用 = 空心）与描述行
    expect(row.find('.caps-skill-item__dot--on').exists()).toBe(false);
    expect(row.find('.caps-skill-item__desc').text()).toContain('QQ 管理');
    // 快速开关：change 事件 → ToggleSkill，且不选中该行
    const input = row.find('.caps-skill-item__quick input');
    expect(input.exists()).toBe(true);
    await input.setValue(true);
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    expect(calls).toContainEqual({ ToggleSkill: { name: 'qq-management', enabled: true } });
    expect(wrapper.find('.caps-detail').exists()).toBe(false);
  });

  it('详情分区：生效方式 / 被谁使用 / 来源 / 内容', async () => {
    const wrapper = await openSkills();
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('qq-transport'))!;
    await row.trigger('click');
    const detail = wrapper.find('.skill-detail');
    expect(detail.exists()).toBe(true);
    const titles = wrapper.findAll('.detail-section__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('生效方式'))).toBe(true);
    expect(titles.some((t) => t.includes('被谁使用'))).toBe(true);
    expect(titles.some((t) => t.includes('来源'))).toBe(true);
    expect(titles.some((t) => t.includes('内容'))).toBe(true);
    // 使用面：Alix 作为系统提示词注入；Writer 未配置白名单 → 可用
    const usage = wrapper.findAll('.skill-usage__row').map((r) => r.text());
    expect(usage.length).toBe(2);
    expect(usage[0]).toContain('Alix');
    expect(usage[0]).toContain('系统提示词注入');
    expect(usage[1]).toContain('Writer');
    expect(usage[1]).toContain('可用');
    // 包禁用横幅
    expect(wrapper.find('.skill-banner--warn').text()).toContain('QQ 适配器包');
    // 内容预览（MarkdownRenderer 渲染）
    expect(wrapper.find('.skill-content-preview').exists()).toBe(true);
  });

  it('详情：Git 来源技能显示来源信息与更新/移除入口，菜单含「更新（Git）」', async () => {
    const wrapper = await openSkills();
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('old-skill'))!;
    await row.trigger('click');
    expect(wrapper.find('.skill-source').text()).toContain('https://example.com/skill.git');
    expect(wrapper.find('.skill-source').text()).toContain('abc1234');
    // ⋯ 菜单
    await wrapper.find('.skill-menu .nm-button').trigger('click');
    const menu = wrapper.findAll('.skill-menu__item').map((i) => i.text());
    expect(menu).toContain('编辑');
    expect(menu).toContain('更新（Git）');
    expect(menu).toContain('移除来源');
    expect(menu).toContain('删除');
  });

  it('编辑态：脏状态提示 + 放弃更改回到详情', async () => {
    const wrapper = await openSkills();
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('coding'))!;
    await row.trigger('click');
    // 菜单 → 编辑
    await wrapper.find('.skill-menu .nm-button').trigger('click');
    const editItem = wrapper.findAll('.skill-menu__item').find((i) => i.text() === '编辑')!;
    await editItem.trigger('click');
    const footer = wrapper.find('.form-actions--sticky');
    expect(footer.exists()).toBe(true);
    expect(footer.text()).toContain('无更改');
    // 改一个字段 → 脏
    const inputs = wrapper.findAll('.caps-form input');
    await inputs[1].setValue('改动后的描述');
    expect(wrapper.find('.form-actions--sticky').text()).toContain('有未保存的更改');
    // 放弃更改 → 回详情（不再有编辑表单）
    const discard = wrapper
      .findAll('.form-actions--sticky .nm-button')
      .find((b) => b.text().includes('放弃更改'))!;
    await discard.trigger('click');
    expect(wrapper.find('.caps-form').exists()).toBe(false);
    expect(wrapper.find('.skill-detail').exists()).toBe(true);
  });

  it('编辑中点击同一行先确认（防静默丢改动；confirm 拒绝则留在编辑态）', async () => {
    const wrapper = await openSkills();
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('coding'))!;
    await row.trigger('click');
    await wrapper.find('.skill-menu .nm-button').trigger('click');
    await wrapper
      .findAll('.skill-menu__item')
      .find((i) => i.text() === '编辑')!
      .trigger('click');
    const inputs = wrapper.findAll('.caps-form input');
    await inputs[1].setValue('改动后的描述');
    // 确认框拒绝放弃 → 留在编辑态（不回详情、不丢改动）
    vi.mocked(confirmDialog).mockResolvedValue(false);
    await row.trigger('click');
    await flushPromises();
    expect(confirmDialog).toHaveBeenCalled();
    expect(wrapper.find('.caps-form').exists()).toBe(true);
    // 确认框同意放弃 → 退出编辑（回到只读详情）
    vi.mocked(confirmDialog).mockResolvedValue(true);
    await row.trigger('click');
    await flushPromises();
    expect(wrapper.find('.caps-form').exists()).toBe(false);
    expect(wrapper.find('.skill-detail').exists()).toBe(true);
  });

  it('详情：触发词就地删除（closable tag）→ SaveSkill 携带剩余字段', async () => {
    const wrapper = await openSkills();
    const row = wrapper.findAll('.caps-skill-item').find((r) => r.text().includes('qq-transport'))!;
    await row.trigger('click');
    // 触发词 chips：qq / 消息；点第一个的关闭按钮
    const tags = wrapper.findAll('.detail-keywords .nm-tag');
    expect(tags.length).toBeGreaterThanOrEqual(2);
    const closeBtn = tags[0].find('.nm-tag__close, button');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]) as {
      SaveSkill?: { name: string; keywords: string[]; content: string };
    }[];
    const save = calls.find((c) => c.SaveSkill);
    expect(save?.SaveSkill?.name).toBe('qq-transport');
    expect(save?.SaveSkill?.keywords).toEqual(['消息']);
    // 内容原样保留（就地补丁不丢字段）
    expect(save?.SaveSkill?.content).toContain('# QQ 传输');
  });
});
