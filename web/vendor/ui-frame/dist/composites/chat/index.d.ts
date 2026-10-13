/**
 * @echolab-auto/ui-frame/chat — 聊天领域**原子组件**（2026-10-13 起纯原子层）
 *
 * 模块只保留**单一职责的原子**：`ChatComposer`（输入行，IME/取消/发送）、
 * `ChatFold`（折叠/展开块）、`ChatCopyButton`（悬停复制按钮）。零领域语义、
 * slot 驱动，可自由组合。
 *
 * 早前为组装件混入的 `ChatBubble` / `ChatTray`（气泡壳 / 托盘 + 吸底）已解散：
 * 它们把"角色→样式映射 + 行为 + 语义"烘进壳里，属产品语义——气泡壳样式 /
 * 角色映射由宿主 CSS + 基础层消费（`useChatScroll` 吸底 headless + 基础按钮/
 * token 自组跳转钮），折叠块用 `ChatFold`。宿主参考实现见
 * `examples/pages/ChatPage.vue`（2026-10-13 起改为原子组装示例）。
 *
 * 纯渲染层：组件不持有业务状态、不发起网络请求；types.ts 保留 ChatMessage
 * 数据契约导出，供宿主映射自有消息模型时复用。
 *
 * 注意：本模块自身不依赖可选 peer 依赖；如需在气泡内渲染 Markdown，
 * 可组合 doc 模块的 MarkdownRenderer（届时需安装 marked + dompurify）。
 *
 * @example
 * ```ts
 * import { ChatComposer, ChatFold, ChatCopyButton } from '@echolab-auto/ui-frame/chat'
 * import { useChatScroll } from '@echolab-auto/ui-frame/composables/useChatScroll'
 * import type { ChatMessage } from '@echolab-auto/ui-frame/chat'
 * ```
 */
/** @category 原子组件 */
export { default as ChatComposer } from './ChatComposer';
export type { ChatComposerProps } from './ChatComposer';
export type { ChatComposerEmits } from './ChatComposer';
/** @category 原子组件 */
export { default as ChatFold } from './ChatFold';
export type { ChatFoldProps } from './ChatFold';
export type { ChatFoldEmits } from './ChatFold';
/** @category 原子组件 */
export { default as ChatCopyButton } from './ChatCopyButton';
export type { ChatRole, ChatToolStatus, ChatMessageSource, ChatToolCall, ChatBranchEntryKind, ChatBranchEntry, ChatBranchSummary, ChatMessage, } from './types';
