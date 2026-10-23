//! 连接状态卡契约：浏览器↔Panel 通道 + **逐 core** 上游连接状态。
//! 多上游部署下必须把所有已配置 Core 都列出来（含离线/认证失败），
//! 而不只是当前管理目标那一个。
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConnectionStatusCard from '../ConnectionStatusCard.vue';
import { state } from '../../store';
import type { UpstreamStatus } from '../../state';

function upstream(over: Partial<UpstreamStatus>): UpstreamStatus {
  return {
    name: 'core',
    url: 'ws://127.0.0.1:3132',
    token_set: false,
    access: 'direct',
    ssh: null,
    online: true,
    connectivity: 'online',
    auth: 'ok',
    last_error: null,
    last_checked: 1,
    ...over,
  };
}

describe('ConnectionStatusCard 上游 Core 状态', () => {
  beforeEach(() => {
    state.connected = true;
    state.activeRegion = 'core';
    state.knownCores = new Set(['core']);
    state.instances = [];
    state.upstreams = [
      upstream({ name: 'core' }),
      upstream({
        name: 'ai_station',
        url: 'ws://10.10.2.250:3132',
        token_set: true,
        online: false,
        connectivity: 'offline',
        auth: 'failed',
        last_error: '认证失败',
      }),
    ];
  });

  it('逐 core 渲染全部上游连接状态（含离线）', () => {
    const wrapper = mount(ConnectionStatusCard);
    const rows = wrapper.findAll('.conn-row--core');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('core');
    expect(rows[0].text()).toContain('已连接');
    expect(rows[1].text()).toContain('ai_station');
    // 离线且认证失败时展示更具体的"认证失败"
    expect(rows[1].text()).toContain('认证失败');
  });

  it('上游行主名用**配置名**（= 会话徽标 = 命令路由键），不是区域名', () => {
    // 2026-10 用户报告：连接状态显示的是 region_name（「本机」），而设置页里
    // 配的是 `core`——同一个上游三个名字对不上，排查时无法对应。
    state.regions = {
      core: { id: 'node-1', name: '本机' },
      ai_station: { id: 'node-2', name: 'AI 站' },
    };
    const wrapper = mount(ConnectionStatusCard);
    const rows = wrapper.findAll('.conn-row--core');
    // 主名必须是配置名
    expect(rows[0].find('.conn-row__label').text()).toContain('core');
    expect(rows[1].find('.conn-row__label').text()).toContain('ai_station');
    // 区域名作为副注保留（两者不同 → 显示）
    expect(rows[0].find('.conn-row__region').text()).toBe('本机');
    expect(rows[1].find('.conn-row__region').text()).toBe('AI 站');
  });

  it('区域名与配置名相同时不重复显示（避免一行两个名字）', () => {
    // region_name 缺省时 Core 会回落成上游名——此时副注没有信息量。
    state.regions = { core: { id: 'node-1', name: 'core' } };
    state.upstreams = [upstream({ name: 'core' })];
    const wrapper = mount(ConnectionStatusCard);
    const row = wrapper.find('.conn-row--core');
    expect(row.find('.conn-row__region').exists()).toBe(false);
    expect(row.find('.conn-row__label').text()).toBe('core');
  });

  it('悬停详情依次给出配置名 / 区域名 / 地址或最近错误', () => {
    state.regions = { core: { id: 'node-1', name: '本机' } };
    state.upstreams = [upstream({ name: 'core', url: 'ws://127.0.0.1:3132' })];
    const wrapper = mount(ConnectionStatusCard);
    const title = wrapper.find('.conn-row--core').attributes('title') ?? '';
    expect(title).toContain('core');
    expect(title).toContain('区域 本机');
    expect(title).toContain('ws://127.0.0.1:3132');
  });
});
