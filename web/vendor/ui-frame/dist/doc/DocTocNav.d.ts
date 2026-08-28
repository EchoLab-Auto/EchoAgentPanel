import { TocNode } from './useMarkdownToc';

export interface DocTocNavProps {
    /** 层级目录树 */
    items: TocNode[];
    /** 当前激活的标题 id（scroll-spy 驱动） */
    activeId?: string;
    /** 面板标题（默认取 locale markdownTocLabel） */
    title?: string;
    /**
     * 是否带卡片边框（默认 true）。
     * false 时只渲染目录列表（用于嵌入移动端抽屉等自有容器）。
     */
    framed?: boolean;
    /**
     * 受控的折叠组集合（配合 update:collapsedGroups 使用）。
     * 传入后多个实例（如桌面侧栏 + 移动端抽屉）共享同一份折叠状态；
     * 不传则组件内部自维护。
     */
    collapsedGroups?: Set<string>;
}
/** 将 TOC 侧边栏滚动到当前激活项（滞回区间：视口中间 50% 不滚动，减少抖动） */
declare function scrollTocToActive(): void;
declare const _default: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<DocTocNavProps>, {
    activeId: string;
    title: string;
    framed: boolean;
    collapsedGroups: undefined;
}>>, {
    scrollTocToActive: typeof scrollTocToActive;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    select: (id: string) => void;
    "update:collapsedGroups": (value: Set<string>) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<DocTocNavProps>, {
    activeId: string;
    title: string;
    framed: boolean;
    collapsedGroups: undefined;
}>>> & Readonly<{
    onSelect?: ((id: string) => any) | undefined;
    "onUpdate:collapsedGroups"?: ((value: Set<string>) => any) | undefined;
}>, {
    title: string;
    collapsedGroups: Set<string>;
    activeId: string;
    framed: boolean;
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
