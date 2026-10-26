export type PaginationSize = 'small' | 'medium' | 'large';
export interface NeumorphismPaginationProps {
    modelValue?: number;
    total?: number;
    pageSize?: number;
    /**
     * 尺寸——px 页码按钮高（数字，主几何量），或三档预设名。
     *
     * 数字即「页码按钮高」：按钮最小宽度与字号按三锚点（30 / 38 / 46）
     * 分段线性插值，所以 `:size="38"` 与 `size="medium"` 逐像素相同，
     * `:size="42"` 落在 medium / large 之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | PaginationSize;
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
