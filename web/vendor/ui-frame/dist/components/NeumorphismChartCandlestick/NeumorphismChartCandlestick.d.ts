import { OhlcDataPoint } from '../../composables/useCandlestickChart';

export interface NeumorphismChartCandlestickProps {
    data?: OhlcDataPoint[];
    width?: string | number;
    height?: string | number;
    showVolume?: boolean;
    showMA?: boolean;
    maPeriods?: number[];
    upColor?: string;
    downColor?: string;
    showTooltip?: boolean;
    showGrid?: boolean;
    showAxis?: boolean;
    animate?: boolean;
    title?: string;
}
declare function __VLS_template(): {
    title?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartCandlestickProps>, {
    data: () => never[];
    width: string;
    height: string;
    showVolume: undefined;
    showMA: undefined;
    maPeriods: undefined;
    showTooltip: undefined;
    showGrid: undefined;
    showAxis: undefined;
    animate: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "candle-click": (payload: {
        index: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartCandlestickProps>, {
    data: () => never[];
    width: string;
    height: string;
    showVolume: undefined;
    showMA: undefined;
    maPeriods: undefined;
    showTooltip: undefined;
    showGrid: undefined;
    showAxis: undefined;
    animate: undefined;
}>>> & Readonly<{
    "onCandle-click"?: ((payload: {
        index: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }) => any) | undefined;
}>, {
    data: OhlcDataPoint[];
    animate: boolean;
    width: string | number;
    height: string | number;
    showGrid: boolean;
    showTooltip: boolean;
    showAxis: boolean;
    showVolume: boolean;
    showMA: boolean;
    maPeriods: number[];
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
