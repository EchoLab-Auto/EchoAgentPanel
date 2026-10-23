//! 上下文分块视图契约测试（2026-10 会话范围修复：ClearHistory / ArchiveHistory）。
//!
//! 背景（用户报告）：面板「清理历史记忆」此前发送的 `ClearHistory` 只带
//! `team_id`——Core 侧语义 = 清空该人格**全部会话**（事件日志 + 上下文
//! 投影 + 显示时间线），把 QQ 群/私聊、其他 workspace 会话的记忆一并抹掉。
//! 「归档」（`ArchiveHistory`）是同类漏网：不带 session_id 时 Core 走旧语义
//! （整档归档 + 全量清空），点一次会清掉同人格下所有会话。
//!
//! 本测试钉住两条防线（各命令一组）：
//!   1. 正常路径：命令**必须携带 session_id**（只影响当前会话）；
//!   2. 会话未知时 fail-closed：不发命令（缺 session_id 在 Core 语义是
//!      全量清空——与按钮「只清/只归档当前会话」的承诺不符）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

vi.mock('../../confirm', () => ({
  // 确认框服务（2026-10 审计：window.confirm 已替换为全局 Modal 确认）。
  // 默认同意——「归档」经 confirmDialog 确认后发送命令；需要"拒绝"的
  // 用例再覆盖返回值。
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

import ContextView from '../ContextView.vue';
import { sendCommand } from '../../connection';
import { confirmDialog } from '../../confirm';
import { state } from '../../store';

/** 全部 ClearHistory 调用。 */
function clearCalls() {
  return vi
    .mocked(sendCommand)
    .mock.calls.filter(
      ([c]) => typeof c === 'object' && c !== null && 'ClearHistory' in (c as object),
    );
}

/** 全部 ArchiveHistory 调用。 */
function archiveCalls() {
  return vi
    .mocked(sendCommand)
    .mock.calls.filter(
      ([c]) => typeof c === 'object' && c !== null && 'ArchiveHistory' in (c as object),
    );
}

/** 点击顶栏「归档」按钮（NeumorphismButton 渲染为原生 button）。 */
async function clickArchive(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((b) => b.text().includes('归档'));
  expect(button, '「归档」按钮').toBeTruthy();
  await button!.trigger('click');
}

/**
 * 压缩 / 归档进度条（2026-10）。
 *
 * 契约：Core 推 `CompactionProgress` → 面板**在首屏可见处**画出阶段与
 * `done/total`；进行中禁用两个动作按钮（重复点击会撞 Core 的 compact_lock，
 * 看起来像毫无响应）；终态定时收掉；进度停更超时后转成失败提示（不能让
 * 进度条永远转下去）。
 */
describe('ContextView 压缩进度', () => {
  // 复合键是 `core\u0000id`（见 keys.ts::scopedKey），不是 `::`——写错了
  // 这条测试只会"恰好通过"（取不到记录 → 不渲染），什么都测不到。
  const key = 'core-a\u0000alix';
  const snapshot = {
    session_id: 's1',
    messages: [],
    blocks: [],
    total_tokens: 0,
    limit_tokens: 1000,
  };

  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    state.connected = true;
    state.contexts = {};
    state.compactions = {};
    // 快照存在 → 进度条所在的 v-else 分支才会渲染
    state.contexts['core-a\u0000s1'] = snapshot as never;
  });

  function seed(phase: string, done = 0, total = 0) {
    state.compactions[key] = {
      phase: phase as never,
      done,
      total,
      sessions: total,
      message: `阶段 ${phase}`,
      at: Date.now(),
    };
  }

  it('进行中：显示阶段、3/7 组与百分比', async () => {
    seed('summarize', 3, 7);
    const wrapper = mount(ContextView, {
      props: { teamId: 'alix', sessionId: 's1', core: 'core-a' },
    });
    const box = wrapper.find('.ctx-compaction');
    expect(box.exists(), '应渲染压缩进度块').toBe(true);
    expect(box.text()).toContain('生成摘要');
    expect(box.text()).toContain('3/7 组');
    expect(box.text()).toContain('43%');
    wrapper.unmount();
  });

  it('进行中：禁用「归档」与「压缩」（避免撞 Core 的 compact_lock）', async () => {
    seed('summarize', 1, 4);
    const wrapper = mount(ContextView, {
      props: { teamId: 'alix', sessionId: 's1', core: 'core-a' },
    });
    const archive = wrapper.findAll('button').find((b) => b.text().includes('归档'));
    const compact = wrapper.findAll('button').find((b) => b.text().includes('压缩'));
    expect(archive!.attributes('disabled')).toBeDefined();
    expect(compact!.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('终态：显示结果且不再禁用按钮（可以再压一次）', async () => {
    seed('done', 5, 5);
    const wrapper = mount(ContextView, {
      props: { teamId: 'alix', sessionId: 's1', core: 'core-a' },
    });
    const box = wrapper.find('.ctx-compaction');
    expect(box.exists()).toBe(true);
    expect(box.classes()).toContain('ctx-compaction--done');
    const compact = wrapper.findAll('button').find((b) => b.text().includes('压缩'));
    expect(compact!.attributes('disabled')).toBeUndefined();
    wrapper.unmount();
  });

  it('进度停更超过阈值：转成失败提示（不让进度条永远转）', async () => {
    // 5 分钟前的一条"生成摘要中"，之后再无事件（断线/丢帧）。
    state.compactions[key] = {
      phase: 'summarize',
      done: 2,
      total: 9,
      sessions: 9,
      message: '正在生成摘要 2/9…',
      at: Date.now() - 6 * 60_000,
    };
    const wrapper = mount(ContextView, {
      props: { teamId: 'alix', sessionId: 's1', core: 'core-a' },
    });
    const box = wrapper.find('.ctx-compaction');
    expect(box.classes()).toContain('ctx-compaction--failed');
    expect(box.text()).toContain('进度已停止更新');
    wrapper.unmount();
  });

  it('长度不确定的阶段不显示百分比（不写"0%"误导）', async () => {
    // `total === 0` = 该阶段长度未知（预览/写快照），进度条画不确定态；
    // 此时写"0%"会让人以为"一点都没动"。
    seed('preview', 0, 0);
    const wrapper = mount(ContextView, {
      props: { teamId: 'alix', sessionId: 's1', core: 'core-a' },
    });
    const box = wrapper.find('.ctx-compaction');
    expect(box.text()).toContain('准备');
    expect(box.text()).not.toContain('%');
    wrapper.unmount();
  });

  it('别的 agent 的进度不会串显到本面板', async () => {
    state.compactions['core-a\u0000someone-else'] = {
      phase: 'summarize',
      done: 1,
      total: 2,
      sessions: 2,
      message: '别人的压缩',
      at: Date.now(),
    };
    const wrapper = mount(ContextView, {
      props: { teamId: 'alix', sessionId: 's1', core: 'core-a' },
    });
    expect(wrapper.find('.ctx-compaction').exists()).toBe(false);
    wrapper.unmount();
  });
});

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

describe('ContextView 归档（会话范围契约）', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    vi.mocked(confirmDialog).mockClear();
    vi.mocked(confirmDialog).mockResolvedValue(true);
    state.contexts = {};
    state.connected = true;
  });

  it('确认后发送带 session_id 的 ArchiveHistory——只归档当前会话', async () => {
    const wrapper = mount(ContextView, {
      props: {
        teamId: 'alix',
        sessionId: 'local:workspace:proj:alice',
        core: 'core-a',
      },
    });
    await clickArchive(wrapper);
    await flushPromises();
    // 两步确认的第二步（确认框）出现且被同意。
    expect(confirmDialog).toHaveBeenCalledTimes(1);
    const calls = archiveCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toEqual({
      ArchiveHistory: { team_id: 'alix', session_id: 'local:workspace:proj:alice' },
    });
  });

  it('会话未知时 fail-closed：不发 ArchiveHistory（防误升级为全量归档+清空）', async () => {
    const wrapper = mount(ContextView, {
      props: {
        teamId: 'alix',
        sessionId: null,
        core: 'core-a',
      },
    });
    await clickArchive(wrapper);
    await flushPromises();
    expect(archiveCalls()).toHaveLength(0);
  });
});
