export interface NeumorphismModalProps {
    modelValue?: boolean;
    title?: string;
    size?: 'small' | 'medium' | 'large';
    closable?: boolean;
    maskClosable?: boolean;
    showClose?: boolean;
    destroyOnClose?: boolean;
    footer?: boolean;
    closeLabel?: string;
    cancelLabel?: string;
    confirmLabel?: string;
}
declare function __VLS_template(): {
    header?(_: {}): any;
    default?(_: {}): any;
    footer?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismModalProps>, {
    modelValue: boolean;
    closable: undefined;
    maskClosable: undefined;
    showClose: undefined;
    destroyOnClose: undefined;
    footer: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: boolean) => void;
    open: () => void;
    close: () => void;
    confirm: () => void;
    cancel: () => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismModalProps>, {
    modelValue: boolean;
    closable: undefined;
    maskClosable: undefined;
    showClose: undefined;
    destroyOnClose: undefined;
    footer: boolean;
}>>> & Readonly<{
    onClose?: (() => any) | undefined;
    onOpen?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
    onCancel?: (() => any) | undefined;
    onConfirm?: (() => any) | undefined;
}>, {
    closable: boolean;
    footer: boolean;
    modelValue: boolean;
    maskClosable: boolean;
    showClose: boolean;
    destroyOnClose: boolean;
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
