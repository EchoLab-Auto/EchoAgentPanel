import { Ref, ComputedRef } from 'vue';

export interface MenuItem {
    key: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    children?: MenuItem[];
    divided?: boolean;
}
export interface UseMenuOptions {
    /** Flat or nested menu items */
    items: Ref<MenuItem[]> | ComputedRef<MenuItem[]>;
    /** Layout direction */
    mode?: Ref<'vertical' | 'horizontal'>;
    /** Initial active key (controlled: pass a Ref) */
    activeKey?: Ref<string | null>;
    /** Initial expanded submenu keys (controlled: pass a Ref) */
    expandedKeys?: Ref<string[]>;
    /** Called when an item is selected */
    onSelect?: (item: MenuItem) => void;
    /** Whether the menu is disabled entirely */
    disabled?: Ref<boolean>;
}
export interface UseMenuReturn {
    /** Currently active (focused/highlighted) key */
    activeKey: Ref<string | null>;
    /** Currently expanded submenu keys */
    expandedKeys: Ref<string[]>;
    /** All leaf keys in the menu tree */
    allKeys: ComputedRef<string[]>;
    /** Handle keyboard events */
    handleKeydown: (event: KeyboardEvent) => void;
    /** Handle item click */
    handleItemClick: (item: MenuItem) => void;
    /** Handle item hover/focus (used in horizontal mode) */
    handleItemEnter: (item: MenuItem) => void;
    /** Handle item leave (used in horizontal mode for submenus) */
    handleItemLeave: (item: MenuItem) => void;
    /** Check if a key is currently expanded */
    isExpanded: (key: string) => boolean;
    /** Check if a key is the active one */
    isActive: (key: string) => boolean;
    /** Expand a submenu */
    expand: (key: string) => void;
    /** Collapse a submenu */
    collapse: (key: string) => void;
    /** Toggle a submenu */
    toggleExpand: (key: string) => void;
}
/**
 * Headless menu — encapsulates active-item tracking, keyboard navigation,
 * submenu expansion, typeahead search, and mode-aware arrow key behaviour.
 */
export declare function useMenu(opts: UseMenuOptions): UseMenuReturn;
