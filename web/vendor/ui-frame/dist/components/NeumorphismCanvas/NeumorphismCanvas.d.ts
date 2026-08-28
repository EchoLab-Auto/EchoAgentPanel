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
declare function toggleFullscreen(): void;
declare function __VLS_template(): {
    toolbar?(_: {}): any;
    default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCanvasProps>, {
    showControls: undefined;
    showGrid: undefined;
    gridVariant: undefined;
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
    toggleFullscreen: typeof toggleFullscreen;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: number) => void;
    "zoom-change": (value: number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismCanvasProps>, {
    showControls: undefined;
    showGrid: undefined;
    gridVariant: undefined;
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
