export type ListSize = 'small' | 'medium' | 'large';
export interface NeumorphismListProps<T> {
    /** Data array to render (when not using manual slot) */
    items?: T[];
    /** Show border around the list */
    bordered?: boolean;
    /** Show dividers between items */
    split?: boolean;
    /**
     * 尺寸——px 字号（数字，主几何量），或三档预设名。
     *
     * 数字即「字号」：行内距与头尾内距按三锚点（12 / 14 / 15）分段线性插值，
     * 所以 `:size="14"` 与 `size="medium"` 逐像素相同，`:size="14.5"` 落在两者之间。
     *
     * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）仅作兼容别名保留，
     * 新代码请传数字。
     */
    size?: number | ListSize;
    /** Enable hover effect on items */
    hoverable?: boolean;
    /** Show loading state */
    loading?: boolean;
}
declare const _default: <T>(__VLS_props: Awaited<typeof __VLS_setup>["props"], __VLS_ctx?: __VLS_Prettify<Pick<Awaited<typeof __VLS_setup>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_Prettify<__VLS_OmitKeepDiscriminatedUnion<(Partial<{}> & Omit<{
        readonly "onItem-click"?: ((item: T, index: number) => any) | undefined;
    } & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps, never>) & NeumorphismListProps<T>, keyof import('vue').VNodeProps | keyof import('vue').AllowedComponentProps>> & {} & (import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps);
    expose(exposed: import('vue').ShallowUnwrapRef<{}>): void;
    attrs: any;
    slots: ReturnType<() => {
        header?(_: {}): any;
        loading?(_: {}): any;
        empty?(_: {}): any;
        default?(_: {
            item: T;
            index: number;
        }): any;
        footer?(_: {}): any;
    }>;
    emit: (e: "item-click", item: T, index: number) => void;
}>) => import('vue').VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
export default _default;
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
