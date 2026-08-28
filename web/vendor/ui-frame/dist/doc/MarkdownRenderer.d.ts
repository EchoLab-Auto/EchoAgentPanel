export type { TocNode } from './useMarkdownToc';
export interface MarkdownRendererProps {
    /** Markdown 内容 */
    content: string;
    /** 自定义样式类名 */
    className?: string;
    /** 是否显示目录 */
    showToc?: boolean;
    /** 滚动容器（HTMLElement 或 CSS 选择器）。不传则自动查找 .nm-layout__content */
    scrollContainer?: HTMLElement | string;
    /** prodoc-flow 画布节点可拖拽编辑（松手触发 flowNodeMove，由宿主持久化） */
    flowEditable?: boolean;
}
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<MarkdownRendererProps>, {
    className: string;
    showToc: boolean;
    flowEditable: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    docLink: (path: string) => void;
    flowNodeMove: (payload: {
        id: string;
        x: number;
        y: number;
        source: string;
        blockIndex: number;
    }) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<MarkdownRendererProps>, {
    className: string;
    showToc: boolean;
    flowEditable: boolean;
}>>> & Readonly<{
    onDocLink?: ((path: string) => any) | undefined;
    onFlowNodeMove?: ((payload: {
        id: string;
        x: number;
        y: number;
        source: string;
        blockIndex: number;
    }) => any) | undefined;
}>, {
    className: string;
    showToc: boolean;
    flowEditable: boolean;
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
