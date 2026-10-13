//! 上下文分块视图契约测试（2026-10「清理历史记忆」会话范围修复）。
//!
//! 背景（用户报告）：面板「清理历史记忆」此前发送的 `ClearHistory` 只带
//! `team_id`——Core 侧语义 = 清空该人格**全部会话**（事件日志 + 上下文
//! 投影 + 显示时间线），把 QQ 群/私聊、其他 workspace 会话的记忆一并抹掉。
//!
//! 本测试钉住两条防线：
//!   1. 正常路径：清理命令**必须携带 session_id**（只清当前会话）；
//!   2. 会话未知时 fail-closed：不发命令（缺 session_id 在 Core 语义是
//!      全量清空——与按钮「只清当前会话」的承诺不符）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

import ContextView from '../ContextView.vue';
import { sendCommand } from '../../connection';
import { state } from '../../store';

/** 全部 ClearHistory 调用。 */
function clearCalls() {
  return vi
    .mocked(sendCommand)
    .mock.calls.filter(
      ([c]) => typeof c === 'object' && c !== null && 'ClearHistory' in (c as object),
    );
}

describe('ContextView 清理历史记忆（会话范围契约）', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    state.contexts = {};
    state.connected = true;
  });

  it('两步确认后发送带 session_id 的 ClearHistory——只清当前会话', async () => {
    const wrapper = mount(ContextView, {
      props: {
        teamId: 'alix',
        sessionId: 'local:workspace:proj:alice',
        core: 'core-a',
      },
    });
    const btn = wrapper.find('.ctx-clear');
    expect(btn.exists()).toBe(true);

    // 第一次点击：只武装，不发送。
    await btn.trigger('click');
    expect(clearCalls()).toHaveLength(0);
    expect(btn.text()).toContain('确认');

    // 第二次：发送——**必须携带 session_id**（缺省时 Core 全量清空）。
    await btn.trigger('click');
    const calls = clearCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toEqual({
      ClearHistory: { team_id: 'alix', session_id: 'local:workspace:proj:alice' },
    });
  });

  it('会话未知时 fail-closed：不发 ClearHistory（防误升级为全量清理）', async () => {
    const wrapper = mount(ContextView, {
      props: {
        teamId: 'alix',
        sessionId: null,
        core: 'core-a',
      },
    });
    const btn = wrapper.find('.ctx-clear');
    // 两步确认都点（武装 + 确认）。
    await btn.trigger('click');
    await btn.trigger('click');
    expect(clearCalls()).toHaveLength(0);
  });
});
