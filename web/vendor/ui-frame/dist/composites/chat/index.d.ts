/**
 * @echolab-auto/ui-frame/chat — 聊天 / Agent 面板领域组件（组合组件模块）
 *
 * 模块内部分两层（分类定义见 document/user/components.md「组件分层」）：
 * - **组合组件（ChatMessage 驱动）**：ChatMessageList / ChatMessageItem /
 *   ChatToolCallBlock / ChatReasoningBlock / ChatBranchMergeBlock ——
 *   由元组件与基础组件拼成的现成领域组件
 * - **元组件（纯 UI 原语）**：ChatBubble / ChatTray / ChatFold / ChatComposer /
 *   ChatCopyButton —— 零领域类型，slot 驱动，性质上属于基础组件，
 *   可自由组装任意聊天式 UI
 *
 * 纯渲染层：宿主把消息数据（ChatMessage）喂给组合组件，或用元组件自行组装；
 * 组件不持有业务状态、不发起网络请求。
 *
 * 注意：Agent 消息正文的 Markdown 渲染复用 doc 模块的 MarkdownRenderer，
 * 使用本模块需安装可选 peer 依赖 marked + dompurify。
 *
 * @example
 * ```ts
 * import { ChatMessageList, ChatComposer } from '@echolab-auto/ui-frame/chat'
 * import type { ChatMessage, ChatToolCall } from '@echolab-auto/ui-frame/chat'
 *
 * // 或用元组件自由组装：
 * import { ChatBubble, ChatTray, ChatFold } from '@echolab-auto/ui-frame/chat'
 * ```
 */
/**
 * 组件分类元数据：composite 为组合组件（ChatMessage 数据契约驱动），
 * meta 为元组件（纯 UI 原语，归基础组件层）。
 */
export declare const componentCategories: {
    readonly composite: readonly ["ChatMessageList", "ChatMessageItem", "ChatToolCallBlock", "ChatReasoningBlock", "ChatBranchMergeBlock"];
    readonly meta: readonly ["ChatBubble", "ChatTray", "ChatFold", "ChatComposer", "ChatCopyButton"];
};
/** @category 组合组件 */
export { default as ChatMessageList } from './ChatMessageList';
export type { ChatMessageListProps } from './ChatMessageList';
/** @category 组合组件 */
export { default as ChatMessageItem } from './ChatMessageItem';
export type { ChatMessageItemProps } from './ChatMessageItem';
/** @category 组合组件 */
export { default as ChatToolCallBlock } from './ChatToolCallBlock';
export type { ChatToolCallBlockProps } from './ChatToolCallBlock';
/** @category 组合组件 */
export { default as ChatReasoningBlock } from './ChatReasoningBlock';
export type { ChatReasoningBlockProps } from './ChatReasoningBlock';
/** @category 组合组件 */
export { default as ChatBranchMergeBlock } from './ChatBranchMergeBlock';
export type { ChatBranchMergeBlockProps } from './ChatBranchMergeBlock';
/** @category 元组件 */
export { default as ChatBubble } from './ChatBubble';
export type { ChatBubbleProps, ChatBubbleAlign, ChatBubbleTone } from './ChatBubble';
/** @category 元组件 */
export { default as ChatTray } from './ChatTray';
export type { ChatTrayProps } from './ChatTray';
/** @category 元组件 */
export { default as ChatFold } from './ChatFold';
export type { ChatFoldProps } from './ChatFold';
/** @category 元组件 */
export { default as ChatComposer } from './ChatComposer';
export type { ChatComposerProps } from './ChatComposer';
/** @category 元组件 */
export { default as ChatCopyButton } from './ChatCopyButton';
export type { ChatRole, ChatToolStatus, ChatMessageSource, ChatToolCall, ChatBranchEntryKind, ChatBranchEntry, ChatBranchSummary, ChatMessage, } from './types';
