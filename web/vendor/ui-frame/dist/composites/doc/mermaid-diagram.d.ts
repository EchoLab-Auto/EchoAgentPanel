import { GanttGraph } from './mermaid-gantt';
import { SequenceGraph } from './mermaid-sequence';
import { MermaidDiagramKind } from './mermaid';
import { ProDocFlowGraph } from './types.js';

export type MermaidDiagram = {
    kind: 'flowchart';
    graph: ProDocFlowGraph;
} | {
    kind: 'sequence';
    graph: SequenceGraph;
} | {
    kind: 'gantt';
    graph: GanttGraph;
};
export interface MermaidDiagramResult {
    /** 判定出的图型（写进 `data-mermaid-graph`，用于诊断与样式） */
    type: MermaidDiagramKind;
    /** 解析成功才有的模型；`undefined` = 宿主保留源码 */
    diagram?: MermaidDiagram;
}
/**
 * 解析一段 `mermaid` 代码块源码。
 *
 * 顺序有意义：三个判定函数各自只看首个有效行，互斥；`flowchart` 先判是因为它最
 * 常用（判定成本最低的路径先走）。
 */
export declare function parseMermaidDiagram(source: string): MermaidDiagramResult;
