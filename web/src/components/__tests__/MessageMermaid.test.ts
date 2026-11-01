//! 会话正文的 Mermaid 图表渲染。
//!
//! ui-frame 已负责把 `mermaid` 代码块转换成图表占位并延迟渲染；本测试走完整的
//! MessageItem → MarkdownLazy → MarkdownRenderer 链路，守住 Panel 的集成责任：
//! 安装 mermaid 可选依赖、图表确实替换源码，以及单图失败时仍保留可读源码。

import { afterEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import mermaid from 'mermaid';
import MessageItem from '../MessageItem.vue';
import type { ChatMessageWithImages } from '../../chat-adapter';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({
      svg: '<svg class="mermaid-test-svg" viewBox="0 0 120 40"><text>依赖图</text></svg>',
    })),
  },
}));

const MERMAID_TIMEOUT = 15000;

function mountItem(content: string) {
  const message = {
    id: 'm-mermaid',
    role: 'agent',
    content,
    time: 1700000000,
  } as ChatMessageWithImages;

  return mount(MessageItem, {
    props: { message, formatTime: (t: number) => `T${t}` },
    attachTo: document.body,
    global: { stubs: { ChatCopyButton: true } },
  });
}

describe('会话正文的 Mermaid 图表', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('agent 消息中的 flowchart 复用 ui-frame 原生图组件', async () => {
    const wrapper = mountItem(
      '插件依赖如下：\n\n```mermaid\nflowchart LR\n  LLM["llm 服务"] --> Loop["loop 插件"]\n```',
    );

    await vi.waitFor(() => expect(wrapper.find('.mermaid-diagram .nm-flow').exists()).toBe(true), {
      timeout: MERMAID_TIMEOUT,
    });

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.attributes('data-mermaid-state')).toBe('done');
    expect(diagram.attributes('data-mermaid-renderer')).toBe('ui-frame');
    expect(diagram.findAll('.nm-flow__node')).toHaveLength(2);
    expect(diagram.findAll('.nm-flow__edge')).toHaveLength(1);
    expect(diagram.find('pre').exists()).toBe(false);
    expect(wrapper.text()).toContain('插件依赖如下');

    const render = vi.mocked(mermaid.render);
    expect(render).not.toHaveBeenCalled();
  });

  it('单图解析失败时保留源码回退，不影响同条消息的其他内容', async () => {
    const render = vi.mocked(mermaid.render);
    render.mockClear();
    render.mockImplementation(async () => {
      throw new Error('bad diagram');
    });
    const wrapper = mountItem('前文\n\n```mermaid\nflowchart LR\n  非法图源\n```\n\n后文');

    await vi.waitFor(() => expect(render.mock.calls.length).toBeGreaterThanOrEqual(1), {
      timeout: MERMAID_TIMEOUT,
    });

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.find('pre code').text()).toContain('非法图源');
    expect(diagram.attributes('data-mermaid-state')).toBe('error');
    expect(wrapper.text()).toContain('前文');
    expect(wrapper.text()).toContain('后文');
  }, MERMAID_TIMEOUT);
});
