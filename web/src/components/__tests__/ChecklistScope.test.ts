//! 清单作用域基础修复（2026-11）：
//! 1) 同名人格跨 core：`currentTeam` 必须按 (core, id) 取权限画像，
//!    不能按 id 取列表里第一个；
//! 2) 清单工具被禁用：已有快照保留、入口以只读形态可见（不删状态、不卸载）；
//! 3) 同一 core 两个 persona：同名会话的清单按 activeTeamId 分离；
//! 4) global 聚合：同名清单来自不同会话时都渲染，且来源标签可辨。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state, dispatch } from '../../store';
import { entryOverlay } from '../../overlays';
import { checklistKey } from '../../keys';
import type { BackendEvent, TeamInfo } from '../../protocol';

// ChatView 的发送路径不触网：其余导出保持真实（与 ChatView.test.ts 同款）。
vi.mock('../../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true) };
});

const SID = 'local:tui::local_user';

const MessageItemStub = defineComponent({
  name: 'MessageItem',
  props: ['message'],
  setup(props) {
    return () => h('div', { class: 'stub-item' }, String((props.message as { content?: string })?.content ?? ''));
  },
});

const ChatComposerStub = defineComponent({
  name: 'ChatComposer',
  props: ['modelValue', 'disabled', 'cancelable', 'placeholder'],
  setup() {
    return () => h('div', { class: 'stub-composer' });
  },
});

/** TeamInfo 工厂：只写用例关心的字段，其余按 Core 缺省值。 */
function team(id: string, core: string | null, over: Partial<TeamInfo> = {}): TeamInfo {
  return {
    id,
    name: id,
    enabled: true,
    sessions: 0,
    core,
    available_modules: [],
    available_tools: [],
    disabled_tools: [],
    ...over,
  } as unknown as TeamInfo;
}

function checklistEvent(sessionId: string, teamId: string | null, name: string): BackendEvent {
  return {
    ChecklistUpdated: {
      session_id: sessionId,
      team_id: teamId,
      state: {
        lists: [
          {
            name,
            items: [
              { text: 'a', done: true },
              { text: 'b', done: false },
            ],
          },
        ],
      },
    },
  } as unknown as BackendEvent;
}

function mountChat(props: { sessionId?: string; activeTeamId?: string | null } = {}) {
  return mount(ChatView, {
    props: { sessionId: SID, ...props },
    attachTo: document.body,
    global: {
      stubs: {
        MessageItem: MessageItemStub,
        ChatComposer: ChatComposerStub,
      },
    },
  });
}

function entryWith(wrapper: ReturnType<typeof mountChat>, text: string) {
  return wrapper.findAll('.ctx-entry').find((button) => button.text().includes(text));
}

async function openChecklist(wrapper: ReturnType<typeof mountChat>) {
  const button = entryWith(wrapper, '清单');
  expect(button, '清单入口应可见').toBeTruthy();
  await button!.trigger('click');
  await nextTick();
  return button!;
}

beforeEach(() => {
  state.teams = [];
  state.activeTeamId = null;
  state.activeRegion = null;
  state.checklists = {};
  state.checklistVersions = {};
  state.checklistWatermarks = {};
  state.checklistCapability = {};
  state.connected = false;
  state.trunk = [];
});

afterEach(() => {
  entryOverlay.value = null;
  document.body.innerHTML = '';
});

describe('清单作用域（2026-11 基础修复）', () => {
  it('同名人格跨 core：能力门控按 activeRegion 取对应权限画像', async () => {
    state.teams = [
      team('default', 'core-a', {
        available_modules: ['echo-agent.subagent'],
        disabled_tools: ['checklist'],
      }),
      team('default', 'core-b', {
        // 既有 management.panel，也保留内置工具包（否则包级门控会顺带禁用清单）。
        available_modules: ['echo-agent.management.panel', 'echo-agent.tools.builtin'],
      }),
    ];
    state.activeTeamId = 'default';
    state.activeRegion = 'core-a';

    const wrapper = mountChat({ activeTeamId: 'default' });
    // core-a 的 default 未启用 management.panel → 上下文入口隐藏。
    expect(entryWith(wrapper, '上下文')).toBeUndefined();

    state.activeRegion = 'core-b';
    await nextTick();
    // core-b 的同名 default 有 management.panel → 入口出现；清单工具也已启用。
    expect(entryWith(wrapper, '上下文')).toBeTruthy();
    expect(entryWith(wrapper, '清单')).toBeTruthy();

    // 切回 core-a：权限/tool 禁用随作用域回来。
    state.activeRegion = 'core-a';
    await nextTick();
    expect(entryWith(wrapper, '上下文')).toBeUndefined();
    expect(entryWith(wrapper, '清单')).toBeUndefined();
    wrapper.unmount();
  });

  it('清单工具禁用：已有快照保留、入口只读可见；无快照时入口隐藏', async () => {
    state.teams = [team('EchoCode', 'core-a', { disabled_tools: ['checklist'] })];
    state.activeTeamId = 'EchoCode';
    state.activeRegion = 'core-a';
    dispatch(checklistEvent(SID, 'EchoCode', 'todo'), 'core-a');

    const key = checklistKey('core-a', 'EchoCode', SID);
    expect(state.checklists[key]).toHaveLength(1);

    const wrapper = mountChat({ activeTeamId: 'EchoCode' });
    const button = entryWith(wrapper, '清单');
    expect(button, '工具禁用但已有快照 → 入口保留').toBeTruthy();
    expect(button!.attributes('title')).toContain('工具已禁用');

    await openChecklist(wrapper);
    expect(wrapper.find('.checklist-name').text()).toBe('todo');

    // Team 回推（重新下发权限）不得删除快照。
    state.teams = [team('EchoCode', 'core-a', { disabled_tools: ['checklist'] })];
    await nextTick();
    expect(state.checklists[key]).toHaveLength(1);
    expect(entryWith(wrapper, '清单')).toBeTruthy();
    wrapper.unmount();

    // 工具禁用且本地无快照：入口隐藏（只读例外不扩大成"永远显示"）。
    state.checklists = {};
    const empty = mountChat({ activeTeamId: 'EchoCode' });
    expect(entryWith(empty, '清单')).toBeUndefined();
    empty.unmount();
  });

  it('同一 core 两 persona：同名会话的清单按 activeTeamId 分离', async () => {
    state.teams = [
      team('EchoCode', 'core-a', { disabled_tools: ['checklist'] }),
      team('alix', 'core-a'),
    ];
    state.activeTeamId = 'EchoCode';
    state.activeRegion = 'core-a';
    dispatch(checklistEvent(SID, 'EchoCode', 'ec-todo'), 'core-a');
    dispatch(checklistEvent(SID, 'alix', 'alix-todo'), 'core-a');

    const wrapper = mountChat({ activeTeamId: 'EchoCode' });
    await openChecklist(wrapper);
    expect(wrapper.find('.checklist-name').text()).toBe('ec-todo');

    // 切到 alix：props 是读取真源，同名会话读到的是 alix 那份。
    // 切 Agent 会按既有语义关闭内置弹层，重新打开再断言内容。
    state.activeTeamId = 'alix';
    await wrapper.setProps({ activeTeamId: 'alix' });
    await nextTick();
    await openChecklist(wrapper);
    expect(wrapper.find('.checklist-name').text()).toBe('alix-todo');
    expect(entryWith(wrapper, '清单')!.attributes('title')).not.toContain('工具已禁用');
    wrapper.unmount();
  });

  it('global 聚合：同名清单跨会话都渲染，来源标签可辨且不混入别 core', async () => {
    state.teams = [team('EchoCode', 'core-a')];
    state.activeTeamId = 'EchoCode';
    state.activeRegion = 'core-a';
    dispatch(checklistEvent('local:tui::s1', 'EchoCode', 'todo'), 'core-a');
    dispatch(checklistEvent('local:tui::s2', 'EchoCode', 'todo'), 'core-a');
    dispatch(checklistEvent('local:tui::s1', 'EchoCode', 'todo'), 'core-b');

    const wrapper = mountChat({ sessionId: 'global', activeTeamId: 'EchoCode' });
    await openChecklist(wrapper);

    const cards = wrapper.findAll('.checklist-card');
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.find('.checklist-name').text())).toEqual(['todo', 'todo']);
    const labels = wrapper.findAll('.checklist-source').map((label) => label.text());
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain('local:tui::s1');
    expect(labels[1]).toContain('local:tui::s2');
    expect(labels.join(' ')).not.toContain('core-b');
    wrapper.unmount();
  });
});
