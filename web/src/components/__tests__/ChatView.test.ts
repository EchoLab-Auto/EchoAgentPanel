//! ChatView 布局契约测试。
//!
//! 背景：输入区浮动在消息列表上曾导致最后一条消息被遮挡（absolute + padding 猜测）。
//! 修复方案：输入区改为 flex 子项占位（flex: 0 0 auto），消息列表 flex:1 独立滚动。
//! 本测试锁定该契约，防止回归为 absolute/padding hack。

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import ChatView from '../ChatView.vue';
import { state } from '../../store';

// ── 库组件 mock：不渲染真实 ui-frame/chat（避免 markdown/dom 依赖） ──
// ChatView 自渲染消息行（ToolRunGroup 合并 + ChatMessageItem），容器为库 ChatTray。
const ChatTrayStub = defineComponent({
  name: 'ChatTray',
  setup(_, { slots }) {
    return () => h('div', { class: 'stub-list' }, slots.default?.());
  },
});
const ChatMessageItemStub = defineComponent({
  name: 'ChatMessageItem',
  props: ['message'],
  setup(props) {
    return () => h('div', { class: 'stub-item' }, String((props.message as { content?: string })?.content ?? ''));
  },
});

const ChatComposerStub = defineComponent({
  name: 'ChatComposer',
  props: ['modelValue', 'disabled', 'cancelable', 'placeholder'],
  emits: ['update:modelValue', 'send', 'cancel'],
  setup(props, { emit, slots }) {
    return () =>
      h('div', { class: 'stub-composer' }, [
        h('span', { class: 'stub-meta' }, `session=${props.modelValue ?? ''}`),
        h('input', { class: 'stub-input', onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value) }),
        h('button', { class: 'stub-send', onClick: () => emit('send', 'hi') }, 'send'),
        // 渲染自定义 actions 插槽（库语义：提供插槽替换默认发送按钮）
        slots.actions?.({
          submit: () => emit('send', props.modelValue ?? '', []),
          canSubmit: true,
        }),
      ]);
  },
});

function mountChatView(sessionId = 'local:tui::local_user') {
  return mount(ChatView, {
    props: { sessionId },
    global: {
      stubs: {
        ChatTray: ChatTrayStub,
        ChatMessageItem: ChatMessageItemStub,
        ChatComposer: ChatComposerStub,
      },
    },
  });
}

describe('ChatView 布局契约', () => {
  it('渲染 .chat-view 纵向 flex 容器，包含消息列表与输入区两个子项', () => {
    const wrapper = mountChatView();
    expect(wrapper.find('.chat-view').exists()).toBe(true);
    expect(wrapper.find('.chat-view__list').exists()).toBe(true);
    expect(wrapper.find('.chat-composer-float').exists()).toBe(true);
    // 两个子项必须是 .chat-view 的直接子级（同一 flex 流，非嵌套遮挡）
    const children = Array.from(wrapper.find('.chat-view').element.children);
    const withList = children.filter((el) => el.className.includes('chat-view__list'));
    const withComposer = children.filter((el) => el.className.includes('chat-composer-float'));
    expect(withList.length).toBe(1);
    expect(withComposer.length).toBe(1);
  });

  it('消息列表在输入区之前（DOM 顺序：列表 → 输入区）', () => {
    const wrapper = mountChatView();
    const container = wrapper.find('.chat-view');
    const children = Array.from(container.element.children);
    const listIndex = children.findIndex((el) => el.className.includes('chat-view__list'));
    const composerIndex = children.findIndex((el) => el.className.includes('chat-composer-float'));
    expect(listIndex).toBeGreaterThanOrEqual(0);
    expect(composerIndex).toBeGreaterThan(listIndex);
  });

  it('按会话过滤消息：global 显示全部，具体会话只显示归属消息', () => {
    state.trunk = [
      { key: 'm1', role: 'user', content: 'a', time: 1, sessionId: 'local:tui::a' },
      { key: 'm2', role: 'user', content: 'b', time: 2, sessionId: 'local:tui::b' },
    ];
    const global = mountChatView('global');
    expect(global.findAll('.stub-item').length).toBe(2);
    const scoped = mountChatView('local:tui::a');
    expect(scoped.findAll('.stub-item').length).toBe(1);
  });

  it('输入区吸底悬浮（absolute 叠层）：样式契约', () => {
    // 解析 SFC 样式块，锁定布局实现方式。回归为 flex 占位（不再叠压）时测试失败。
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    expect(styleBlock).toMatch(/\.chat-view\s*\{[^}]*display:\s*flex/s);
    expect(styleBlock).toMatch(/\.chat-view\s*\{[^}]*position:\s*relative/s);
    expect(styleBlock).toMatch(/\.chat-view__list\s*\{[^}]*flex:\s*1/s);
    expect(styleBlock).toMatch(/\.chat-view__list\s*\{[^}]*min-height:\s*0/s);
    // 输入框必须以 absolute 盖在消息列表上（叠层悬浮）
    expect(styleBlock).toMatch(/\.chat-composer-float\s*\{[^}]*position:\s*absolute/s);
    // 预留空间必须在滚动区内部（nm-chat-tray__scroll）：外层 padding
    // 会压缩滚动高度，消息将永远无法滚到输入框后方
    expect(styleBlock).toMatch(/nm-chat-tray__scroll[^}]*padding-bottom:\s*\d+px/s);
    // 外层不得出现 padding-bottom（避免压缩滚动区）
    expect(styleBlock).not.toMatch(/\.chat-view__list\s*\{[^}]*padding-bottom/s);
  });

  it('提供图片附件按钮（SVG 图标，无 emoji）与发送按钮（#actions 契约）', () => {
    const wrapper = mountChatView();
    // 附件按钮存在且内含 SVG（非 🖼 emoji 文本）
    const attach = wrapper.find('.chat-view__attach-btn');
    expect(attach.exists()).toBe(true);
    expect(attach.find('svg').exists()).toBe(true);
    expect(attach.text().trim()).not.toContain('🖼');
    // 发送按钮存在（#actions 内自定义），点击触发 send
    const sendBtn = wrapper.find('.chat-view__send');
    expect(sendBtn.exists()).toBe(true);
  });

  it('入口行「会话」按钮：>1 个会话时显示，点击弹层并选择发出 selectSession', async () => {
    // 多会话（2026-09）：单会话模式下每个群/私聊独立上下文，入口行提供切换。
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.sessions = [
      {
        id: 'local:tui::local_user',
        team_id: 'alix',
        platform: 'local',
        scope: 'tui',
        user_id: 'local_user',
        nickname: 'local user',
        group_name: null,
        last_active: 1,
        last_message: '',
      },
      {
        id: 'qq:dm::1828980067',
        team_id: 'alix',
        platform: 'qq',
        scope: 'dm',
        user_id: '1828980067',
        nickname: 'Evence',
        group_name: null,
        last_active: 2,
        last_message: 'hi',
      },
    ] as never;
    const wrapper = mountChatView();
    const btn = wrapper
      .findAll('.ctx-entry')
      .find((b) => b.text().includes('会话'));
    expect(btn, 'session button visible').toBeTruthy();
    await btn!.trigger('click');
    // 弹层内可选 QQ 私聊项
    const item = wrapper.findAll('.sw-item').find((b) => b.text().includes('Evence'));
    expect(item).toBeTruthy();
    await item!.trigger('click');
    expect(wrapper.emitted('selectSession')?.[0]).toEqual(['qq:dm::1828980067']);
  });

  it('入口行「会话」按钮：仅单一本地会话时隐藏', () => {
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.sessions = [
      {
        id: 'local:tui::local_user',
        team_id: 'alix',
        platform: 'local',
        scope: 'tui',
        user_id: 'local_user',
        nickname: 'local user',
        group_name: null,
        last_active: 1,
        last_message: '',
      },
    ] as never;
    const wrapper = mountChatView();
    const btn = wrapper.findAll('.ctx-entry').find((b) => b.text().includes('会话'));
    expect(btn).toBeUndefined();
  });

  it('入口行「任务」按钮：弹层只显示当前会话的任务', async () => {
    const TasksPanelStub = defineComponent({
      name: 'TasksPanel',
      props: ['sessionId'],
      setup(props) {
        return () => h('div', { class: 'stub-tasks' }, String(props.sessionId ?? ''));
      },
    });
    state.teams = [];
    state.tasks = [
      {
        id: 't1',
        sequence: null,
        sessionId: 'local:tui::local_user',
        kind: 'subagent',
        objective: '本会话任务',
        status: 'running',
        createdAtMs: 1,
        completedAtMs: null,
        integratedAtMs: null,
        branches: [],
      },
      {
        id: 't2',
        sequence: null,
        sessionId: 'qq:dm::1',
        kind: 'subagent',
        objective: '其他会话任务',
        status: 'running',
        createdAtMs: 1,
        completedAtMs: null,
        integratedAtMs: null,
        branches: [],
      },
    ] as never;
    const wrapper = mount(ChatView, {
      props: { sessionId: 'local:tui::local_user' },
      global: {
        stubs: {
          ChatTray: ChatTrayStub,
          ChatMessageItem: ChatMessageItemStub,
          ChatComposer: ChatComposerStub,
          TasksPanel: TasksPanelStub,
        },
      },
    });
    const btn = wrapper.findAll('.ctx-entry').find((b) => b.text().includes('任务'));
    expect(btn, 'tasks entry visible').toBeTruthy();
    await btn!.trigger('click');
    // 弹层按当前会话过滤：只传当前 sessionId 给 TasksPanel
    const panel = wrapper.find('.stub-tasks');
    expect(panel.exists()).toBe(true);
    expect(panel.text()).toBe('local:tui::local_user');
    state.tasks = [];
  });

  it('入口行「任务」按钮：subagent 插件未启用且无会话任务时隐藏', () => {
    state.teams = [
      {
        id: 'alix',
        name: 'Alix',
        enabled: true,
        sessions: 0,
        enabled_plugins: ['echo-agent.tools.builtin'],
      } as never,
    ];
    state.tasks = [];
    const wrapper = mount(ChatView, {
      props: { sessionId: 'local:tui::local_user', activeTeamId: 'alix' },
      global: {
        stubs: {
          ChatTray: ChatTrayStub,
          ChatMessageItem: ChatMessageItemStub,
          ChatComposer: ChatComposerStub,
        },
      },
    });
    const btn = wrapper.findAll('.ctx-entry').find((b) => b.text().includes('任务'));
    expect(btn).toBeUndefined();
    state.teams = [];
  });

  it('发送事件携带空 images（无附件时）', () => {
    const wrapper = mountChatView();
    const sendBtn = wrapper.find('.chat-view__send');
    sendBtn.trigger('click');
    const emitted = wrapper.emitted('send');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toBe('');
    expect(emitted![0][1]).toEqual([]);
  });

  it('受限样式契约：actions 行底对齐、图标 17px、SVG 图标而非 emoji', () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    // 图标规格：17px stroke SVG
    expect(styleBlock).toMatch(/chat-view__icon\s*\{[^}]*width:\s*17px/s);
    // actions 行底对齐
    expect(styleBlock).toMatch(/nm-chat-composer__row[^}]*align-items:\s*flex-end/s);
    // 源文件不得出现 emoji 图标
    expect(raw).not.toContain('🖼');
    // 发送按钮内联 flex 布局（图标+文字）
    expect(styleBlock).toMatch(/chat-view__send\s*\{[^}]*display:\s*inline-flex/s);
  });
});
