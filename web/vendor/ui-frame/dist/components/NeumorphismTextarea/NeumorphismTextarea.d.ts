export interface NeumorphismTextareaProps {
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    size?: 'small' | 'medium' | 'large';
    maxlength?: number | string;
    minlength?: number | string;
    label?: string;
    error?: string | boolean;
    name?: string;
    id?: string;
    inputmode?: 'none' | 'text' | 'search';
    rows?: number | string;
    autoResize?: boolean;
    showCount?: boolean;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTextareaProps>, {
    modelValue: string;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    rows: number;
    autoResize: boolean;
    showCount: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
    input: (event: Event) => void;
    change: (event: Event) => void;
    keydown: (event: KeyboardEvent) => void;
    enter: (value: string) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismTextareaProps>, {
    modelValue: string;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    rows: number;
    autoResize: boolean;
    showCount: boolean;
}>>> & Readonly<{
    onInput?: ((event: Event) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
    onKeydown?: ((event: KeyboardEvent) => any) | undefined;
    onEnter?: ((value: string) => any) | undefined;
}>, {
    disabled: boolean;
    required: boolean;
    modelValue: string;
    readonly: boolean;
    rows: number | string;
    autoResize: boolean;
    showCount: boolean;
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
