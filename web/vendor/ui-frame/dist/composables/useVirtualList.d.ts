import { Ref, ComputedRef } from 'vue';

export interface UseVirtualListOptions<T = unknown> {
    /**
     * The full data array to virtualize.
     * The composable reads `items.value.length` to compute total height.
     */
    items: Ref<T[]>;
    /**
     * Item height in pixels.
     * - `number` — every item has the same fixed height.
     * - `(index: number) => number` — dynamic per-item height function.
     *   When using dynamic heights the composable caches measured values.
     */
    itemHeight: Ref<number | ((index: number) => number)> | number | ((index: number) => number);
    /**
     * Number of extra items to render above and below the visible viewport.
     * Higher values produce smoother scrolling at the cost of more DOM nodes.
     * @default 5
     */
    overscan?: Ref<number> | number;
}
export interface UseVirtualListReturn<T = unknown> {
    /**
     * Template ref to attach to the scrollable container element.
     * The container must have overflow-y: auto (or scroll).
     */
    containerRef: Ref<HTMLElement | null>;
    /** The currently visible slice of `items` — iterate this in the template. */
    visibleItems: ComputedRef<T[]>;
    /** Total height of the virtual spacer (all items combined), in px. */
    totalHeight: Ref<number>;
    /** Vertical translate offset for the visible-items wrapper, in px. */
    offsetY: Ref<number>;
    /** Start index of the visible range (inclusive). */
    startIndex: Ref<number>;
    /** End index of the visible range (exclusive). */
    endIndex: Ref<number>;
    /**
     * Scroll to a specific item by index, optionally aligned to the
     * top (default) or center of the viewport.
     */
    scrollTo: (index: number, align?: 'top' | 'center') => void;
    /**
     * Attach to the container's @scroll event.
     * The composable recalculates the visible window on each call.
     */
    handleScroll: () => void;
}
/**
 * Headless virtual list composable.
 *
 * Encapsulates scroll-driven window calculation, viewport measurement
 * via ResizeObserver, fixed and dynamic item-height support, overscan,
 * and imperative scroll-to-item. Use with your own UI rendering — mount
 * `containerRef` on the scrollable wrapper and wire `handleScroll` to its
 * `@scroll` event.
 */
export declare function useVirtualList<T = unknown>(opts: UseVirtualListOptions<T>): UseVirtualListReturn<T>;
