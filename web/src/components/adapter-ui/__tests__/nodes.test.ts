//! nodes.test.ts（03a §5.3）：七类节点逐类——渲染值 / 交互载荷 / 在途态 /
//! 错误态 / 禁用态（meta.running=false）。
//!
//! 挂载整个 AdapterUiRenderer（单节点描述符 + 单节点 panel）而非裸节点组件：
//! 获得真实 provide 上下文与命令总线；mock 边界只有 `invokeAdapterOp`
//!（03a §5：不 mock 节点组件和 ui-frame）。

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('../../../adapterOps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../adapterOps')>();
  return { ...actual, invokeAdapterOp: vi.fn() };
});

import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import AdapterUiRenderer from '../AdapterUiRenderer.vue';
import { settleConfirm } from '../../../confirm';
import { invokeAdapterOp, type AdapterOpOutcome } from '../../../adapterOps';
import type { AdapterUiMeta } from '../types';

const invokeMock = vi.mocked(invokeAdapterOp);

const META: AdapterUiMeta = { core: 'core-a', adapter: 'qq', running: true, connected: true };

/** 挂一个 renderer，panel 内只含给定节点（panel id = p，节点 index = 0）。 */
function mountNode(
  node: Record<string, unknown>,
  state: Record<string, unknown> | null = {},
  meta: Partial<AdapterUiMeta> = {},
) {
  return mount(AdapterUiRenderer, {
    props: {
      descriptor: { version: 1, panels: [{ id: 'p', nodes: [node] }] },
      state,
      meta: { ...META, ...meta },
    },
  });
}

function hanging(): Promise<AdapterOpOutcome> {
  return new Promise<AdapterOpOutcome>(() => {});
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** 按文本精确查找按钮（找不到直接抛错，便于定位）。 */
function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === text);
  if (!btn) throw new Error(`未找到按钮：${text}`);
  return btn;
}

function warningCodes(wrapper: ReturnType<typeof mount>): string[] {
  return (wrapper.emitted('warning') ?? []).map((args) => (args[0] as { code: string }).code);
}

/** select 的 change 走组件 emit（下拉 teleport 到 body，直接 emit 更稳）。 */
function emitSelect(wrapper: ReturnType<typeof mount>, value: string): void {
  wrapper.findComponent(NeumorphismSelect).vm.$emit('change', value);
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation(() => hanging()); // 默认挂起；用例按需给出结算
});

describe('status 节点（03a §2.1）', () => {
  const node = { type: 'status', bind: 'online', label: 'QQ 连接' };

  it('true → 绿点「在线」；false → 灰点「离线」', () => {
    const on = mountNode(node, { online: true });
    expect(on.find('.nm-status-dot').classes()).toContain('nm-status-dot--online');
    expect(on.find('.status-node__text').text()).toBe('在线');
    expect(on.text()).toContain('QQ 连接');

    const off = mountNode(node, { online: false });
    expect(off.find('.nm-status-dot').classes()).toContain('nm-status-dot--offline');
    expect(off.find('.status-node__text').text()).toBe('离线');
  });

  it('字符串原样显示（中性灰点）；undefined / state=null → 未知', () => {
    const s = mountNode(node, { online: '连接中' });
    expect(s.find('.status-node__text').text()).toBe('连接中');
    expect(s.find('.nm-status-dot').classes()).toContain('nm-status-dot--offline');

    expect(mountNode(node, {}).find('.status-node__text').text()).toBe('未知');
    expect(mountNode(node, null).find('.status-node__text').text()).toBe('未知');
  });

  it('声明 action 被忽略：bad_field warning、不发命令', () => {
    const w = mountNode({ ...node, action: { method: 'set_gate_mode' } }, { online: true });
    expect(warningCodes(w)).toContain('bad_field');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe('text 节点（03a §2.2）', () => {
  const editable = {
    type: 'text',
    bind: 'owner',
    label: '主人 QQ',
    editable: true,
    action: { method: 'set_owner', arg: { owner_qq: '$value' } },
  };

  it('只读：number 也以字符串展示 + 复制按钮', () => {
    const w = mountNode({ type: 'text', bind: 'self_id', label: '账号' }, { self_id: 12345 });
    expect(w.find('.text-node__value').text()).toBe('12345');
    expect(findButton(w, '复制')).toBeTruthy();
    expect(w.find('input').exists()).toBe(false);
  });

  it('可编辑：输入 "10001" 保存 → 载荷 {owner_qq:"10001"}', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode(editable, { owner: 10002 });
    const input = w.find('input');
    expect((input.element as HTMLInputElement).value).toBe('10002');
    await input.setValue('10001');
    await findButton(w, '保存').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'set_owner', { owner_qq: '10001' });
  });

  it('空串不允许提交（保存禁用）', async () => {
    const w = mountNode(editable, { owner: 10002 });
    await w.find('input').setValue('');
    expect(findButton(w, '保存').attributes('disabled')).toBeDefined();
  });

  it('用户脏输入不被 state 更新覆盖', async () => {
    const w = mountNode(editable, { owner: 10002 });
    await w.find('input').setValue('abc');
    await w.setProps({ state: { owner: 999 } });
    await nextTick();
    expect((w.find('input').element as HTMLInputElement).value).toBe('abc');
  });

  it('在途：输入与按钮禁用 + loading；错误态显示报错文本', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode(editable, { owner: 10002 });
    await findButton(w, '保存').trigger('click');
    await flushPromises();
    expect(w.find('input').attributes('disabled')).toBeDefined();
    expect(findButton(w, '保存').classes()).toContain('nm-button--loading');

    d.resolve({ result: null, error: '校验失败：QQ 号非法' });
    await flushPromises();
    expect(w.find('.nm-alert__message').text()).toBe('校验失败：QQ 号非法');
    expect(w.find('input').attributes('disabled')).toBeUndefined();
  });

  it('禁用态：meta.running=false → 输入与保存均禁用', () => {
    const w = mountNode(editable, { owner: 10002 }, { running: false });
    expect(w.find('input').attributes('disabled')).toBeDefined();
    expect(findButton(w, '保存').attributes('disabled')).toBeDefined();
  });

  it('state=null：可编辑模式显示 skeleton（03a §2.0 null 态）', () => {
    const w = mountNode(editable, null);
    expect(w.find('.text-node__skeleton').exists()).toBe(true);
    expect(w.find('input').exists()).toBe(false);
  });
});

describe('link 节点（03a §2.3）', () => {
  it('http(s) 渲染 <a target=_blank rel=noopener noreferrer>，文字为 label', () => {
    const w = mountNode(
      { type: 'link', bind: 'instance.webui_url', label: '打开 NapCat WebUI' },
      { instance: { webui_url: 'http://127.0.0.1:6099' } },
    );
    const a = w.find('a');
    expect(a.attributes('href')).toBe('http://127.0.0.1:6099');
    expect(a.attributes('target')).toBe('_blank');
    expect(a.attributes('rel')).toBe('noopener noreferrer');
    expect(a.text()).toBe('打开 NapCat WebUI');
  });

  it('javascript: 协议不渲染 + bad_field warning', () => {
    const w = mountNode(
      { type: 'link', bind: 'instance.webui_url', label: 'webui' },
      { instance: { webui_url: 'javascript:alert(1)' } },
    );
    expect(w.find('a').exists()).toBe(false);
    expect(warningCodes(w)).toContain('bad_field');
  });

  it('空值不渲染链接、不告警', () => {
    const w = mountNode({ type: 'link', bind: 'instance.webui_url', label: 'webui' }, { instance: {} });
    expect(w.find('a').exists()).toBe(false);
    expect(warningCodes(w)).toEqual([]);
  });
});

describe('select 节点（03a §2.4）', () => {
  const node = {
    type: 'select',
    bind: 'gate.mode',
    label: '门控模式',
    options: [
      { value: 'none', label: '不限制', hint: '所有消息均响应' },
      { value: 'allowlist', label: '白名单', hint: '仅名单内用户/群' },
      { value: 'denylist', label: '黑名单', hint: '忽略名单内用户/群' },
    ],
    action: { method: 'set_gate_mode', arg: { mode: '$value' } },
  };
  const stateOf = (mode: string) => ({ gate: { mode } });

  it('显示 state 值；hint 随选中项（GATE_HINTS parity）', () => {
    const w = mountNode(node, stateOf('allowlist'));
    expect(w.find('.nm-select__value').text()).toBe('白名单');
    expect(w.find('.select-node__head').text()).toContain('仅名单内用户/群');
  });

  it('change → 载荷严格 {mode:"denylist"}、method/核心为 meta 值', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode(node, stateOf('allowlist'));
    emitSelect(w, 'denylist');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'set_gate_mode', { mode: 'denylist' });
  });

  it('选中值等于 state 现值时不发命令', async () => {
    const w = mountNode(node, stateOf('allowlist'));
    emitSelect(w, 'allowlist');
    await flushPromises();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('在途：禁用 + 显示临时值；失败回弹 state 值 + 错误提示', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode(node, stateOf('allowlist'));
    emitSelect(w, 'denylist');
    await flushPromises();
    expect(w.find('.nm-select').classes()).toContain('nm-select--disabled');
    expect(w.find('.nm-select__value').text()).toBe('黑名单'); // 临时值

    d.resolve({ result: null, error: '切换失败' });
    await flushPromises();
    expect(w.find('.nm-select__value').text()).toBe('白名单'); // 回弹
    expect(w.find('.nm-alert__message').text()).toBe('切换失败');
    expect(w.find('.nm-select').classes()).not.toContain('nm-select--disabled');
  });

  it('无 action → 只读（disabled）；state=null → skeleton', () => {
    const readonly = mountNode({ ...node, action: undefined }, stateOf('allowlist'));
    expect(readonly.find('.nm-select').classes()).toContain('nm-select--disabled');
    const nullState = mountNode(node, null);
    expect(nullState.find('.select-node .nm-skeleton').exists()).toBe(true);
  });

  it('禁用态：meta.running=false 时 change 不发命令', async () => {
    const w = mountNode(node, stateOf('allowlist'), { running: false });
    expect(w.find('.nm-select').classes()).toContain('nm-select--disabled');
    emitSelect(w, 'denylist');
    await flushPromises();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe('list_editor 节点（03a §2.5）', () => {
  const node = {
    type: 'list_editor',
    bind: 'gate.allowlist_users',
    label: '白名单用户',
    action: { method: 'update_allowlist', arg: { user_ids: '$value' } },
  };
  const stateOf = (list: unknown) => ({ gate: { allowlist_users: list } });

  it('渲染徽标与条目；添加 "42" → 载荷 {user_ids:[旧...,"42"]}', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode(node, stateOf(['1', '2']));
    expect(w.find('.nm-badge__text').text()).toBe('2');
    expect(w.findAll('.list-editor-node__item').map((i) => i.text())).toEqual(['1', '2']);
    await w.find('input').setValue('42');
    await findButton(w, '添加').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'update_allowlist', {
      user_ids: ['1', '2', '42'],
    });
  });

  it('重复添加不发 + 提示；trim 后空不发（添加禁用）', async () => {
    const w = mountNode(node, stateOf(['1']));
    await w.find('input').setValue('1');
    await findButton(w, '添加').trigger('click');
    await flushPromises();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(w.text()).toContain('「1」已在列表中');

    await w.find('input').setValue('   ');
    expect(findButton(w, '添加').attributes('disabled')).toBeDefined();
  });

  it('移除 → 载荷少一项（每次发整表）', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode(node, stateOf(['1', '2']));
    await findButton(w, '移除').trigger('click'); // 第一行 = "1"
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'update_allowlist', { user_ids: ['2'] });
  });

  it('非数组 bind 视为空 + Empty；在途整卡禁用', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode(node, stateOf('bad'));
    expect(w.find('.nm-empty__description').text()).toBe('未添加');

    await w.find('input').setValue('42');
    await findButton(w, '添加').trigger('click');
    await flushPromises();
    expect(w.find('.list-editor-node').classes()).toContain('is-pending');
    expect(w.find('input').attributes('disabled')).toBeDefined();
    expect(findButton(w, '移除').attributes('disabled')).toBeDefined(); // 临时列表行

    d.resolve({ result: null, error: null });
    await flushPromises();
    expect(w.find('.list-editor-node').classes()).not.toContain('is-pending');
  });

  it('错误态提示；禁用态（running=false）输入与添加按钮禁用', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode(node, stateOf(['1']));
    await w.find('input').setValue('42');
    await findButton(w, '添加').trigger('click');
    await flushPromises();
    d.resolve({ result: null, error: '写入失败' });
    await flushPromises();
    expect(w.find('.nm-alert__message').text()).toBe('写入失败');

    const off = mountNode(node, stateOf(['1']), { running: false });
    expect(off.find('input').attributes('disabled')).toBeDefined();
    expect(findButton(off, '添加').attributes('disabled')).toBeDefined();
  });
});

describe('image 节点（03a §2.6 / §4.3）', () => {
  const node = {
    type: 'image',
    label: '登录二维码',
    clear_when: 'online',
    fetch: { method: 'login_qrcode', result_key: 'png_base64' },
  };

  it('初始不自动 fetch；点击 → login_qrcode {}；结果渲染 data URL + alt', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode(node, { online: false });
    expect(invokeMock).not.toHaveBeenCalled(); // 不自动拉取（二维码生成有副作用）

    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'login_qrcode', {});

    d.resolve({ result: { png_base64: 'QUJD' }, error: null });
    await flushPromises();
    const img = w.find('img.image-node__img');
    expect(img.attributes('src')).toBe('data:image/png;base64,QUJD');
    expect(img.attributes('alt')).toBe('登录二维码');
    expect(w.findAll('button').some((b) => b.text().trim() === '刷新')).toBe(true);
  });

  it('result_key 缺失 / 非字符串 → 「未返回图片」错误态', async () => {
    invokeMock.mockResolvedValue({ result: { other: 'x' }, error: null });
    const w = mountNode(node, { online: false });
    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(w.find('.image-node__error').text()).toBe('未返回图片');
    expect(w.find('img').exists()).toBe(false);
  });

  it('命令失败 → 占位框显示错误', async () => {
    invokeMock.mockResolvedValue({ result: null, error: '拉取失败' });
    const w = mountNode(node, { online: false });
    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(w.find('.image-node__error').text()).toBe('拉取失败');
  });

  it('在途：按钮 loading + 占位；重复点击被忽略', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode(node, { online: false });
    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(findButton(w, '获取').classes()).toContain('nm-button--loading');
    expect(w.find('.image-node__placeholder').text()).toBe('获取中…');

    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1);

    d.resolve({ result: { png_base64: 'QUJD' }, error: null });
    await flushPromises();
  });

  it('clear_when false→true 清图；running→false 清图并禁用', async () => {
    invokeMock.mockResolvedValue({ result: { png_base64: 'QUJD' }, error: null });
    const w = mountNode(node, { online: false });
    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(w.find('img').exists()).toBe(true);

    await w.setProps({ state: { online: true } });
    await nextTick();
    expect(w.find('img').exists()).toBe(false); // 登录成功清二维码

    await findButton(w, '获取').trigger('click');
    await flushPromises();
    expect(w.find('img').exists()).toBe(true);

    await w.setProps({ meta: { ...META, running: false } });
    await nextTick();
    expect(w.find('img').exists()).toBe(false);
    expect(findButton(w, '获取').attributes('disabled')).toBeDefined();
  });
});

describe('button 节点（03a §2.7）', () => {
  it('点击发送；arg 缺省 → 载荷 {}；字符串 result 短暂提示', async () => {
    invokeMock.mockResolvedValue({ result: '已刷新', error: null });
    const w = mountNode({ type: 'button', label: '刷新状态', action: { method: 'get_state' } });
    await findButton(w, '刷新状态').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'get_state', {});
    expect(w.find('.button-node__notice').text()).toBe('已刷新');
  });

  it('arg 对象原样作为载荷', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode({
      type: 'button',
      label: 'B',
      action: { method: 'm', arg: { a: 1, nested: { b: 2 } } },
    });
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'm', { a: 1, nested: { b: 2 } });
  });

  it('arg 含 $value：替换为 null + bad_field warning', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode({ type: 'button', label: 'B', action: { method: 'm', arg: { target: '$value' } } });
    expect(warningCodes(w)).toContain('bad_field');
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'm', { target: null });
  });

  it('在途重复点击只发送一次；禁用态不发', async () => {
    const d = deferred<AdapterOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountNode({ type: 'button', label: 'B', action: { method: 'm' } });
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    d.resolve({ result: null, error: null });
    await flushPromises();

    const off = mountNode({ type: 'button', label: 'B', action: { method: 'm' } }, {}, { running: false });
    expect(findButton(off, 'B').attributes('disabled')).toBeDefined();
    await findButton(off, 'B').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1); // 未新增
  });

  it('错误态显示（如插件返回 unknown method）', async () => {
    invokeMock.mockResolvedValue({ result: null, error: 'unknown method' });
    const w = mountNode({ type: 'button', label: 'B', action: { method: 'no_such_op' } });
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    expect(w.find('.nm-alert__message').text()).toBe('unknown method');
  });

  it('confirm：取消不发、确认后发送', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountNode({ type: 'button', label: '重置', confirm: '确定重置？', action: { method: 'reset' } });

    await findButton(w, '重置').trigger('click');
    await nextTick();
    expect(invokeMock).not.toHaveBeenCalled();
    settleConfirm(false); // 取消
    await flushPromises();
    expect(invokeMock).not.toHaveBeenCalled();

    await findButton(w, '重置').trigger('click');
    await nextTick();
    settleConfirm(true); // 确认
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'reset', {});
  });
});
