import { Ref } from 'vue';

export interface UseScrollSpyOptions {
    /** 内容容器（heading 渲染在其中） */
    content: Ref<HTMLElement | null>;
    /**
     * 滚动容器：元素 / CSS 选择器（closest 匹配）/ undefined。
     * undefined 时自动向上查找 `.nm-layout__content`。
     */
    scrollContainer?: Ref<HTMLElement | string | undefined>;
    /** 观察的标题选择器（默认 'h1, h2, h3'） */
    headingSelector?: string;
    /** 内容版本信号：变化时重建观察器（如渲染 HTML 更新后 heading 集合已变） */
    watchSource?: () => unknown;
    /** 激活标题变化回调 */
    onActiveChange?: (id: string) => void;
}
export interface UseScrollSpyReturn {
    /** 当前激活的标题 id */
    activeHeading: Ref<string>;
    /** 滚动到指定标题并立即高亮（点击导航期间屏蔽 scroll-spy，避免动画中途闪烁） */
    scrollToHeading: (id: string) => void;
    /** 依当前视口位置手动重算激活标题（observer 兜底） */
    syncActiveHeading: () => void;
}
/** 返回 'smooth' 或 'auto'，取决于用户的 reduced-motion 偏好 */
export declare function getScrollBehavior(): ScrollBehavior;
/**
 * Headless scroll-spy —— IntersectionObserver 跟踪内容区标题，
 * 输出当前激活的 heading id，并提供点击导航（平滑滚动 + 高亮锁定）。
 */
export declare function useScrollSpy(options: UseScrollSpyOptions): UseScrollSpyReturn;
