import { ProDocFlowGraph } from './types';

/**
 * 源码是否是 Mermaid 流程图（`flowchart` / `graph`）。
 *
 * 宿主据此区分**该由原生画布承担**与**该交给官方渲染器**的图型：流程图不再
 * 降级到官方 SVG 皮肤——同一份文档里两种皮肤并排是最刺眼的不一致，解析不了
 * 就保留源码；`sequenceDiagram` / `gantt` 等非流程图形型仍走官方渲染器。
 */
export declare function isMermaidFlowchart(source: string): boolean;
export declare function parseMermaidFlow(source: string): ProDocFlowGraph | null;
