import { Ref, ComputedRef } from 'vue';

export interface UseModalOptions {
    /** v-model visibility */
    modelValue: Ref<boolean>;
    /** Whether clicking the mask closes the modal */
    maskClosable?: Ref<boolean>;
    /** Whether the modal can be closed */
    closable?: Ref<boolean>;
    /** Whether to destroy DOM when closed */
    destroyOnClose?: Ref<boolean>;
}
export interface UseModalReturn {
    /** Whether the modal is currently visible (for transitions) */
    visible: Ref<boolean>;
    /** Whether the modal DOM should be rendered */
    rendered: Ref<boolean>;
    /** Close the modal */
    close: () => void;
    /** Confirm action */
    confirm: () => void;
    /** Handle keydown for Escape and focus trap */
    handleKeydown: (event: KeyboardEvent, dialogEl: HTMLElement | undefined) => void;
    /** Focus the first focusable element inside the dialog (call after dialog mounts) */
    focusDialog: (dialogEl: HTMLElement | undefined) => void;
    /** Current z-index for the overlay mask (context-aware, accounts for nesting). */
    overlayZIndex: ComputedRef<number>;
}
/**
 * Headless modal — encapsulates open/close, body scroll lock, focus
 * trap, and Escape handling. Use with your own UI rendering.
 */
export declare function useModal(opts: UseModalOptions): UseModalReturn;
