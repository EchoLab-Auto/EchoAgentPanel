//! 消息渲染对象缓存契约（2026-10 性能修复 P0）。
//!
//! 背景：`ChatView` 的数据链每次求值都返回全新对象，导致任意一条消息变化都让
//! 全部 `MessageItem` re-render。实测 1024 条消息 + 4× CPU 节流下，每次流式
//! delta 白花 143.8 ms（FPS 11.7，应为 60）。
//!
//! 本测试锁三层不变量：
//! 1. **判等正确**：影响渲染的每个字段变化都必须判为"不同"（漏判会导致内容不更新）；
//! 2. **引用复用**：未变消息返回同一个对象引用（这是性能收益的唯一来源）；
//! 3. **缓存不泄漏**：移出列表的 key 必须被 retain 清掉。

import { describe, it, expect, beforeEach } from 'vitest';
import {
  __chatMessageCacheSizeForTests,
  __resetChatMessageCacheForTests,
  chatMessageCacheStats,
  clearChatMessageCache,
  rememberChatMessage,
  retainChatMessages,
  reuseChatMessage,
  sameForRender,
} from '../chat-message-cache';
import type { DisplayMessage } from '../state';
import type { ChatMessageWithImages } from '../chat-adapter';

/** 造一条与真实形状一致的 DisplayMessage。 */
function msg(over: Partial<DisplayMessage> = {}): DisplayMessage {
  return {
    key: 'm1',
    role: 'backend',
    sessionId: 's1',
    content: 'hello',
    time: 1700000000,
    ...over,
  } as DisplayMessage;
}

/** 造一个可识别的渲染产物（用 content 当标记，便于断言是哪一个）。 */
function cm(src: DisplayMessage): ChatMessageWithImages {
  return { id: src.key, role: 'agent', content: src.content, time: src.time } as ChatMessageWithImages;
}

describe('sameForRender：渲染相关字段判等', () => {
  it('同一引用 → 等价（最快路径）', () => {
    const a = msg();
    expect(sameForRender(a, a)).toBe(true);
  });

  it('内容相同但对象不同 → 等价', () => {
    expect(sameForRender(msg(), msg())).toBe(true);
  });

  it('浅拷贝（sessionMessagesFor 的 hist 分支）→ 等价', () => {
    const a = msg({ tool: { name: 'bash', input: '{}', output: 'ok', status: 'ok' } as never });
    const b = { ...a, tool: { ...a.tool! } };
    expect(sameForRender(a, b)).toBe(true);
  });

  // 逐个字段：改了就必须重建，否则界面不更新
  const cases: Array<[string, Partial<DisplayMessage>]> = [
    ['key', { key: 'm2' }],
    ['role', { role: 'user' }],
    ['content', { content: 'hello world' }],
    ['time', { time: 1700000001 }],
    ['animate', { animate: true }],
    ['streamState', { streamState: 'streaming' }],
    ['reasoning', { reasoning: ['thinking...'] }],
    ['images', { images: ['/media/a.png'] }],
    ['subagent', { subagent: { task: 'x', status: 'running' } as never }],
    ['source', { source: { platform: 'qq' } as never }],
  ];
  for (const [field, patch] of cases) {
    it(`改变 ${field} → 不等价`, () => {
      expect(sameForRender(msg(), msg(patch))).toBe(false);
    });
  }

  it('tool 各字段变化 → 不等价（流式工具输出的关键路径）', () => {
    const base = { name: 'bash', input: '{}', output: 'ok', status: 'ok' as const };
    const a = msg({ role: 'tool', tool: base as never });
    for (const patch of [
      { output: 'ok2' },
      { status: 'failed' as const },
      { elapsedMs: 120 },
      { startedAtMs: 1700000000000 },
      { input: '{"cmd":"ls"}' },
      { name: 'read_file' },
    ]) {
      expect(sameForRender(a, msg({ role: 'tool', tool: { ...base, ...patch } as never }))).toBe(false);
    }
  });

  it('仅 tool 对象引用变但内容相同 → 等价（patchToolMessage 每次都建新对象）', () => {
    const tool = { name: 'bash', input: '{}', output: 'ok', status: 'ok' as const };
    const a = msg({ role: 'tool', tool: tool as never });
    const b = msg({ role: 'tool', tool: { ...tool } as never });
    expect(sameForRender(a, b)).toBe(true);
  });

  it('branch 追加消息 / 改文本 → 不等价', () => {
    const b1 = { branchId: 'b1', summary: '分支', msgs: [{ kind: 'content' as const, text: 'a', time: 1 }] };
    const a = msg({ branch: b1 as never });
    const appended = { ...b1, msgs: [...b1.msgs, { kind: 'content' as const, text: 'b', time: 2 }] };
    expect(sameForRender(a, msg({ branch: appended as never }))).toBe(false);
    const edited = { ...b1, msgs: [{ kind: 'content' as const, text: 'a-changed', time: 1 }] };
    expect(sameForRender(a, msg({ branch: edited as never }))).toBe(false);
  });
});

describe('缓存复用：未变消息返回同一引用', () => {
  beforeEach(() => {
    __resetChatMessageCacheForTests();
  });

  it('首次 miss → 记住 → 再次命中返回同一对象', () => {
    const a = msg();
    expect(reuseChatMessage(a)).toBeNull();
    const built = cm(a);
    rememberChatMessage(a, built);

    expect(reuseChatMessage(a)).toBe(built); // 同引用
    expect(chatMessageCacheStats.hits).toBe(1);
    expect(chatMessageCacheStats.misses).toBe(1);
  });

  it('内容变化 → miss（调用方重建）', () => {
    const a = msg();
    rememberChatMessage(a, cm(a));
    const changed = msg({ content: 'changed' });
    expect(reuseChatMessage(changed)).toBeNull();
  });

  it('浅拷贝但内容相同 → 命中（hist 分支的核心路径）', () => {
    const a = msg();
    const built = cm(a);
    rememberChatMessage(a, built);
    expect(reuseChatMessage({ ...a })).toBe(built);
  });

  it('1000 条中只有 1 条变化 → 只 1 次 miss，其余全命中（性能收益来源）', () => {
    const list = Array.from({ length: 1000 }, (_, i) =>
      msg({ key: `k${i}`, content: `msg ${i}` }),
    );
    // 第一次求值：构建并入缓存（firstPass 就是这里返回的产物引用）
    const firstPass = list.map((m) => {
      const built = cm(m);
      rememberChatMessage(m, built);
      return built;
    });
    chatMessageCacheStats.hits = 0;
    chatMessageCacheStats.misses = 0;

    // 模拟一次流式 delta：最后一条内容变了，其余完全相同（浅拷贝新对象）
    const next = list.map((m, i) => (i === 999 ? { ...m, content: 'msg 999 delta' } : { ...m }));
    const reused = next.map((m) => reuseChatMessage(m));
    const misses = reused.filter((x) => x === null).length;

    expect(misses).toBe(1);
    expect(chatMessageCacheStats.hits).toBe(999);
    // 未变消息必须拿到**与上次相同的**对象引用（这是 Vue 跳过子组件的唯一依据）
    expect(reused[0]).toBe(firstPass[0]);
    expect(reused[500]).toBe(firstPass[500]);
    // 变的那条必须 miss（调用方会重建）
    expect(reused[999]).toBeNull();
  });
});

describe('缓存清理：不泄漏', () => {
  beforeEach(() => {
    __resetChatMessageCacheForTests();
  });

  it('retain 清掉不在列表里的 key', () => {
    rememberChatMessage(msg({ key: 'a' }), cm(msg({ key: 'a' })));
    rememberChatMessage(msg({ key: 'b' }), cm(msg({ key: 'b' })));
    expect(__chatMessageCacheSizeForTests()).toBe(2);

    retainChatMessages(new Set(['b']));
    expect(__chatMessageCacheSizeForTests()).toBe(1);
    // 保留的仍可命中
    expect(reuseChatMessage(msg({ key: 'b' }))).not.toBeNull();
  });

  it('会话切换（全新 key 集合）后旧条目全清', () => {
    for (let i = 0; i < 10; i++) {
      const m = msg({ key: `old${i}` });
      rememberChatMessage(m, cm(m));
    }
    retainChatMessages(new Set(['new1', 'new2']));
    expect(__chatMessageCacheSizeForTests()).toBe(0);
  });

  it('clear 清空', () => {
    const m = msg();
    rememberChatMessage(m, cm(m));
    clearChatMessageCache();
    expect(__chatMessageCacheSizeForTests()).toBe(0);
    expect(reuseChatMessage(m)).toBeNull();
  });
});
