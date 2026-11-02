import { ProDocFlowError } from './types.js';

export type GanttTaskStatus = 'default' | 'done' | 'active' | 'crit' | 'milestone';
export interface GanttTask {
    id: string;
    label: string;
    /** 所属 section 名（无 section 时为空串） */
    section: string;
    status: GanttTaskStatus;
    startMs: number;
    endMs: number;
    /** `after X` 的来源任务 id（供渲染依赖线用） */
    after?: string;
}
export interface GanttSection {
    name: string;
    tasks: GanttTask[];
}
export interface GanttGraph {
    title?: string;
    sections: GanttSection[];
    /** 全图时间范围 */
    startMs: number;
    endMs: number;
    axisFormat?: string;
    errors: ProDocFlowError[];
}
export declare function emptyGanttGraph(): GanttGraph;
export declare function isMermaidGantt(source: string): boolean;
/**
 * 解析 `gantt` 源码。
 *
 * 两遍：先按出现顺序收集任务（id 在行内位置不固定），再顺序结算时间——`after`
 * 只能引用**已结算**的任务，这与 Mermaid 的语义一致（跨行乱序引用它自己也会拒绝）。
 */
export declare function parseMermaidGantt(source: string): GanttGraph;
/**
 * 按 `axisFormat`（Mermaid 的 strftime 子集）格式化刻度。
 *
 * 只认文档里真正用得上的几个 token（`%Y %m %d %H %M %S`），其余原样输出：猜错的
 * 格式比不格式化更误导。缺省格式按跨度决定是否带时刻。
 */
export declare function formatGanttTick(ms: number, format?: string): string;
