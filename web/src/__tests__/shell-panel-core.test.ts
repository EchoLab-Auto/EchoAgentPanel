//! Shell 面板 × 多 Core 契约（2026-10 多 Core 交互修复）。
//!
//! `sh-{seq}` 是 **per-core** 编号（每个 Core 都从 `sh-1` 起）。此前详情面板只
//! 按 activeRegion 定位会话，且 `ShellStop/ShellExec` 不带 targetCore：
//! `coreForCommand` 只查聊天会话表（shell id 永远查不到）→ 一律落到
//! activeRegion。于是打开 A 的 `sh-1` 后切到 B，面板显示的是 B 的 `sh-1`，
//! 在这里敲的命令也打进 B——用户在"以为还是 A"的终端里跑了一次 rm。
//!
//! 契约：详情面板按 `(core, sessionId)` 精确定位；命令显式定向该 core。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const { sendCommand } = vi.hoisted(() => ({ sendCommand: vi.fn() }));
vi.mock('../connection', () => ({
  sendCommand,
  sendPending: vi.fn(),
  panelFetch: vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) })),
}));

import ShellPanel from '../components/ShellPanel.vue';
import { state } from '../store';

function seed() {
  state.upstreams = [
    { name: 'core-a', url: 'ws://a:3132', connectivity: 'online', auth: 'ok', token_set: false, last_checked: 1, last_error: null },
    { name: 'core-b', url: 'ws://b:3132', connectivity: 'online', auth: 'ok', token_set: false, last_checked: 1, last_error: null },
  ] as never;
  state.knownCores = new Set(['core-a', 'core-b']);
  // 当前运行区域是 core-b（模拟"打开 A 的终端之后切到了 B"）
  state.activeRegion = 'core-b';
  // 两个 core 上都有 sh-1 —— 光凭 id 无法区分
  state.shellSessions = [
    { session_id: 'sh-1', core: 'core-a', team_id: null, workdir: '/a/work', created_at_ms: 1, exec_count: 2 },
    { session_id: 'sh-1', core: 'core-b', team_id: null, workdir: '/b/work', created_at_ms: 2, exec_count: 7 },
  ] as never;
  state.shellTerminals = {
    'core-a\u0000sh-1': [{ seq: 1, command: 'pwd', status: 'done', output: '/a/work\n' }],
    'core-b\u0000sh-1': [{ seq: 1, command: 'pwd', status: 'done', output: '/b/work\n' }],
  } as never;
}

describe('ShellPanel · 多 Core 定位与命令定向', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
  });

  it('显式 core 优先：显示该 core 的会话与终端（不是 activeRegion 的同号会话）', () => {
    const wrapper = mount(ShellPanel, { props: { sessionId: 'sh-1', core: 'core-a' } });
    expect(wrapper.text()).toContain('/a/work');
    expect(wrapper.text()).toContain('/a/work\n'.trim());
    expect(wrapper.text()).not.toContain('/b/work');
  });

  it('ShellExec 定向到会话自己的 core（activeRegion 是另一个 core）', async () => {
    const wrapper = mount(ShellPanel, { props: { sessionId: 'sh-1', core: 'core-a' } });
    const input = wrapper.find('input.shell-input__field');
    await input.setValue('ls -l');
    await input.trigger('keyup.enter');

    // `team_id` = 请求者人格（2026-10 作用域普查）：Core 据此做归属校验，
    // 不允许跨人格操作别人的 shell。测试环境无激活人格 → null。
    expect(sendCommand).toHaveBeenCalledWith(
      { ShellExec: { session_id: 'sh-1', command: 'ls -l', team_id: null } },
      'core-a',
    );
  });

  it('ShellStop 定向到会话自己的 core', () => {
    const wrapper = mount(ShellPanel, { props: { sessionId: 'sh-1', core: 'core-a' } });
    const stop = wrapper.findAll('button').find((b) => b.text().includes('停止会话'));
    expect(stop).toBeTruthy();
    void stop!.trigger('click');
    expect(sendCommand).toHaveBeenCalledWith(
      { ShellStop: { session_id: 'sh-1', team_id: null } },
      'core-a',
    );
  });

  it('缺省 core（旧调用点）回落 activeRegion，行为与改造前一致', () => {
    const wrapper = mount(ShellPanel, { props: { sessionId: 'sh-1' } });
    // activeRegion = core-b → 显示 B 的会话
    expect(wrapper.text()).toContain('/b/work');
  });
});
