import { ProDocFlowGraph, ProDocNode } from './types.js';

/** 当前节点 + 子文档卡片的空间布局图 */
export declare function buildHierarchyGraph(node: ProDocNode): ProDocFlowGraph;
/**
 * 解析节点的画布图：显式流程优先，子文档层级地图回退，叶子返回 null。
 */
export declare function resolveCanvasGraph(node: ProDocNode): ProDocFlowGraph | null;
