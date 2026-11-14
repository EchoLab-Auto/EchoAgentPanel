//! ChatGPT 订阅登录在设置页的契约（2026-11）。
//!
//! 背景：登录原本只有 CLI（`echo-agent-core login-chatgpt`），用户的诉求是
//! 「在设置里创建供应商时触发」。这条链路涉及三个容易错的地方，本文件各锁一条：
//!
//! 1. **命令的线格式**：`StartChatGptLogin` 是**无载荷变体**，必须发裸字符串
//!    `"StartChatGptLogin"`。发 `{ StartChatGptLogin: {} }` Core 会反序列化失败
//!    并**静默丢帧**——面板看起来点了没反应（ProDocRoots 踩过同一个坑）。
//! 2. **URL 只在 pending 期间存在**：登录结果一到就清空。留着会让用户对着一份
//!    已作废的授权链接反复点（state 已经换过，回调必然被判"不匹配"）。
//! 3. **登录块只在该 provider 下出现**：其它 provider 看到「登录 ChatGPT」会
//!    困惑自己是不是漏了一步。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const sendCommand = vi.fn();
vi.mock('../../connection', () => ({
  sendCommand: (...args: unknown[]) => sendCommand(...args),
  sendPending: vi.fn((command: unknown) => sendCommand(command)),
}));

import ApiSettings from '../ApiSettings.vue';
import { state } from '../../store';
import { reduce } from '../../state';
import type { BackendEvent } from '../../protocol';

function resetState() {
  // `profiles` 挂在 `state.api` 上（`ApiConfig.profiles`），不是顶层字段。
  state.api = null;
  state.teams = [];
  state.toasts = [];
  state.chatgptLogin = {
    url: null,
    redirectUri: '',
    pending: false,
    error: null,
    status: null,
  };
}

/** 打开「添加 API 服务商」表单并选中 ChatGPT 订阅模板。 */
async function mountWithChatGpt(wrapper = mount(ApiSettings)) {
  await wrapper.find('.profile-add-row button').trigger('click');
  const template = wrapper
    .findAll('.template-item')
    .find((item) => item.find('.template-name').text() === 'ChatGPT 订阅');
  expect(template, '模板里应有「ChatGPT 订阅」').toBeTruthy();
  await template!.trigger('click');
  return wrapper;
}

/** 发一条 Core → Panel 事件。 */
function feed(event: Record<string, unknown>) {
  reduce(state, event as unknown as BackendEvent);
}

describe('ApiSettings · ChatGPT 订阅登录', () => {
  beforeEach(() => {
    resetState();
    sendCommand.mockClear();
  });

  it('进入设置页就拉一次登录态', () => {
    mount(ApiSettings);
    // 不依赖用户先点开表单：设置页一打开就要知道是否已登录。
    const names = sendCommand.mock.calls.map((call) => call[0]);
    expect(names).toContain('RequestChatGptStatus');
  });

  it('非该 provider 时不显示登录块', async () => {
    const wrapper = await mountWithChatGpt();
    expect(wrapper.find('.chatgpt-login').exists()).toBe(true);
    // 切回 DeepSeek 模板：登录块应消失。
    const deepseek = wrapper
      .findAll('.template-item')
      .find((item) => item.find('.template-name').text() === 'DeepSeek');
    await deepseek!.trigger('click');
    expect(wrapper.find('.chatgpt-login').exists()).toBe(false);
  });

  it('点「登录」发的是裸字符串命令（无载荷变体的线格式）', async () => {
    const wrapper = await mountWithChatGpt();
    sendCommand.mockClear();
    const button = wrapper
      .findAll('.chatgpt-login button')
      .find((b) => b.text().includes('登录 ChatGPT'));
    expect(button, '应有登录按钮').toBeTruthy();
    await button!.trigger('click');
    expect(sendCommand).toHaveBeenCalledWith('StartChatGptLogin');
  });

  it('收到 pending 事件后显示授权链接与复制/打开/取消', async () => {
    const wrapper = await mountWithChatGpt();
    feed({
      ChatGptLoginPending: {
        url: 'https://auth.openai.com/oauth/authorize?client_id=x&state=y',
        redirect_uri: 'http://localhost:1455/auth/callback',
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.chatgpt-login__url-text').text()).toContain(
      'auth.openai.com/oauth/authorize',
    );
    const labels = wrapper.findAll('.chatgpt-login button').map((b) => b.text());
    expect(labels).toContain('复制');
    expect(labels).toContain('打开');
    expect(labels).toContain('取消登录');
  });

  it('成功后清掉 URL 并显示已登录（作废链接不能留着）', async () => {
    const wrapper = await mountWithChatGpt();
    feed({ ChatGptLoginPending: { url: 'https://auth.openai.com/x', redirect_uri: '' } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.chatgpt-login__url').exists()).toBe(true);

    feed({ ChatGptLoginResult: { ok: true, email: 'user@example.com' } });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.chatgpt-login__url').exists()).toBe(false);
    expect(wrapper.find('.chatgpt-login__email').text()).toBe('user@example.com');
    expect(state.chatgptLogin.url).toBeNull();
  });

  it('失败时显示原因，且不再 pending', async () => {
    const wrapper = await mountWithChatGpt();
    feed({ ChatGptLoginPending: { url: 'https://auth.openai.com/x', redirect_uri: '' } });
    feed({ ChatGptLoginResult: { ok: false, email: '', error: '登录已取消' } });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.chatgpt-login__error').text()).toBe('登录已取消');
    expect(state.chatgptLogin.pending).toBe(false);
    expect(state.chatgptLogin.url).toBeNull();
  });

  it('「重新登录」已登录时也发 StartChatGptLogin', async () => {
    const wrapper = await mountWithChatGpt();
    feed({ ChatGptStatus: { logged_in: true, email: 'a@b.c', expires_at_ms: 0, refreshable: true } });
    await wrapper.vm.$nextTick();
    sendCommand.mockClear();
    const relogin = wrapper
      .findAll('.chatgpt-login button')
      .find((b) => b.text().includes('重新登录'));
    await relogin!.trigger('click');
    expect(sendCommand).toHaveBeenCalledWith('StartChatGptLogin');
  });

  it('「取消登录」发 CancelChatGptLogin', async () => {
    const wrapper = await mountWithChatGpt();
    feed({ ChatGptLoginPending: { url: 'https://auth.openai.com/x', redirect_uri: '' } });
    await wrapper.vm.$nextTick();
    sendCommand.mockClear();
    const cancel = wrapper
      .findAll('.chatgpt-login button')
      .find((b) => b.text() === '取消登录');
    await cancel!.trigger('click');
    expect(sendCommand).toHaveBeenCalledWith('CancelChatGptLogin');
  });
});
