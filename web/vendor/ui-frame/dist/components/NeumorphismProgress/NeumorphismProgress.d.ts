import { ProgressSize } from '../../composables/useProgress';

export type ProgressVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
export type ProgressEffect = 'default' | 'pulse' | 'flow' | 'wave' | 'stripes' | 'sparkle';
export interface NeumorphismProgressProps {
    modelValue?: number;
    max?: number;
    variant?: ProgressVariant;
    /**
     * 尺寸——px 线形条厚度（数字，主几何量），或三档预设名。
     *
     * 数字即「线形条厚度」：环形直径与描边按三锚点（厚度 4 / 8 / 12）分段线性插值
     * （直径 64 / 120 / 160、描边 4 / 7 / 10），所以 `:size="8"` 与 `size="medium"`
     * 的线性条与环形都逐像素相同。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | ProgressSize;
    /** Progress shape: linear bar (default) or circular SVG ring */
    type?: 'line' | 'circle';
    showLabel?: boolean;
    indeterminate?: boolean;
    effect?: ProgressEffect;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismProgressProps>, {
    showLabel: undefined;
    modelValue: number;
    max: number;
    indeterminate: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismProgressProps>, {
    showLabel: undefined;
    modelValue: number;
    max: number;
    indeterminate: boolean;
}>>> & Readonly<{}>, {
    max: number;
    modelValue: number;
    indeterminate: boolean;
    showLabel: boolean;
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
