import { ComputedRef, InjectionKey } from 'vue';
import { LocaleMessages, Locale } from '../locales/types';

declare const LocaleKey: InjectionKey<ComputedRef<LocaleMessages>>;
/**
 * Returns the active locale messages.
 *
 * Priority:
 *   1. Explicitly provided locale via `provideLocale()`
 *   2. Default zh-CN
 *
 * Use `t('key')` for messages with interpolation:
 *   t('badgeUnread', { count: 5 }) // '未读 5'
 *
 * Or access directly:
 *   locale.badgeOnline // '在线'
 */
export declare function useLocale(): {
    locale: ComputedRef<LocaleMessages>;
    t: (key: keyof LocaleMessages, params?: Record<string, string | number>) => string;
};
/**
 * Provide a custom locale to all child components.
 *
 * @example
 * ```ts
 * import { provideLocale } from '@echolab-auto/ui-frame'
 * import { zhCN } from '@echolab-auto/ui-frame/locales'
 *
 * provideLocale(zhCN)
 * ```
 */
export declare function provideLocale(messages: LocaleMessages): void;
/**
 * Get locale messages by locale code.
 */
export declare function getLocaleMessages(locale: Locale): LocaleMessages;
export { LocaleKey };
