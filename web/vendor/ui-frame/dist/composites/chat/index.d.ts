/**
 * @echolab-auto/ui-frame/chat — 聊天 / Agent 面板领域元组件（纯元组件模块）
 *
 * 模块只保留**元组件（纯 UI 原语）**：ChatBubble / ChatTray / ChatFold /
 * ChatComposer / ChatCopyButton —— 零领域类型、slot 驱动，性质上属于基础组件，
 * 可自由组装任意聊天式 UI。
 *
 * 组合组件（ChatMessageList / ChatMessageItem / ChatToolCallBlock /
 * ChatReasoningBlock / ChatBranchMergeBlock）已于 2026-09-30 移除：
 * 聊天场景的组合（消息行、工具/推理/分支块）属产品语义（行模型、跨条合并、
 * 流式呈现策略），由宿主产品用本模块保留的机制原语自行组装
 * （参考 EchoAgentPanel 以 ChatBubble + doc 模块 MarkdownRenderer 自组消息行）。
 *
 * 纯渲染层：组件不持有业务状态、不发起网络请求；types.ts 保留 ChatMessage
 * 数据契约导出，供宿主映射自有消息模型时复用。
 *
 * 注意：本模块自身不依赖可选 peer 依赖；如需在气泡内渲染 Markdown，
 * 可组合 doc 模块的 MarkdownRenderer（届时需安装 marked + dompurify）。
 *
 * @example
 * ```ts
 * import { ChatBubble, ChatTray, ChatFold, ChatComposer } from '@echolab-auto/ui-frame/chat'
 * import type { ChatMessage } from '@echolab-auto/ui-frame/chat'
 *
 * // 宿主自组消息行：ChatTray 托盘内 v-for 渲染 ChatBubble（role → align/tone 映射）
 * ```
 */
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
