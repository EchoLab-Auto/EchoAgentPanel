import { Ref, ComputedRef, WatchSource } from 'vue';

export interface UseChatScrollOptions {
    /** 滚动容器元素 */
    container: Ref<HTMLElement | null>;
    /** 距底部多少 px 内视为"贴底"（默认 120；需大于单条新内容的典型高度） */
    threshold?: number | Ref<number>;
    /** 新内容到达时是否自动吸底（仅当用户本就在底部才跟随），默认 true */
    autoScroll?: boolean | Ref<boolean>;
    /**
     * 内容变化侦听源（消息条数、最后一条的输出等）。
     * 变化时在下一帧重新评估贴底状态并按需吸底。
     */
    watchSource?: WatchSource<unknown> | Array<WatchSource<unknown>>;
}
export interface UseChatScrollReturn {
    /** 当前是否贴底 */
    isNearBottom: Ref<boolean>;
    /** 是否显示"回到底部"按钮（即未贴底） */
    showJumpButton: ComputedRef<boolean>;
    /** 绑定到容器 scroll 事件 */
    handleScroll: () => void;
    /** 滚动到底部（默认 smooth，用于手动'回到底部'；内容自动跟随请传 'auto'） */
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    /** 立即重新评估贴底状态（容器尺寸变化等场景手动触发） */
    recheck: () => void;
}
/**
 * Headless 聊天吸底滚动 —— 用户位于底部时新内容自动跟随，
 * 向上翻阅历史时不打断；离开底部时暴露"回到底部"信号。
 *
 * @example
 * ```ts
 * const { showJumpButton, handleScroll, scrollToBottom } = useChatScroll({
 *   container,
 *   watchSource: () => messages.length,
 * })
 * ```
 */
export declare function useChatScroll(options: UseChatScrollOptions): UseChatScrollReturn;
