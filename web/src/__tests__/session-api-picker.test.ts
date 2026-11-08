//! 会话级 API 的**入口位置**契约（2026-11 用户要求）。
//!
//! 背景：会话级 API 覆盖原来是「会话」覆盖面板里每行一个下拉。两个问题：
//! ① 切会话时看不到当前用的是哪个 API（要打开面板才知道）；② 行内下拉与
//! 行选中挤在同一行，靠 `@click.stop` 分隔，动一下就配错。
//!
//! 现在改为：输入区状态行的 API 徽标即入口（显示当前生效者，点开可改），
//! 「会话」面板不再有 API 下拉。本测试锁定这两件事。

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const sendCommand = vi.fn();
vi.mock('../connection', () => ({
  sendCommand: (...args: unknown[]) => sendCommand(...args),
}));

import SessionApiPicker from '../components/SessionApiPicker.vue';
import SessionSwitcher from '../components/SessionSwitcher.vue';
import { state } from '../store';
import type { SessionInfo } from '../protocol';

const WORKSPACE = 'local:workspace:echo-agent/v:local_user';
const TUI = 'local:tui::local_user';

beforeEach(() => {
  sendCommand.mockClear();
  document.body.innerHTML = '';
  state.sessionApiOverrides = {};
  state.teams = [{ id: 'alice', name: 'Alice', enabled: true, sessions: 0 } as never];
  state.activities = {};
  state.api = {
    active_api: 'kimi',
    provider: 'moonshot',
    model: 'k3',
    profiles: [
      { name: 'kimi', provider: 'moonshot', model: 'k3' },
      { name: 'deepseek', provider: 'deepseek', model: 'deepseek-v4-flash' },
    ],
  } as never;
  state.sessions = [
    {
      id: WORKSPACE,
      team_id: 'alice',
      platform: 'local',
      scope: 'workspace',
      user_id: 'local_user',
      nickname: 'echo-agent · v0.2重构',
      group_name: null,
      last_active: 1,
      last_message: '',
    } as SessionInfo,
  ];
});

function mountPicker(over: Record<string, unknown> = {}) {
  return mount(SessionApiPicker, {
    props: {
      sessionId: WORKSPACE,
      teamId: 'alice',
      core: 'core-a',
      effectiveLabel: 'moonshot / k3',
      effectiveScope: 'agent「Alice」',
      ...over,
    },
    attachTo: document.body,
  });
}

/**
 * 打开浮层并返回选项元素。
 *
 * 内容走 `Teleport` 到 body（浮层不能被困在输入区的 `overflow` 里），所以
 * 查询必须落在 document 上，而不是组件 wrapper 内。
 */
async function openPicker(wrapper: ReturnType<typeof mountPicker>) {
  await wrapper.find('.api-picker__trigger').trigger('click');
  await nextTick();
  await nextTick();
  return Array.from(document.querySelectorAll<HTMLElement>('.api-picker__option'));
}

describe('会话级 API：入口在状态行、不在「会话」面板', () => {
  it('a) 徽标显示当前生效的 provider/model，并标出凭据来源层级', () => {
    const wrapper = mountPicker();
    expect(wrapper.find('.api-picker__label').text()).toBe('moonshot / k3');
    expect(wrapper.find('.api-picker__trigger').attributes('title')).toContain('agent「Alice」');
    wrapper.unmount();
  });

  it('b) 点开 → 列出「跟随 persona」与全部 profile；选中即发 SetSessionApi', async () => {
    const wrapper = mountPicker();
    const options = await openPicker(wrapper);
    expect(options.length).toBe(3); // 跟随 persona + 两个 profile
    expect(options[0]!.textContent).toContain('跟随 persona');
    // 顺序 = 供应商池原序（kimi 在前，deepseek 在后）
    const deepseek = options.find((o) => o.textContent?.includes('deepseek'))!;
    expect(deepseek, '供应商池里的 profile 都要能选').toBeTruthy();
    // 选中 deepseek → 命令带 team/session/core（多上游必须定向）
    deepseek.click();
    await nextTick();
    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand.mock.calls[0]![0]).toEqual({
      SetSessionApi: { team_id: 'alice', session_id: WORKSPACE, profile: 'deepseek' },
    });
    expect(sendCommand.mock.calls[0]![1]).toBe('core-a');
    // 乐观更新：徽标立刻指向新值（不等 Core 回推）
    expect(state.sessionApiOverrides[WORKSPACE]).toBe('deepseek');
    wrapper.unmount();
  });

  it('c) 选「跟随 persona」→ 发 ClearSessionApi 并清掉本地覆盖', async () => {
    state.sessionApiOverrides[WORKSPACE] = 'deepseek';
    const wrapper = mountPicker();
    const options = await openPicker(wrapper);
    options[0]!.click();
    await nextTick();
    expect(sendCommand.mock.calls[0]![0]).toEqual({
      ClearSessionApi: { team_id: 'alice', session_id: WORKSPACE },
    });
    expect(state.sessionApiOverrides[WORKSPACE]).toBeUndefined();
    wrapper.unmount();
  });

  it('d) 持久化边界如实标注：工作区通道 vs 其它会话', async () => {
    const workspace = mountPicker();
    await openPicker(workspace);
    expect(document.querySelector('.api-picker__hint')?.textContent).toContain('重启后仍生效');
    workspace.unmount();
    document.body.innerHTML = '';

    const tui = mountPicker({ sessionId: TUI, effectiveScope: '全局激活' });
    await openPicker(tui);
    expect(document.querySelector('.api-picker__hint')?.textContent).toContain('仅在本次运行有效');
    tui.unmount();
  });

  it('e) 回归：「会话」面板不再渲染会话级 API 下拉', () => {
    // 曾经的 `.sw-api` 行内下拉必须彻底消失（否则两处入口会各说各话）。
    const wrapper = mount(SessionSwitcher, {
      props: { activeTeamId: 'alice', activeSessionId: WORKSPACE },
    });
    expect(wrapper.find('.sw-api').exists()).toBe(false);
    expect(wrapper.find('.nm-select').exists()).toBe(false);
    // 会话行本身仍在
    expect(wrapper.findAll('.sw-item').length).toBeGreaterThan(0);
    wrapper.unmount();
  });
});
