export interface DocTreeIconProps {
    /** 文档域语义名（`tree-utils.getNodeIcon` / `nodeToTreeData` 的返回值） */
    name?: string;
    /** 显示尺寸（px；缺省 14，与库内行内图标一致） */
    size?: number;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    /** 文档域语义名（`tree-utils.getNodeIcon` / `nodeToTreeData` 的返回值） */
    name?: string;
    /** 显示尺寸（px；缺省 14，与库内行内图标一致） */
    size?: number;
}>, {
    name: string;
    size: number;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    /** 文档域语义名（`tree-utils.getNodeIcon` / `nodeToTreeData` 的返回值） */
    name?: string;
    /** 显示尺寸（px；缺省 14，与库内行内图标一致） */
    size?: number;
}>, {
    name: string;
    size: number;
}>>> & Readonly<{}>, {
    name: string;
    size: number;
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
