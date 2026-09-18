export interface NeumorphismDatePickerProps {
    modelValue?: Date | null;
    placeholder?: string;
    format?: string;
    disabled?: boolean;
    clearable?: boolean;
    size?: 'small' | 'medium' | 'large';
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
