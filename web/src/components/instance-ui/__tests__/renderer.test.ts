//! renderer.test.ts（03a §5.2 / §5.4 / §5.5）：容错（未知节点/未知 action/
//! 缺 descriptor/state=null）、接线与并发（路由/同 method 串行/多实例隔离/
//! 卸载丢弃/state 回推/emits）、QQ 真实描述符集成（ui.rs fixture）。
//!
//! mock 边界只有 `invokeInstanceOp`（03a §5：不 mock 节点组件和 ui-frame）。

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount, type BaseWrapper } from '@vue/test-utils';

vi.mock('../../../instanceOps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../instanceOps')>();
  return { ...actual, invokeInstanceOp: vi.fn() };
});

import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import InstanceUiRenderer from '../InstanceUiRenderer.vue';
import { invokeInstanceOp, type InstanceOpOutcome } from '../../../instanceOps';
import type { InstanceUiMeta, UiWarning } from '../types';

const invokeMock = vi.mocked(invokeInstanceOp);

const META: InstanceUiMeta = { core: 'core-a', instance: 'qq', running: true, connected: true };

function mountRenderer(
  descriptor: unknown,
  state: Record<string, unknown> | null = {},
  meta: Partial<InstanceUiMeta> = {},
) {
  return mount(InstanceUiRenderer, {
    props: { descriptor, state, meta: { ...META, ...meta } },
  });
}

function hanging(): Promise<InstanceOpOutcome> {
  return new Promise<InstanceOpOutcome>(() => {});
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

/** 按文本精确查找按钮（顶层 VueWrapper 与节点内 DOMWrapper 通用）。 */
function findButton(wrapper: BaseWrapper<Node>, text: string) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === text);
  if (!btn) throw new Error(`未找到按钮：${text}`);
  return btn;
}

function warningCodes(wrapper: ReturnType<typeof mount>): string[] {
  return (wrapper.emitted('warning') ?? []).map((args) => (args[0] as UiWarning).code);
}

function emitSelect(wrapper: ReturnType<typeof mount>, value: string): void {
  wrapper.findComponent(NeumorphismSelect).vm.$emit('change', value);
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation(() => hanging());
});

describe('渲染器：解析容错（03a §5.2 / §3.2）', () => {
  it('未知节点静默跳过：只渲染 text；同 type 只发一次 unknown_node', () => {
    const w = mountRenderer(
      {
        version: 1,
        panels: [
          {
            id: 'p',
            nodes: [{ type: 'slider' }, { type: 'slider' }, { type: 'text', bind: 'self_id' }],
          },
        ],
      },
      { self_id: '10001' },
    );
    expect(w.findAll('.instance-node')).toHaveLength(1);
    expect(w.find('.text-node__value').text()).toBe('10001');
    expect(warningCodes(w).filter((c) => c === 'unknown_node')).toHaveLength(1);
  });

  it('缺 type 的节点同样忽略', () => {
    const w = mountRenderer(
      { version: 1, panels: [{ id: 'p', nodes: [{ foo: 1 }, { type: 'text', bind: 'self_id' }] }] },
      { self_id: 'x' },
    );
    expect(w.findAll('.instance-node')).toHaveLength(1);
    expect(warningCodes(w)).toContain('unknown_node');
  });

  it('已知节点上的未知字段忽略、不产生 warning', () => {
    const w = mountRenderer(
      { version: 1, panels: [{ id: 'p', nodes: [{ type: 'text', bind: 'self_id', foo: 1 }] }] },
      { self_id: 'x' },
    );
    expect(w.find('.text-node__value').text()).toBe('x');
    expect(w.emitted('warning')).toBeUndefined();
  });

  it('未知 method 照发；插件报错 → 节点错误态', async () => {
    invokeMock.mockResolvedValue({ result: null, error: 'unknown method' });
    const w = mountRenderer({
      version: 1,
      panels: [{ id: 'p', nodes: [{ type: 'button', label: 'B', action: { method: 'no_such_op' } }] }],
    });
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'no_such_op', {});
    expect(w.find('.nm-alert__message').text()).toBe('unknown method');
  });

  it('非法 method 形状：button 不渲染 + unknown_action warning、不发命令', async () => {
    for (const method of ['', 'a b']) {
      const w = mountRenderer({
        version: 1,
        panels: [{ id: 'p', nodes: [{ type: 'button', label: 'B', action: { method } }] }],
      });
      expect(w.find('.button-node').exists()).toBe(false);
      expect(warningCodes(w)).toContain('unknown_action');
    }
    await flushPromises();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('descriptor=null / undefined / 缺省 → 渲染空、无 warning', () => {
    for (const descriptor of [null, undefined]) {
      const w = mountRenderer(descriptor);
      expect(w.find('.instance-ui').exists()).toBe(true);
      expect(w.find('.nm-card').exists()).toBe(false);
      expect(w.emitted('warning')).toBeUndefined();
    }
    // 整个 prop 缺省（不传 descriptor）
    const w2 = mount(InstanceUiRenderer, { props: { state: null, meta: META } });
    expect(w2.find('.nm-card').exists()).toBe(false);
    expect(w2.emitted('warning')).toBeUndefined();
  });

  it('state=null：只读节点显示「—」、可编辑节点显示 skeleton（§2.0 null 态）', () => {
    const w = mountRenderer(
      {
        version: 1,
        panels: [
          {
            id: 'p',
            nodes: [
              { type: 'text', bind: 'self_id', label: '账号' },
              {
                type: 'text',
                bind: 'owner',
                label: '主人',
                editable: true,
                action: { method: 'set_owner', arg: { owner_qq: '$value' } },
              },
              {
                type: 'select',
                bind: 'gate.mode',
                options: ['a'],
                action: { method: 'set_gate_mode', arg: { mode: '$value' } },
              },
            ],
          },
        ],
      },
      null,
    );
    const texts = w.findAll('.text-node');
    expect(texts[0].find('.text-node__value').text()).toBe('—');
    expect(texts[1].find('.text-node__skeleton').exists()).toBe(true);
    expect(w.find('.select-node__skeleton').exists()).toBe(true);
    expect(w.find('.nm-select').exists()).toBe(false);
  });
});

describe('渲染器：接线与并发（03a §5.4）', () => {
  const buttonNode = { type: 'button', label: 'B', action: { method: 'm' } };
  const descriptorOf = (nodes: unknown[]) => ({ version: 1, panels: [{ id: 'p', nodes }] });

  it('路由：core/instance 使用 meta 显式值（不依赖默认推断）', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountRenderer(descriptorOf([buttonNode]), {}, { core: 'core-zz', instance: 'instance-x' });
    await findButton(w, 'B').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-zz', 'instance-x', 'm', {});
  });

  it('同 method 串行：第二个请求等第一个 settle 才发出', async () => {
    const d1 = deferred<InstanceOpOutcome>();
    const d2 = deferred<InstanceOpOutcome>();
    invokeMock
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise)
      .mockImplementation(() => hanging());
    const listNode = (label: string) => ({
      type: 'list_editor',
      bind: 'gate.allowlist_users',
      label,
      action: { method: 'update_allowlist', arg: { user_ids: '$value' } },
    });
    const w = mountRenderer(descriptorOf([listNode('A'), listNode('B')]), {
      gate: { allowlist_users: [] },
    });
    const inputs = w.findAll('input');
    await inputs[0].setValue('1');
    await inputs[1].setValue('2');
    const addButtons = w.findAll('button').filter((b) => b.text().trim() === '添加');
    expect(addButtons).toHaveLength(2);

    await addButtons[0].trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1);

    await addButtons[1].trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(1); // 同 method 排队中

    d1.resolve({ result: null, error: null });
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledTimes(2); // 第一个 settle 后放行

    d2.resolve({ result: null, error: null });
    await flushPromises();
  });

  it('多实例二维码隔离：各自 fetch 的结果只显示在自己的 renderer', async () => {
    const byCore: Record<string, ReturnType<typeof deferred<InstanceOpOutcome>>> = {};
    invokeMock.mockImplementation((core) => {
      const d = deferred<InstanceOpOutcome>();
      byCore[String(core)] = d;
      return d.promise;
    });
    const descriptor = descriptorOf([
      { type: 'image', label: '二维码', fetch: { method: 'login_qrcode', result_key: 'png_base64' } },
    ]);
    const a = mountRenderer(descriptor, {}, { core: 'core-a', instance: 'qq' });
    const b = mountRenderer(descriptor, {}, { core: 'core-b', instance: 'qq' });

    await findButton(a, '获取').trigger('click');
    await findButton(b, '获取').trigger('click');
    await flushPromises();
    expect(Object.keys(byCore).sort()).toEqual(['core-a', 'core-b']);

    byCore['core-b'].resolve({ result: { png_base64: 'QkI=' }, error: null }); // B 先回
    await flushPromises();
    byCore['core-a'].resolve({ result: { png_base64: 'QUE=' }, error: null }); // A 后回
    await flushPromises();

    expect(a.find('img').attributes('src')).toBe('data:image/png;base64,QUE=');
    expect(b.find('img').attributes('src')).toBe('data:image/png;base64,QkI=');
  });

  it('卸载丢弃：fetch 在途时卸载，随后 resolve 不报错、不写入', async () => {
    const d = deferred<InstanceOpOutcome>();
    invokeMock.mockImplementation(() => d.promise);
    const w = mountRenderer(
      descriptorOf([
        { type: 'image', label: '二维码', fetch: { method: 'login_qrcode', result_key: 'png_base64' } },
      ]),
    );
    await findButton(w, '获取').trigger('click');
    await flushPromises();
    w.unmount();

    d.resolve({ result: { png_base64: 'QUJD' }, error: null });
    await flushPromises(); // 不抛错（卸载后结果丢弃，04a §4.3-2）
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('state 回推：临时值在结果回来后清除、显示切到新 state 值', async () => {
    invokeMock.mockResolvedValue({ result: null, error: null });
    const w = mountRenderer(
      descriptorOf([
        {
          type: 'select',
          bind: 'gate.mode',
          label: '门控模式',
          options: [
            { value: 'allowlist', label: '白名单' },
            { value: 'denylist', label: '黑名单' },
          ],
          action: { method: 'set_gate_mode', arg: { mode: '$value' } },
        },
      ]),
      { gate: { mode: 'allowlist' } },
    );
    expect(w.find('.nm-select__value').text()).toBe('白名单');

    emitSelect(w, 'denylist');
    await flushPromises();
    expect(w.find('.nm-select__value').text()).toBe('白名单'); // 结果回来、临时值清除，回到 state 投影

    await w.setProps({ state: { gate: { mode: 'denylist' } } });
    await nextTick();
    expect(w.find('.nm-select__value').text()).toBe('黑名单');
  });

  it('emits：发送前 emit op、结算后 emit op-result（nodeKey = panel.id/index/type）', async () => {
    invokeMock.mockResolvedValue({ result: { ok: 1 }, error: null });
    const w = mountRenderer(descriptorOf([{ type: 'button', label: 'B', action: { method: 'm', arg: { a: 1 } } }]), {}, {
      core: 'c9',
      instance: 'a9',
    });
    await findButton(w, 'B').trigger('click');
    await flushPromises();

    const ops = w.emitted('op');
    expect(ops).toHaveLength(1);
    expect(ops![0][0]).toMatchObject({ method: 'm', payload: { a: 1 }, nodeKey: 'p/0/button' });
    const results = w.emitted('op-result');
    expect(results).toHaveLength(1);
    expect(results![0][0]).toMatchObject({ method: 'm', ok: true, nodeKey: 'p/0/button' });
  });
});

describe('QQ 真实描述符（ui.rs fixture，03a §5.5 集成）', () => {
  /** 与 echo-instance-qq `ui.rs::ui_descriptor()` 等价的 JSON（3 panel / 7 类节点）。 */
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

  /** 00 §三 cached_state 样例（id 一律字符串）。 */
  const QQ_STATE = {
    instance: {
      persona: 'alix',
      container: 'qq',
      webui_url: 'http://127.0.0.1:6099',
      onebot_url: 'http://127.0.0.1:3000',
      bind_address: '0.0.0.0:3131',
    },
    running: true,
    online: true,
    self_id: '123456789',
    gate: {
      mode: 'allowlist',
      allowlist_users: ['10001'],
      allowlist_groups: ['20001'],
      denylist_users: [],
      denylist_groups: [],
    },
    owner: 10001,
  };

  it('3 panel / 7 类节点齐备且渲染（无 warning）', () => {
    const w = mountRenderer(QQ_DESCRIPTOR, QQ_STATE);
    expect(w.findAll('.nm-card')).toHaveLength(3);
    expect(w.find('.status-node .nm-status-dot').classes()).toContain('nm-status-dot--online');
    expect(w.find('.status-node__text').text()).toBe('在线');
    expect(w.findAll('.text-node')).toHaveLength(2);
    expect(w.find('.image-node').exists()).toBe(true);
    expect(w.find('.link-node a').attributes('href')).toBe('http://127.0.0.1:6099');
    expect(w.find('.select-node').exists()).toBe(true);
    expect(w.findAll('.list-editor-node')).toHaveLength(4);
    expect(w.find('.button-node').exists()).toBe(true);
    expect(w.find('.text-node__value').text()).toBe('123456789');
    expect(w.emitted('warning')).toBeUndefined();
  });

  it('关键 action 载荷正确（select / list_editor / set_owner / button / image fetch）', async () => {
    invokeMock.mockImplementation((_core, _instance, method) =>
      method === 'login_qrcode'
        ? Promise.resolve({ result: { png_base64: 'QUJD' }, error: null })
        : Promise.resolve({ result: null, error: null }),
    );
    const w = mountRenderer(QQ_DESCRIPTOR, QQ_STATE);

    // select：门控模式 → set_gate_mode {mode}
    emitSelect(w, 'denylist');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'set_gate_mode', { mode: 'denylist' });

    // list_editor：白名单用户（部分载荷 user_ids）+ 白名单群（group_ids）
    const users = w.findAll('.list-editor-node')[0];
    await users.find('input').setValue('10002');
    await findButton(users, '添加').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'update_allowlist', {
      user_ids: ['10001', '10002'],
    });

    const groups = w.findAll('.list-editor-node')[1];
    await groups.find('input').setValue('20002');
    await findButton(groups, '添加').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'update_allowlist', {
      group_ids: ['20001', '20002'],
    });

    // text（editable）：set_owner {owner_qq}
    const ownerNode = w.findAll('.text-node').find((t) => t.find('input').exists())!;
    await ownerNode.find('input').setValue('10086');
    await findButton(ownerNode, '保存').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'set_owner', { owner_qq: '10086' });

    // button：刷新状态 → get_state {}
    await findButton(w, '刷新状态').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'get_state', {});

    // image：login_qrcode {} → data URL
    const image = w.find('.image-node');
    await findButton(image, '获取').trigger('click');
    await flushPromises();
    expect(invokeMock).toHaveBeenCalledWith('core-a', 'qq', 'login_qrcode', {});
    expect(image.find('img').attributes('src')).toBe('data:image/png;base64,QUJD');
    expect(image.find('img').attributes('alt')).toBe('登录二维码');
  });
});
