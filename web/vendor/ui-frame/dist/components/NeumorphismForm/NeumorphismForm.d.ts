import { FormRule } from '../../composables/useFormValidation';

export type { FormRule };
export type FormSize = 'small' | 'medium' | 'large';
export interface NeumorphismFormProps {
    model?: Record<string, unknown>;
    rules?: Record<string, FormRule[]>;
    labelWidth?: string;
    /**
     * 子字段尺寸——px 最小高度（数字，主几何量），或三档预设名。
     *
     * Form 自身不画几何量：size 只做级联，原样下发给子字段（Input / Select / …），
     * 由子组件按各自的三锚点插值，所以这里既不做换算也不做插值。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | FormSize;
    direction?: 'horizontal' | 'vertical';
}
declare function validateField(name: string): boolean;
declare function validateAll(): boolean;
declare function clearErrors(): void;
declare function __VLS_template(): {
    default?(_: {
        errors: Record<string, string>;
        validateAll: typeof validateAll;
        clearErrors: typeof clearErrors;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismFormProps>, {
    model: () => {};
    rules: () => {};
}>>, {
    validateAll: typeof validateAll;
    validateField: typeof validateField;
    clearErrors: typeof clearErrors;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    submit: (model: Record<string, unknown>) => void;
    validate: (valid: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismFormProps>, {
    model: () => {};
    rules: () => {};
}>>> & Readonly<{
    onSubmit?: ((model: Record<string, unknown>) => any) | undefined;
    onValidate?: ((valid: boolean) => any) | undefined;
}>, {
    model: Record<string, unknown>;
    rules: Record<string, FormRule[]>;
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
