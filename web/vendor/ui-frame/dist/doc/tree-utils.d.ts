import { ProDocNode } from './types.js';

/**
 * 根据节点路径特征推断对应的图标
 * @param node - ProDoc 文档节点
 * @returns 对应的 emoji 图标
 */
export declare function getNodeIcon(node: ProDocNode): string;
/** 树节点数据结构（与 NeumorphismTree 的 TreeNodeData 兼容） */
export interface DocTreeNode {
    key: string;
    label: string;
    icon: string;
    children: DocTreeNode[];
    [key: string]: unknown;
}
/**
 * 将 ProDocNode 递归转换为树形节点数据
 * @param node - ProDoc 文档节点
 * @returns 树形节点数据
 */
export declare function nodeToTreeData(node: ProDocNode): DocTreeNode;
