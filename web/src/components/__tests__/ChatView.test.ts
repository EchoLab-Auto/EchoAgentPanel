//! ChatView 布局契约测试。
//!
//! 背景：输入区浮动在消息列表上曾导致最后一条消息被遮挡（absolute + padding 猜测）。
//! 修复方案：输入区改为 flex 子项占位（flex: 0 0 auto），消息列表 flex:1 独立滚动。
//! 本测试锁定该契约，防止回归为 absolute/padding hack。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state, dispatch } from '../../store';
import { displayContentOf } from '../../state_domains/timeline';
import { resetReasoningAnimForTests } from '../../reasoning-anim';
import type { DisplayMessage } from '../../state';
import { teamKey } from '../../keys';

// 会话历史补拉（RequestSessionHistory）断言用：拦截命令发送。importOriginal
// 保证其余导出（startConnection 等）保持真实；本文件其余用例不触网。
vi.mock('../../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true) };
});

import { sendCommand } from '../../connection';
// ChatView 自渲染消息行（WorkRunGroup 合并 + MessageItem）；滚动区自组
// （2026-10-13 起直用 useChatScroll，无 ChatTray 组件——头部 stub 已移除）。
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
    // 两个子项必须是 .chat-view 的直接子级（同一 flex 流，非嵌套遮挡）；
    // 2026-10-13 起对话区为 .chat-view__tray（滚动区 + 跳转钮的包装）。
    const children = Array.from(wrapper.find('.chat-view').element.children);
    const withTray = children.filter((el) => el.className.includes('chat-view__tray'));
    const withComposer = children.filter((el) => el.className.includes('chat-composer-float'));
    expect(withTray.length).toBe(1);
    expect(withComposer.length).toBe(1);
    // 滚动区在托盘内部
    expect(wrapper.find('.chat-view__tray .chat-view__list').exists()).toBe(true);
  });

  it('消息列表在输入区之前（DOM 顺序：列表 → 输入区）', () => {
    const wrapper = mountChatView();
    const container = wrapper.find('.chat-view');
    const children = Array.from(container.element.children);
    const trayIndex = children.findIndex((el) => el.className.includes('chat-view__tray'));
    const composerIndex = children.findIndex((el) => el.className.includes('chat-composer-float'));
    expect(trayIndex).toBeGreaterThanOrEqual(0);
    expect(composerIndex).toBeGreaterThan(trayIndex);
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
    // 列表自身即滚动区（2026-10-13 起，原 ChatTray 组装件解散）+ 预留空间
    // 加在滚动区内部——外层 padding 会压缩滚动高度，消息将永远无法滚到
    // 输入框后方
    expect(styleBlock).toMatch(/\.chat-view__list\s*\{[^}]*overflow-y:\s*auto/s);
    expect(styleBlock).toMatch(/\.chat-view__list\s*\{[^}]*padding-bottom:\s*190px/s);
    // 外层包装（.chat-view__tray）不得出现 padding-bottom（避免压缩滚动区）
    expect(styleBlock).not.toMatch(/\.chat-view__tray\s*\{[^}]*padding-bottom/s);
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
    const jumpRule = styleBlock.match(/\.chat-view__jump\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    // 横向避让右侧栏列（trayPadRight）+ 纵向与边栏列底对齐（entryBottom + 45）
    expect(jumpRule).toMatch(/right:\s*calc\(v-bind\(trayPadRight\)\s*\+\s*16px\)/);
    // 2026-10：45px 抽成 RAIL_ENTRY_GAP（与侧栏、覆盖面板同源）
    expect(jumpRule).toMatch(
      /bottom:\s*calc\(v-bind\(entryBottom\)\s*\+\s*v-bind\(railEntryGap\)\)/,
    );
    expect(jumpRule).toMatch(/z-index:\s*5/);
    // 浮层打开时隐藏（覆盖 rail 之上不再被盖住）
    expect(styleBlock).toMatch(
      /\.chat-view--overlay-open \.chat-view__jump\s*\{[^}]*display:\s*none/s,
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
    // 覆盖面板（SessionOverlay，2026-10 统一）：内容在会话视图内部渲染，
    // 从 wrapper 查询（不再 Teleport 到 body）。
    await vi.waitFor(() => {
      expect(wrapper.findAll('.session-overlay .sw-item').length).toBeGreaterThan(0);
    });
    // 面板内可选 QQ 私聊项
    const items = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll('.session-overlay .sw-item'),
    ) as HTMLElement[];
    const item = items.find((b) => (b.textContent ?? '').includes('Evence'));
    expect(item).toBeTruthy();
    item!.click();
    await nextTick();
    expect(wrapper.emitted('selectSession')?.[0]).toEqual(['qq:dm::1828980067']);
    wrapper.unmount();
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
    // （覆盖面板渲染在会话视图内部，从 wrapper 查询）
    const panel = wrapper.element.querySelector('.session-overlay .stub-tasks');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toBe('local:tui::local_user');
    wrapper.unmount();
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

  it('受限样式契约：actions 行底对齐、图标取 ui-frame 档位、SVG 图标而非 emoji', () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    // 图标规格（2026-10 图标统一）：尺寸取 --nm-icon-size-md（16px 档），
    // 不再自造 17px / 15px 档位（UI Frame §8 尺寸须为枚举档）。
    expect(styleBlock).toMatch(/chat-view__icon\s*\{[^}]*width:\s*var\(--nm-icon-size-md\)/s);
    expect(styleBlock).not.toMatch(/chat-view__icon[^{]*\{[^}]*width:\s*1[57]px/s);
    // actions 行底对齐
    expect(styleBlock).toMatch(/nm-chat-composer__row[^}]*align-items:\s*flex-end/s);
    // 源文件不得出现 emoji 图标
    expect(raw).not.toContain('🖼');
    // 发送按钮内联 flex 布局（图标+文字）
    expect(styleBlock).toMatch(/chat-view__send\s*\{[^}]*display:\s*inline-flex/s);
  });
});

describe('状态行（2026-10：从入口行浮条搬进输入区）', () => {
  // 需求：入口行左侧那颗玻璃胶囊浮条（.chat-activity）推到 Agent 切换器到
  // 「模型」整排按钮左右移动，文案一长还抖动。改成输入区内、文本域下方独占
  // 一行（.chat-status），入口行排布不再受影响。
  const SESSION = 'local:tui::a';

  function act(phase: 'thinking' | 'tool' | 'subagent' | 'completed', detail: string | null = null) {
    return {
      phase,
      detail,
      startedAt: Date.now(),
      toolsCompleted: 0,
      subagentsCompleted: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  beforeEach(() => {
    state.trunk = [];
    state.activities = {};
    state.sessionApiOverrides = {};
    state.api = null;
  });

  it('忙碌时状态行出现在输入区内，且入口行里没有它', () => {
    state.activities[SESSION] = act('thinking');
    const wrapper = mountChatView(SESSION);
    const status = wrapper.find('.chat-status');
    expect(status.exists()).toBe(true);
    // 位置契约：必须是输入区（.chat-composer-float）的后代
    expect(wrapper.find('.chat-composer-float .chat-status').exists()).toBe(true);
    // 旧浮条已移除：入口行里不能再有这个元素
    expect(wrapper.find('.entry-row .chat-activity').exists()).toBe(false);
    expect(wrapper.find('.chat-activity').exists()).toBe(false);
    wrapper.unmount();
  });

  it('空闲时也显示 API 徽标（常驻），但没有相位文案与 spinner', () => {
    // 用户明确要求：不管忙不忙，始终能看到当前 API
    state.api = {
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      active_api: '',
      profiles: [],
    } as unknown as typeof state.api;
    // activities 为空 = 空闲
    const wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-status').exists()).toBe(true);
    expect(wrapper.find('.chat-status__api').text()).toBe('deepseek / deepseek-v4-flash');
    // 相位部分整体不存在（含 spinner），但 live region 容器也不该留下空壳
    expect(wrapper.find('.chat-status__live').exists()).toBe(false);
    expect(wrapper.find('.chat-status__spinner').exists()).toBe(false);
    wrapper.unmount();
  });

  it('既无 API 又无相位时整行不渲染（不留空行占位）', () => {
    // beforeEach 已把 api 置 null
    const wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-status').exists()).toBe(false);
    wrapper.unmount();
  });

  it('忙碌与空闲的输入区高度一致（常驻行不引入跳动）', async () => {
    state.api = {
      provider: 'deepseek', model: 'm', active_api: '', profiles: [],
    } as unknown as typeof state.api;
    const idle = mountChatView(SESSION);
    const idleRow = idle.find('.chat-status').exists();
    idle.unmount();

    state.activities[SESSION] = act('thinking');
    const busy = mountChatView(SESSION);
    // 两种状态都渲染同一行 .chat-status（高度由 CSS min-height 兜住，
    // 组件层面能断言的是"行存在"这件事在两种状态下都成立）
    expect(idleRow).toBe(true);
    expect(busy.find('.chat-status').exists()).toBe(true);
    busy.unmount();
  });

  it('文案按相位切换：thinking / tool / subagent', async () => {
    state.activities[SESSION] = act('thinking');
    const wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-status__text').text()).toBe('正在思考…');

    state.activities[SESSION] = act('thinking', '正在整合 subagent 结果');
    await nextTick();
    expect(wrapper.find('.chat-status__text').text()).toContain('正在整合 subagent 结果');

    state.activities[SESSION] = act('subagent', '写文档');
    await nextTick();
    expect(wrapper.find('.chat-status__text').text()).toContain('子代理工作中');

    state.activities[SESSION] = act('completed');
    await nextTick();
    // 结束即整行移除（不是变灰留白）
    expect(wrapper.find('.chat-status').exists()).toBe(false);
    wrapper.unmount();
  });

  it('读屏契约：相位文案是 live region，API 徽标不在其中', () => {
    state.activities[SESSION] = act('thinking');
    const wrapper = mountChatView(SESSION);
    // live region 收窄到 .chat-status__live：API 名是静态信息，重复播报只会吵
    const live = wrapper.find('.chat-status__live');
    expect(live.attributes('role')).toBe('status');
    expect(live.attributes('aria-live')).toBe('polite');
    expect(wrapper.find('.chat-status').attributes('role')).toBeUndefined();
    // 装饰性 spinner 不该被读出来
    expect(wrapper.find('.chat-status__spinner').attributes('aria-hidden')).toBe('true');
    wrapper.unmount();
  });

  // 状态行左侧的「当前会话正在用的 API」：会话级覆盖 → persona 激活 → 顶层默认
  it('API 徽标：会话级覆盖优先于 persona 级 active_api', async () => {
    state.api = {
      provider: 'deepseek',
      model: 'top-level-model',
      active_api: 'persona-profile',
      profiles: [
        { name: 'persona-profile', provider: 'deepseek', model: 'persona-model' },
        { name: 'session-profile', provider: 'kimi', model: 'k3-session' },
      ],
    } as unknown as typeof state.api;
    state.activities[SESSION] = act('thinking');

    // 无会话级覆盖 → persona 激活的 profile
    let wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-status__api').text()).toBe('deepseek / persona-model');
    wrapper.unmount();

    // 有会话级覆盖 → 覆盖优先（与入口行「模型」按钮显示的 persona 级不同）
    state.sessionApiOverrides[SESSION] = 'session-profile';
    wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-status__api').text()).toBe('kimi / k3-session');
    expect(wrapper.find('.chat-status__api').attributes('title')).toContain('本会话覆盖');
    wrapper.unmount();

    // 两层都空 → 顶层默认配置
    delete state.sessionApiOverrides[SESSION];
    state.api!.active_api = '';
    wrapper = mountChatView(SESSION);
    expect(wrapper.find('.chat-status__api').text()).toBe('deepseek / top-level-model');
    expect(wrapper.find('.chat-status__api').attributes('title')).toContain('顶层默认配置');
    wrapper.unmount();
  });

  it('API 徽标在相位文案左边（DOM 顺序 = 视觉顺序）', () => {
    // beforeEach 把 api 清成 null（徽标不渲染），这里必须先放一份配置
    state.api = {
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      active_api: '',
      profiles: [],
    } as unknown as typeof state.api;
    state.activities[SESSION] = act('thinking');
    const wrapper = mountChatView(SESSION);
    const row = wrapper.find('.chat-status');
    const kids = [...row.element.children].map((el) => el.className);
    expect(kids[0]).toContain('chat-status__api');
    expect(kids[1]).toContain('chat-status__live');
    wrapper.unmount();
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

describe('会话历史补拉（RequestSessionHistory，2026-10）', () => {
  const sendMock = vi.mocked(sendCommand);
  const stubs = {
    MessageItem: MessageItemStub,
    ChatComposer: ChatComposerStub,
  };

  beforeEach(() => {
    sendMock.mockClear();
    state.connected = true;
    state.trunk = [];
    state.sessionHistory = {};
    state.teams = [];
    state.sessions = [];
    state.activities = {};
    state.activeRegion = null;
    state.activeTeamId = null;
    state.knownCores = new Set();
  });

  afterEach(() => {
    state.connected = false;
  });

  /** 指定会话的补拉调用。⚠️ 本文件前面的用例有部分未 unmount 的遗留组件，
   *  其 watcher 也会随连接/区域变化补拉各自的会话——断言只按会话 id 过滤
   *  自己关心的调用（用例用专属会话 id，与遗留组件天然隔离）。 */
  function historyCallsFor(sessionId: string) {
    return sendMock.mock.calls.filter(([command]) => {
      const payload = command as { RequestSessionHistory?: { session_id?: string } };
      return payload?.RequestSessionHistory?.session_id === sessionId;
    });
  }

  it('挂载非 global 会话：发 RequestSessionHistory（team_id/session_id/limit 正确）', () => {
    const wrapper = mount(ChatView, {
      props: { sessionId: 'sess-open', activeTeamId: 'alix' },
      global: { stubs },
    });
    const calls = historyCallsFor('sess-open');
    expect(calls.length, '未发出（或重复发出）会话历史补拉').toBe(1);
    expect(calls[0][0]).toEqual({
      // 渐进式拉取（2026-10 内存/切会话治理）：首拉 300 条（渲染窗口 200
      // + 余量），用户点「加载更早」把窗口扩到界外时再 +300。
      // 此前固定 1000 条——切一次会话白拉 5 倍量（实测 33 ms）。
      RequestSessionHistory: { team_id: 'alix', session_id: 'sess-open', limit: 300 },
    });
    wrapper.unmount();
  });

  it('global 视图不发补拉（聚合视图没有单一会话归属）', () => {
    const wrapper = mount(ChatView, {
      props: { sessionId: 'global' },
      global: { stubs },
    });
    const globalCalls = sendMock.mock.calls.filter(([command]) => {
      const payload = command as { RequestSessionHistory?: { session_id?: string } };
      return payload?.RequestSessionHistory?.session_id === 'global';
    });
    expect(globalCalls).toEqual([]);
    wrapper.unmount();
  });

  it('未连接时不发；连接恢复（重连）后补发', async () => {
    state.connected = false;
    const wrapper = mount(ChatView, {
      props: { sessionId: 'sess-reconnect' },
      global: { stubs },
    });
    expect(historyCallsFor('sess-reconnect')).toEqual([]);
    state.connected = true;
    await nextTick();
    const calls = historyCallsFor('sess-reconnect');
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toEqual({
      RequestSessionHistory: { team_id: null, session_id: 'sess-reconnect', limit: 300 },
    });
    wrapper.unmount();
  });

  it('无窗口条目但有会话历史快照：消息照常渲染（修复「暂无消息」）', () => {
    state.activeRegion = 'core-a';
    dispatch(
      {
        SessionHistory: {
          team_id: 'alix',
          session_id: 'sess-h',
          messages: [{ kind: 'user', content: '历史消息', session_id: 'sess-h', time: 5, seq: 1 }],
          total: 1,
          truncated: false,
          max_seq: 3,
        },
      },
      'core-a',
    );
    expect(state.trunk).toEqual([]); // 共享窗口里没有该会话条目（已被 FIFO 淘汰）
    const wrapper = mount(ChatView, {
      props: { sessionId: 'sess-h', activeTeamId: 'alix' },
      global: { stubs },
    });
    const items = wrapper.findAll('.stub-item');
    expect(items.length).toBe(1);
    expect(items[0].text()).toContain('历史消息');
    wrapper.unmount();
  });
});

// ── 渲染窗口（2026-10 P0 性能止血）───────────────────────────────────────
//
// 背景：消息列表此前全量 v-for，会话多长 DOM 就有多大——实测 2000 行时一次
// 流式 delta 全链路 23 ms、一次回答掉帧 117/119（30fps）；300 行时 1/119。
// 现改为只渲染尾部 200 行，更早的按需扩窗。本组锁定三条不变量：
//   ① 超过窗口的行**不渲染**（性能收益的唯一来源）；
//   ② 未渲染行数 > 0 时提供「加载更早」入口，点击按步长扩窗；
//   ③ 切会话把窗口复位（不把长窗口带到下一个会话）。
describe('ChatView 渲染窗口（P0）', () => {
  const stubs = { MessageItem: MessageItemStub, ChatComposer: ChatComposerStub };

  beforeEach(() => {
    state.connected = true;
    state.trunk = [];
    state.sessionHistory = {};
    state.sessions = [];
    state.activities = {};
    state.activeRegion = null;
    state.activeTeamId = null;
  });

  /** 灌 n 条 window 条目（实时投影路径：sessionMessagesFor 无快照时按其过滤）。 */
  function seed(n: number, sessionId: string) {
    const list: DisplayMessage[] = [];
    for (let i = 0; i < n; i++) {
      list.push({ key: `w-${i}`, role: 'backend', content: `m${i}`, sessionId, time: 1000 + i });
    }
    state.trunk = list;
  }

  it('超过 200 行只渲染尾部 200 行，并显示「加载更早」入口', () => {
    seed(500, 'sess-window');
    const wrapper = mount(ChatView, { props: { sessionId: 'sess-window' }, global: { stubs } });
    const items = wrapper.findAll('.stub-item');
    expect(items.length).toBe(200);
    // 尾部窗口：最新一条在，最早的 300 条不在
    expect(items[items.length - 1].text()).toBe('m499');
    expect(items[0].text()).toBe('m300');
    expect(wrapper.find('[data-testid="chat-load-earlier"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('点「加载更早」按 200 扩窗', async () => {
    seed(500, 'sess-window-more');
    const wrapper = mount(ChatView, { props: { sessionId: 'sess-window-more' }, global: { stubs } });
    expect(wrapper.findAll('.stub-item').length).toBe(200);
    await wrapper.find('[data-testid="chat-load-earlier"]').trigger('click');
    await nextTick();
    expect(wrapper.findAll('.stub-item').length).toBe(400);
    // 仍差 100 行 → 入口继续在
    expect(wrapper.find('[data-testid="chat-load-earlier"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('不足窗口时不显示入口（不引入无谓 UI）', () => {
    seed(50, 'sess-window-small');
    const wrapper = mount(ChatView, { props: { sessionId: 'sess-window-small' }, global: { stubs } });
    expect(wrapper.findAll('.stub-item').length).toBe(50);
    expect(wrapper.find('[data-testid="chat-load-earlier"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
// ── 渐进式历史拉取（2026-10 内存/切会话治理）──────────────────────────────
//
// 改前固定 `limit: 1000`，而渲染窗口只有 200 条：切一次会话白拉 5 倍量
// （Core 派生 + 传输 + toDisplayMessages 全量转换 + 写 store，实测 33 ms）。
// 现在首拉 300，用户把窗口扩到已加载量之外时再 +300。
describe('ChatView 渐进式历史', () => {
  const stubs = { MessageItem: MessageItemStub, ChatComposer: ChatComposerStub };
  const sendMock = vi.mocked(sendCommand);

  beforeEach(() => {
    sendMock.mockClear();
    state.connected = true;
    state.trunk = [];
    state.sessionHistory = {};
    state.teams = [];
    state.sessions = [];
    state.activities = {};
    state.activeRegion = null;
    state.activeTeamId = null;
    state.knownCores = new Set();
  });

  function limitsFor(sessionId: string): number[] {
    return sendMock.mock.calls
      .map(([command]) => command as { RequestSessionHistory?: { session_id?: string; limit?: number } })
      .filter((payload) => payload?.RequestSessionHistory?.session_id === sessionId)
      .map((payload) => payload.RequestSessionHistory!.limit!);
  }

  it('首拉 300；本地渲染完后入口仍在（Core 侧还有更早）→ 再拉 300', async () => {
    const wrapper = mount(ChatView, { props: { sessionId: 'sess-progressive' }, global: { stubs } });
    expect(limitsFor('sess-progressive')).toEqual([300]);

    // 灌 300 条（= 首拉量）。同时给一份 `total: 1200, truncated: true` 的快照，
    // 表示事件日志里还有更早的 900 条没拉下来。
    const list: DisplayMessage[] = [];
    for (let i = 0; i < 300; i++) {
      list.push({ key: `p-${i}`, role: 'backend', content: `m${i}`, sessionId: 'sess-progressive', time: 1000 + i });
    }
    state.trunk = list;
    dispatch(
      {
        SessionHistory: {
          team_id: null,
          session_id: 'sess-progressive',
          messages: list.map((m, i) => ({
            kind: 'backend' as const,
            content: m.content,
            session_id: 'sess-progressive',
            time: m.time,
            seq: i + 1,
          })),
          total: 1200,
          truncated: true,
          max_seq: 1200,
        },
      },
      null,
    );
    await nextTick();
    expect(wrapper.findAll('.stub-item').length).toBe(200); // 渲染窗口仍是 200

    // ① 扩窗到 300（仍在本地已加载范围内）
    await wrapper.find('[data-testid="chat-load-earlier"]').trigger('click');
    await nextTick();
    await nextTick();
    expect(wrapper.findAll('.stub-item').length).toBe(300);

    // ② 本地都渲染完了，但 Core 侧还有 → 入口仍在，文案退化为不带计数
    const btn = wrapper.find('[data-testid="chat-load-earlier"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('加载更早的消息');
    expect(btn.text()).not.toContain('还有');

    // ③ 再点 → 向 Core 多拉一档（300 → 600）
    await btn.trigger('click');
    await nextTick();
    expect(limitsFor('sess-progressive')).toEqual([300, 600]);
    wrapper.unmount();
  });

  it('切会话把拉取档位复位回 300', async () => {
    const wrapper = mount(ChatView, { props: { sessionId: 'sess-a' }, global: { stubs } });
    expect(limitsFor('sess-a')).toEqual([300]);
    await wrapper.setProps({ sessionId: 'sess-b' });
    await nextTick();
    expect(limitsFor('sess-b')).toEqual([300]);
    wrapper.unmount();
  });
});
// ── 时间线分页接线（2026-10）──────────────────────────────────────────────
//
// 首屏只收最新 200 条（`TIMELINE_INITIAL_WINDOW`），更早的内容由「加载更早」
// 按 `RequestTimelineEarlier` 向上翻页。本组锁的是**触发条件**：
// 本地渲染完 + 会话历史已到顶 + 时间线 has_more → 发翻页请求（带正确锚点）。
describe('ChatView 时间线翻页接线', () => {
  const stubs = { MessageItem: MessageItemStub, ChatComposer: ChatComposerStub };
  const sendMock = vi.mocked(sendCommand);

  beforeEach(() => {
    sendMock.mockClear();
    state.connected = true;
    state.trunk = [];
    state.sessionHistory = {};
    state.teamTimelines = {};
    state.timelineHasMore = {};
    state.trunkTeamId = null;
    state.teams = [];
    state.sessions = [];
    state.activities = {};
    state.activeRegion = null;
    state.activeTeamId = null;
    state.knownCores = new Set();
  });

  function earlierCalls() {
    return sendMock.mock.calls
      .map(([command]) => command as { RequestTimelineEarlier?: { before_seq?: number; limit?: number } })
      .filter((payload) => payload?.RequestTimelineEarlier);
  }

  it('本地渲染完 + 时间线 has_more → 点「加载更早」发 RequestTimelineEarlier（锚点=最老条目 seq）', async () => {
    // 灌 5 条（全在渲染窗口内），并标记 Core 侧还有更早的
    state.trunk = [
      { key: 'g1', role: 'backend', content: 'a', sessionId: 'global', time: 1000, seq: 201, ord: 401 },
      { key: 'g2', role: 'backend', content: 'b', sessionId: 'global', time: 1001, seq: 202, ord: 402 },
      { key: 'g3', role: 'backend', content: 'c', sessionId: 'global', time: 1002, seq: 203, ord: 403 },
      { key: 'g4', role: 'backend', content: 'd', sessionId: 'global', time: 1003, seq: 204, ord: 404 },
      { key: 'g5', role: 'backend', content: 'e', sessionId: 'global', time: 1004, seq: 205, ord: 405 },
    ];
    state.trunkTeamId = teamKey(null, null);
    state.timelineHasMore[teamKey(null, null)] = true;

    const wrapper = mount(ChatView, { props: { sessionId: 'global' }, global: { stubs } });
    await nextTick();
    expect(wrapper.findAll('.stub-item').length).toBe(5);

    // 入口显示（本地无未渲染，但 Core 侧还有）
    const btn = wrapper.find('[data-testid="chat-load-earlier"]');
    expect(btn.exists()).toBe(true);

    await btn.trigger('click');
    await nextTick();
    const calls = earlierCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].RequestTimelineEarlier).toEqual({
      team_id: null,
      // 锚点 = 已加载**最老条目的 ord**（不是 seq：seq 因就地更新而乱序；
      // 也不是条数：分页期间新增会让"从尾部数 N 条"错位）
      before_ord: 401,
      limit: 400, // 一页 = 渲染窗口的两倍（少往返）
    });
    wrapper.unmount();
  });

  it('时间线已翻到底（has_more=false）→ 入口不显示、不发请求', async () => {
    state.trunk = [
      { key: 'g1', role: 'backend', content: 'a', sessionId: 'global', time: 1000, seq: 201 },
    ];
    state.trunkTeamId = teamKey(null, null);
    state.timelineHasMore[teamKey(null, null)] = false;

    const wrapper = mount(ChatView, { props: { sessionId: 'global' }, global: { stubs } });
    await nextTick();
    expect(wrapper.find('[data-testid="chat-load-earlier"]').exists()).toBe(false);
    expect(earlierCalls().length).toBe(0);
    wrapper.unmount();
  });

  it('本地还有未渲染的行时优先本地扩窗（不发翻页请求）', async () => {
    const list: DisplayMessage[] = [];
    for (let i = 0; i < 260; i++) {
      list.push({ key: `w${i}`, role: 'backend', content: `m${i}`, sessionId: 'global', time: 1000 + i, seq: 300 + i });
    }
    state.trunk = list;
    state.trunkTeamId = teamKey(null, null);
    state.timelineHasMore[teamKey(null, null)] = true;

    const wrapper = mount(ChatView, { props: { sessionId: 'global' }, global: { stubs } });
    await nextTick();
    expect(wrapper.findAll('.stub-item').length).toBe(200);
    await wrapper.find('[data-testid="chat-load-earlier"]').trigger('click');
    await nextTick();
    await nextTick();
    expect(wrapper.findAll('.stub-item').length).toBe(260); // 本地扩窗
    expect(earlierCalls().length).toBe(0); // 未发翻页请求
    wrapper.unmount();
  });
});

