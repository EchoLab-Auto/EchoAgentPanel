import { ChartDataPoint } from '../../composables/usePieChart';

export interface NeumorphismChartPieProps {
    data?: ChartDataPoint[];
    width?: string | number;
    height?: string | number;
    innerRadius?: number;
    padAngle?: number;
    startAngle?: number;
    labelPosition?: 'inside' | 'outside' | 'none';
    roundedCorners?: boolean;
    showTooltip?: boolean;
    showLegend?: boolean;
    animate?: boolean;
    title?: string;
    colorPalette?: string[];
}
declare function __VLS_template(): {
    title?(_: {}): any;
    center?(_: {
        total: number;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartPieProps>, {
    data: () => never[];
    width: string;
    height: string;
    padAngle: number;
    startAngle: number;
    colorPalette: () => never[];
    showTooltip: undefined;
    showLegend: undefined;
    animate: undefined;
    innerRadius: undefined;
    labelPosition: undefined;
    roundedCorners: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "arc-click": (payload: {
        index: number;
        value: number;
        label: string;
    }) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismChartPieProps>, {
    data: () => never[];
    width: string;
    height: string;
    padAngle: number;
    startAngle: number;
    colorPalette: () => never[];
    showTooltip: undefined;
    showLegend: undefined;
    animate: undefined;
    innerRadius: undefined;
    labelPosition: undefined;
    roundedCorners: undefined;
}>>> & Readonly<{
    "onArc-click"?: ((payload: {
        index: number;
        value: number;
        label: string;
    }) => any) | undefined;
}>, {
    data: ChartDataPoint[];
    animate: boolean;
    width: string | number;
    height: string | number;
    showTooltip: boolean;
    showLegend: boolean;
    innerRadius: number;
    padAngle: number;
    startAngle: number;
    labelPosition: "inside" | "outside" | "none";
    roundedCorners: boolean;
    colorPalette: string[];
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
