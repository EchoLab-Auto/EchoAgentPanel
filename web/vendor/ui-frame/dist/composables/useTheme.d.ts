import { Ref } from 'vue';

export type Theme = 'light' | 'dark' | 'auto';
export interface ThemeOptions {
    defaultTheme?: Theme;
    storageKey?: string;
    followSystem?: boolean;
}
export interface ThemeContext {
    theme: Ref<Theme>;
    currentTheme: Ref<'light' | 'dark'>;
    isDark: Ref<boolean>;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    dispose: () => void;
}
/**
 * Create theme state for a component tree.
 * The returned context is independent — each call gets its own state
 * and event listeners, safe for SSR and concurrent usage.
 */
export declare function createTheme(options?: ThemeOptions): ThemeContext;
/**
 * Provide theme context to child components.
 *
 * Accepts a plain object or a reactive ref/computed. When a ref is passed,
 * `defaultTheme` changes are propagated automatically at runtime.
 *
 * Note: `storageKey` and `followSystem` are only read at initialization.
 *       Changing them at runtime requires remounting the provider.
 */
export declare function provideTheme(options?: ThemeOptions | Ref<ThemeOptions>): ThemeContext;
/**
 * Inject theme context from parent.
 *
 * If no provider is found, creates an independent fallback context
 * that is disposed when the calling component unmounts.
 * This avoids module-level shared state that leaks across SSR requests.
 */
export declare function useTheme(): ThemeContext;
/**
 * Returns an inline script string that applies the stored theme before
 * Vue hydrates, preventing a flash of unstyled content (FOUC) in SSR
 * / Nuxt environments.
 *
 * Insert this in your index.html `<head>` before any CSS loads:
 * ```html
 * <script>${getAntiFlickerScript()}</script>
 * ```
 *
 * @param storageKey — localStorage key for theme persistence
 */
export declare function getAntiFlickerScript(storageKey?: string): string;
