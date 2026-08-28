import { Ref, ComputedRef } from 'vue';

export interface TabItem {
    key: string;
    label: string;
    disabled?: boolean;
    icon?: string;
}
export interface UseTabsOptions {
    /** v-model active tab key */
    modelValue: Ref<string>;
    /** Tab items */
    tabs: Ref<TabItem[]> | ComputedRef<TabItem[]>;
    /** Tab position (determines arrow key direction) */
    position?: Ref<'top' | 'left' | 'right' | 'bottom'>;
}
export interface UseTabsReturn {
    /** Activate a tab by key */
    activate: (key: string) => void;
    /** Handle keyboard navigation */
    handleKeydown: (event: KeyboardEvent, currentKey: string) => void;
    /** Panel ID for ARIA */
    panelId: ComputedRef<string>;
    /** Tab list ID for ARIA */
    tabListId: string;
    /** ARIA orientation based on position */
    orientation: ComputedRef<'horizontal' | 'vertical'>;
}
/**
 * Headless tabs — encapsulates tab activation and keyboard navigation.
 * Use with your own UI rendering.
 */
export declare function useTabs(opts: UseTabsOptions): UseTabsReturn;
