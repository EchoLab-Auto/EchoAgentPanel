import { Ref } from 'vue';

export interface UseReducedMotionReturn {
    /** Whether the user has requested reduced motion. */
    isReducedMotion: Ref<boolean>;
    /**
     * Stop listening to media query changes.
     * Called automatically on component unmount when used inside a component;
     * call it manually when used outside a component lifecycle (e.g. directives).
     */
    stop: () => void;
}
/**
 * One-time (non-reactive) check of the user's reduced-motion preference.
 */
export declare function prefersReducedMotion(): boolean;
/**
 * Tracks the `prefers-reduced-motion` media query reactively.
 *
 * Inside a component the media listener is removed automatically on unmount;
 * outside a component (e.g. in a custom directive) call `stop()` manually.
 *
 * @example
 * ```ts
 * const { isReducedMotion } = useReducedMotion()
 * ```
 */
export declare function useReducedMotion(): UseReducedMotionReturn;
export default useReducedMotion;
