//! ChatView 布局契约测试。
//!
//! 背景：输入区浮动在消息列表上曾导致最后一条消息被遮挡（absolute + padding 猜测）。
//! 修复方案：输入区改为 flex 子项占位（flex: 0 0 auto），消息列表 flex:1 独立滚动。
//! 本测试锁定该契约，防止回归为 absolute/padding hack。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state } from '../../store';
import { displayContentOf } from '../../state_domains/timeline';
import { resetReasoningAnimForTests } from '../../reasoning-anim';
// ChatView 自渲染消息行（WorkRunGroup 合并 + MessageItem），容器为库 ChatTray。
const ChatTrayStub = defineComponent({
  name: 'ChatTray',
  setup(_, { slots }) {
    return () => h('div', { class: 'stub-list' }, slots.default?.());
  },
});
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
        MessageItem: MessageItemStub,
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

  it('子代理完成回报渲染为工作 chip（.work-run-group__chip--subagent），不落用户气泡', () => {
    state.trunk = [
      { key: 'u1', role: 'user', content: '普通消息', time: 1, sessionId: 'local:tui::a' },
      {
        key: 's1',
        role: 'subagent',
        content: '审计 Panel 文档',
        time: 2,
        sessionId: 'local:tui::a',
        subagent: { id: 'task-1', task: '审计 Panel 文档', success: true, result: '结论', completedAtMs: null },
      },
    ];
    const wrapper = mountChatView('local:tui::a');
    const chip = wrapper.find('.work-run-group__chip--subagent');
    expect(chip.exists()).toBe(true);
    // 悬停提示：状态 + 任务摘要
    expect(chip.attributes('title')).toContain('子代理完成');
    expect(chip.attributes('title')).toContain('审计 Panel 文档');
    // 普通消息仍走气泡（stub）；子代理行不经过 MessageItem
    expect(wrapper.findAll('.stub-item').length).toBe(1);
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

  it('消息行容器为 flex 列：气泡对齐与宽度动态化前提（2026-09-30）', () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    // .chat-view__item--msg 必须为 flex 列，否则气泡的 align-self（user 靠右 /
    // agent 靠左 / system 居中）失效（回归曾导致全部左对齐固定宽）
    expect(styleBlock).toMatch(
      /\.chat-view__item--msg\s*\{[^}]*display:\s*flex/s,
    );
    expect(styleBlock).toMatch(
      /\.chat-view__item--msg\s*\{[^}]*flex-direction:\s*column/s,
    );
  });

  it('「回到底部」按钮：避开右侧栏与浮层的落位契约（2026-09-28）', async () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    const jumpRule =
      styleBlock.match(/\.chat-view :deep\(\.nm-chat-tray__jump\)\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    // 横向避让右侧栏列（trayPadRight）+ 纵向与边栏列底对齐（entryBottom + 45）
    expect(jumpRule).toMatch(/right:\s*calc\(v-bind\(trayPadRight\)\s*\+\s*16px\)/);
    expect(jumpRule).toMatch(/bottom:\s*calc\(v-bind\(entryBottom\)\s*\+\s*45px\)/);
    expect(jumpRule).toMatch(/z-index:\s*5/);
    // 浮层打开时隐藏（覆盖 rail 之上不再被盖住）
    expect(styleBlock).toMatch(
      /\.chat-view--overlay-open :deep\(\.nm-chat-tray__jump\)\s*\{[^}]*display:\s*none/s,
    );

    // 行为：打开入口行浮层（清单）→ 根节点带 overlay-open 类
    const wrapper = mountChatView();
    expect(wrapper.find('.chat-view--overlay-open').exists()).toBe(false);
    const menuBtn = wrapper.findAll('.ctx-entry').find((b) => b.text().includes('清单'));
    if (menuBtn) {
      await menuBtn.trigger('click');
      expect(wrapper.find('.chat-view--overlay-open').exists()).toBe(true);
    }
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
    // 弹层组件为按需加载（defineAsyncComponent，2026-10 首屏瘦身）：
    // 异步 chunk 的解析落在宏任务，`vi.waitFor` 等到弹层渲染完成。
    await vi.waitFor(() => {
      expect(wrapper.findAll('.sw-item').length).toBeGreaterThan(0);
    });
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
          MessageItem: MessageItemStub,
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
          MessageItem: MessageItemStub,
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

describe('推理行打字机门槛（2026-10）', () => {
  // 需求：只有「正在输出」的思考播打字动画；已经完成的思考卡片
  // （重新）加载/显示时直接全量显示（见 reasoning-anim.ts）。
  // 判定 = 实时标记 + 消息新鲜 + 会话仍在运行 + 仅播一次。

  const SESSION = 'local:tui::a';

  function activity(phase: 'thinking' | 'tool' | 'subagent' | 'completed' | 'failed') {
    return {
      phase,
      detail: null,
      startedAt: Date.now(),
      toolsCompleted: 0,
      subagentsCompleted: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  function reasoningMessage(key: string, overrides: Record<string, unknown> = {}) {
    return {
      key,
      role: 'reasoning' as const,
      content: '这是一段思考内容',
      time: Math.floor(Date.now() / 1000),
      sessionId: SESSION,
      animate: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    resetReasoningAnimForTests();
    state.trunk = [];
    state.activities = {};
  });

  it('实时 + 会话运行中：首次显示播打字机（chip 自动展开 + 正在推演提示）', async () => {
    state.trunk = [reasoningMessage('r1')];
    state.activities[SESSION] = activity('thinking');
    const wrapper = mountChatView(SESSION);
    // onMounted 的响应式更新需一次 tick 落盘（与 ReasoningText.test 一致）
    await nextTick();
    // 思考为工作行 chip（与工具同款）；播放中自动展开详情，正文播打字机
    expect(wrapper.find('.work-run-group__chip--reasoning').exists()).toBe(true);
    expect(wrapper.find('.reasoning-text--typing').exists()).toBe(true);
    expect(wrapper.find('.work-run-group__detail-status').text()).toContain('正在推演');
    wrapper.unmount();
  });

  it('重新显示（切走再切回 / 重挂载）：已播放过的思考卡片不再打字、不自动展开', async () => {
    state.trunk = [reasoningMessage('r1')];
    state.activities[SESSION] = activity('thinking');
    const first = mountChatView(SESSION);
    await nextTick();
    expect(first.find('.reasoning-text--typing').exists()).toBe(true);
    first.unmount();
    // 重新挂载（同一消息、仍在会话运行中）——已完成展示过，关闭为静止 chip
    const second = mountChatView(SESSION);
    await nextTick();
    expect(second.find('.work-run-group__chip--reasoning').exists()).toBe(true);
    expect(second.find('.reasoning-text--typing').exists()).toBe(false);
    expect(second.find('.work-run-group__detail').exists()).toBe(false);
    second.unmount();
  });

  it('消息不新鲜（超过 30s 窗口）：不补播打字机', () => {
    state.trunk = [reasoningMessage('r3', { time: Math.floor(Date.now() / 1000) - 120 })];
    state.activities[SESSION] = activity('tool');
    const wrapper = mountChatView(SESSION);
    expect(wrapper.find('.work-run-group__chip--reasoning').exists()).toBe(true);
    expect(wrapper.find('.reasoning-text--typing').exists()).toBe(false);
    wrapper.unmount();
  });

  it('历史回放（animate=false）：不播打字机', () => {
    state.trunk = [reasoningMessage('r4', { animate: false })];
    state.activities[SESSION] = activity('thinking');
    const wrapper = mountChatView(SESSION);
    expect(wrapper.find('.reasoning-text--typing').exists()).toBe(false);
    wrapper.unmount();
  });

  it('切会话查看（期间消息到达）：切回时若会话已结束，不播打字机', async () => {
    // 用户在会话 B 时，A 的实时推理到达（未被渲染 → 未登记）
    state.trunk = [reasoningMessage('r5')];
    state.activities[SESSION] = activity('completed');
    const wrapper = mountChatView('local:tui::b');
    expect(wrapper.find('.work-run-group').exists()).toBe(false);
    // 切回 A：会话已结束 → 已完成的思考卡片直接全量显示（静止 chip）
    await wrapper.setProps({ sessionId: SESSION });
    expect(wrapper.find('.work-run-group__chip--reasoning').exists()).toBe(true);
    expect(wrapper.find('.reasoning-text--typing').exists()).toBe(false);
    wrapper.unmount();
  });

  it('连续工作条目（工具 + 思考）合并为同一组 chip 行', async () => {
    // 工具、思考、工具连续出现 → 单条 WorkRunGroup：三个 chip 同排
    state.trunk = [
      {
        key: 't1',
        role: 'tool',
        content: '',
        time: Math.floor(Date.now() / 1000),
        sessionId: SESSION,
        tool: { name: 'bash', input: '{"command":"ls"}', output: 'ok', status: 'succeeded' },
      },
      reasoningMessage('r6', { animate: false }),
      {
        key: 't2',
        role: 'tool',
        content: '',
        time: Math.floor(Date.now() / 1000),
        sessionId: SESSION,
        tool: { name: 'read_file', input: '{"path":"a"}', output: 'x', status: 'succeeded' },
      },
    ];
    const wrapper = mountChatView(SESSION);
    await nextTick();
    expect(wrapper.findAll('.work-run-group').length).toBe(1);
    const chips = wrapper.findAll('.work-run-group__chip');
    expect(chips.length).toBe(3);
    expect(chips[0].classes()).toContain('work-run-group__chip--tool');
    expect(chips[1].classes()).toContain('work-run-group__chip--reasoning');
    expect(chips[2].classes()).toContain('work-run-group__chip--tool');
    // 全静止（无运行中/播放中/失败）→ 折叠为 chip 行
    expect(wrapper.find('.work-run-group__detail').exists()).toBe(false);
    wrapper.unmount();
  });

  it('非推理消息不受影响（仍按实时标记播放入场动画）', () => {
    state.trunk = [
      {
        key: 'ans1',
        role: 'backend',
        content: '回答',
        time: Math.floor(Date.now() / 1000),
        sessionId: SESSION,
        animate: true,
      },
    ];
    const wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-view__item--enter').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe('displayContentOf（hook 输入展示剥离）', () => {
  it('hook 输入只显示 payload.content；非 hook 原样返回', () => {
    const hook = `<qq_message_hook>{"content":"你好","message_sequence":5}</qq_message_hook>`;
    expect(displayContentOf(hook)).toBe('你好');
    expect(displayContentOf('普通文本 {"a":1}')).toBe('普通文本 {"a":1}');
    // 非法 JSON 兜底原样
    expect(displayContentOf('<qq_message_hook>{bad}</qq_message_hook>')).toContain('{bad}');
  });
});
