//! 通用 AdapterPanel 契约（2026-10，03b S2，自 QqPanel.test.ts 迁移）。
//!
//! 背景：通用适配器面板列 `state.adapters` 全部平台，persona 过滤保留
//! （别的 agent 的实例既不显示状态也不作为命令目标）；无可见实例打开面板
//! 零命令（QqPanel.test.ts:63/113 语义）。启停重启的 pending 键为通用形式
//! `adapter:<op>:<core>:<adapter>`（03b §2.2）。
//!
//! 迁入用例对照（03b §4.2）：:50 → 单实例不显示选择器；:56 → 多实例显示
//! 选择器与 persona 标签；:63 → 无实例打开面板零命令；:77 → persona 过滤；
//! :113 → 当前智能体无实例空态零命令。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick, h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记 pending + 发命令（生产语义）：测试等价转发——命令
    // 断言查 sendCommand 的记录，pending 键断言查 sendPending 的调用参数。
    sendPending: vi.fn((command: unknown, _key?: string, core?: string) =>
      sendCommand(command as never, core),
    ),
  };
});

import AdapterPanel from '../AdapterPanel.vue';
import { state } from '../../store';
import { sendCommand, sendPending } from '../../connection';
import type { AdapterStatus } from '../../protocol';

const sendMock = vi.mocked(sendCommand);
const pendingMock = vi.mocked(sendPending);

function adapter(over: Partial<AdapterStatus> = {}): AdapterStatus {
  return {
    name: 'qq',
    display_name: 'QQ（alix）',
    connected: true,
    running: true,
    self_id: '10001',
    bind_address: '0.0.0.0:3131',
    started_at: null,
    persona: 'alix',
    platform: 'qq',
    ...over,
  };
}

/** 混合实例 fixture：2 个 qq（alix）+ 1 个异 persona + 1 个无 persona（全局）。 */
function seedMixed() {
  state.adapters = [
    adapter(),
    adapter({ name: 'qq-2', display_name: 'QQ（alix-2）', self_id: '10002' }),
    adapter({
      name: 'sc-qq',
      display_name: 'QQ（self-coding）',
      persona: 'self-coding',
      connected: false,
      self_id: null,
    }),
    adapter({
      name: 'tg-global',
      display_name: 'TG 全局实例',
      persona: null,
      platform: 'telegram',
      self_id: '90001',
    }),
  ];
}

let wrapper: VueWrapper | null = null;

function mountPanel(
  props: { teamId?: string | null; core?: string | null } = { teamId: 'alix' },
): VueWrapper {
  wrapper = mount(AdapterPanel, { props }) as VueWrapper;
  return wrapper;
}

describe('AdapterPanel 通用实例面板（03b S2）', () => {
  beforeEach(() => {
    state.connected = false;
    state.adapters = [];
    sendMock.mockClear();
    pendingMock.mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    state.connected = false;
  });

  it('单实例：不显示实例选择器（与旧版一致）', () => {
    state.adapters = [adapter()];
    const w = mountPanel();
    expect(w.text()).toContain('QQ（alix）');
    expect(w.text()).not.toContain('适配器实例');
  });

  it('多实例：显示实例分段选择与 persona 标签', () => {
    state.adapters = [
      adapter(),
      adapter({ name: 'qq-2', display_name: 'QQ（alix-2）', self_id: '10002' }),
    ];
    const w = mountPanel();
    expect(w.text()).toContain('适配器实例');
    expect(w.text()).toContain('alix');
    // 选项文本 = display_name + persona 标签
    expect(w.text()).toContain('QQ（alix-2）（alix）');
  });

  it('无实例：打开面板不发任何命令（零噪音）', async () => {
    // 回归：此前打开面板会发必被 Core 拒绝的 QQ 专属请求，堆一串
    // "适配器未找到 / 实例未找到"错误提示；通用面板保持零噪音。
    state.adapters = [];
    state.connected = true; // 触发 onMounted → 刷新路径
    mountPanel();
    await nextTick();
    expect(sendMock).not.toHaveBeenCalled();
    expect(pendingMock).not.toHaveBeenCalled();
  });

  it('只显示当前智能体的实例（persona 过滤；无 persona 的全局实例始终显示）', async () => {
    seedMixed();
    const w = mountPanel({ teamId: 'alix' });
    await nextTick();
    expect(w.text()).toContain('QQ（alix）');
    expect(w.text()).toContain('QQ（alix-2）');
    expect(w.text()).toContain('TG 全局实例'); // 无 persona = 全局实例
    expect(w.text()).not.toContain('self-coding'); // 别的 agent 的实例不显示
    expect(w.findAll('.adapter-row')).toHaveLength(3);
  });

  it('当前智能体无实例：显示空态且不发任何命令（别的 agent 的实例不算）', async () => {
    state.adapters = [
      adapter({ name: 'sc-qq', display_name: 'QQ（self-coding）', persona: 'self-coding' }),
    ];
    state.connected = true;
    const w = mountPanel({ teamId: 'alix' });
    await nextTick();
    expect(w.text()).toContain('当前智能体没有适配器实例');
    expect(w.text()).not.toContain('self-coding');
    expect(sendMock).not.toHaveBeenCalled();
    expect(pendingMock).not.toHaveBeenCalled();
  });

  it('状态行：文案/状态点取 S1 共享计算（已连接 / 已停止 / 等待连接）', () => {
    state.adapters = [
      adapter({ name: 'qq', display_name: 'QQ 已连' }),
      adapter({
        name: 'qq-stopped',
        display_name: 'QQ 已停',
        running: false,
        connected: true,
        self_id: null,
      }),
      adapter({ name: 'qq-wait', display_name: 'QQ 等待', connected: false, self_id: null }),
    ];
    const w = mountPanel();
    expect(w.text()).toContain('已连接');
    expect(w.text()).toContain('已停止');
    expect(w.text()).toContain('等待连接');
    expect(w.text()).toContain('10001'); // self_id 展示
  });

  it('启停重启：命令中立 + pending 键 adapter:<op>:<core>:<adapter>', async () => {
    state.adapters = [
      adapter(),
      adapter({ name: 'qq-2', display_name: 'QQ（alix-2）', running: false, connected: false, self_id: null }),
    ];
    state.connected = true;
    const w = mountPanel();
    sendMock.mockClear();
    pendingMock.mockClear();

    const rows = w.findAll('.adapter-row');
    await rows[0].findAll('button')[0].trigger('click'); // 运行中 → 停止
    expect(sendMock).toHaveBeenCalledWith({ StopAdapter: { name: 'qq' } }, undefined);
    expect(pendingMock).toHaveBeenCalledWith(
      { StopAdapter: { name: 'qq' } },
      'adapter:stop::qq',
      undefined,
    );

    await rows[1].findAll('button')[0].trigger('click'); // 已停止 → 启动
    expect(sendMock).toHaveBeenCalledWith({ StartAdapter: { name: 'qq-2' } }, undefined);
    expect(pendingMock).toHaveBeenCalledWith(
      { StartAdapter: { name: 'qq-2' } },
      'adapter:start::qq-2',
      undefined,
    );

    await rows[0].findAll('button')[1].trigger('click'); // 重启
    expect(sendMock).toHaveBeenCalledWith({ RestartAdapter: { name: 'qq' } }, undefined);
    expect(pendingMock).toHaveBeenCalledWith(
      { RestartAdapter: { name: 'qq' } },
      'adapter:restart::qq',
      undefined,
    );
  });

  it('多上游：刷新与启停重启显式寻址面板 core', async () => {
    state.adapters = [adapter({ running: false, connected: false, self_id: null })];
    state.connected = true;
    const w = mountPanel({ teamId: 'alix', core: 'core-a' });
    // 挂载即刷新列表（可见实例存在）→ 寻址 core-a
    expect(sendMock).toHaveBeenCalledWith('RequestAdapterStatus', 'core-a');

    await w.find('.adapter-row').findAll('button')[0].trigger('click'); // 启动
    expect(pendingMock).toHaveBeenCalledWith(
      { StartAdapter: { name: 'qq' } },
      'adapter:start:core-a:qq',
      'core-a',
    );
  });

  it('渲染器插槽：默认占位；提供插槽时收到 core / adapter / adapter-status', () => {
    state.adapters = [adapter()];
    const plain = mountPanel();
    expect(plain.text()).toContain('该适配器未提供管理界面');

    const w = mount(AdapterPanel, {
      props: { teamId: 'alix', core: 'core-a' },
      slots: {
        renderer: (sp: Record<string, unknown>) => {
          const status = sp.adapterStatus as AdapterStatus;
          return h('div', { class: 'ap-probe' }, `${sp.core}|${sp.adapter}|${status.self_id}`);
        },
      },
    }) as VueWrapper;
    wrapper = w;
    expect(w.find('.ap-probe').text()).toBe('core-a|qq|10001');
  });

  it('可见实例存在时挂载即请求适配器列表', async () => {
    state.adapters = [adapter()];
    state.connected = true;
    mountPanel();
    await nextTick();
    expect(sendMock).toHaveBeenCalledWith('RequestAdapterStatus', undefined);
  });
});
