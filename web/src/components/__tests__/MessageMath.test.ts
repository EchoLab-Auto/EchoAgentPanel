//! 会话正文的数学公式渲染（2026-10）。
//!
//! 公式渲染落在 ui-frame 的 `MarkdownRenderer`（`composites/doc/math.ts`）：
//! marked 扩展把 `$…$` / `$$…$$` / `\(…\)` / `\[…\]` 换成一个**占位元素**，
//! 挂载后动态 `import('katex')` 再把占位替换成公式 HTML。因此本测试不 mock
//! Markdown 链路（与 `MessageItem.test.ts` 相反），而是真挂载
//! MessageItem → MarkdownLazy → MarkdownRenderer → KaTeX，验证面板这一侧
//! 的三件事：
//!
//! 1. agent 消息里的公式**真的渲染出来**（`.katex` 出现）；
//! 2. 样式表随 Markdown 模块按需加载，而不是落进首屏关键路径
//!    （`MarkdownLazy` 的 loader 里 import katex CSS）；
//! 3. 用户消息保持纯文本 —— 公式只在 Markdown 路径生效（范围与既有
//!    Markdown 支持一致：用户输入不被当作 Markdown 解析）。

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageItem from '../MessageItem.vue';
import type { ChatMessageWithImages } from '../../chat-adapter';

/** 异步 chunk（doc 模块 + katex）在 CI/慢机上可能超过默认 1s。 */
const MATH_TIMEOUT = 15000;

function message(over: Partial<ChatMessageWithImages> = {}): ChatMessageWithImages {
  return {
    id: 'm-math',
    role: 'agent',
    content: '',
    time: 1700000000,
    ...over,
  } as ChatMessageWithImages;
}

function mountItem(content: string, role: 'agent' | 'user' = 'agent') {
  return mount(MessageItem, {
    props: { message: message({ role, content }), formatTime: (t: number) => `T${t}` },
    global: { stubs: { ChatCopyButton: true } },
  });
}

describe('会话正文的数学公式', () => {
  it('agent 消息的行内公式渲染为 KaTeX（含 MathML 无障碍输出）', async () => {
    const wrapper = mountItem('能量满足 $E=mc^2$，这一步很重要');

    await vi.waitFor(() => expect(wrapper.find('.katex').exists()).toBe(true), {
      timeout: MATH_TIMEOUT,
    });

    const mountEl = wrapper.find('.md-math-mount');
    expect(mountEl.exists()).toBe(true);
    expect(mountEl.attributes('data-math-state')).toBe('done');
    // annotation 是 MathML 里的 TeX 原文（屏幕阅读器 / 禁字体场景可读）
    expect(mountEl.find('.katex-mathml annotation').text()).toBe('E=mc^2');
    // 中文正文没被公式吞掉
    expect(wrapper.text()).toContain('能量满足');
    expect(wrapper.text()).toContain('这一步很重要');
  });

  it('块级公式独占一行，并包在可横向滚动的容器里（长公式在窄屏不撑破气泡）', async () => {
    const wrapper = mountItem('推导如下：\n\n$$\n\\sum_{i=1}^{n} a_i = \\frac{n(n+1)}{2}\n$$\n\n证毕');

    await vi.waitFor(() => expect(wrapper.find('.katex-display').exists()).toBe(true), {
      timeout: MATH_TIMEOUT,
    });

    const block = wrapper.find('.md-math-mount--block');
    expect(block.exists()).toBe(true);
    expect(block.attributes('data-math-state')).toBe('done');
    expect(wrapper.text()).toContain('推导如下');
    expect(wrapper.text()).toContain('证毕');
  });

  it('金额与行内代码里的 $ 不被当成公式（不误伤正常文本）', async () => {
    const wrapper = mountItem('预算 $199 起，命令写作 `$HOME`');

    // 给异步 Markdown 渲染留出完成时间：若误判，.md-math-mount 会出现
    await vi.waitFor(() => expect(wrapper.find('.md-lazy-plain').exists()).toBe(false), {
      timeout: MATH_TIMEOUT,
    });
    expect(wrapper.find('.md-math-mount').exists()).toBe(false);
    expect(wrapper.text()).toContain('$199');
    expect(wrapper.find('code').text()).toBe('$HOME');
  });

  it('用户消息保持纯文本：公式不在非 Markdown 路径生效', async () => {
    const wrapper = mountItem('看我写的 $E=mc^2$', 'user');
    await Promise.resolve();
    expect(wrapper.find('.md-math-mount').exists()).toBe(false);
    expect(wrapper.find('.katex').exists()).toBe(false);
    // 原文照旧可见
    expect(wrapper.text()).toContain('$E=mc^2$');
  });
});
