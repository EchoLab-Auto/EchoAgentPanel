//! 通用 AdapterPanel 契约（2026-10；03b S2 面板 + S3 渲染器接线）。
//!
//! S2 语义：列 `state.adapters` 全部平台，persona 过滤保留（别的 agent 的
//! 实例既不显示状态也不作为命令目标）；无可见实例打开面板零命令
//!（QqPanel.test.ts:63/113 语义）；启停重启 pending 键为通用形式
//! `adapter:<op>:<core>:<adapter>`（03b §2.2）。
//!
//! S3 接线（03b §3.2）：`ui` 存在 → 内嵌 AdapterUiRenderer（真实 QQ 描述符
//! fixture 集成：select/list_editor 动作经真实 adapterOps 发 `InvokeAdapterOp`，
//! core/adapter 寻址正确）；无 `ui` → 占位文案且不渲染渲染器。节点内部语义
//! 已在 adapter-ui/__tests__/ 覆盖，本文件只做面板层接线断言。
//!
//! 迁入用例对照（03b §4.2）：:50 → 单实例不显示选择器；:56 → 多实例显示
//! 选择器与 persona 标签；:63 → 无实例打开面板零命令；:77 → persona 过滤；
//! :113 → 当前智能体无实例空态零命令。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';

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

import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import AdapterPanel from '../AdapterPanel.vue';
import { adapterOpKey, settleAdapterOp } from '../../adapterOps';
import { scopedKey } from '../../keys';
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

/** 与 echo-adapter-qq `ui.rs::ui_descriptor()` 等价的真实 QQ 描述符
 *  （3 panel / 7 类节点；同 03a renderer.test.ts §5.5 fixture）。 */
const QQ_DESCRIPTOR = {
  version: 1,
  panels: [
    {
      id: 'login',
      title: '登录',
      nodes: [
        { type: 'status', bind: 'online', label: 'QQ 连接' },
        { type: 'text', bind: 'self_id', label: '账号' },
        {
          type: 'image',
          label: '登录二维码',
          clear_when: 'online',
          fetch: { method: 'login_qrcode', result_key: 'png_base64' },
        },
        { type: 'link', bind: 'instance.webui_url', label: '打开 NapCat WebUI' },
      ],
    },
    {
      id: 'gate',
      title: '消息门控',
      nodes: [
        {
          type: 'select',
          bind: 'gate.mode',
          label: '门控模式',
          options: [
            { value: 'none', label: '不限制', hint: '所有消息均响应' },
            { value: 'allowlist', label: '白名单', hint: '仅响应名单内用户/群' },
            { value: 'denylist', label: '黑名单', hint: '忽略名单内用户/群' },
          ],
          action: { method: 'set_gate_mode', arg: { mode: '$value' } },
        },
        {
          type: 'list_editor',
          bind: 'gate.allowlist_users',
          label: '白名单用户',
          action: { method: 'update_allowlist', arg: { user_ids: '$value' } },
        },
        {
          type: 'list_editor',
          bind: 'gate.allowlist_groups',
          label: '白名单群',
          action: { method: 'update_allowlist', arg: { group_ids: '$value' } },
        },
        {
          type: 'list_editor',
          bind: 'gate.denylist_users',
          label: '黑名单用户',
          action: { method: 'update_denylist', arg: { user_ids: '$value' } },
        },
        {
          type: 'list_editor',
          bind: 'gate.denylist_groups',
          label: '黑名单群',
          action: { method: 'update_denylist', arg: { group_ids: '$value' } },
        },
      ],
    },
    {
      id: 'owner',
      title: '主人',
      nodes: [
        {
          type: 'text',
          bind: 'owner',
          label: '主人 QQ',
          editable: true,
          action: { method: 'set_owner', arg: { owner_qq: '$value' } },
        },
        { type: 'button', label: '刷新状态', action: { method: 'get_state' } },
      ],
    },
  ],
};

/** QQ 状态文档（00 §三 cached_state 形状；id 一律字符串）。 */
function qqState(mode: string, allowlistUsers: string[]): Record<string, unknown> {
  return {
    instance: { webui_url: 'http://127.0.0.1:6099', bind_address: '0.0.0.0:3131' },
    running: true,
    online: true,
    self_id: '123456789',
    gate: {
      mode,
      allowlist_users: allowlistUsers,
      allowlist_groups: [],
      denylist_users: [],
      denylist_groups: [],
    },
    owner: 10001,
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
    state.adapterUiByKey = {};
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

  it('可见实例存在时挂载即请求适配器列表', async () => {
    state.adapters = [adapter()];
    state.connected = true;
    mountPanel();
    await nextTick();
    expect(sendMock).toHaveBeenCalledWith('RequestAdapterStatus', undefined);
  });
});

describe('AdapterPanel × 渲染器接线（03b S3）', () => {
  beforeEach(() => {
    // 渲染器控制项在断线时被外层禁用（`:disabled="!state.connected"`）。
    state.connected = true;
    state.adapters = [];
    state.adapterUiByKey = {};
    sendMock.mockClear();
    // 真实 adapterOps 发送路径：命令发出成功（否则拒发 reject）。
    sendMock.mockReturnValue(true);
    pendingMock.mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    state.connected = false;
    state.adapters = [];
    state.adapterUiByKey = {};
    sendMock.mockReset(); // 恢复默认返回值（undefined），清调用记录
  });

  it('有 ui：内嵌渲染器渲染真实 QQ 描述符（登录/消息门控/主人 3 panel）', () => {
    state.adapters = [adapter({ ui: QQ_DESCRIPTOR })];
    const w = mountPanel();
    expect(w.find('.adapter-ui').exists()).toBe(true);
    expect(w.findAll('.adapter-ui-panel')).toHaveLength(3);
    expect(w.findAll('.adapter-ui-panel__head h3').map((h) => h.text())).toEqual([
      '登录',
      '消息门控',
      '主人',
    ]);
    expect(w.text()).not.toContain('该适配器未提供管理界面');
  });

  it('无 ui：显示「未提供管理界面」占位且不渲染渲染器', () => {
    state.adapters = [adapter()]; // 未提供 ui
    const w = mountPanel();
    expect(w.text()).toContain('该适配器未提供管理界面');
    expect(w.find('.adapter-ui').exists()).toBe(false);
    expect(w.findAll('.adapter-ui-panel')).toHaveLength(0);
  });

  it('fixture：门控 select 读 gate.mode，点选发 InvokeAdapterOp 且 core/adapter 寻址正确', async () => {
    const key = scopedKey('core-a', 'qq');
    state.adapters = [adapter({ ui: QQ_DESCRIPTOR })];
    state.adapterUiByKey[key] = qqState('allowlist', ['10001']);
    const w = mountPanel({ teamId: 'alix', core: 'core-a' });
    sendMock.mockClear(); // 丢弃挂载刷新（RequestAdapterStatus）

    // 显示值 = 状态文档 gate.mode（allowlist → 白名单）
    const select = w.findComponent(NeumorphismSelect);
    expect(select.props('modelValue')).toBe('allowlist');
    expect(w.text()).toContain('仅响应名单内用户/群'); // options.hint 随选中项

    select.vm.$emit('change', 'denylist');
    await flushPromises();
    expect(sendMock).toHaveBeenCalledWith(
      { InvokeAdapterOp: { adapter: 'qq', method: 'set_gate_mode', payload: { mode: 'denylist' } } },
      'core-a',
    );
    // 渲染器 op 旁路通知经面板透传（03a §1.3；命令本身由渲染器直发）
    expect(w.emitted('op')?.[0]?.[0]).toMatchObject({
      method: 'set_gate_mode',
      payload: { mode: 'denylist' },
      nodeKey: 'gate/0/select',
    });

    // 模拟 AdapterOpResult 回推 → op-result 透传
    settleAdapterOp(adapterOpKey('core-a', 'qq', 'set_gate_mode'), { result: null, error: null });
    await flushPromises();
    expect(w.emitted('op-result')?.[0]?.[0]).toMatchObject({ method: 'set_gate_mode', ok: true });
  });

  it('多实例：切换实例后 select 跟随该实例状态文档，动作寻址选中实例', async () => {
    state.adapters = [
      adapter({ ui: QQ_DESCRIPTOR }),
      adapter({ name: 'qq-2', display_name: 'QQ（alix-2）', self_id: '10002', ui: QQ_DESCRIPTOR }),
    ];
    state.adapterUiByKey[scopedKey('core-a', 'qq')] = qqState('allowlist', ['10001']);
    state.adapterUiByKey[scopedKey('core-a', 'qq-2')] = qqState('none', ['20002']);
    const w = mountPanel({ teamId: 'alix', core: 'core-a' });
    sendMock.mockClear();

    expect(w.findComponent(NeumorphismSelect).props('modelValue')).toBe('allowlist');

    w.findComponent(NeumorphismSegmented).vm.$emit('change', 'qq-2');
    await nextTick();
    // :key = scopedKey(core, adapter) 重挂后读 qq-2 的状态文档（原 :212 语义）
    expect(w.findComponent(NeumorphismSelect).props('modelValue')).toBe('none');

    w.findComponent(NeumorphismSelect).vm.$emit('change', 'denylist');
    await flushPromises();
    expect(sendMock).toHaveBeenCalledWith(
      { InvokeAdapterOp: { adapter: 'qq-2', method: 'set_gate_mode', payload: { mode: 'denylist' } } },
      'core-a',
    );
    settleAdapterOp(adapterOpKey('core-a', 'qq-2', 'set_gate_mode'), { result: null, error: null });
    await flushPromises();
  });

  it('fixture：list_editor 增删发 update_allowlist 整表/单字段载荷', async () => {
    const key = scopedKey('core-a', 'qq');
    state.adapters = [adapter({ ui: QQ_DESCRIPTOR })];
    state.adapterUiByKey[key] = qqState('allowlist', ['10001']);
    const w = mountPanel({ teamId: 'alix', core: 'core-a' });
    sendMock.mockClear();

    const card = w.findAll('.list-editor-node')[0]; // gate 面板第一张 = 白名单用户
    expect(card.text()).toContain('白名单用户');
    await card.find('input').setValue('10002');
    await card
      .findAll('button')
      .find((b) => b.text().trim() === '添加')!
      .trigger('click');
    await flushPromises();
    expect(sendMock).toHaveBeenCalledWith(
      { InvokeAdapterOp: { adapter: 'qq', method: 'update_allowlist', payload: { user_ids: ['10001', '10002'] } } },
      'core-a',
    );

    // 模拟 AdapterState 回推（整文档替换）后移除一项：仍发整表
    settleAdapterOp(adapterOpKey('core-a', 'qq', 'update_allowlist'), { result: null, error: null });
    await flushPromises();
    state.adapterUiByKey[key] = qqState('allowlist', ['10001', '10002']);
    await nextTick();

    const row = card.findAll('.list-editor-node__row').find((r) => r.text().includes('10002'));
    expect(row).toBeTruthy();
    await row!.find('button').trigger('click'); // 移除 10002
    await flushPromises();
    expect(sendMock).toHaveBeenCalledWith(
      { InvokeAdapterOp: { adapter: 'qq', method: 'update_allowlist', payload: { user_ids: ['10001'] } } },
      'core-a',
    );
    settleAdapterOp(adapterOpKey('core-a', 'qq', 'update_allowlist'), { result: null, error: null });
    await flushPromises();
  });
});
