import { Ref } from 'vue';

export type FloatingPlacement = 'top' | 'bottom' | 'left' | 'right';
export interface FloatingRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}
export interface UseFloatingPositionOptions {
    /** 触发器元素 */
    trigger: Ref<HTMLElement | undefined>;
    /** 浮层是否打开（rAF 逐帧追踪随之启停） */
    open: Ref<boolean>;
    /** 期望方向；'auto' 时按 candidates 顺序选择首个空间满足的方向 */
    placement: Ref<FloatingPlacement | 'auto'>;
    /** 与触发器的间距 px（默认 0） */
    offset?: Ref<number>;
    /** 浮层元素（读取实际尺寸用于边界判断；缺省用 estimateSize） */
    floating?: Ref<HTMLElement | undefined>;
    /** auto 模式候选顺序（默认 bottom→top→right→left） */
    candidates?: FloatingPlacement[];
    /** 翻转滞后 px —— 对侧需比当前侧宽裕该值才翻转（默认 48，防边界抖动） */
    flipHysteresis?: number;
    /** 当前侧可用空间低于该值才考虑翻转（默认 120） */
    minSpace?: number;
    /** floating 未挂载时的内容尺寸估计（默认 200×120） */
    estimateSize?: {
        width: number;
        height: number;
    };
    /**
     * 锁定展开期间的方向：打开时以当前几何决策一次后冻结，逐帧追踪与
     * refresh/resize 均不再重新判向，直到关闭（下次打开重新决策）。
     * 适用于单盒连体变体（outlined）—— 其触发器本身会随展开长高，
     * 逐帧判向会把盒底增长误判为"空间不足"而中途翻转；且翻转意味着
     * 盒体 column-reverse 重构，任何中途翻转都极度刺眼。
     */
    lockPlacement?: Ref<boolean>;
    /** 每帧回调（跟随 rAF 追踪，用于消费方做逐帧同步，如负 margin 补偿） */
    onFrame?: () => void;
}
export interface UseFloatingPositionReturn {
    /** 边界翻转后的实际方向 */
    actualPlacement: Ref<FloatingPlacement>;
    /** 触发器视口 rect（逐帧更新，仅变化时写入） */
    rect: Ref<FloatingRect | null>;
    /** 当前侧可用空间 px（打开/翻转/resize 时重估，滚动中冻结防抖动） */
    available: Ref<number>;
    /** 立即全量重算（方向 + rect + 可用空间） */
    refresh: () => void;
    /** 停止 rAF 追踪（组件卸载时自动调用） */
    stop: () => void;
}
/**
 * 共享浮层定位引擎 —— rAF 逐帧追踪 + 边界翻转（带滞后）。
 *
 * 滚动（含嵌套滚动容器）、缩放、布局变化均由逐帧轮询覆盖，不依赖
 * scroll 事件（事件在嵌套容器与平滑滚动下会漏发/滞后）。位置更新与
 * 页面绘制落在同一帧，浮层与触发器无坐标系错位。
 *
 * @example
 * ```ts
 * const { actualPlacement, rect, available, stop } = useFloatingPosition({
 *   trigger: triggerRef,
 *   open: isOpen,
 *   placement: computed(() => 'bottom'),
 *   offset: computed(() => 6),
 * })
 * ```
 */
export declare function useFloatingPosition(opts: UseFloatingPositionOptions): UseFloatingPositionReturn;
export default useFloatingPosition;
