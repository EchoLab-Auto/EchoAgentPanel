import { Ref, InjectionKey } from 'vue';

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
 * Injection key shared by `NeumorphismToastProvider` (provide) and
 * `useToast()` (inject). Descendants of a mounted provider reuse the
 * provider's queue so their notifications are actually rendered.
 */
export declare const ToastInjectionKey: InjectionKey<UseToastReturn>;
/**
 * Headless toast — encapsulates toast queue management, auto-dismiss
 * timers, and remove animations.
 *
 * 解析顺序：
 * 1. 组件 setup 内且存在 `NeumorphismToastProvider` provide 的实例 → 复用它；
 * 2. 否则回退到模块级共享单例（首次调用时的 `opts` 生效，后续忽略）。
 *
 * @example
 * ```ts
 * const { toasts, addToast, removeToast } = useToast({ maxCount: 5 })
 * addToast({ message: 'Saved!', type: 'success', duration: 3000 })
 * ```
 */
/** 测试专用：重置模块级共享单例（下一调用按新 opts 重建）。
 * 生产代码不应调用。 */
export declare function __resetSharedToastForTest(): void;
export declare function useToast(opts?: UseToastOptions): UseToastReturn;
