//! MessageItem（面板自组消息行）契约测试（2026-09-30；2026-10-13 气泡壳收敛；
//! 2026-10-29 外壳改由 ui-frame `NeumorphismCard` 凸起档承担）。
//!
//! 背景：ui-frame 移除了 chat 组合组件（ChatMessageItem 等）；2026-10-13
//! 原库 `ChatBubble` 元组件亦被解散（角色→样式映射烘进壳），气泡壳样式
//! 改由面板 CSS 配方承担；2026-10-29 起**材质（阴影/圆角/裁剪）交回库的卡片
//! 组件**（`elevation=1` 凸起台阶），面板只保留角色语义（对齐 / 色调 / 非对称
//! 圆角开向）。本测试锁定角色 → 气泡形态的映射、卡片外壳的存在性，
//! 以及头部（角色名 / 来源 / 时间）与 Markdown 渲染的分派：
//! - user：居右主色气泡、纯文本；
//! - agent：居左中性气泡、正文走 MarkdownLazy（2026-10 起为延迟加载的
//!   Markdown 渲染包装，内部异步加载 doc 模块——测试以 stub 拦截）；
//! - system：居中平铺（不套卡片）。

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
        // Markdown 渲染（延迟加载包装）：stub 后不触碰异步 chunk 加载。
        MarkdownLazy: { template: '<div class="md-stub">{{ content }}</div>', props: ['content'] },
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
    const bubble = wrapper.find('.msg-item__bubble');
    expect(bubble.classes()).toContain('msg-item__bubble--user');
    // 头部：来源标签（实例 · 用户名）+ 时间；user 不显示角色名
    expect(wrapper.text()).toContain('local · local user');
    expect(wrapper.text()).toContain('T1700000000');
    expect(wrapper.text()).not.toContain('Agent');
    // 正文纯文本，不走 Markdown
    expect(wrapper.find('.md-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('你好');
  });

  it('agent：居左中性气泡，正文走 Markdown；头部有角色名', () => {
    const wrapper = mountItem(message({ role: 'agent', content: '# 标题' }));
    const bubble = wrapper.find('.msg-item__bubble');
    expect(bubble.classes()).toContain('msg-item__bubble--agent');
    expect(wrapper.text()).toContain('Agent');
    expect(wrapper.find('.md-stub').text()).toBe('# 标题');
    // 无障碍名标注角色
    expect(bubble.attributes('aria-label')).toBe('Agent');
  });

  it('system：居中平铺 + 时间，不渲染气泡头部角色', () => {
    const wrapper = mountItem(message({ role: 'system', content: '定时器触发' }));
    const bubble = wrapper.find('.msg-item__bubble');
    expect(bubble.classes()).toContain('msg-item__bubble--system');
    expect(wrapper.text()).toContain('定时器触发');
    expect(wrapper.text()).toContain('T1700000000');
  });

  it('样式契约：气泡宽度动态化（解除库 640px 上限）+ 隐藏标题锚点', () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../MessageItem.vue'),
      'utf-8',
    );
    const style = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    // max-width 100%（短贴内容、长撑满列宽；2026-10-13 收敛为面板自有样式，
    // 不再需要双写类名压库样式）
    expect(style).toMatch(/\.msg-item__bubble\s*\{[^}]*max-width:\s*100%/s);
    // 标题锚点（绝对定位 -22px）会撑出横向溢出，气泡内隐藏
    expect(style).toMatch(/heading-anchor[^{]*\{[^}]*display:\s*none/s);
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

  // ── 流式纯文本（2026-10 P0 性能止血）───────────────────────────────────
  // 背景：MarkdownRenderer 对 content 是"每次变化全量重解析 + innerHTML 替换"，
  // 一次回答的成本是 O(deltas × 长度)（实测 4 万字正文单次 delta 16.9 ms）。
  // 现改为流式中纯文本、终值一次 Markdown（O(长度)）。锁定该分派。
  it('流式中（streaming=true）：正文走纯文本，不挂 Markdown 渲染器', () => {
    const wrapper = mountItem(message({ role: 'agent', content: '**正在输出**', streaming: true }));
    // 原始 Markdown 标记原样显示（未解析）
    expect(wrapper.find('.msg-item__stream').text()).toBe('**正在输出**');
    expect(wrapper.find('.md-stub').exists()).toBe(false);
  });

  it('终值（streaming 非 true）：恢复 Markdown 渲染', () => {
    const wrapper = mountItem(message({ role: 'agent', content: '**已完成**' }));
    expect(wrapper.find('.md-stub').exists()).toBe(true);
    expect(wrapper.find('.msg-item__stream').exists()).toBe(false);
  });

  it('user 消息即使带 streaming 标记也走纯文本分支（不受影响）', () => {
    const wrapper = mountItem(message({ role: 'user', content: '你好', streaming: true }));
    expect(wrapper.find('.msg-item__stream').exists()).toBe(false);
    expect(wrapper.find('.md-stub').exists()).toBe(false);
  });

  // ── 外壳 = ui-frame NeumorphismCard 凸起档（2026-10-29）─────────────────
  // 动机：气泡的阴影此前是面板手写的两条 box-shadow，与库的台阶高度模型
  // （elevation 1–4）各写一套，深浅不成体系、改一处要同步两处。改为把壳交给
  // 卡片组件后，面板不再出现 box-shadow —— 下面几条把这个契约钉住。
  it('外壳是卡片组件且材质零覆盖：不传 elevation / radius（走组件默认档）', () => {
    const wrapper = mountItem(message({ role: 'agent', content: 'hi' }));
    const bubble = wrapper.find('.msg-item__bubble');
    expect(bubble.classes()).toContain('nm-card');
    // 默认档（variant medium → elevation 2）；面板不指定档位
    expect(bubble.classes()).toContain('nm-card--elevation-2');
    expect(bubble.classes().some((c) => /--elevation-[134]$/.test(c))).toBe(false);
    // padding 归面板（库 body 留白 24px 对气泡过大）——这是版面，不是材质
    expect(bubble.classes()).toContain('nm-card--no-padding');
    // 圆角走组件默认：`--nm-card-radius` 由组件自己写到 24px（面板没传 radius）
    expect(bubble.attributes('style') ?? '').toContain('--nm-card-radius: 24px');
  });

  it('角色语义仍在根节点：user 居右 / agent 居左，无障碍注解透传', () => {
    const user = mountItem(message({ role: 'user', content: 'a' })).find('.msg-item__bubble');
    expect(user.classes()).toEqual(
      expect.arrayContaining(['nm-card', 'msg-item__bubble', 'msg-item__bubble--user']),
    );
    expect(user.attributes('role')).toBe('article');
    expect(user.attributes('aria-label')).toBe('用户');
  });

  it('system 行不套卡片（居中平铺 + 细线夹文本，无凸起材质）', () => {
    const wrapper = mountItem(message({ role: 'system', content: '定时器触发' }));
    const bubble = wrapper.find('.msg-item__bubble');
    expect(bubble.classes()).not.toContain('nm-card');
    expect(bubble.classes()).not.toContain('nm-card--elevation-1');
  });

  it('样式契约：面板零材质声明（无阴影 / 背景 / 圆角），只留版面', () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../MessageItem.vue'),
      'utf-8',
    );
    const style = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    // 只看声明本身：注释里会提到 box-shadow / border-radius 之类字样
    const decls = style.replace(/\/\*[\s\S]*?\*\//g, '');
    /** 取某个选择器块的声明体（CSS 是扁平的，够用） */
    const blockOf = (sel: string): string =>
      new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 's').exec(
        decls,
      )?.[1] ?? '';
    // 材质零覆盖（2026-10-29 用户要求「用组件原生的」）：气泡的三个自有类里
    // 不得出现任何材质声明——阴影、底色、圆角全部由 NeumorphismCard 决定。
    for (const sel of ['.msg-item__bubble', '.msg-item__bubble--user', '.msg-item__bubble--agent']) {
      const body = blockOf(sel);
      expect(body, sel).not.toBe('');
      expect(body, sel).not.toMatch(/box-shadow/);
      expect(body, sel).not.toMatch(/border-radius/);
      expect(body, sel).not.toMatch(/background/);
      expect(body, sel).not.toMatch(/filter|backdrop-filter/);
    }
    // 版面仍在面板侧
    expect(blockOf('.msg-item__bubble')).toMatch(/padding:/);
    expect(blockOf('.msg-item__bubble')).toMatch(/max-width:\s*100%/);
    expect(blockOf('.msg-item__bubble--user')).toMatch(/align-self:\s*flex-end/);
    expect(blockOf('.msg-item__bubble--agent')).toMatch(/align-self:\s*flex-start/);
  });
});
