export interface NeumorphismCanvasBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface NeumorphismCanvasProps {
    /** Current zoom level (1 = 100%) */
    modelValue?: number;
    /** Minimum zoom level */
    minZoom?: number;
    /** Maximum zoom level */
    maxZoom?: number;
    /** Zoom step for +/- buttons */
    zoomStep?: number;
    /** Whether to show the grid background */
    showGrid?: boolean;
    /** Grid cell size in pixels (before zoom) */
    gridSize?: number;
    /** Grid pattern variant */
    gridVariant?: 'dots' | 'lines';
    /** Whether to show zoom controls */
    showControls?: boolean;
    /** Whether the controls include the fit-to-screen button */
    showFit?: boolean;
    /** Whether the controls include the fullscreen toggle */
    showFullscreen?: boolean;
    /** Pan the canvas by dragging with the mouse (space + drag always works) */
    panOnDrag?: boolean;
    /** Zoom to cursor with Ctrl/Cmd + wheel */
    wheelZoom?: boolean;
    /**
     * Infinite canvas mode: pan/zoom are unbounded virtual state applied via
     * transform, instead of native overflow scrolling. Content may live at any
     * (including negative) canvas coordinates.
     */
    infinite?: boolean;
    /**
     * Content bounding box in canvas coordinates (infinite mode). Used by
     * fit()/resetView(); falls back to measuring slotted children when omitted.
     */
    contentBounds?: NeumorphismCanvasBounds;
    /** Canvas width (CSS value, e.g. '100%', '800px') */
    width?: string;
    /** Canvas height (CSS value) */
    height?: string;
}
declare function zoomIn(): void;
declare function zoomOut(): void;
declare function resetZoom(): void;
/** Scale content to fit the viewport (with padding) and center it. */
declare function fit(): void;
/**
 * Reset the view: animate pan and zoom back to the fit-to-content view.
 * In infinite mode this is the "return to content" action behind the reset
 * button and the `0` key; identical to fit() but named for intent.
 */
declare function resetView(): void;
declare function toggleFullscreen(): void;
/** Imperative pan by viewport-px deltas (infinite mode; no-op in scroll mode) */
declare function panBy(dx: number, dy: number): void;
/** Current view state (pan is viewport-px translation, post-zoom) */
declare function getView(): {
    panX: number;
    panY: number;
    zoom: number;
};
/**
 * Convert client (screen) coordinates to canvas coordinates.
 * Infinite mode uses the virtual pan state; scroll mode uses scroll offsets.
 */
declare function toCanvasCoords(clientX: number, clientY: number): {
    x: number;
    y: number;
    zoom: number;
};
/** Viewport bounding rect (for edge auto-pan hit tests etc.) */
declare function getViewportRect(): DOMRect | null;
declare function __VLS_template(): {
    toolbar?(_: {}): any;
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCanvasProps>, {
    showControls: undefined;
    showGrid: undefined;
    gridVariant: undefined;
    infinite: undefined;
    modelValue: number;
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    showFit: boolean;
    showFullscreen: boolean;
    panOnDrag: boolean;
    wheelZoom: boolean;
    width: string;
    height: string;
}>>, {
    zoomIn: typeof zoomIn;
    zoomOut: typeof zoomOut;
    resetZoom: typeof resetZoom;
    fit: typeof fit;
    resetView: typeof resetView;
    toggleFullscreen: typeof toggleFullscreen;
    panBy: typeof panBy;
    getView: typeof getView;
    toCanvasCoords: typeof toCanvasCoords;
    getViewportRect: typeof getViewportRect;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: number) => void;
    "zoom-change": (value: number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCanvasProps>, {
    showControls: undefined;
    showGrid: undefined;
    gridVariant: undefined;
    infinite: undefined;
    modelValue: number;
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    showFit: boolean;
    showFullscreen: boolean;
    panOnDrag: boolean;
    wheelZoom: boolean;
    width: string;
    height: string;
}>>> & Readonly<{
    "onUpdate:modelValue"?: ((value: number) => any) | undefined;
    "onZoom-change"?: ((value: number) => any) | undefined;
}>, {
    width: string;
    height: string;
    modelValue: number;
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    showGrid: boolean;
    gridVariant: "dots" | "lines";
    showControls: boolean;
    showFit: boolean;
    showFullscreen: boolean;
    panOnDrag: boolean;
    wheelZoom: boolean;
    infinite: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
    } : {
        type: import('vue').PropType<T[K]>;
        required: true;
    };
};
type __VLS_WithDefaults<P, D> = {
    [K in keyof Pick<P, keyof P>]: K extends keyof D ? __VLS_Prettify<P[K] & {
        default: D[K];
    }> : P[K];
};
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
