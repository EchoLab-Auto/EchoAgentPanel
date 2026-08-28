import { Ref } from 'vue';

export interface CollapseItem {
    key: string;
    title: string;
    disabled?: boolean;
}
export interface UseCollapseOptions {
    /** v-model active keys */
    modelValue: Ref<string[]>;
    /** Collapse items */
    items: Ref<CollapseItem[]>;
    /** Whether accordion mode (only one panel open at a time) */
    accordion?: Ref<boolean>;
}
export interface UseCollapseReturn {
    /** Toggle a panel by key */
    toggle: (key: string) => void;
    /** Check if a panel is active */
    isActive: (key: string) => boolean;
}
/**
 * Headless collapse/accordion — encapsulates panel toggle logic.
 * Use with your own UI rendering.
 */
export declare function useCollapse(opts: UseCollapseOptions): UseCollapseReturn;
