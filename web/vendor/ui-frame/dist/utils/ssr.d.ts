/**
 * SSR-safe browser API utilities.
 *
 * Centralises typeof window / document guards scattered across 15+ files
 * into a single module. Use these instead of inline guards to ensure
 * consistent behaviour and to make new code SSR-safe by default.
 */
/** True when running in a browser (window is defined). */
export declare const isBrowser: boolean;
/** True when running on a server (SSR / Node). */
export declare const isServer: boolean;
/**
 * Safely access `window.matchMedia`, returning a no-op stub on the server.
 * The stub returns an object that behaves like a never-matching query so
 * callers can safely chain `.matches` without guards.
 */
export declare function safeMatchMedia(query: string): MediaQueryList;
/**
 * Safely read/write from localStorage. Returns null on read failures
 * (SSR, private browsing restrictions, quota errors).
 */
export declare function safeLocalStorageGet(key: string): string | null;
export declare function safeLocalStorageSet(key: string, value: string): void;
export declare function safeLocalStorageRemove(key: string): void;
/**
 * Get the current document. Returns undefined on the server.
 */
export declare function safeDocument(): Document | undefined;
/**
 * Get the current window. Returns undefined on the server.
 */
export declare function safeWindow(): Window | undefined;
/**
 * Get computed style for an element. Returns an empty CSSStyleDeclaration
 * stub on the server to avoid `getComputedStyle is not defined` errors.
 */
export declare function safeGetComputedStyle(el: Element): CSSStyleDeclaration;
