//! QQ 面板多实例契约（2026-09-13）。
//!
//! 背景：QQ 支持多实例（一实例 = 一容器 + 一通道 + 一账号，归属某人格）。
//! 面板须按实例寻址：单实例时与旧版一致（无实例选择器），多实例时出现
//! 实例分段选择，且门控/名单操作都带 `adapter` 字段。
//!
//! 作用域（2026-09-14）：面板只显示**当前智能体**的实例（persona = team
//! id）——别的 agent 的适配器状态/登录状况不进面板，也不会成为命令目标。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
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
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    expect(wrapper.text()).not.toContain('QQ 实例');
  });

  it('多实例：显示实例分段选择与 persona 标签', () => {
    seedInstances(2);
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    expect(wrapper.text()).toContain('QQ 实例');
    expect(wrapper.text()).toContain('alix');
  });

  it('无实例（QQ 未启用）：打开面板不发任何命令（零噪音）', async () => {
    // 回归：此前打开面板会发 5 条（组/好友/过滤/owner/登录）+ 登录区 1 条
    // （adapter 回退字面量 "qq"）必被 Core 拒绝的请求，堆一串
    // "QQ 适配器未找到 / QQ 实例 qq 未找到"错误提示。
    state.adapters = [];
    state.qqByAdapter = {};
    state.connected = true; // 触发 onMounted → refreshLists 路径
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    expect(vi.mocked(sendCommand)).not.toHaveBeenCalled();
    state.connected = false;
    wrapper.unmount();
  });

  it('只显示当前智能体的实例（persona 过滤，别的 agent 状态不进面板）', async () => {
    state.adapters = [
      {
        name: 'qq',
        display_name: 'QQ（alix）',
        connected: true,
        running: true,
        self_id: '10001',
        bind_address: '0.0.0.0:3131',
        started_at: null,
        persona: 'alix',
        container: 'napcat',
      },
      {
        name: 'sc-qq',
        display_name: 'QQ（self-coding）',
        connected: false,
        running: true,
        self_id: null,
        bind_address: '0.0.0.0:3140',
        started_at: null,
        persona: 'self-coding',
        container: 'echo-napcat-self-coding',
      },
    ] as typeof state.adapters;
    state.qqByAdapter = {};
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    expect(wrapper.text()).toContain('QQ（alix）');
    expect(wrapper.text()).not.toContain('self-coding');
    expect(wrapper.text()).not.toContain('echo-napcat-self-coding');
    state.connected = false;
    wrapper.unmount();
  });

  it('当前智能体无实例：显示空态且不发任何命令（别的 agent 的实例不算）', async () => {
    state.adapters = [
      {
        name: 'sc-qq',
        display_name: 'QQ（self-coding）',
        connected: true,
        running: true,
        self_id: '20002',
        bind_address: '0.0.0.0:3140',
        started_at: null,
        persona: 'self-coding',
        container: 'echo-napcat-self-coding',
      },
    ] as typeof state.adapters;
    state.qqByAdapter = {};
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    expect(wrapper.text()).toContain('当前智能体没有 QQ 实例');
    expect(vi.mocked(sendCommand)).not.toHaveBeenCalled();
    state.connected = false;
    wrapper.unmount();
  });

  it('刷新命令只寻址当前智能体的实例', async () => {
    state.adapters = [
      {
        name: 'qq',
        display_name: 'QQ（alix）',
        connected: true,
        running: true,
        self_id: '10001',
        bind_address: '0.0.0.0:3131',
        started_at: null,
        persona: 'alix',
        container: 'napcat',
      },
      {
        name: 'sc-qq',
        display_name: 'QQ（self-coding）',
        connected: true,
        running: true,
        self_id: '20002',
        bind_address: '0.0.0.0:3140',
        started_at: null,
        persona: 'self-coding',
        container: 'echo-napcat-self-coding',
      },
    ] as typeof state.adapters;
    state.qqByAdapter = {};
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0] as Record<string, { adapter?: string | null }>);
    const queried = calls.filter((c) => 'RequestGroupList' in c || 'RequestFriendList' in c);
    expect(queried.length).toBeGreaterThan(0);
    for (const call of queried) {
      const payload = Object.values(call)[0];
      expect(payload.adapter).toBe('qq'); // 只寻址 alix 的实例
    }
    expect(
      calls.some(
        (c) => Object.values(c)[0] && String((Object.values(c)[0] as { adapter?: string }).adapter) === 'sc-qq',
      ),
    ).toBe(false);
    state.connected = false;
    wrapper.unmount();
  });

  it('多实例：门控切换命令带 adapter（实例寻址）', async () => {
    seedInstances(2);
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
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
