import { Ref } from 'vue';

export type PopoverPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type PopoverTrigger = 'click' | 'hover' | 'focus' | 'manual';
export interface UsePopoverOptions {
    /** Preferred position of the popover relative to the trigger */
    position?: Ref<PopoverPosition>;
    /** How the popover is triggered */
    trigger?: Ref<PopoverTrigger>;
    /** Whether the popover is disabled */
    disabled?: Ref<boolean>;
    /** Offset from the trigger element in px */
    offset?: Ref<number> | number;
    /** Delay before showing (ms, for hover trigger) */
    delay?: number;
}
export interface UsePopoverReturn {
    /** Whether the popover is currently open */
    isOpen: Ref<boolean>;
    /** Show the popover */
    show: () => void;
    /** Hide the popover */
    hide: () => void;
    /** Toggle visibility (for click trigger) */
    toggle: () => void;
    /** Handle keydown (Escape to close). Tab handling is delegated to the component layer. */
    handleKeydown: (event: KeyboardEvent) => void;
}
/**
 * Headless popover — encapsulates open/close, trigger modes (click/hover/focus/manual),
 * boundary-aware positioning helpers, keyboard dismissal, and click-outside detection.
 *
 * Use with your own UI rendering. Position calculation and DOM measurement
 * are the consumer's responsibility; this composable provides the state machine.
 */
export declare function usePopover(opts?: UsePopoverOptions): UsePopoverReturn;
