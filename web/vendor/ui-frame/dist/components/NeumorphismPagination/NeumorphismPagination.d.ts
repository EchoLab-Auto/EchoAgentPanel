export interface NeumorphismPaginationProps {
    modelValue?: number;
    total?: number;
    pageSize?: number;
    size?: 'small' | 'medium' | 'large';
    showTotal?: boolean;
    showJumper?: boolean;
    maxVisiblePages?: number;
    disabled?: boolean;
    prevLabel?: string;
    nextLabel?: string;
    totalLabel?: string;
}
declare function __VLS_template(): {
    "page-item"?(_: {
        key: string;
        page: number | "prev-ellipsis" | "next-ellipsis";
        active: boolean;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismPaginationProps>, {
    showJumper: undefined;
    showTotal: undefined;
    modelValue: number;
    total: number;
    disabled: boolean;
    prevLabel: string;
    nextLabel: string;
    totalLabel: undefined;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: number) => void;
    change: (value: number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismPaginationProps>, {
    showJumper: undefined;
    showTotal: undefined;
    modelValue: number;
    total: number;
    disabled: boolean;
    prevLabel: string;
    nextLabel: string;
    totalLabel: undefined;
}>>> & Readonly<{
    onChange?: ((value: number) => any) | undefined;
    "onUpdate:modelValue"?: ((value: number) => any) | undefined;
}>, {
    disabled: boolean;
    modelValue: number;
    total: number;
    showTotal: boolean;
    showJumper: boolean;
    prevLabel: string;
    nextLabel: string;
    totalLabel: string;
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
