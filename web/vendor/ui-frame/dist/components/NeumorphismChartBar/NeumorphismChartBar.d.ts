import { ChartSeries } from '../../composables/useBarChart';

export interface NeumorphismChartBarProps {
    series?: ChartSeries[];
    width?: string | number;
    height?: string | number;
    orientation?: 'vertical' | 'horizontal';
    stacked?: boolean;
    barGap?: number;
    showTooltip?: boolean;
    showLegend?: boolean;
    showGrid?: boolean;
    showAxis?: boolean;
    animate?: boolean;
    yMin?: number;
    yMax?: number;
    title?: string;
}
declare function __VLS_template(): {
    title?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartBarProps>, {
    series: () => never[];
    width: string;
    height: string;
    orientation: undefined;
    stacked: undefined;
    barGap: undefined;
    showTooltip: undefined;
    showLegend: undefined;
    showGrid: undefined;
    showAxis: undefined;
    animate: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "bar-click": (payload: {
        index: number;
        seriesIndex: number;
        value: number;
    }) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartBarProps>, {
    series: () => never[];
    width: string;
    height: string;
    orientation: undefined;
    stacked: undefined;
    barGap: undefined;
    showTooltip: undefined;
    showLegend: undefined;
    showGrid: undefined;
    showAxis: undefined;
    animate: undefined;
}>>> & Readonly<{
    "onBar-click"?: ((payload: {
        index: number;
        seriesIndex: number;
        value: number;
    }) => any) | undefined;
}>, {
    animate: boolean;
    width: string | number;
    height: string | number;
    showGrid: boolean;
    series: ChartSeries[];
    orientation: "vertical" | "horizontal";
    barGap: number;
    stacked: boolean;
    showTooltip: boolean;
    showLegend: boolean;
    showAxis: boolean;
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
