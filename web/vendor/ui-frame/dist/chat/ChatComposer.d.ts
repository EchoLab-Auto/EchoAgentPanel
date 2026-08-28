export interface ChatComposerProps {
    /** 输入内容（v-model） */
    modelValue?: string;
    /** 禁用态（如未连接），禁止输入与提交 */
    disabled?: boolean;
    /** 占位文本（默认取 locale chatInputPlaceholder） */
    placeholder?: string;
    /** 是否显示"取消任务"按钮 */
    cancelable?: boolean;
    /** 发送按钮文本（默认取 locale chatSend） */
    sendLabel?: string;
    /** 取消按钮文本（默认取 locale chatCancel） */
    cancelLabel?: string;
    /** 初始行数 */
    rows?: number | string;
    /** 随内容自动增高 */
    autoResize?: boolean;
    /** 最大输入长度 */
    maxlength?: number | string;
}
declare function __VLS_template(): {
    meta?(_: {}): any;
    actions?(_: {
        submit: () => void;
        canSubmit: boolean;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatComposerProps>, {
    modelValue: string;
    disabled: boolean;
    placeholder: string;
    cancelable: boolean;
    sendLabel: string;
    cancelLabel: string;
    rows: number;
    autoResize: boolean;
    maxlength: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string) => void;
    send: (content: string) => void;
    cancel: () => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatComposerProps>, {
    modelValue: string;
    disabled: boolean;
    placeholder: string;
    cancelable: boolean;
    sendLabel: string;
    cancelLabel: string;
    rows: number;
    autoResize: boolean;
    maxlength: undefined;
}>>> & Readonly<{
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onSend?: ((content: string) => any) | undefined;
    onCancel?: (() => any) | undefined;
}>, {
    disabled: boolean;
    placeholder: string;
    modelValue: string;
    maxlength: number | string;
    rows: number | string;
    autoResize: boolean;
    cancelable: boolean;
    sendLabel: string;
    cancelLabel: string;
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
