import { Theme } from '../../composables/useTheme';

export type ThemeToggleSize = 'small' | 'medium' | 'large';
export interface NeumorphismThemeToggleProps {
    /** v-model binding: 'light' | 'dark' | 'auto' */
    modelValue?: Theme;
    /**
     * 尺寸——内层按钮的上下内距 px（数字，主几何量），或三档预设名。
     *
     * 数字即「按钮上下内距」：图标、左右内距、外层内距按锚点表（5 / 6 / 8）
     * 分段线性插值，尺寸施加在内部 `.nm-theme-toggle__btn` / `__icon` 上。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | ThemeToggleSize;
    /** Whether to disable auto mode option */
    disableAuto?: boolean;
    /** Whether the toggle is disabled */
    disabled?: boolean;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismThemeToggleProps>, {
    disableAuto: undefined;
    modelValue: string;
    disabled: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: Theme) => void;
    change: (value: Theme) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismThemeToggleProps>, {
    disableAuto: undefined;
    modelValue: string;
    disabled: boolean;
}>>> & Readonly<{
    onChange?: ((value: Theme) => any) | undefined;
    "onUpdate:modelValue"?: ((value: Theme) => any) | undefined;
}>, {
    disabled: boolean;
    modelValue: Theme;
    disableAuto: boolean;
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
