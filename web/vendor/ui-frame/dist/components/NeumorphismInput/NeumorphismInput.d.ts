export type InputSize = 'small' | 'medium' | 'large';
export interface NeumorphismInputProps {
    modelValue?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    /**
     * 尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * 数字即「最小高度」：字号、内距与前后缀内距按三锚点（36 / 48 / 60）
     * 分段线性插值，所以 `:size="36"` 与 `size="small"` 逐像素相同，
     * `:size="42"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | InputSize;
    maxlength?: number | string;
    minlength?: number | string;
    name?: string;
    id?: string;
    autocomplete?: string;
    inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    error?: string | boolean;
    label?: string;
    /** Enable floating label: label starts as placeholder and floats up on focus/value */
    floatingLabel?: boolean;
}
declare function __VLS_template(): {
    prefix?(_: {}): any;
    suffix?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismInputProps>, {
    modelValue: string;
    type: string;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    autocomplete: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string) => void;
    focus: (event: FocusEvent) => void;
    blur: (event: FocusEvent) => void;
    input: (event: Event) => void;
    change: (event: Event) => void;
    keydown: (event: KeyboardEvent) => void;
    enter: (value: string) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismInputProps>, {
    modelValue: string;
    type: string;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    autocomplete: string;
}>>> & Readonly<{
    onInput?: ((event: Event) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    onKeydown?: ((event: KeyboardEvent) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onEnter?: ((value: string) => any) | undefined;
}>, {
    type: string;
    required: boolean;
    disabled: boolean;
    modelValue: string;
    readonly: boolean;
    autocomplete: string;
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
