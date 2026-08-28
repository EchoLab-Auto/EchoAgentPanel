import { ProDocFlowGraph } from './types.js';

export declare function extractFlowBlocks(body: string): string[];
/**
 * 把节点的手动排版坐标写回 markdown 正文中的指定 prodoc-flow 块。
 *
 * 定位：与 blockSource 内容一致的围栏块（忽略首尾空白；行尾归一化后比较——
 * marked 会把 CRLF 归一为 LF，而正文 inner 保留 \r）。传入 blockIndex 时
 * 按文档内第 N 个 prodoc-flow 块直接定位（内容相同的重复块场景），
 * 此时仍以归一化后的内容一致性作为校验，不匹配则不写入。
 * 写回：节点有独立声明行时就地替换/追加 `@ x, y`（保留行尾 %% 注释）；
 * 仅出现在边链中的节点，在块尾新增 `id @ x, y` 行。
 * 找不到匹配块时原样返回。
 */
export declare function writeFlowNodePosition(body: string, blockSource: string, nodeId: string, x: number, y: number, blockIndex?: number): string;
/**
 * 解析 prodoc-flow 源码为流程图。
 * 容错优先：任何非法输入都不会抛错，而是记录到 graph.errors。
 */
export declare function parseProDocFlow(source: string): ProDocFlowGraph;
