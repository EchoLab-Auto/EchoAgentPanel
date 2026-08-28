import { Ref, ComputedRef } from 'vue';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';
export interface UseDrawerOptions {
    /** v-model visibility */
    modelValue: Ref<boolean>;
    /** Whether clicking the mask closes the drawer */
    maskClosable?: Ref<boolean>;
    /** Whether the drawer can be closed at all (Escape / close button) */
    closable?: Ref<boolean>;
    /** Whether to destroy DOM when closed */
    destroyOnClose?: Ref<boolean>;
}
export interface UseDrawerReturn {
    /** Whether the drawer is currently visible (for transitions) */
    isOpen: Ref<boolean>;
    /** Whether the drawer DOM should be rendered */
    rendered: Ref<boolean>;
    /** Open the drawer */
    open: () => void;
    /** Close the drawer */
    close: () => void;
    /** Handle keydown for Escape and focus trap */
    handleKeydown: (event: KeyboardEvent, drawerEl: HTMLElement | undefined) => void;
    /** Handle mask click — closes when maskClosable and closable */
    handleMaskClick: () => void;
    /** Focus the first focusable element inside the drawer (call after drawer mounts) */
    focusDrawer: (drawerEl: HTMLElement | undefined) => void;
    /** Current z-index for the overlay mask (context-aware, accounts for nesting). */
    overlayZIndex: ComputedRef<number>;
}
/**
 * Headless drawer — encapsulates open/close, body scroll lock, focus trap,
 * Escape handling, and mask click dismissal. Use with your own UI rendering.
 */
export declare function useDrawer(opts: UseDrawerOptions): UseDrawerReturn;
