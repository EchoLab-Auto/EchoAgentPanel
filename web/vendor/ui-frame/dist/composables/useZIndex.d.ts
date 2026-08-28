/**
 * Pre-defined z-index layers (static base values).
 *
 * Each layer's actual rendered z-index is computed as:
 *
 *   For overlay masks (Modal, Drawer):
 *     actualZIndex = Z_LAYERS[layer] + max(0, overlayCount - 1) × Z_STRIDE
 *
 *   For floating elements (dropdown, tooltip, popover, toast):
 *     actualZIndex = Z_LAYERS[layer] + overlayCount × Z_STRIDE
 *
 * The asymmetric offset ensures floating UI rendered inside a Modal / Drawer
 * always stacks **above** the overlay mask, while nested overlays still stack
 * correctly on top of each other.
 */
export declare const Z_LAYERS: {
    /** Select / AutoComplete dropdowns, Menu submenus, Chart tooltips */
    readonly dropdown: 100;
    /** Tooltip */
    readonly tooltip: 200;
    /** Popover, Dropdown */
    readonly popover: 300;
    /** Modal mask, Drawer mask */
    readonly overlay: 400;
    /** Toast notification container */
    readonly toast: 500;
};
/** Step between nesting levels — large enough to avoid any overlap. */
export declare const Z_STRIDE = 1000;
export type ZLayer = keyof typeof Z_LAYERS;
/**
 * Composable for participating in the global z-index layering system.
 *
 * - **Floating components** (Select, Tooltip, Popover, Toast, …) call
 *   `getZIndex(layer)` to obtain a context-aware z-index that automatically
 *   stacks above any open overlay masks (Modals, Drawers).
 *
 * - **Overlay components** (Modal, Drawer) call `registerOverlay()` when they
 *   open and call the returned cleanup function when they close. The overlay
 *   mask itself receives a z-index that only shifts when nested, keeping the
 *   first overlay at its base level.
 *
 * @example
 * ```ts
 * // In a floating component (e.g., Select dropdown)
 * const { getZIndex } = useZIndex()
 * const dropdownZIndex = computed(() => getZIndex('dropdown'))
 *
 * // In an overlay component (e.g., Modal)
 * const { getZIndex, registerOverlay } = useZIndex()
 * onMounted(() => {
 *   const unregister = registerOverlay()
 *   onBeforeUnmount(unregister)
 * })
 * ```
 */
export declare function useZIndex(): {
    getZIndex: (layer: ZLayer) => number;
    registerOverlay: () => () => void;
    /** Reactive count of currently-active overlays (read-only for debugging). */
    overlayCount: import('vue').Ref<number, number>;
};
