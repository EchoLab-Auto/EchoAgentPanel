import { ScrollbarVariant } from '../../composables/useScrollbar';
export type { ScrollbarVariant } from '../../composables/useScrollbar';
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    variant?: ScrollbarVariant;
    /** 目标滚动容器的 CSS 选择器（必填 —— 组件不再默认耦合应用布局类名） */
    target?: string;
    /** 点阵基础色（"r,g,b"；缺省读取 --nm-text-placeholder） */
    dotColor?: string;
    /** 强调色（"r,g,b"；缺省读取 --nm-primary-color） */
    accentColor?: string;
    sigma?: number;
}>, {
    variant: string;
    target: string;
    dotColor: string;
    accentColor: string;
    sigma: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    variant?: ScrollbarVariant;
    /** 目标滚动容器的 CSS 选择器（必填 —— 组件不再默认耦合应用布局类名） */
    target?: string;
    /** 点阵基础色（"r,g,b"；缺省读取 --nm-text-placeholder） */
    dotColor?: string;
    /** 强调色（"r,g,b"；缺省读取 --nm-primary-color） */
    accentColor?: string;
    sigma?: number;
}>, {
    variant: string;
    target: string;
    dotColor: string;
    accentColor: string;
    sigma: number;
}>>> & Readonly<{}>, {
    target: string;
    variant: ScrollbarVariant;
    dotColor: string;
    accentColor: string;
    sigma: number;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
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
