export { isBrowser, isServer, safeMatchMedia, safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove, safeDocument, safeWindow, safeGetComputedStyle, } from './ssr';
/**
 * Generate a unique ID string
 */
export declare function generateId(prefix?: string): string;
/**
 * Escape HTML special characters
 */
export declare function escapeHtml(text: string): string;
/**
 * Unicode-aware slugify.
 *
 * Preserves Unicode letters and numbers, normalizes whitespace and dashes
 * to single dashes, and trims leading/trailing dashes.
 */
export declare function slugify(text: string): string;
/**
 * Debounce function with a cancel method
 */
export declare function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): ((...args: Parameters<T>) => void) & {
    cancel: () => void;
};
/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export declare function isEmpty(value: unknown): boolean;
