export type DatePickerSize = 'small' | 'medium' | 'large';
export interface NeumorphismDatePickerProps {
    modelValue?: Date | null;
    placeholder?: string;
    format?: string;
    disabled?: boolean;
    clearable?: boolean;
    /**
     * 尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * 数字即「最小高度」：字号与内距按三锚点（36 / 48 / 60）分段线性插值，
     * 所以 `:size="36"` 与 `size="small"` 逐像素相同，`:size="42"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | DatePickerSize;
    minDate?: Date;
    maxDate?: Date;
    firstDayOfWeek?: number;
    label?: string;
    required?: boolean;
    error?: string | boolean;
    name?: string;
    id?: string;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismDatePickerProps>, {
    modelValue: null;
    placeholder: string;
    disabled: boolean;
    clearable: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: Date | null) => void;
    change: (value: Date | null) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismDatePickerProps>, {
    modelValue: null;
    placeholder: string;
    disabled: boolean;
    clearable: undefined;
}>>> & Readonly<{
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onChange?: ((value: Date | null) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((value: Date | null) => any) | undefined;
}>, {
    disabled: boolean;
    placeholder: string;
    modelValue: Date | null;
    clearable: boolean;
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
