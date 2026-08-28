import { Ref } from 'vue';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipTrigger = 'hover' | 'click' | 'focus';
export interface UseTooltipOptions {
    /** Whether the tooltip is disabled */
    disabled?: Ref<boolean>;
    /** Delay before showing (ms) */
    delay?: number;
    /** Trigger mode */
    trigger?: Ref<TooltipTrigger>;
}
export interface UseTooltipReturn {
    /** Whether the tooltip is visible */
    isVisible: Ref<boolean>;
    /** Show the tooltip */
    show: () => void;
    /** Hide the tooltip */
    hide: () => void;
    /** Toggle visibility (for click trigger) */
    toggle: () => void;
    /** Handle keydown (Escape to close) */
    handleKeydown: (event: KeyboardEvent) => void;
}
/**
 * Headless tooltip — encapsulates show/hide with delay, toggle for
 * click trigger, and keyboard dismissal. Use with your own UI rendering.
 */
export declare function useTooltip(opts?: UseTooltipOptions): UseTooltipReturn;
