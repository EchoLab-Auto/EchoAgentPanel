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
const ChatMessageListStub = defineComponent({
  name: 'ChatMessageList',
  props: ['messages', 'formatTime', 'emptyText'],
  setup(props) {
    return () => h('div', { class: 'stub-list', 'data-count': String(props.messages.length) });
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
        ChatMessageList: ChatMessageListStub,
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
    expect(global.find('.stub-list').attributes('data-count')).toBe('2');
    const scoped = mountChatView('local:tui::a');
    expect(scoped.find('.stub-list').attributes('data-count')).toBe('1');
  });

  it('输入区占位（flex 子项）而非 absolute 遮挡：样式契约', () => {
    // 解析 SFC 样式块，锁定布局实现方式。回归为 position:absolute / padding hack 时测试失败。
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    expect(styleBlock).toMatch(/\.chat-view\s*\{[^}]*display:\s*flex/s);
    expect(styleBlock).toMatch(/\.chat-view\s*\{[^}]*flex-direction:\s*column/s);
    expect(styleBlock).toMatch(/\.chat-view__list\s*\{[^}]*flex:\s*1/s);
    expect(styleBlock).toMatch(/\.chat-view__list\s*\{[^}]*min-height:\s*0/s);
    expect(styleBlock).toMatch(/\.chat-composer-float\s*\{[^}]*flex:\s*0\s*0\s*auto/s);
    // 禁止回到 absolute 遮挡方案
    expect(styleBlock).not.toMatch(/\.chat-composer-float\s*\{[^}]*position:\s*absolute/s);
    // 不需要 padding-bottom hack 也能保证不遮挡
    expect(styleBlock).not.toMatch(/padding-bottom:\s*(?!0)[0-9]+px\s*!important/);
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
