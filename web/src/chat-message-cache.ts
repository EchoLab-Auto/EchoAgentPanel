//! 消息渲染对象缓存（2026-10 性能修复，P0）。
//!
//! ## 问题
//!
//! `ChatView` 的数据链每次求值都返回**全新对象**：
//!
//! ```text
//! state.trunk / sessionHistory
//!   → sessionMessagesFor()   （hist 分支对每条消息 `{ ...m }` 浅拷贝）
//!   → messages computed      （toChatMessage() 每条都建完整新对象）
//!   → messageRows computed   （遍历合并工作行）
//! ```
//!
//! 于是**任意一条**消息变化（流式 delta 就是每几十毫秒一次）都会让
//! `messages` 里 1000+ 个元素的引用全变 → 所有 `MessageItem` 的 `:message`
//! prop 都「变了」→ Vue 逐个子组件 re-render，而实际 DOM 几乎不需要改。
//!
//! 实测（1024 条消息，4× CPU 节流，见 `document/design/panel-performance-audit.md`）：
//!
//! | 实验 | 单次 delta 耗时 |
//! | --- | --- |
//! | 改 state 里最后一条 `content`（走完整 Vue 链） | 176.9 ms |
//! | 什么都不改，只等 2 帧（纯基线） | 33.1 ms |
//! | 直接改 DOM 文本（绕过 Vue） | 32.9 ms |
//!
//! 即 **143.8 ms 全是"无效 re-render"**。同期 `LayoutCount` 只增 3、
//! `RecalcStyleCount` 只增 7——浏览器几乎没做 DOM 工作，时间全花在 JS 里
//! 创建 vnode / diff / 跑 render 函数上。
//!
//! ## 修法
//!
//! 按消息 key 缓存渲染产物（`ChatMessageWithImages`），只有**影响渲染的字段**
//! 真的变了才重建。未变消息沿用上次的对象引用 → 子组件 props 恒等 → Vue 跳过。
//!
//! 缓存判据（[`sameForRender`]）覆盖 `toChatMessage` 会读到的全部字段：
//! `key` / `role` / `content` / `time` / `animate` / `streamState` /
//! `reasoning` / `images` / `subagent` / `source` / `tool.*` / `branch.*`。
//!
//! ## 为什么不缓存 reasoning 消息
//!
//! 推理行的 `animate` 由 [`claimReasoningAnimation`] 决定，而它是**有状态的**
//! （同一 key 只在首次申请时可能命中，此后恒 false）。若把首次结果缓存下来，
//! 后续重算就不会再调用它、`animate` 不会按原语义翻回 false——属于行为变化。
//! 推理消息在会话里占比很小（一回合通常一条），保持原路径即可。
//!
//! [`claimReasoningAnimation`]: ./reasoning-anim.ts

import type { BranchMsg, DisplayMessage } from './state';
import type { ChatMessageWithImages } from './chat-adapter';

interface CachedEntry {
  /** 上次建对象时的源消息（用于判等；同引用时走最快路径）。 */
  src: DisplayMessage;
  /** 已构建的渲染产物。 */
  cm: ChatMessageWithImages;
}

/** 模块级缓存：消息 key → 渲染产物。SPA 生命周期内有效（页面刷新重建）。 */
const cache = new Map<string, CachedEntry>();

/** 命中率统计（排障/测试用；生产不读）。 */
export const chatMessageCacheStats = { hits: 0, misses: 0 };

/**
 * 两条消息在**渲染层**是否等价（true = 可以复用上次的 `ChatMessageWithImages`）。
 *
 * 只比较 `toChatMessage` 真正会读的字段——多比几个标量比漏比导致"内容不更新"
 * 安全得多，而字符串比较在引用相同时是 O(1)（V8 对同一字符串对象直接比指针），
 * 所以常见路径（未变消息）的判等成本极低。
 */
export function sameForRender(a: DisplayMessage, b: DisplayMessage): boolean {
  // 最快路径：同一个对象（`state.trunk.filter` 返回的正是 trunk 里的引用，
  // 无 sessionHistory 快照时全列表都走这条）。
  if (a === b) return true;

  if (a.key !== b.key) return false;
  if (a.role !== b.role) return false;
  if (a.content !== b.content) return false;
  if (a.time !== b.time) return false;
  if (a.animate !== b.animate) return false;
  if (a.streamState !== b.streamState) return false;
  if (a.reasoning !== b.reasoning) return false;
  // 以下三项在 toChatMessage 里是直接透传引用，比引用即可。
  if (a.images !== b.images) return false;
  if (a.subagent !== b.subagent) return false;
  if (a.source !== b.source) return false;

  // tool：内联小对象。绝大多数消息没有 tool，`a.tool === b.tool`（都 undefined）直接过。
  if (a.tool !== b.tool) {
    const x = a.tool;
    const y = b.tool;
    if (!x || !y) return false;
    if (
      x.name !== y.name ||
      x.input !== y.input ||
      x.output !== y.output ||
      x.status !== y.status ||
      x.startedAtMs !== y.startedAtMs ||
      x.elapsedMs !== y.elapsedMs
    ) {
      return false;
    }
  }

  // branch：分支内消息流经 mergeReasoning 展平成 entries，需覆盖"追加/改文本"。
  if (a.branch !== b.branch) {
    const x = a.branch;
    const y = b.branch;
    if (!x || !y) return false;
    if (x.branchId !== y.branchId || x.summary !== y.summary) return false;
    if (!sameBranchMsgs(x.msgs, y.msgs)) return false;
  }

  return true;
}

/** 分支消息数组等价（长度 + 每条 kind/text；工具字段变化也影响渲染）。 */
function sameBranchMsgs(a: BranchMsg[], b: BranchMsg[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (
      x.kind !== y.kind ||
      x.text !== y.text ||
      x.status !== y.status ||
      x.output !== y.output ||
      x.toolName !== y.toolName
    ) {
      return false;
    }
  }
  return true;
}

/**
 * 取（或跳过）缓存：源消息与上次等价时返回已构建对象，否则返回 `null`
 * 由调用方重建（重建后须调 [`rememberChatMessage`]）。
 *
 * 只用于**非 reasoning** 消息（理由见模块注释）。
 */
export function reuseChatMessage(src: DisplayMessage): ChatMessageWithImages | null {
  const hit = cache.get(src.key);
  if (hit && sameForRender(hit.src, src)) {
    chatMessageCacheStats.hits += 1;
    return hit.cm;
  }
  chatMessageCacheStats.misses += 1;
  return null;
}

/** 记住刚构建的对象（供下次求值复用）。 */
export function rememberChatMessage(src: DisplayMessage, cm: ChatMessageWithImages): void {
  cache.set(src.key, { src, cm });
}

/**
 * 丢弃不在 `aliveKeys` 里的条目。
 *
 * 必须调：消息 key 单调递增、会话切换后旧 key 不再出现，不清理会让缓存
 * 随使用时长无界增长（每条消息一个对象 + 对 trunk 的引用）。
 * 成本 O(缓存条目数) 的哈希查找——1024 条约 0.05 ms，可忽略。
 */
export function retainChatMessages(aliveKeys: Set<string>): void {
  for (const key of cache.keys()) {
    if (!aliveKeys.has(key)) cache.delete(key);
  }
}

/** 清空缓存（切换 agent / 会话可调；也可只依赖 retain 自然淘汰）。 */
export function clearChatMessageCache(): void {
  cache.clear();
}

/** 测试用：清空缓存与统计。 */
export function __resetChatMessageCacheForTests(): void {
  cache.clear();
  chatMessageCacheStats.hits = 0;
  chatMessageCacheStats.misses = 0;
}

/** 测试用：当前缓存条目数。 */
export function __chatMessageCacheSizeForTests(): number {
  return cache.size;
}
