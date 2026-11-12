//! 「设置 · 面板 → 安全」的界面契约（2026-11）。
//!
//! 锁的是三个"看错就会把用户锁在门外"的点：
//!
//! 1. **读接口只给摘要** → 界面必须展示 `abcd…wxyz`，绝不回显明文；
//! 2. **保存令牌后立刻写进 localStorage** → 后端会在 2s 内断开所有中继
//!    （含当前这条），前端重连读的就是这个键。不写进去等于保存完就把自己
//!    锁在外面；
//! 3. **只切开关时请求体不带 token** → 服务端语义是"只改我给了的"，多带
//!    一个字段就可能顺手把令牌改掉。
//!
//! 另外两条纯前端判据：短令牌在本地就拦住（不必等服务端 400）、
//! `require_token && !token_set` 时必须显式警告"认证不会生效"。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

/** 可控的后端：每个用例改写 `respond` 决定下一次响应。 */
const calls: Array<{ url: string; init?: RequestInit }> = [];
let respond: (url: string, init?: RequestInit) => { status: number; body: unknown };
/** 确认框默认"用户点了确定"（个别用例可改成取消）。 */
let confirmResult = true;

vi.mock('../../connection', () => ({
  panelFetch: vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const { status, body } = respond(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }),
  sendCommand: vi.fn(),
}));

vi.mock('../../confirm', () => ({
  confirmDialog: vi.fn(async () => confirmResult),
}));

import PanelSecuritySettings from '../PanelSecuritySettings.vue';

const TOKEN = '0123456789abcdef0123456789abcdef';
const HINT = '0123…cdef';

const baseView = {
  token_set: true,
  token_hint: HINT,
  require_token: true,
  enforced: true,
  bind_address: '0.0.0.0:8080',
  loopback: false,
  config_writable: true,
};

function mountPage() {
  return mount(PanelSecuritySettings, {
    global: {
      stubs: {
        // ui-frame 组件走真实实现会很重（样式/交互），这里只关心契约：
        // 按钮保留可点击语义，其余渲染成占位。
        NeumorphismButton: {
          props: ['loading', 'disabled'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        NeumorphismCard: { template: '<div><slot /></div>' },
        NeumorphismTag: { template: '<span><slot /></span>' },
        NeumorphismInput: {
          props: ['modelValue', 'type'],
          emits: ['update:modelValue'],
          template:
            '<input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        NeumorphismSwitch: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<button class="switch" @click="$emit(\'update:modelValue\', !modelValue)" />',
        },
      },
    },
  });
}

beforeEach(() => {
  calls.length = 0;
  confirmResult = true;
  window.localStorage.clear();
  respond = () => ({ status: 200, body: baseView });
});

/** 等首次加载完成。 */
async function ready() {
  const wrapper = mountPage();
  await flushPromises();
  return wrapper;
}

describe('面板 · 安全', () => {
  it('只显示令牌摘要，不出现明文', async () => {
    const wrapper = await ready();
    const text = wrapper.text();
    expect(text).toContain(HINT);
    expect(text).not.toContain(TOKEN);
  });

  it('保存令牌后立刻写进 localStorage（否则重连就没有凭据）', async () => {
    const wrapper = await ready();
    respond = (_url, init) => {
      if (init?.method === 'POST') {
        return {
          status: 200,
          body: { ...baseView, token_hint: 'fedc…3210', persisted: true },
        };
      }
      return { status: 200, body: baseView };
    };
    const next = 'fedcba9876543210fedcba9876543210';
    await wrapper.find('input').setValue(next);
    // 「保存」是输入行里的第二个按钮（第一个是显示/隐藏）
    const buttons = wrapper.findAll('button').filter((b) => b.text() === '保存');
    expect(buttons).toHaveLength(1);
    await buttons[0].trigger('click');
    await flushPromises();

    expect(window.localStorage.getItem('echo-panel-token')).toBe(next);
    const post = calls.find((c) => c.init?.method === 'POST');
    expect(post, '没有发出 POST').toBeTruthy();
    expect(JSON.parse(String(post!.init!.body))).toEqual({ token: next });
  });

  it('只切开关时请求体不带 token（服务端语义是"只改我给了的"）', async () => {
    const wrapper = await ready();
    respond = (_url, init) =>
      init?.method === 'POST'
        ? { status: 200, body: { ...baseView, require_token: false, enforced: false } }
        : { status: 200, body: baseView };

    await wrapper.find('.switch').trigger('click');
    await flushPromises();

    const post = calls.find((c) => c.init?.method === 'POST');
    expect(post).toBeTruthy();
    expect(JSON.parse(String(post!.init!.body))).toEqual({ require_token: false });
  });

  it('生成令牌：把 token_once 写进 localStorage，并提示只显示一次', async () => {
    const wrapper = await ready();
    const issued = 'a'.repeat(64);
    respond = (_url, init) =>
      init?.method === 'POST'
        ? {
            status: 200,
            body: {
              ...baseView,
              token_once: issued,
              persisted: false,
              // 后端语义：persisted=false ⇔ 没有可写回的配置文件
              config_writable: false,
            },
          }
        : { status: 200, body: baseView };

    const generate = wrapper.findAll('button').find((b) => b.text().includes('生成随机令牌'));
    expect(generate).toBeTruthy();
    await generate!.trigger('click');
    await flushPromises();

    expect(window.localStorage.getItem('echo-panel-token')).toBe(issued);
    expect(wrapper.text()).toContain('只显示这一次');
    // persisted=false 时必须**常驻**说清"重启后恢复"（不能只靠 toast）
    expect(wrapper.text()).toContain('只在当前进程内有效');
    expect(wrapper.text()).toContain('重启后会恢复原值');
  });

  it('短令牌在本地就拦住（不发请求）', async () => {
    const wrapper = await ready();
    await wrapper.find('input').setValue('1234');
    await flushPromises();

    expect(wrapper.text()).toContain('至少 16 位');
    const save = wrapper.findAll('button').find((b) => b.text() === '保存');
    expect(save!.attributes('disabled')).toBeDefined();
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
  });

  it('勾了开关却没有令牌：显式警告"认证不会生效"', async () => {
    respond = () => ({
      status: 200,
      body: { ...baseView, token_set: false, token_hint: '', enforced: false },
    });
    const wrapper = await ready();
    expect(wrapper.text()).toContain('认证不会生效');
  });

  it('对外监听且无认证：警告端口可达（这条比开关状态更要紧）', async () => {
    respond = () => ({
      status: 200,
      body: { ...baseView, require_token: false, enforced: false },
    });
    const wrapper = await ready();
    expect(wrapper.text()).toContain('任何能访问');
  });

  it('用户取消确认框：不发请求、不写本地', async () => {
    const wrapper = await ready();
    confirmResult = false;
    const next = 'fedcba9876543210fedcba9876543210';
    await wrapper.find('input').setValue(next);
    const save = wrapper.findAll('button').find((b) => b.text() === '保存');
    await save!.trigger('click');
    await flushPromises();

    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
    expect(window.localStorage.getItem('echo-panel-token')).toBeNull();
  });
});
