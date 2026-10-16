//! QQ 面板多实例契约（2026-09-13）。
//!
//! 背景：QQ 支持多实例（一实例 = 一容器 + 一通道 + 一账号，归属某人格）。
//! 面板须按实例寻址：单实例时与旧版一致（无实例选择器），多实例时出现
//! 实例分段选择，且门控/名单操作都带 `adapter` 字段。
//!
//! 作用域（2026-09-14）：面板只显示**当前智能体**的实例（persona = team
//! id）——别的 agent 的适配器状态/登录状况不进面板，也不会成为命令目标。
//!
//! 泛化迁移（02b-R2 起）：读取切到统一 op 通道——命令断言查
//! `invokeAdapterOp` 调用（`ops()` 助手），状态文档投射经
//! `state.adapterUiByKey` + `readOverlay`（qqView）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
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

vi.mock('../../adapterOps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../adapterOps')>();
  return {
    ...actual,
    // 默认挂起（用例按需 mockImplementation 控制）：读请求不自动回写覆盖层。
    invokeAdapterOp: vi.fn(),
  };
});

import QqPanel from '../QqPanel.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';
import { invokeAdapterOp, type AdapterOpOutcome } from '../../adapterOps';
import { readOverlay } from '../qq/qqView';

const invokeMock = vi.mocked(invokeAdapterOp);

/** 统一 op 调用的 (adapter, method, payload) 断言助手（02b §4）。 */
const ops = () =>
  invokeMock.mock.calls.map(([core, a, m, p]) => ({
    core,
    a,
    m,
    p: (p ?? {}) as Record<string, unknown>,
  }));

function clearOverlay() {
  for (const key of Object.keys(readOverlay)) delete readOverlay[key];
}

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
  state.adapterUiByKey = {};
}

describe('QqPanel 多实例', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    invokeMock.mockReset();
    invokeMock.mockImplementation(() => new Promise<AdapterOpOutcome>(() => {}));
    clearOverlay();
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
    state.adapterUiByKey = {};
    state.connected = true; // 触发 onMounted → refreshLists 路径
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    expect(vi.mocked(sendCommand)).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
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
    state.adapterUiByKey = {};
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
    state.adapterUiByKey = {};
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    expect(wrapper.text()).toContain('当前智能体没有 QQ 实例');
    expect(vi.mocked(sendCommand)).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
    state.connected = false;
    wrapper.unmount();
  });

  it('状态文档投影：gate/online/self_id/owner 进面板（AdapterState 新通道）', async () => {
    seedInstances(1);
    state.adapterUiByKey['qq'] = {
      instance: { persona: 'alix' },
      running: true,
      online: true,
      self_id: '1',
      gate: {
        mode: 'allowlist',
        allowlist_users: ['7'],
        allowlist_groups: [],
        denylist_users: [],
        denylist_groups: [],
      },
      owner: 9,
    };
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    expect(wrapper.text()).toContain('7'); // 白名单 chip（string[] → number[] 投影）
    expect(wrapper.text()).toContain('QQ 已连接：1'); // 登录区自文档取 online/self_id
    expect(wrapper.text()).toContain('QQ 管理员：9'); // owner prop 自文档
    expect(wrapper.findAll('.qq-count')[0].text()).toContain('1'); // 白名单徽标 = 1
    state.connected = false;
    wrapper.unmount();
  });

  it('读结果落覆盖层：get_friends/get_filter_config → 视图；新 AdapterState 引用后 filter 回落文档', async () => {
    seedInstances(1);
    state.connected = true;
    state.adapterUiByKey['qq'] = {
      gate: {
        mode: 'none',
        allowlist_users: [],
        allowlist_groups: [],
        denylist_users: [],
        denylist_groups: [],
      },
      owner: 0,
      online: false,
      self_id: null,
    };
    invokeMock.mockImplementation((_core, _adapter, method) => {
      if (method === 'get_friends') {
        return Promise.resolve({ result: { friends: [{ id: '5', name: '好友甲乙' }] }, error: null });
      }
      if (method === 'get_filter_config') {
        return Promise.resolve({
          result: {
            allowlist_users: ['42'],
            allowlist_groups: [],
            denylist_users: [],
            denylist_groups: [],
          },
          error: null,
        });
      }
      return new Promise<AdapterOpOutcome>(() => {});
    });
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await flushPromises();
    expect(wrapper.text()).toContain('好友甲乙'); // 好友 chip（覆盖层）
    expect(wrapper.text()).toContain('42'); // 白名单（覆盖层 filter）
    // 新 AdapterState（整文档替换 ⇒ 引用变化）⇒ 覆盖层失效 ⇒ filter 回到文档值
    state.adapterUiByKey['qq'] = {
      gate: {
        mode: 'none',
        allowlist_users: ['77'],
        allowlist_groups: [],
        denylist_users: [],
        denylist_groups: [],
      },
      owner: 0,
      online: false,
      self_id: null,
    };
    await nextTick();
    expect(wrapper.text()).toContain('77');
    expect(wrapper.text()).not.toContain('42');
    state.connected = false;
    wrapper.unmount();
  });

  it('未登录时打开面板自动拉一次登录二维码（挂载即触发）', async () => {
    // 回归：QqPanel 在有实例时才渲染登录区，挂载时 adapter.running 已是
    // true、online 已是 false——watch 不带 immediate 时初值即终值、
    // 自动拉码永不触发（用户须手动点按钮，重启后看不到码）。
    state.adapters = [
      {
        name: 'qq',
        display_name: 'QQ（alix）',
        connected: false,
        running: true,
        self_id: null,
        bind_address: '0.0.0.0:3131',
        started_at: null,
        persona: 'alix',
        container: 'napcat',
      },
    ] as typeof state.adapters;
    state.adapterUiByKey = {};
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    expect(
      calls.some((c) => typeof c === 'object' && 'RequestQqQrcode' in (c as object)),
      `calls: ${JSON.stringify(calls)}`,
    ).toBe(true);
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
    state.adapterUiByKey = {};
    state.connected = true;
    const wrapper = mount(QqPanel, { props: { teamId: 'alix' } });
    await nextTick();
    const queried = ops().filter((o) => o.m === 'get_groups' || o.m === 'get_friends');
    expect(queried.length).toBeGreaterThan(0);
    for (const call of queried) {
      expect(call.a).toBe('qq'); // 只寻址 alix 的实例
    }
    expect(
      ops().some((o) => o.a === 'sc-qq'),
      `ops: ${JSON.stringify(ops())}`,
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
