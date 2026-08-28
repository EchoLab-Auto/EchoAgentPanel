import { Ref, ComputedRef } from 'vue';

export type ScrollbarVariant = 'standard' | 'primary' | 'none' | 'dots' | 'glow';
export interface UseScrollbarOptions {
    /** 变体：standard/primary/none 为 CSS 类变体，dots/glow 为覆盖层变体 */
    variant: Ref<ScrollbarVariant>;
    /** 目标滚动容器的 CSS 选择器；空串为禁用（不再默认耦合应用布局类名） */
    target: Ref<string>;
    /** 点阵基础色（"r,g,b"） */
    dotColor: Ref<string>;
    /** 强调色（"r,g,b"） */
    accentColor: Ref<string>;
    /** 点阵高斯半径 */
    sigma: Ref<number>;
}
export interface UseScrollbarReturn {
    /** 是否覆盖层变体（dots/glow） */
    overlayKind: ComputedRef<'dots' | 'glow' | null>;
    /** 当前滚动位置（覆盖层变体使用） */
    scrollY: Ref<number>;
    /** 可视高度（覆盖层变体使用） */
    overlayH: Ref<number>;
    /** 文档总高（覆盖层变体使用） */
    overlayDocH: Ref<number>;
    /** 挂载行为（CSS 类或覆盖层）；空 target 为安全 no-op */
    start: () => void;
    /** 卸载全部行为与监听器 */
    stop: () => void;
}
/**
 * Headless 滚动条行为 —— CSS 类变体应用、点阵/辉光覆盖层的构建、
 * 滚动进度同步与监听器清理。组件层仅声明 props 并调用 start/stop。
 *
 * @example
 * ```ts
 * const { start, stop } = useScrollbar({
 *   variant: toRef(props, 'variant'),
 *   target: toRef(props, 'target'),
 *   dotColor: toRef(props, 'dotColor'),
 *   accentColor: toRef(props, 'accentColor'),
 *   sigma: toRef(props, 'sigma'),
 * })
 * onMounted(start)
 * onBeforeUnmount(stop)
 * ```
 */
export declare function useScrollbar(opts: UseScrollbarOptions): UseScrollbarReturn;
export default useScrollbar;
