import { Ref, ComputedRef } from 'vue';

export type ProgressSize = 'small' | 'medium' | 'large';
export interface UseProgressOptions {
    /** Current value. */
    modelValue: Ref<number>;
    /** Maximum value. */
    max: Ref<number>;
    /** Whether the progress is in indeterminate mode. */
    indeterminate: Ref<boolean>;
    /** Resolved size — drives the circular geometry. */
    size: Ref<ProgressSize>;
}
export interface UseProgressReturn {
    /** Clamped percentage in [0, 100]. Always 0 while indeterminate. */
    percentage: ComputedRef<number>;
    /** Whether the progress has reached 100% (never true while indeterminate). */
    isComplete: ComputedRef<boolean>;
    /**
     * Rounded percentage for display, animated towards `percentage` with an
     * rAF-driven ease-out so labels count smoothly instead of snapping.
     * Snaps instantly when the user prefers reduced motion.
     */
    displayPercentage: ComputedRef<number>;
    /** Whether the user has requested reduced motion. */
    isReducedMotion: Ref<boolean>;
    /** SVG viewBox edge length of the circular ring. */
    circleSize: ComputedRef<number>;
    /** Stroke width of the circular ring. */
    strokeWidth: ComputedRef<number>;
    /** Radius of the circular ring. */
    radius: ComputedRef<number>;
    /** Circumference of the circular ring. */
    circumference: ComputedRef<number>;
    /** stroke-dashoffset that renders `percentage` on the ring. */
    dashOffset: ComputedRef<number>;
    /**
     * Cancel a running label animation.
     * Called automatically on component unmount when used inside a component.
     */
    stop: () => void;
}
/**
 * Headless logic for NeumorphismProgress: percentage clamping, an animated
 * display value for labels, and circular-ring geometry. Contains no rendering
 * — the component layer binds these values to DOM and styles.
 *
 * @example
 * ```ts
 * const { percentage, displayPercentage, circumference, dashOffset } = useProgress({
 *   modelValue: toRef(props, 'modelValue'),
 *   max: toRef(props, 'max'),
 *   indeterminate: toRef(props, 'indeterminate'),
 *   size: resolvedSize,
 * })
 * ```
 */
export declare function useProgress(options: UseProgressOptions): UseProgressReturn;
export default useProgress;
