//! MessageItem（面板自组消息行）契约测试（2026-09-30）。
//!
//! 背景：ui-frame 移除了 chat 组合组件（ChatMessageItem 等），面板改用
//! `ChatBubble` 元组件自组消息行。本测试锁定角色 → 气泡形态的映射，
//! 以及头部（角色名 / 来源 / 时间）与 Markdown 渲染的分派：
//! - user：居右主色气泡、纯文本；
//! - agent：居左中性气泡、正文走 MarkdownRenderer；
//! - system：居中平铺。

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageItem from '../MessageItem.vue';
import type { ChatMessageWithImages } from '../../chat-adapter';

function message(over: Partial<ChatMessageWithImages> = {}): ChatMessageWithImages {
  return {
    id: 'm1',
    role: 'user',
    content: '内容',
    time: 1700000000,
    ...over,
  } as ChatMessageWithImages;
}

function mountItem(msg: ChatMessageWithImages) {
  return mount(MessageItem, {
    props: { message: msg, formatTime: (t: number) => `T${t}` },
    global: {
      stubs: {
        MarkdownRenderer: { template: '<div class="md-stub">{{ content }}</div>', props: ['content'] },
        ChatCopyButton: true,
      },
    },
  });
}

describe('MessageItem 消息行', () => {
  it('user：居右主色气泡，头部显示来源与时间，正文纯文本', () => {
    const wrapper = mountItem(
      message({
        role: 'user',
        content: '你好',
        source: {
          adapterName: 'local',
          platform: 'local',
          userId: 'u1',
          userName: 'local user',
          channel: 'direct',
          groupName: null,
        } as ChatMessageWithImages['source'],
      }),
    );
    const bubble = wrapper.find('.nm-chat-bubble');
    expect(bubble.classes()).toContain('nm-chat-bubble--end');
    expect(bubble.classes()).toContain('nm-chat-bubble--primary');
    // 头部：来源标签（适配器 · 用户名）+ 时间；user 不显示角色名
    expect(wrapper.text()).toContain('local · local user');
    expect(wrapper.text()).toContain('T1700000000');
    expect(wrapper.text()).not.toContain('Agent');
    // 正文纯文本，不走 Markdown
    expect(wrapper.find('.md-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('你好');
  });

  it('agent：居左中性气泡，正文走 Markdown；头部有角色名', () => {
    const wrapper = mountItem(message({ role: 'agent', content: '# 标题' }));
    const bubble = wrapper.find('.nm-chat-bubble');
    expect(bubble.classes()).toContain('nm-chat-bubble--start');
    expect(bubble.classes()).toContain('nm-chat-bubble--default');
    expect(wrapper.text()).toContain('Agent');
    expect(wrapper.find('.md-stub').text()).toBe('# 标题');
    // 无障碍名标注角色
    expect(bubble.attributes('aria-label')).toBe('Agent');
  });

  it('system：居中平铺 + 时间，不渲染气泡头部角色', () => {
    const wrapper = mountItem(message({ role: 'system', content: '定时器触发' }));
    const bubble = wrapper.find('.nm-chat-bubble');
    expect(bubble.classes()).toContain('nm-chat-bubble--center');
    expect(bubble.classes()).toContain('nm-chat-bubble--plain');
    expect(wrapper.text()).toContain('定时器触发');
    expect(wrapper.text()).toContain('T1700000000');
  });

  it('群来源：群名前缀经 locale 文案渲染（群 {name}）', () => {
    const wrapper = mountItem(
      message({
        role: 'user',
        content: '看图',
        source: {
          adapterName: 'qq',
          platform: 'qq',
          userId: 'u1',
          userName: '某人',
          channel: 'group:12345',
          groupName: '测试群',
        } as ChatMessageWithImages['source'],
      }),
    );
    expect(wrapper.text()).toContain('qq');
    expect(wrapper.text()).toContain('测试群');
  });
});
