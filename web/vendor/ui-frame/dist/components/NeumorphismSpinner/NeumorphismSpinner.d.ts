/** @deprecated 旧尺寸档位（字符串）——保留仅为兼容映射，新代码请传数字（px 直径） */
export type SpinnerSize = 'small' | 'medium' | 'large';
export interface NeumorphismSpinnerProps {
    /**
     * 直径（px，直接就是像素值）。默认 20。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）已弃用，仅按
     * small=14 / medium=20 / large=28（px）兼容映射；新代码请传数字。
     */
    size?: number | SpinnerSize;
    /** 无障碍标签（默认取 locale spinnerLoading） */
    label?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSpinnerProps>, {
    size: undefined;
    label: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismSpinnerProps>, {
    size: undefined;
    label: string;
}>>> & Readonly<{}>, {
    size: number | SpinnerSize;
    label: string;
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
