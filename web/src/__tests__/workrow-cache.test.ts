//! 工作行对象缓存契约（2026-10 P0 性能止血）。
//!
//! 背景：`messageRows` 是**数组级** computed——任意一条消息变化（流式 delta
//! 每几十毫秒一次）都会让它整体重算，于是每次都要对**全部**消息重跑
//! `ChatView::workRowOf`（每条工作行还要 `formatTime` + `JSON.parse` 子代理
//! 参数）。实测 2000 行消息时这块占单次 delta 耗时的 19%（另 44% 是 Intl）。
//!
//! 修法：`ChatView` 用 `WeakMap<ChatMessageWithImages, WorkRunItem | null>`
//! 缓存工作行。命中条件依赖 `chat-message-cache` 的不变量——**未变消息的
//! 渲染对象引用恒等**（见 `__tests__/chat-message-cache.test.ts`）。
//!
//! 本组锁定三件事（缺一即收益归零或渲染出错）：
//!   ① 同一渲染对象 → 重算返回**同一个 WorkRunItem**（缓存命中的唯一证据）；
//!   ② 内容变化的**新对象** → 必须重建（否则界面不更新：这是 2026-10
//!      `d8e862d` 那次"工具行一直读秒"的同型陷阱）；
//!   ③ 非工作行（user / backend）返回 null，且 null 也被缓存（避免反复判定）。

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../components/ChatView.vue';
import { state } from '../store';
import type { DisplayMessage } from '../state';

const SID = 'local:tui::local_user';

/** ChatView 的最小可用环境：消息行用 stub（只关心行对象复用，不关心行内视觉）。 */
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
  setup() {
    return () => h('div', { class: 'stub-composer' });
  },
});
const stubs = { MessageItem: MessageItemStub, ChatComposer: ChatComposerStub };

function toolMsg(key: string, content: string, time: number): DisplayMessage {
  return {
    key,
    role: 'tool',
    content,
    sessionId: SID,
    time,
    tool: { name: 'bash', input: '{"cmd":"ls"}', output: 'ok', status: 'succeeded' },
  };
}

function mountChatView() {
  return mount(ChatView, { props: { sessionId: SID }, global: { stubs } });
}

describe('ChatView 工作行对象缓存（P0）', () => {
  it('未变消息的渲染对象复用 → WorkRunGroup 的 items 引用保持不变', async () => {
    state.connected = true;
    state.trunk = [toolMsg('t1', 'bash', 1000), toolMsg('t2', 'bash', 2000)];
    state.sessionHistory = {};
    const wrapper = mountChatView();
    await nextTick();

    const groups = () => wrapper.findAllComponents({ name: 'WorkRunGroup' });
    const first = groups()[0].props('items') as unknown[];
    expect(Array.isArray(first)).toBe(true);

    // 追加一条新的普通消息：旧工作行内容未变 → 复用同一 items 数组引用
    state.trunk.push({
      key: 'b1',
      role: 'backend',
      content: '回答',
      sessionId: SID,
      time: 3000,
    });
    await nextTick();
    const second = groups()[0].props('items') as unknown[];
    // 缓存命中的唯一可观测证据：对象引用恒等（Vue 据此跳过子组件 diff）
    expect(second[0]).toBe(first[0]);
    wrapper.unmount();
  });

  it('工具行状态变化 → 重建（不得因缓存而漏更新）', async () => {
    state.connected = true;
    state.trunk = [
      {
        key: 't-run',
        role: 'tool',
        content: 'bash',
        sessionId: SID,
        time: 4000,
        tool: { name: 'bash', input: '{"cmd":"sleep 1"}', output: null, status: 'running' },
      },
    ];
    state.sessionHistory = {};
    const wrapper = mountChatView();
    await nextTick();
    const before = (wrapper.findAllComponents({ name: 'WorkRunGroup' })[0].props('items') as Array<{ status?: string }>)[0];
    expect(before.status).toBe('running');

    // 就地变异（state.ts 的真实写法）→ chat-message-cache 感知到值变化 →
    // 新渲染对象 → 工作行必须重建为 succeeded。
    const live = state.trunk[0];
    live.tool = { ...(live.tool as NonNullable<DisplayMessage['tool']>), output: 'done', status: 'succeeded' };
    await nextTick();
    const after = (wrapper.findAllComponents({ name: 'WorkRunGroup' })[0].props('items') as Array<{ status?: string }>)[0];
    expect(after.status).toBe('succeeded');
    expect(after).not.toBe(before);
    wrapper.unmount();
  });

  it('非工作行返回 null 也被缓存（user / backend 不反复判定）', async () => {
    state.connected = true;
    state.trunk = [
      { key: 'u1', role: 'user', content: '问', sessionId: SID, time: 5000 },
      { key: 'b2', role: 'backend', content: '答', sessionId: SID, time: 5001 },
    ];
    state.sessionHistory = {};
    const wrapper = mountChatView();
    await nextTick();
    // 两条普通消息 → 两条单行（无工作组）
    expect(wrapper.findAllComponents({ name: 'WorkRunGroup' }).length).toBe(0);
    expect(wrapper.findAll('.stub-item').length).toBe(2);

    // 再触发一次重算（追加消息）：普通行仍不产生工作组
    state.trunk.push({ key: 'u3', role: 'user', content: '追问', sessionId: SID, time: 5002 });
    await nextTick();
    expect(wrapper.findAllComponents({ name: 'WorkRunGroup' }).length).toBe(0);
    expect(wrapper.findAll('.stub-item').length).toBe(3);
    wrapper.unmount();
  });
});
