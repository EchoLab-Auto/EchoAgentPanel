import { ChartSeries } from '../../composables/useLineChart';

export interface NeumorphismChartLineProps {
    series?: ChartSeries[];
    width?: string | number;
    height?: string | number;
    curve?: 'linear' | 'smooth' | 'step';
    area?: boolean;
    areaOpacity?: number;
    showPoints?: boolean;
    pointSize?: number;
    lineWidth?: number;
    showTooltip?: boolean;
    showLegend?: boolean;
    showGrid?: boolean;
    showAxis?: boolean;
    animate?: boolean;
    yMin?: number;
    yMax?: number;
    title?: string;
    /** tooltip 数值格式化：接收 (value, seriesName)，返回展示文本 */
    valueFormatter?: (value: number, seriesName: string) => string;
}
declare function __VLS_template(): {
    title?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartLineProps>, {
    series: () => never[];
    width: string;
    height: string;
    areaOpacity: number;
    pointSize: number;
    showTooltip: undefined;
    showLegend: undefined;
    showGrid: undefined;
    showAxis: undefined;
    animate: undefined;
    curve: undefined;
    area: undefined;
    showPoints: undefined;
    lineWidth: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "point-click": (payload: {
        index: number;
        seriesIndex: number;
        value: number;
    }) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartLineProps>, {
    series: () => never[];
    width: string;
    height: string;
    areaOpacity: number;
    pointSize: number;
    showTooltip: undefined;
    showLegend: undefined;
    showGrid: undefined;
    showAxis: undefined;
    animate: undefined;
    curve: undefined;
    area: undefined;
    showPoints: undefined;
    lineWidth: undefined;
}>>> & Readonly<{
    "onPoint-click"?: ((payload: {
        index: number;
        seriesIndex: number;
        value: number;
    }) => any) | undefined;
}>, {
    area: boolean;
    animate: boolean;
    width: string | number;
    height: string | number;
    showGrid: boolean;
    series: ChartSeries[];
    showTooltip: boolean;
    showLegend: boolean;
    showAxis: boolean;
    curve: "linear" | "smooth" | "step";
    areaOpacity: number;
    showPoints: boolean;
    pointSize: number;
    lineWidth: number;
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
