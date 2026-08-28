import { Ref } from 'vue';

export type AlertType = 'info' | 'success' | 'warning' | 'error';
export interface UseAlertOptions {
    /**
     * Auto-dismiss duration in milliseconds.
     * 0 (default) means the alert must be closed manually.
     */
    duration?: number;
}
export interface UseAlertReturn {
    /** Whether the alert is currently visible */
    isVisible: Ref<boolean>;
    /** Close the alert (triggers leave animation then hides) */
    close: () => void;
    /** Whether the alert is in its leave/dismiss animation phase */
    leaving: Ref<boolean>;
}
/**
 * Headless alert — encapsulates visibility state, auto-dismiss timer,
 * and dismiss-animation lifecycle. Use with your own UI rendering.
 *
 * @example
 * ```ts
 * const { isVisible, close, leaving } = useAlert({ duration: 5000 })
 * // When duration expires or close() is called, `leaving` flips to true,
 * // the component runs its leave transition, then `isVisible` goes false.
 * ```
 */
export declare function useAlert(opts?: UseAlertOptions): UseAlertReturn;
