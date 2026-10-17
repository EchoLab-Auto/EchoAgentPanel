//! 多窗口互不干扰（2026-10 用户反馈）。
//!
//! 问题：多个浏览器窗口连同一个 Panel 时，A 窗口点选工作区会话（或选默认
//! 会话取消激活）会把 B 窗口一起跳走。根因是 Core 的 workspace `active` 为
//! **全局单例**，`WorkspaceSessions` 广播给所有连接，而 App 的跟随 watcher
//! 此前**无条件**把本地 activeSessionId 改成 active 投影。
//!
//! 修复：只有「本窗口自己发起的激活」才跟随投影（意图标记 + 一次性消费），
//! 他端广播只同步 workspace 状态；另加「本地通道已失效则回退」的安全网。
//!
//! 本测试锁两层：① 纯函数决策规则；② App 集成（广播不改本窗口视图）。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

vi.mock('../connection', () => ({
  startConnection: vi.fn(),
  sendCommand: vi.fn(),
  requestActiveRegionManagement: vi.fn(),
}));

import App from '../App.vue';
import { state } from '../store';
import { dispatch } from '../store';
import {
  LOCAL_DEFAULT_SESSION,
  __resetLocalActivateIntentForTest,
  decideOnWorkspaceBroadcast,
  noteLocalActivateIntent,
  takeLocalActivateIntent,
} from '../workspace';
import type { WorkspaceSessionInfo } from '../protocol';

// ── fixture：一个带两条对话的工作区 ──
const wsA: WorkspaceSessionInfo = {
  id: 'wsA',
  name: '项目 A',
  conversations: [
    { id: 'main', name: '主线', legacy: true },
    { id: 'c2', name: '分支二' },
  ],
} as WorkspaceSessionInfo;

const wsB: WorkspaceSessionInfo = {
  id: 'wsB',
  name: '项目 B',
  conversations: [{ id: 'main', name: '主线', legacy: true }],
} as WorkspaceSessionInfo;

const WS_A_LEGACY = 'local:workspace:wsA:local_user';
const WS_A_C2 = 'local:workspace:wsA/c2:local_user';
const WS_B_LEGACY = 'local:workspace:wsB:local_user';

beforeEach(() => {
  __resetLocalActivateIntentForTest();
});

describe('意图标记：一次性消费', () => {
  it('匹配 → true 并清空；再问一次则为 false', () => {
    noteLocalActivateIntent('wsA');
    expect(takeLocalActivateIntent('wsA')).toBe(true);
    expect(takeLocalActivateIntent('wsA')).toBe(false);
  });

  it('不匹配（他端改的）→ false，且不残留', () => {
    noteLocalActivateIntent('wsA');
    expect(takeLocalActivateIntent('wsB')).toBe(false);
    // 残留会让下一次他端变更被误判成自己的
    expect(takeLocalActivateIntent('wsA')).toBe(false);
  });

  it('取消激活意图（id = null）与 active = null 匹配', () => {
    noteLocalActivateIntent(null);
    expect(takeLocalActivateIntent(null)).toBe(true);
  });
});

describe('decideOnWorkspaceBroadcast 决策规则', () => {
  const base = {
    active: 'wsA' as string | null,
    activeConversation: null as string | null,
    sessions: [wsA, wsB] as WorkspaceSessionInfo[] | null,
    hasLocalIntent: false,
    landing: LOCAL_DEFAULT_SESSION,
  };

  it('本窗口意图 → 跟随投影', () => {
    expect(
      decideOnWorkspaceBroadcast({ ...base, currentSessionId: WS_B_LEGACY, hasLocalIntent: true }),
    ).toEqual({ kind: 'follow', next: WS_A_LEGACY });
  });

  it('本窗口意图但当前停在 QQ 会话 → 不抢回（keep）', () => {
    expect(
      decideOnWorkspaceBroadcast({
        ...base,
        currentSessionId: 'qq:dm::42',
        hasLocalIntent: true,
      }),
    ).toEqual({ kind: 'keep' });
  });

  it('他端激活 wsA：本地停在 wsB 通道 → keep（核心修复：不再串台）', () => {
    expect(
      decideOnWorkspaceBroadcast({ ...base, currentSessionId: WS_B_LEGACY, hasLocalIntent: false }),
    ).toEqual({ kind: 'keep' });
  });

  it('他端取消激活：本地停在残留通道但工作区仍在 → keep', () => {
    expect(
      decideOnWorkspaceBroadcast({
        ...base,
        active: null,
        currentSessionId: WS_A_LEGACY,
        hasLocalIntent: false,
      }),
    ).toEqual({ kind: 'keep' });
  });

  it('他端广播、本地停在默认本地会话 → keep', () => {
    expect(
      decideOnWorkspaceBroadcast({
        ...base,
        currentSessionId: LOCAL_DEFAULT_SESSION,
        hasLocalIntent: false,
      }),
    ).toEqual({ kind: 'keep' });
  });

  it('安全网：本地工作区已被删除 → reset 到落点', () => {
    expect(
      decideOnWorkspaceBroadcast({
        ...base,
        sessions: [wsB], // wsA 被删
        currentSessionId: WS_A_LEGACY,
        hasLocalIntent: false,
      }),
    ).toEqual({ kind: 'reset', next: LOCAL_DEFAULT_SESSION });
  });

  it('安全网：本地对话已被删除 → reset', () => {
    const noC2: WorkspaceSessionInfo = {
      id: 'wsA',
      name: '项目 A',
      conversations: [{ id: 'main', name: '主线', legacy: true }],
    } as WorkspaceSessionInfo;
    expect(
      decideOnWorkspaceBroadcast({
        ...base,
        sessions: [noC2],
        currentSessionId: WS_A_C2,
        hasLocalIntent: false,
      }),
    ).toEqual({ kind: 'reset', next: LOCAL_DEFAULT_SESSION });
  });

  it('快照尚未到达（sessions = null）不猜 → keep', () => {
    expect(
      decideOnWorkspaceBroadcast({
        ...base,
        sessions: null,
        currentSessionId: WS_A_LEGACY,
        hasLocalIntent: false,
      }),
    ).toEqual({ kind: 'keep' });
  });
});

// ── App 集成：广播不改本窗口视图 ──
const Stub = defineComponent({ name: 'Stub', setup: () => () => h('div', { class: 'stub' }) });
/** ChatView 替身：把收到的 session-id 渲染成文本，便于断言「本窗口在看哪个会话」。 */
const ChatViewStub = defineComponent({
  name: 'ChatView',
  props: { sessionId: { type: String, default: '' } },
  setup: (props) => () => h('div', { class: 'stub-chat' }, props.sessionId),
});

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        ChatView: ChatViewStub,
        PanelSidebar: Stub,
        TasksPanel: Stub,
        SettingsView: Stub,
        ShellPanel: Stub,
        BranchModal: Stub,
        ThemeToggleButton: Stub,
      },
    },
  });
}

/** 广播一次 WorkspaceSessions（模拟 Core 推给本窗口）。 */
function broadcastWorkspace(active: string | null, conversation: string | null) {
  dispatch({
    WorkspaceSessions: {
      team_id: 'alix',
      sessions: [wsA, wsB],
      active,
      active_conversation: conversation,
    },
  } as never);
}

describe('App 集成：他端广播不切换本窗口视图', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1280,
      configurable: true,
      writable: true,
    });
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.activeTeamId = 'alix';
    state.activeRegion = null;
    state.workspaceTeamId = 'alix';
    state.workspaceActive = null;
    state.workspaceActiveConversation = null;
    state.workspaceSessions = [wsA, wsB];
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalWidth,
      configurable: true,
      writable: true,
    });
    __resetLocalActivateIntentForTest();
  });

  it('另一窗口激活 wsA → 本窗口仍停在原会话', async () => {
    const wrapper = mountApp();
    await nextTick();
    const before = wrapper.find('.stub-chat').text();

    // 他端广播（本窗口没有任何意图）
    broadcastWorkspace('wsA', null);
    await nextTick();

    // workspace 状态同步了（面板高亮 / 激活标记照常更新）……
    expect(state.workspaceActive).toBe('wsA');
    // ……但本窗口视图没被动过
    expect(wrapper.find('.stub-chat').text()).toBe(before);
    wrapper.unmount();
  });

  it('本窗口自己激活 wsA → 视图跟随到 wsA 通道', async () => {
    const wrapper = mountApp();
    await nextTick();

    noteLocalActivateIntent('wsA'); // 等价于本窗口点了切换器里的 wsA 通道
    broadcastWorkspace('wsA', null);
    await nextTick();

    expect(wrapper.find('.stub-chat').text()).toBe(WS_A_LEGACY);
    wrapper.unmount();
  });

  it('本窗口取消激活 → 回落到默认本地会话', async () => {
    const wrapper = mountApp();
    await nextTick();
    // 先让本窗口处在 wsA 通道（watcher 必须已挂载，否则广播时无人消费意图）
    noteLocalActivateIntent('wsA');
    broadcastWorkspace('wsA', null);
    await nextTick();
    expect(wrapper.find('.stub-chat').text()).toBe(WS_A_LEGACY);

    noteLocalActivateIntent(null);
    broadcastWorkspace(null, null);
    await nextTick();

    expect(wrapper.find('.stub-chat').text()).toBe(LOCAL_DEFAULT_SESSION);
    wrapper.unmount();
  });
});
