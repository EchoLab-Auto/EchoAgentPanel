import { ComputedRef, Ref, WritableComputedRef } from 'vue';
import { ProDocNode } from './types.js';
import { createDocTree } from './doc-tree.js';
import { TreeNodeData } from '../components/NeumorphismTree';
import { Theme } from '../composables/useTheme';

export interface UseDocLayoutOptions {
    /** 文档树根节点 */
    root: ProDocNode;
    /** 初始选中的文档路径 */
    initialPath?: string;
    /** 是否同步 URL hash（默认 true，SSR 下自动禁用） */
    syncUrlHash?: boolean;
}
export interface UseDocLayoutReturn {
    /** 当前选中的路径 */
    selectedPath: Ref<string>;
    /** 选中的 keys（用于 Tree 组件 v-model） */
    selectedKeys: Ref<string[]>;
    /** 展开的 keys */
    expandedKeys: Ref<string[]>;
    /** 树形数据 */
    treeData: ComputedRef<TreeNodeData[]>;
    /** 当前选中的节点 */
    selectedNode: ComputedRef<ProDocNode | undefined>;
    /** 当前显示的节点（默认第一个子节点） */
    displayNode: ComputedRef<ProDocNode | undefined>;
    /** 文档树索引 */
    docTree: ComputedRef<ReturnType<typeof createDocTree>>;
    /** 主题双向绑定模型 */
    themeModel: WritableComputedRef<Theme>;
    /** 搜索查询 */
    searchQuery: Ref<string>;
    /** 搜索匹配结果 */
    searchResults: ComputedRef<ProDocNode[]>;
    /** 处理树节点选择 */
    handleTreeSelect: (key: string) => void;
    /** 处理文档链接点击 */
    handleDocLink: (emit: (e: 'docLink', path: string) => void, path: string) => void;
    /** 执行搜索并跳转 */
    handleSearchSelect: (node: ProDocNode) => void;
}
/**
 * Doc 布局共享逻辑 — 管理树节点选择、主题、节点查找
 */
export declare function useDocLayout(options: UseDocLayoutOptions): UseDocLayoutReturn;
