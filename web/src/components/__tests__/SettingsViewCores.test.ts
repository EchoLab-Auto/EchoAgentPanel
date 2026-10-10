//! 设置视图 · 「Core 连接」合并页契约（2026-10）：
//! 联邦并入 Core 连接——侧栏不再有独立「联邦」分类；Core 连接页同时渲染
//! 上游区块（UpstreamsSettings）与联邦区块（FederationSettings）；
//! 工具条副标题显示连接计数（回归：曾因 count=null 显示「共 null 项」）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
    panelFetch: vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) })),
  };
});

vi.mock('../../confirm', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

import SettingsView from '../SettingsView.vue';
import { state } from '../../store';

function seed() {
  state.upstreams = [
    {
      name: 'core',
      url: 'ws://127.0.0.1:3132',
      connectivity: 'online',
      auth: 'ok',
      token_set: false,
      last_checked: 1,
      last_error: null,
    },
    {
      name: 'ai_station',
      url: 'ws://10.10.2.250:3132',
      connectivity: 'online',
      auth: 'ok',
      token_set: true,
      last_checked: 1,
      last_error: null,
    },
  ] as never;
  state.federation = {
    enabled: true,
    node_id: 'node-a',
    node_name: null,
    listen: '',
    peers: [
      {
        name: 'gpu-box',
        url: 'ws://gpu:3133',
        token_set: true,
        allow_tools: [],
        allow_subagent: true,
        require_confirm: [],
        allow_queries: [],
        link: 'Online',
        active_turns: 0,
      },
    ],
  } as never;
}

describe('SettingsView · Core 连接合并页（联邦并入）', () => {
  beforeEach(seed);

  it('侧栏不再有独立「联邦」分类，Core 连接保留', () => {
    const wrapper = mount(SettingsView);
    const labels = wrapper.findAll('.caps-nav-item').map((n) => n.text());
    expect(labels.some((t) => t.includes('联邦'))).toBe(false);
    expect(labels.some((t) => t.includes('Core 连接'))).toBe(true);
  });

  it('Core 连接页同时渲染上游区块与联邦区块（含分隔线）', async () => {
    const wrapper = mount(SettingsView);
    const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('Core 连接'));
    expect(nav).toBeTruthy();
    await nav!.trigger('click');
    await nextTick();
    // 子页为 defineAsyncComponent（按需加载）：等待异步 chunk 解析完成
    await vi.waitFor(() => {
      expect(wrapper.find('.up-page').exists()).toBe(true);
      expect(wrapper.find('.fed-page').exists()).toBe(true);
    });
    // 两区块标题：上游 Core（原「Core 连接」内页标题改名，避免与页签重复）与联邦网络
    expect(wrapper.find('.up-title').text()).toBe('上游 Core');
    expect(wrapper.find('.fed-title').text()).toBe('联邦网络');
    // 区块间分隔线
    expect(wrapper.find('.cores-merged__sep').exists()).toBe(true);
  });

  it('工具条副标题显示连接计数（上游 N · 联邦节点 M）', async () => {
    const wrapper = mount(SettingsView);
    const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('Core 连接'));
    await nav!.trigger('click');
    await nextTick();
    const subtitle = wrapper.find('.caps-toolbar-title').text();
    expect(subtitle).toContain('上游 2');
    expect(subtitle).toContain('联邦节点 1');
    // 回归：count 为 null 的分类不得落到「共 null 项」兜底文案
    expect(subtitle).not.toContain('null');
  });

  it('联邦状态未加载时副标题只显示上游计数（不显示 null）', async () => {
    state.federation = null;
    const wrapper = mount(SettingsView);
    const nav = wrapper.findAll('.caps-nav-item').find((n) => n.text().includes('Core 连接'));
    await nav!.trigger('click');
    await nextTick();
    const subtitle = wrapper.find('.caps-toolbar-title').text();
    expect(subtitle).toContain('上游 2');
    expect(subtitle).not.toContain('联邦节点');
    expect(subtitle).not.toContain('null');
  });
});
