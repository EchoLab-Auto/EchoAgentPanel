//! 设置视图 · 智能体 × 多 Core 契约（2026-10 多 Core 交互修复）：
//!
//! 背景：`activeRegion` 是单值派生量（= 当前选中的 agent/会话所在区域），
//! 所有不带 targetCore 的 `sendCommand` 都落到它上面。智能体分类此前三处写
//! 操作（SaveTeam / DeleteTeam / ToggleTeam）全都不带 core，于是：
//! - 编辑 B 机器上的 agent → 命令发进 A（A 没有该 id 时凭空新建同名副本）；
//! - 删除 B 的 agent → 删掉 A 上同 id 的那份；
//! - 「至少保留一个」按**合并后**总数判 → 可以把某台机器的最后一个删空，
//!   该机器之后再无入口（区域只能靠选 agent 切换）。
//!
//! 另有两个数据损坏点：
//! - `SaveTeam` 是整对象覆盖，表单不透传 api_profile / token 预算 = 每次保存
//!   都把「配置 Agent」弹层里设好的值清空；
//! - 表单没有「运行区域」选择器 → 新建只能落在当前区域，要先建再迁两步。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const { sendCommand } = vi.hoisted(() => ({ sendCommand: vi.fn() }));
vi.mock('../../connection', () => ({
  sendCommand,
  sendPending: vi.fn(),
  panelFetch: vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) })),
}));
const { toastSpy } = vi.hoisted(() => ({ toastSpy: vi.fn() }));
vi.mock('@echolab-auto/ui-frame/composables/useToast', () => ({
  useToast: () => ({ addToast: toastSpy }),
}));
vi.mock('../../confirm', () => ({ confirmDialog: vi.fn(() => Promise.resolve(true)) }));

import SettingsView from '../SettingsView.vue';
import { state } from '../../store';

/**
 * 两台上游 Core（core-a / core-b）。
 *
 * 特意让 `alix` 在**两边都有一份**（多 Core 下同名同 id 是常态——每个 Core
 * 都可以有自己的人格），activeRegion 设为 core-a，这样"命令发去了哪里"在
 * 断言里可区分（正确 = 条目自己的 core；错误 = core-a）。
 */
function seed() {
  state.upstreams = [
    { name: 'core-a', url: 'ws://a:3132', connectivity: 'online', auth: 'ok', token_set: false, last_checked: 1, last_error: null },
    { name: 'core-b', url: 'ws://b:3132', connectivity: 'online', auth: 'ok', token_set: false, last_checked: 1, last_error: null },
  ] as never;
  state.knownCores = new Set(['core-a', 'core-b']);
  state.activeRegion = 'core-a';
  state.teams = [
    {
      id: 'alix',
      name: 'Alix',
      description: 'A 上的助手',
      core: 'core-a',
      enabled: true,
      sessions: 1,
      api_profile: 'kimi',
      memory_limit_tokens: 4096,
      context_window_tokens: 200000,
    },
    { id: 'echo', name: 'Echo', description: 'A 上的第二个', core: 'core-a', enabled: true, sessions: 0 },
    { id: 'alix', name: 'Alix', description: 'B 上的同名助手', core: 'core-b', enabled: true, sessions: 3 },
    { id: 'helper', name: 'Helper', description: 'B 上的第二个', core: 'core-b', enabled: true, sessions: 0 },
  ] as never;
  state.skills = [];
  state.tools = [];
  state.plugins = [];
}

/**
 * 打开设置 → 智能体，并点开 `(name, core)` 那一行。
 *
 * 列表行只显示 name + 区域徽标（同一 id 跨 core 的两行名字相同），所以两者
 * 都要匹配——这也顺带验证了"区域徽标确实渲染出来了"。
 */
async function openTeam(name: string, core: string) {
  const wrapper = mount(SettingsView);
  const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('智能体'));
  expect(nav).toBeTruthy();
  await nav!.trigger('click');
  const row = wrapper
    .findAll('.caps-list-item')
    .find((el) => el.text().includes(name) && el.text().includes(core));
  expect(row, `未找到 ${name}@${core} 的列表行`).toBeTruthy();
  await row!.trigger('click');
  return wrapper;
}

/** 按钮按文本定位（NeumorphismButton 渲染成 <button class="nm-button">）。 */
function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === text);
}

describe('SettingsView · 智能体 × 多 Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
  });

  it('列表按 (id, 区域) 排序：同名跨 core 的两条相邻，且各带区域徽标', async () => {
    const wrapper = mount(SettingsView);
    await wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('智能体'))!.trigger('click');
    const rows = wrapper.findAll('.caps-list-item').map((r) => r.text());
    // 两条 Alix 必须相邻（否则看起来只是"同一个名字错行显示了两次"）
    const alixIdx = rows.map((t, i) => (t.includes('Alix') ? i : -1)).filter((i) => i >= 0);
    expect(alixIdx).toHaveLength(2);
    expect(alixIdx[1] - alixIdx[0]).toBe(1);
    // 区域徽标（多区域部署才显示）
    expect(rows[alixIdx[0]]).toContain('core-a');
    expect(rows[alixIdx[1]]).toContain('core-b');
  });

  it('编辑 B 机器上的智能体：SaveTeam 定向到它自己的 core（不是 activeRegion）', async () => {
    const wrapper = await openTeam('Alix', 'core-b');
    await buttonByText(wrapper, '保存')!.trigger('click');

    expect(sendCommand).toHaveBeenCalledTimes(1);
    const [cmd, core] = sendCommand.mock.calls[0];
    expect(core).toBe('core-b');
    expect((cmd as { SaveTeam: Record<string, unknown> }).SaveTeam).toMatchObject({
      id: 'alix',
      name: 'Alix',
      description: 'B 上的同名助手',
      // B 上没有配这两项 → 显式 null（而不是"不发"，否则等于保留旧值）
      api_profile: null,
      memory_limit_tokens: null,
      context_window_tokens: null,
    });
  });

  it('编辑 A 机器上已配 API 的智能体：保存不会清空 api_profile / token 预算', async () => {
    const wrapper = await openTeam('Alix', 'core-a');
    await buttonByText(wrapper, '保存')!.trigger('click');

    const [cmd, core] = sendCommand.mock.calls[0];
    expect(core).toBe('core-a');
    // 回归：表单没有这两项的输入控件，此前整个字段被漏发 → Core 视为 None
    expect((cmd as { SaveTeam: Record<string, unknown> }).SaveTeam).toMatchObject({
      api_profile: 'kimi',
      memory_limit_tokens: 4096,
      context_window_tokens: 200000,
    });
  });

  it('DeleteTeam 定向到该条目的 core（不是 activeRegion）', async () => {
    // activeRegion = core-a，删的是 core-b 上的那一条
    const wrapper = await openTeam('Alix', 'core-b');
    await buttonByText(wrapper, '删除')!.trigger('click');

    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand.mock.calls[0]).toEqual([{ DeleteTeam: { id: 'alix' } }, 'core-b']);
  });

  it('「至少保留一个」按区域判：某区域的最后一个不给删除入口（合并总数仍 > 1）', async () => {
    // 只留一个 agent 在 core-b：合并后共 3 个（> 1），但 core-b 只剩 1 个。
    // 此前按 `state.teams.length` 判 → 这里会渲染出「删除」，一点就把 core-b
    // 删空（区域只能靠选中 agent 切换，删空后该机器从 UI 失联）。
    state.teams = state.teams.filter((t) => !((t.core ?? null) === 'core-b' && t.id === 'alix'));
    expect(state.teams.length).toBe(3);
    expect(state.teams.filter((t) => (t.core ?? null) === 'core-b')).toHaveLength(1);

    const wrapper = await openTeam('Helper', 'core-b');
    expect(buttonByText(wrapper, '删除')).toBeUndefined();
    // 详情页同样不给入口（走「放弃更改」进入详情）
    await buttonByText(wrapper, '放弃更改')!.trigger('click');
    expect(wrapper.text()).toContain('运行区域');
    expect(buttonByText(wrapper, '删除')).toBeUndefined();
  });

  it('对照：区域内还有别人时，删除入口正常出现', async () => {
    // core-a 上有 Alix + Echo 两个 → 删除 core-a 的 Alix 是允许的
    const wrapper = await openTeam('Alix', 'core-a');
    expect(buttonByText(wrapper, '删除')).toBeTruthy();
  });

  it('新建智能体：运行区域选择器默认当前区域，改选后可跨机器创建', async () => {
    const wrapper = mount(SettingsView);
    await wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('智能体'))!.trigger('click');
    await buttonByText(wrapper, '新建智能体')!.trigger('click');

    // 表单里出现「运行区域」（多区域部署）
    expect(wrapper.find('.team-editor').text()).toContain('运行区域');

    // 填 ID / 名称
    const inputs = wrapper.findAll('.team-editor input');
    await inputs[0].setValue('newbie');
    await inputs[1].setValue('新人');

    // 改区域为 core-b（NeumorphismSelect 的 update:model-value）
    const select = wrapper.findComponent({ name: 'NeumorphismSelect' });
    expect(select.exists()).toBe(true);
    select.vm.$emit('update:model-value', 'core-b');
    await wrapper.vm.$nextTick();

    await buttonByText(wrapper, '保存')!.trigger('click');
    expect(sendCommand).toHaveBeenCalledTimes(1);
    const [cmd, core] = sendCommand.mock.calls[0];
    expect(core).toBe('core-b');
    expect((cmd as { SaveTeam: Record<string, unknown> }).SaveTeam).toMatchObject({
      id: 'newbie',
      name: '新人',
    });
  });

  it('编辑时改运行区域 = 迁移：目标区域 SaveTeam（带表单内容）+ 源区域 DeleteTeam', async () => {
    const wrapper = await openTeam('Alix', 'core-b');
    const select = wrapper.findComponent({ name: 'NeumorphismSelect' });
    select.vm.$emit('update:model-value', 'core-a');
    await wrapper.vm.$nextTick();
    await buttonByText(wrapper, '保存')!.trigger('click');

    expect(sendCommand).toHaveBeenCalledTimes(2);
    const [save, saveCore] = sendCommand.mock.calls[0];
    const [del, delCore] = sendCommand.mock.calls[1];
    expect(saveCore).toBe('core-a');
    expect((save as { SaveTeam: Record<string, unknown> }).SaveTeam).toMatchObject({
      id: 'alix',
      description: 'B 上的同名助手',
    });
    expect(delCore).toBe('core-b');
    expect(del).toEqual({ DeleteTeam: { id: 'alix' } });
  });
});
