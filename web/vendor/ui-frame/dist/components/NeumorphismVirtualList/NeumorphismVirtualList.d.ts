export interface NeumorphismVirtualListProps<T> {
    /** Data array to render virtually */
    items?: T[];
    /** Fixed item height in pixels */
    itemHeight?: number;
    /** Number of extra items rendered above and below the viewport */
    overscan?: number;
    /** Field name used as the `:key` in the v-for loop */
    keyField?: string;
}
declare const _default: <T>(__VLS_props: Awaited<typeof __VLS_setup>["props"], __VLS_ctx?: __VLS_Prettify<Pick<Awaited<typeof __VLS_setup>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: __VLS_Prettify<__VLS_OmitKeepDiscriminatedUnion<(Partial<{}> & Omit<{} & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps, never>) & NeumorphismVirtualListProps<T>, keyof import('vue').VNodeProps | keyof import('vue').AllowedComponentProps>> & {} & (import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps);
    expose(exposed: import('vue').ShallowUnwrapRef<{
        scrollTo: (index: number, align?: "top" | "center") => void;
    }>): void;
    attrs: any;
    slots: ReturnType<() => {
        default?(_: {
            item: T;
            index: number;
        }): any;
        empty?(_: {}): any;
    }>;
    emit: typeof __VLS_emit;
}>) => import('vue').VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
export default _default;
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
