/** @deprecated 旧宽度档位（字符串）——保留仅为兼容映射，新代码请传数字（px） */
export type ModalSize = 'small' | 'medium' | 'large';
export interface NeumorphismModalProps {
    modelValue?: boolean;
    title?: string;
    /**
     * 对话框宽度（px，直接就是像素值）。默认 560。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）已弃用，仅按
     * small=400 / medium=560 / large=720（px）兼容映射；新代码请传数字。
     */
    size?: number | ModalSize;
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
    onCancel?: (() => any) | undefined;
    onOpen?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
    onConfirm?: (() => any) | undefined;
}>, {
    footer: boolean;
    closable: boolean;
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
