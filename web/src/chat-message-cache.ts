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
//! 缓存判据覆盖 `toChatMessage` 会读到的全部字段：
//! `key` / `role` / `content` / `time` / `animate` / `streamState` /
//! `reasoning` / `images` / `subagent` / `source` / `tool.*` / `branch.*`。
//!
//! ## ⚠️ 判等必须基于**值快照**，不能基于对象引用（2026-10 事故修复）
//!
//! `state.ts` 的 reduce 在 ~30 个分支里**原地深变异**状态（见 store.ts 模块
//! 注释）：`msg.content += delta`、`msg.tool.status = 'succeeded'` 都不改变
//! 对象引用。早期版本用 `if (a === b) return true` 做"最快路径"，并只比
//! `tool` 的对象引用——于是原地变异后缓存**永远命中**，渲染对象永不重建：
//!
//! - 工具行卡在 `running` → `WorkRunGroup` 的 50ms ticker 一直读秒；
//! - 流式正文不增长（`content` 原地拼新串，引用同样是同一个消息对象）。
//!
//! 两者都只有刷新页面（清空本模块级缓存）才恢复。实测复现：
//! `渲染 status = running | store status = succeeded`。
//!
//! 现在 [`RenderSnapshot`] 存**值**：字符串本身不可变（`+=` 赋新串），存
//! 引用即快照；数组与 `tool` 这类会被原地改的对象在 `snapshotOf` 里拷一份。
//!
//! ## 为什么不缓存 reasoning 消息
//!
//! 推理行的 `animate` 由 [`claimReasoningAnimation`] 决定，而它是**有状态的**
//! （同一 key 只在首次申请时可能命中，此后恒 false）。若把首次结果缓存下来，
//! 后续重算就不会再调用它、`animate` 不会按原语义翻回 false——属于行为变化。
//! 推理消息在会话里占比很小（一回合通常一条），保持原路径即可。
//!
//! [`claimReasoningAnimation`]: ./reasoning-anim.ts

import type { DisplayMessage } from './state';
import type { ChatMessageWithImages } from './chat-adapter';

interface CachedEntry {
  /** 上次建对象时源消息的**值快照**（原地变异也能检测出来）。 */
  snap: RenderSnapshot;
  /** 已构建的渲染产物。 */
  cm: ChatMessageWithImages;
}

/** `tool` 的渲染相关字段快照（原地写字段，必须拷值）。 */
interface ToolSnapshot {
  name: string;
  input: string;
  output: string | null;
  status: string | undefined;
  startedAtMs: number | undefined;
  elapsedMs: number | undefined;
}

/** 分支内条目的渲染相关字段快照。 */
interface BranchEntrySnapshot {
  kind: string;
  text: string;
  status: string | undefined;
  output: string | undefined;
  toolName: string | undefined;
}

interface BranchSnapshot {
  branchId: string;
  summary: string;
  entries: BranchEntrySnapshot[];
}

/**
 * 渲染相关字段的**值快照**——判等的唯一依据（理由见模块注释）。
 *
 * 存引用的安全性：`content` 等字符串字段是不可变的（`+=` 会赋一个新串），
 * 存引用即等于存值；`subagent` / `source` 在 state.ts 里是整体替换
 * （`msg.subagent = { ...info, running: false }`），引用比较可靠。
 * 其余会被原地改的（`tool` 字段、`reasoning`/`images` 数组、`branch.msgs`）
 * 都在 [`snapshotOf`] 里逐项拷贝。
 */
interface RenderSnapshot {
  key: string;
  role: string;
  content: string;
  time: number;
  animate: boolean | undefined;
  streamState: DisplayMessage['streamState'];
  reasoning: string[] | undefined;
  images: string[] | undefined;
  tool: ToolSnapshot | undefined;
  branch: BranchSnapshot | undefined;
  subagent: unknown;
  source: unknown;
}

function snapshotOf(m: DisplayMessage): RenderSnapshot {
  return {
    key: m.key,
    role: m.role,
    content: m.content,
    time: m.time,
    animate: m.animate,
    streamState: m.streamState,
    reasoning: m.reasoning ? [...m.reasoning] : undefined,
    images: m.images ? [...m.images] : undefined,
    tool: m.tool
      ? {
          name: m.tool.name,
          input: m.tool.input,
          output: m.tool.output,
          status: m.tool.status,
          startedAtMs: m.tool.startedAtMs,
          elapsedMs: m.tool.elapsedMs,
        }
      : undefined,
    branch: m.branch
      ? {
          branchId: m.branch.branchId,
          summary: m.branch.summary,
          entries: m.branch.msgs.map((x) => ({
            kind: x.kind,
            text: x.text,
            status: x.status,
            output: x.output,
            toolName: x.toolName,
          })),
        }
      : undefined,
    subagent: m.subagent,
    source: m.source,
  };
}

/** 字符串数组比较：长度 + 逐项（元素是不可变字符串，引用比较即值比较）。 */
function sameStrings(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sameToolSnapshot(snap: ToolSnapshot | undefined, tool: DisplayMessage['tool']): boolean {
  if (!snap || !tool) return snap === undefined && tool === undefined;
  return (
    snap.name === tool.name &&
    snap.input === tool.input &&
    snap.output === tool.output &&
    snap.status === tool.status &&
    snap.startedAtMs === tool.startedAtMs &&
    snap.elapsedMs === tool.elapsedMs
  );
}

function sameBranchSnapshot(
  snap: BranchSnapshot | undefined,
  branch: DisplayMessage['branch'],
): boolean {
  if (!snap || !branch) return snap === undefined && branch === undefined;
  if (snap.branchId !== branch.branchId) return false;
  if (snap.summary !== branch.summary) return false;
  if (snap.entries.length !== branch.msgs.length) return false;
  for (let i = 0; i < snap.entries.length; i++) {
    const x = snap.entries[i]!;
    const y = branch.msgs[i]!;
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

/** 快照与源消息当前的渲染字段是否仍然一致。 */
function matchesSnapshot(snap: RenderSnapshot, m: DisplayMessage): boolean {
  if (snap.key !== m.key || snap.role !== m.role || snap.time !== m.time) return false;
  if (snap.content !== m.content) return false;
  if (snap.animate !== m.animate) return false;
  if (snap.streamState !== m.streamState) return false;
  if (!sameStrings(snap.reasoning, m.reasoning)) return false;
  if (!sameStrings(snap.images, m.images)) return false;
  if (!sameToolSnapshot(snap.tool, m.tool)) return false;
  if (!sameBranchSnapshot(snap.branch, m.branch)) return false;
  if (snap.subagent !== m.subagent) return false;
  if (snap.source !== m.source) return false;
  return true;
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
  return matchesSnapshot(snapshotOf(a), b);
}

/**
 * 取（或跳过）缓存：源消息与上次等价时返回已构建对象，否则返回 `null`
 * 由调用方重建（重建后须调 [`rememberChatMessage`]）。
 *
 * 只用于**非 reasoning** 消息（理由见模块注释）。
 */
export function reuseChatMessage(src: DisplayMessage): ChatMessageWithImages | null {
  const hit = cache.get(src.key);
  // 与**值快照**比较（不是与上次的源对象比较）：state 是原地变异的，
  // 同引用不代表未变（见模块注释）。
  if (hit && matchesSnapshot(hit.snap, src)) {
    chatMessageCacheStats.hits += 1;
    return hit.cm;
  }
  chatMessageCacheStats.misses += 1;
  return null;
}

/** 记住刚构建的对象（供下次求值复用）。 */
export function rememberChatMessage(src: DisplayMessage, cm: ChatMessageWithImages): void {
  cache.set(src.key, { snap: snapshotOf(src), cm });
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
