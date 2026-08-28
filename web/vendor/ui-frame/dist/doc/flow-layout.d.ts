import { ProDocFlowGraph } from './types.js';

export interface FlowLayoutNode {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface FlowLayoutEdge {
    from: string;
    to: string;
    label?: string;
    /** SVG path d（三次贝塞尔） */
    path: string;
    /** 边标签定位点 */
    labelPos: {
        x: number;
        y: number;
    };
    /** 回边（构成环的边）：虚线绕行绘制，不参与分层 */
    isBackEdge: boolean;
}
export interface FlowLayoutResult {
    nodes: Map<string, FlowLayoutNode>;
    edges: FlowLayoutEdge[];
    width: number;
    height: number;
}
/**
 * 分层 DAG 布局。
 * @param graph 解析后的流程图
 * @param sweeps 层内 barycenter 往返扫掠轮数（默认 4）
 */
export declare function layoutProDocFlow(graph: ProDocFlowGraph, sweeps?: number): FlowLayoutResult;
