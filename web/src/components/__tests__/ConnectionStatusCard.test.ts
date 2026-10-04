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
    state.activeCore = 'core';
    state.knownCores = new Set(['core']);
    state.adapters = [];
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

  it('当前管理目标 core 带标记', () => {
    const wrapper = mount(ConnectionStatusCard);
    const rows = wrapper.findAll('.conn-row--core');
    expect(rows[0].classes()).toContain('conn-row--target');
    expect(rows[1].classes()).not.toContain('conn-row--target');
    expect(wrapper.find('.conn-core-target').exists()).toBe(true);
  });

  it('管理目标选择器列出所有已配置上游（含离线）', () => {
    const wrapper = mount(ConnectionStatusCard);
    const options = wrapper.findAll('.conn-core-select option').map((o) => o.text());
    expect(options.some((t) => t.includes('core'))).toBe(true);
    expect(options.some((t) => t.includes('ai_station'))).toBe(true);
  });
});
