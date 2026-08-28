import { FormRule } from '../../composables/useFormValidation';

export type { FormRule };
export interface NeumorphismFormProps {
    model?: Record<string, unknown>;
    rules?: Record<string, FormRule[]>;
    labelWidth?: string;
    size?: 'small' | 'medium' | 'large';
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
