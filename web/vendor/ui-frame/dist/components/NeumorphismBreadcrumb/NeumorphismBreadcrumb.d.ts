export type BreadcrumbSize = 'small' | 'medium' | 'large';
export interface BreadcrumbItem {
    label: string;
    to?: string;
    disabled?: boolean;
}
export interface NeumorphismBreadcrumbProps {
    items?: BreadcrumbItem[];
    separator?: string;
    /**
     * 尺寸——px 字号（数字，主几何量），或三档预设名。
     *
     * 数字即「字号」：按三锚点（12 / 14 / 16）定位，所以 `:size="14"` 与
     * `size="medium"` 逐像素相同，`:size="15"` 落在 medium / large 之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | BreadcrumbSize;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismBreadcrumbProps>, {
    items: () => never[];
    separator: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    itemClick: (item: BreadcrumbItem, index: number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismBreadcrumbProps>, {
    items: () => never[];
    separator: string;
}>>> & Readonly<{
    onItemClick?: ((item: BreadcrumbItem, index: number) => any) | undefined;
}>, {
    items: BreadcrumbItem[];
    separator: string;
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
