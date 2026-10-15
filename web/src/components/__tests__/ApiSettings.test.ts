//! ApiSettings 快捷模板契约测试（2026-09）：
//! - 模板数固定 5 个；
//! - DeepSeek 合并为单一预设（Anthropic 端点），不再有 OpenAI 变体；
//! - 新增「中转站（OpenAI 兼容）」预设：provider=third-party，base_url/model 留空待填。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

import ApiSettings from '../ApiSettings.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';

function seedApi() {
  state.api = {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    base_url: 'https://api.deepseek.com/anthropic',
    api_key_set: true,
    thinking: 'enabled',
    reasoning_effort: 'max',
    system_prompt: '',
    active_api: '',
    profiles: [],
  };
  state.apiBalances = {};
  state.apiTests = {};
}

function seedProfiles() {
  state.api!.profiles = [
    {
      name: 'deepseek',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      base_url: 'https://api.deepseek.com/anthropic',
      api_key_set: true,
      thinking: 'enabled',
      reasoning_effort: 'max',
    },
    {
      name: 'openai',
      provider: 'openai',
      model: 'gpt-5.6-sol',
      base_url: 'https://uuapi.io/v1',
      api_key_set: false,
      thinking: 'enabled',
      reasoning_effort: 'max',
    },
  ];
}

describe('ApiSettings 快捷模板', () => {
  beforeEach(seedApi);

  it('模板列表：DeepSeek 合并 + Kimi/中转站预设', async () => {
    const wrapper = mount(ApiSettings);
    // 概览态 → 打开「添加 API 服务商」表单
    await wrapper.find('.profile-add-row button').trigger('click');

    const items = wrapper.findAll('.template-item');
    expect(items.length).toBe(6);
    const labels = items.map((i) => i.find('.template-name').text());
    expect(labels).toEqual([
      'DeepSeek',
      'Kimi For Coding',
      '中转站（OpenAI 兼容）',
      'OpenAI',
      'Anthropic',
      'Ollama（本地）',
    ]);
  });

  it('点击 Kimi 预设：Anthropic 兼容端点 + k3 + high 档位', async () => {
    const wrapper = mount(ApiSettings);
    await wrapper.find('.profile-add-row button').trigger('click');
    await wrapper.findAll('.template-item')[1].trigger('click');

    const inputs = wrapper.findAll('input');
    const modelInput = inputs[1].element as HTMLInputElement;
    const baseUrlInput = inputs[2].element as HTMLInputElement;
    expect(modelInput.value).toBe('k3');
    expect(baseUrlInput.value).toBe('https://api.kimi.com/coding');
  });

  it('点击 DeepSeek 预设：填充官方 Anthropic 端点', async () => {
    const wrapper = mount(ApiSettings);
    await wrapper.find('.profile-add-row button').trigger('click');
    await wrapper.findAll('.template-item')[0].trigger('click');

    const inputs = wrapper.findAll('input');
    // 表单顺序：Profile 名称 / Model / Base URL / API Key
    const modelInput = inputs[1].element as HTMLInputElement;
    const baseUrlInput = inputs[2].element as HTMLInputElement;
    expect(modelInput.value).toBe('deepseek-v4-flash');
    expect(baseUrlInput.value).toBe('https://api.deepseek.com/anthropic');
  });

  it('不再有「默认」标记与「设为默认」按钮（默认提供商功能已移除）', () => {
    seedProfiles();
    // 旧版在 active_api 指向的卡上显示「默认」标签、其余卡显示「设为默认」；
    // 即便 active_api 指向某 profile，也不应再出现任何默认标记。
    state.api!.active_api = 'deepseek';
    const wrapper = mount(ApiSettings);
    expect(wrapper.text()).not.toContain('设为默认');
    for (const card of wrapper.findAll('.profile-card')) {
      expect(card.text(), card.text()).not.toContain('默认');
    }
  });

  it('Profiles 以卡片展示：deepseek 卡带查余额，非 deepseek 卡不带', async () => {
    seedProfiles();
    const wrapper = mount(ApiSettings);

    const cards = wrapper.findAll('.profile-card');
    expect(cards.length).toBe(2);
    // 卡片内容含 provider/model 与 base_url
    expect(cards[0].text()).toContain('deepseek / deepseek-v4-flash');
    expect(cards[0].text()).toContain('api.deepseek.com');
    // deepseek 卡：余额按钮存在
    expect(cards[0].text()).toContain('查余额');
    // openai（中转站）卡：无余额按钮
    expect(cards[1].text()).not.toContain('查余额');
    // 操作按钮齐备
    expect(cards[0].text()).toContain('测试');
    expect(cards[0].text()).toContain('编辑');
    expect(cards[0].text()).toContain('删除');
  });

  it('余额结果渲染为 ¥110.00（CNY 符号）', async () => {
    seedProfiles();
    state.apiBalances['deepseek'] = {
      ok: true,
      available: true,
      total: '110.00',
      currency: 'CNY',
      message: '余额已更新',
      granted: '0.00',
      topped_up: '110.00',
    };
    const wrapper = mount(ApiSettings);
    const amount = wrapper.find('.profile-card__balance-amount');
    expect(amount.exists()).toBe(true);
    expect(amount.text()).toBe('¥110.00');
    expect(amount.classes()).toContain('ok');
  });

  it('余额查询失败展示错误文本', async () => {
    seedProfiles();
    state.apiBalances['deepseek'] = {
      ok: false,
      available: false,
      total: '',
      currency: '',
      message: '请求失败: 连接超时',
      granted: '',
      topped_up: '',
    };
    const wrapper = mount(ApiSettings);
    const amount = wrapper.find('.profile-card__balance-amount');
    expect(amount.text()).toContain('连接超时');
    expect(amount.classes()).toContain('fail');
  });

  it('测试失败：结果行附带复制按钮（复制错误内容）', async () => {
    seedProfiles();
    state.apiTests['deepseek'] = {
      ok: false,
      message: '请求失败: HTTP 请求失败: error sending request for url (https://uuapi.net/v1/chat/completions)',
      latencyMs: 10001,
    };
    const wrapper = mount(ApiSettings);

    const testRow = wrapper.find('.profile-test');
    expect(testRow.exists()).toBe(true);
    expect(testRow.classes()).toContain('fail');
    // ui-frame 复制按钮（nm-chat-copy），且携带完整错误文本
    const copyBtn = wrapper.find('.profile-test-copy');
    expect(copyBtn.exists()).toBe(true);
    expect(copyBtn.classes()).toContain('nm-chat-copy');
    expect(copyBtn.attributes('title') ?? '').toBeTruthy();
  });

  it('测试成功：不显示复制按钮', async () => {
    seedProfiles();
    state.apiTests['deepseek'] = {
      ok: true,
      message: 'OK (deepseek-v4-flash) — 响应: pong',
      latencyMs: 1200,
    };
    const wrapper = mount(ApiSettings);
    expect(wrapper.find('.profile-test').classes()).toContain('ok');
    expect(wrapper.find('.profile-test-copy').exists()).toBe(false);
  });

  it('点击中转站预设：provider 切第三方、base_url/model 清空待填', async () => {
    const wrapper = mount(ApiSettings);
    await wrapper.find('.profile-add-row button').trigger('click');
    // 索引 2 = 中转站（0 DeepSeek / 1 Kimi / 2 中转站）
    await wrapper.findAll('.template-item')[2].trigger('click');

    const inputs = wrapper.findAll('input');
    const modelInput = inputs[1].element as HTMLInputElement;
    const baseUrlInput = inputs[2].element as HTMLInputElement;
    expect(modelInput.value).toBe('');
    expect(baseUrlInput.value).toBe('');
    // third-party 占位提示文案
    expect(baseUrlInput.placeholder).toContain('你的网关/v1');
    expect(modelInput.placeholder).toContain('中转站模型名');
  });
});

// ── API profile 改名（2026-10）：两步提交（RenameApi → 确认后按新名保存） ──

/** 打开第一张卡（deepseek）的编辑表单。 */
async function openFirstEdit(wrapper: ReturnType<typeof mount>) {
  const card = wrapper.findAll('.profile-card')[0];
  const editBtn = card.findAll('button').find((b) => b.text().includes('编辑'))!;
  expect(editBtn, 'profile card must expose an edit button').toBeTruthy();
  await editBtn.trigger('click');
  await nextTick();
}

/** 取出「保存到 …」按钮。 */
function saveButton(wrapper: ReturnType<typeof mount>) {
  const btn = wrapper.findAll('button').find((b) => b.text().includes('保存到'));
  expect(btn, 'save button must exist').toBeTruthy();
  return btn!;
}

describe('ApiSettings 改名（两步提交）', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    seedApi();
    seedProfiles();
  });

  it('编辑模式名称输入框可编辑：原名预填、不再禁用', async () => {
    const wrapper = mount(ApiSettings);
    await openFirstEdit(wrapper);
    const nameInput = wrapper.findAll('input')[0].element as HTMLInputElement;
    expect(nameInput.disabled).toBe(false);
    expect(nameInput.value).toBe('deepseek');
    wrapper.unmount();
  });

  it('未改名：单步 UpdateApiConfig（不发 RenameApi）', async () => {
    const wrapper = mount(ApiSettings);
    await openFirstEdit(wrapper);
    await saveButton(wrapper).trigger('click');

    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0] as unknown);
    expect(calls.some((c) => 'RenameApi' in (c as object))).toBe(false);
    const upd = calls.find((c) => 'UpdateApiConfig' in (c as object)) as {
      UpdateApiConfig: { name: string };
    };
    expect(upd.UpdateApiConfig.name).toBe('deepseek');
    wrapper.unmount();
  });

  it('改名保存：先发 RenameApi；确认前不发 UpdateApiConfig 且按钮锁定', async () => {
    const wrapper = mount(ApiSettings);
    await openFirstEdit(wrapper);
    await wrapper.findAll('input')[0].setValue('k3');
    await saveButton(wrapper).trigger('click');

    let calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0] as unknown);
    const rename = calls.find((c) => 'RenameApi' in (c as object)) as {
      RenameApi: { from: string; to: string };
    };
    expect(rename.RenameApi).toEqual({ from: 'deepseek', to: 'k3' });
    expect(
      calls.some((c) => 'UpdateApiConfig' in (c as object)),
      'must not upsert under the new name before rename confirmation',
    ).toBe(false);
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('改名确认 + 无字段改动 → 收起表单、不补发 UpdateApiConfig', async () => {
    const wrapper = mount(ApiSettings);
    await openFirstEdit(wrapper);
    await wrapper.findAll('input')[0].setValue('k3');
    await saveButton(wrapper).trigger('click');

    // Core 确认：profiles 出现新名（引用替换后的数组）。
    state.api = {
      ...state.api!,
      profiles: state.api!.profiles.map((p) =>
        p.name === 'deepseek' ? { ...p, name: 'k3' } : p,
      ),
    };
    await nextTick();
    await nextTick();

    expect(wrapper.find('.api-form-section').exists()).toBe(false);
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0] as unknown);
    expect(
      calls.some((c) => 'UpdateApiConfig' in (c as object)),
      'pure rename must not re-save (would re-activate the profile)',
    ).toBe(false);
    wrapper.unmount();
  });

  it('改名确认 + 有字段改动 → 按新名补发 UpdateApiConfig（一次操作完成改名+保存）', async () => {
    const wrapper = mount(ApiSettings);
    await openFirstEdit(wrapper);
    await wrapper.findAll('input')[1].setValue('ds-v9'); // Model 字段
    await wrapper.findAll('input')[0].setValue('k3');
    await saveButton(wrapper).trigger('click');

    state.api = {
      ...state.api!,
      profiles: state.api!.profiles.map((p) =>
        p.name === 'deepseek' ? { ...p, name: 'k3' } : p,
      ),
    };
    await nextTick();
    await nextTick();

    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0] as unknown);
    const upd = calls.find((c) => 'UpdateApiConfig' in (c as object)) as {
      UpdateApiConfig: { name: string; model: string };
    };
    expect(upd, 'post-rename field save must be sent').toBeTruthy();
    expect(upd.UpdateApiConfig.name).toBe('k3');
    expect(upd.UpdateApiConfig.model).toBe('ds-v9');
    wrapper.unmount();
  });

  it('改名超时未确认 → 提示错误、表单保留、永不复制 profile', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(ApiSettings);
      await openFirstEdit(wrapper);
      await wrapper.findAll('input')[0].setValue('k3');
      await saveButton(wrapper).trigger('click');

      await vi.advanceTimersByTimeAsync(10_000);
      await nextTick();

      expect(wrapper.text()).toContain('改名未确认');
      expect(wrapper.find('.api-form-section').exists()).toBe(true);
      const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0] as unknown);
      expect(calls.some((c) => 'UpdateApiConfig' in (c as object))).toBe(false);
      wrapper.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('撞名 / 空白名：保存按钮禁用并提示', async () => {
    const wrapper = mount(ApiSettings);
    await openFirstEdit(wrapper);
    const nameInput = wrapper.findAll('input')[0];
    // 撞名（openai 已存在）
    await nameInput.setValue('openai');
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('已存在');
    // 空白名
    await nameInput.setValue('   ');
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('名称不能为空');
    wrapper.unmount();
  });
});
