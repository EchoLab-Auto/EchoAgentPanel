import { ProDocNode, DocTree } from './types.js';

/** 从根节点构建 DocTree */
export declare function createDocTree(root: ProDocNode): DocTree;
/** 扁平化文档树为列表 */
export declare function flattenDocTree(root: ProDocNode): ProDocNode[];
/** 获取节点的所有祖先路径 */
export declare function getAncestors(node: ProDocNode, root: ProDocNode): ProDocNode[];
