import { ProDocFlowError } from './types.js';

export type SequenceActorKind = 'participant' | 'actor';
export type SequenceArrowKind = 'solid-arrow' | 'dashed-arrow' | 'solid-open' | 'dashed-open' | 'solid-cross' | 'dashed-cross' | 'solid-line' | 'dashed-line';
export interface SequenceActor {
    id: string;
    /** 显示名（`participant A as 别名` 取别名，否则取 id） */
    label: string;
    kind: SequenceActorKind;
}
export interface SequenceMessage {
    kind: 'message';
    from: string;
    to: string;
    label: string;
    arrow: SequenceArrowKind;
    /** 自消息：`A->>A:`，渲染成回环而不是零长箭头 */
    self: boolean;
    /** `autonumber` 打开时由解析器补的序号 */
    number?: number;
    /** `->>+B` / `->>-B` 简写：这条消息顺带激活/结束目标的生命线 */
    activate?: boolean;
    deactivate?: boolean;
}
export interface SequenceNote {
    kind: 'note';
    placement: 'left of' | 'right of' | 'over';
    /** `over A,B` 覆盖多个参与者；`left/right of` 只有一个 */
    actors: string[];
    label: string;
}
export interface SequenceActivation {
    kind: 'activate' | 'deactivate';
    actor: string;
}
export interface SequenceBlock {
    kind: 'block';
    block: 'loop' | 'alt' | 'opt' | 'par' | 'critical' | 'break';
    label: string;
}
/**
 * 分组内的分隔线（`alt` 的 `else` / `par` 的 `and`）。
 *
 * 作为**独立 item** 而不是 `SequenceBlock.splits` 的元素：它的位置就是"出现在
 * 第几行"，塞进 block 里会让渲染端不得不回头重扫 items 猜位置（第一版就这么写，
 * 结果两处游标各算一遍，必然漂移）。
 */
export interface SequenceBlockSplit {
    kind: 'block-split';
    label: string;
}
export type SequenceItem = SequenceMessage | SequenceNote | SequenceActivation | SequenceBlock | SequenceBlockSplit | {
    kind: 'block-end';
};
export interface SequenceGraph {
    title?: string;
    actors: SequenceActor[];
    items: SequenceItem[];
    errors: ProDocFlowError[];
}
/** 空模型（无参与者、无内容）——调用方据此判"没什么可画"。 */
export declare function emptySequenceGraph(): SequenceGraph;
/** 源码是否是 Mermaid 时序图（首个有效行判定，跳过空行与 `%%` 注释）。 */
export declare function isMermaidSequence(source: string): boolean;
/**
 * 解析 `sequenceDiagram` 源码。
 *
 * 容错：任何无法识别的行都进 `errors`（带行号与原文），解析继续——但调用方看到
 * `errors` 非空就不该渲染（半张时序图比源码更难懂：缺一条消息的时序是**错误**的
 * 时序，不是不完整的时序）。
 */
export declare function parseMermaidSequence(source: string): SequenceGraph;
