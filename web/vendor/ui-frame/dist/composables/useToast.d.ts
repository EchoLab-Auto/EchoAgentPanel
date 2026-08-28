import { Ref } from 'vue';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
    closable: boolean;
    timestamp: number;
    leaving: boolean;
}
export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
    closable?: boolean;
}
export interface UseToastOptions {
    /** Maximum number of toasts visible at once */
    maxCount?: number;
}
export interface UseToastReturn {
    /** Current toast items */
    toasts: Ref<ToastItem[]>;
    /** Add a toast notification */
    addToast: (options: ToastOptions) => string;
    /** Remove a toast by ID */
    removeToast: (id: string) => void;
    /** Clear all toasts */
    clearAll: () => void;
}
/**
 * Headless toast — encapsulates toast queue management, auto-dismiss
 * timers, and remove animations. Use with your own UI rendering.
 *
 * @example
 * ```ts
 * const { toasts, addToast, removeToast } = useToast({ maxCount: 5 })
 * addToast({ message: 'Saved!', type: 'success', duration: 3000 })
 * ```
 */
export declare function useToast(opts?: UseToastOptions): UseToastReturn;
