//! 会话正文的 Mermaid 图表渲染。
//!
//! ui-frame 已负责把 `mermaid` 代码块转换成图表占位并交给原生画布渲染；本测试
//! 走完整的 MessageItem → MarkdownLazy → MarkdownRenderer 链路，守住 Panel 的
//! 集成责任：flowchart 变成原生画布（`.nm-flow`）、粗箭头 `==>` 不再降级、
//! 画不出来的图保留可读源码，且 Panel **不再安装** mermaid 官方渲染器。

import { afterEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageItem from '../MessageItem.vue';
import type { ChatMessageWithImages } from '../../chat-adapter';

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
      '模块依赖如下：\n\n```mermaid\nflowchart LR\n  LLM["llm 服务"] --> Loop["loop 模块"]\n```',
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
    expect(wrapper.text()).toContain('模块依赖如下');
  });

  it('`==>` 粗箭头同样进原生画布，并画出加重边', async () => {
    const wrapper = mountItem(
      '根与人格层：\n\n```mermaid\nflowchart TB\n  ROOT["根作用域"] ==> P["人格子作用域"]\n```',
    );

    await vi.waitFor(() => expect(wrapper.find('.mermaid-diagram .nm-flow').exists()).toBe(true), {
      timeout: MERMAID_TIMEOUT,
    });

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.attributes('data-mermaid-state')).toBe('done');
    expect(diagram.findAll('.nm-flow__node')).toHaveLength(2);
    expect(diagram.find('.nm-flow__edge--thick').exists()).toBe(true);
  });

  it('画不出来的图保留源码回退，不影响同条消息的其他内容', async () => {
    // `direction` 是 Mermaid 合法语法、原生画布不支持——触发源码回退。
    const wrapper = mountItem(
      '前文\n\n```mermaid\nflowchart LR\n  A[开始] --> B[结束]\n  direction BT\n```\n\n后文',
    );

    await vi.waitFor(
      () =>
        expect(wrapper.find('.mermaid-diagram').attributes('data-mermaid-state')).toBe('error'),
      { timeout: MERMAID_TIMEOUT },
    );

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.find('pre code').text()).toContain('direction BT');
    expect(diagram.find('svg').exists()).toBe(false);
    expect(wrapper.text()).toContain('前文');
    expect(wrapper.text()).toContain('后文');
  }, MERMAID_TIMEOUT);

  it('sequenceDiagram 渲染成原生时序图', async () => {
    const wrapper = mountItem(
      '时序：\n\n```mermaid\nsequenceDiagram\n  participant A\n  participant B\n  A->>B: 请求\n```',
    );

    await vi.waitFor(() => expect(wrapper.find('.mermaid-diagram .nm-seq').exists()).toBe(true), {
      timeout: MERMAID_TIMEOUT,
    });

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.attributes('data-mermaid-graph')).toBe('sequence');
    expect(diagram.attributes('data-mermaid-state')).toBe('done');
    expect(diagram.findAll('.nm-seq__head')).toHaveLength(2);
    expect(diagram.findAll('.nm-seq__message')).toHaveLength(1);
  }, MERMAID_TIMEOUT);

  it('gantt 渲染成原生甘特图', async () => {
    const wrapper = mountItem(
      '排期：\n\n```mermaid\ngantt\n  dateFormat YYYY-MM-DD\n  section 开发\n  实现 :a, 2026-01-01, 5d\n```',
    );

    await vi.waitFor(() => expect(wrapper.find('.mermaid-diagram .nm-gantt').exists()).toBe(true), {
      timeout: MERMAID_TIMEOUT,
    });

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.attributes('data-mermaid-graph')).toBe('gantt');
    expect(diagram.attributes('data-mermaid-state')).toBe('done');
    expect(diagram.findAll('.nm-gantt__bar')).toHaveLength(1);
  }, MERMAID_TIMEOUT);

  it('既没有原生实现、也不知道的图型保留源码（Panel 不装官方渲染器）', async () => {
    const wrapper = mountItem('饼图：\n\n```mermaid\npie\n  "A" : 30\n```');

    await vi.waitFor(
      () =>
        expect(wrapper.find('.mermaid-diagram').attributes('data-mermaid-state')).toBe('error'),
      { timeout: MERMAID_TIMEOUT },
    );

    const diagram = wrapper.find('.mermaid-diagram');
    expect(diagram.attributes('data-mermaid-graph')).toBe('other');
    expect(diagram.find('svg').exists()).toBe(false);
    expect(diagram.find('pre code').text()).toContain('pie');
  }, MERMAID_TIMEOUT);
});
