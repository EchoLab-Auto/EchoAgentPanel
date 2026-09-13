//! QQ 面板多实例契约（2026-09-13）。
//!
//! 背景：QQ 支持多实例（一实例 = 一容器 + 一通道 + 一账号，归属某人格）。
//! 面板须按实例寻址：单实例时与旧版一致（无实例选择器），多实例时出现
//! 实例分段选择，且门控/名单操作都带 `adapter` 字段。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
}));

import QqPanel from '../QqPanel.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';

function seedInstances(count: number) {
  state.adapters = Array.from({ length: count }, (_, i) => ({
    name: i === 0 ? 'qq' : `alix-${i + 1}`,
    display_name: i === 0 ? 'QQ（alix）' : `QQ（alix / alix-${i + 1}）`,
    connected: true,
    running: true,
    self_id: '10001',
    bind_address: `0.0.0.0:${3131 + i}`,
    started_at: null,
    persona: 'alix',
    container: `echo-napcat-alix-${i + 1}`,
    webui_url: `http://localhost:${6100 + i}`,
    onebot_url: `http://localhost:${3010 + i}`,
  })) as typeof state.adapters;
  state.qqByAdapter = {};
}

describe('QqPanel 多实例', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
  });

  it('单实例：不显示实例选择器（与旧版一致）', () => {
    seedInstances(1);
    const wrapper = mount(QqPanel);
    expect(wrapper.text()).not.toContain('QQ 实例');
  });

  it('多实例：显示实例分段选择与 persona 标签', () => {
    seedInstances(2);
    const wrapper = mount(QqPanel);
    expect(wrapper.text()).toContain('QQ 实例');
    expect(wrapper.text()).toContain('alix');
  });

  it('多实例：门控切换命令带 adapter（实例寻址）', async () => {
    seedInstances(2);
    const wrapper = mount(QqPanel);
    // 触发门控分段（实例选择器也是分段；取最后一个 = 门控模式）
    const segmenteds = wrapper.findAll('.nm-segmented');
    expect(segmenteds.length).toBeGreaterThan(0);
    const gateSegmented = segmenteds[segmenteds.length - 1];
    const option = gateSegmented.findAll('button')[1];
    await option.trigger('click');
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const gate = calls.find((c) => typeof c === 'object' && 'SetQqGateMode' in (c as object));
    expect(gate, `calls: ${JSON.stringify(calls)}`).toBeTruthy();
    expect((gate as { SetQqGateMode: { adapter?: string } }).SetQqGateMode.adapter).toBeTruthy();
  });
});
