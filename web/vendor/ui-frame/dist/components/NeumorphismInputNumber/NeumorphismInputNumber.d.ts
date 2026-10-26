export type NumberInputSize = 'small' | 'medium' | 'large';
export interface NeumorphismInputNumberProps {
    /** v-model binding — current number value */
    modelValue?: number;
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Step increment for up/down */
    step?: number;
    /** Decimal precision */
    precision?: number;
    /** Whether the input is disabled */
    disabled?: boolean;
    /**
     * 尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * 数字即「最小高度」：字号、内距与两侧步进按钮宽度按三锚点（36 / 48 / 60）
     * 分段线性插值，所以 `:size="36"` 与 `size="small"` 逐像素相同，
     * `:size="42"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | NumberInputSize;
    /** Placeholder text */
    placeholder?: string;
    /** Show increment/decrement buttons */
    controls?: boolean;
    /** Label text */
    label?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismInputNumberProps>, {
    modelValue: undefined;
    min: undefined;
    max: undefined;
    step: number;
    precision: undefined;
    disabled: boolean;
    placeholder: string;
    controls: boolean;
    label: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: number | undefined) => void;
    change: (value: number | undefined) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismInputNumberProps>, {
    modelValue: undefined;
    min: undefined;
    max: undefined;
    step: number;
    precision: undefined;
    disabled: boolean;
    placeholder: string;
    controls: boolean;
    label: undefined;
}>>> & Readonly<{
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onChange?: ((value: number | undefined) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((value: number | undefined) => any) | undefined;
}>, {
    step: number;
    label: string;
    disabled: boolean;
    max: number;
    placeholder: string;
    modelValue: number;
    min: number;
    precision: number;
    controls: boolean;
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
