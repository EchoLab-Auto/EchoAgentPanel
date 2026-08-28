import { ComputedRef, Ref } from 'vue';

/** 扁平目录项（heading 提取结果） */
export interface TocItem {
    level: number;
    text: string;
    id: string;
}
/** 层级目录节点 */
export interface TocNode {
    level: number;
    text: string;
    id: string;
    children: TocNode[];
}
export interface UseMarkdownTocReturn {
    /** 扁平 heading 列表（含实例级唯一 id） */
    toc: ComputedRef<TocItem[]>;
    /** 由扁平列表构建的层级树 */
    tocTree: ComputedRef<TocNode[]>;
    /** 生成带实例前缀的唯一 heading id（渲染管线兜底用） */
    makeUniqueId: (text: string) => string;
}
/**
 * Headless 目录提取 —— 从 markdown 内容提取 heading 列表并构建层级树。
 * id 带实例级唯一前缀（避免多实例冲突），同名标题自动去重加后缀。
 */
export declare function useMarkdownToc(content: Ref<string>): UseMarkdownTocReturn;
