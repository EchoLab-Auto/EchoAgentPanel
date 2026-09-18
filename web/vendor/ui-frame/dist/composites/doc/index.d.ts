/**
 * @echolab-auto/ui-frame/doc — 文档渲染模块（组合组件模块）
 *
 * 提供 Markdown 渲染、文档查看器和编辑器组件，
 * 以及文档解析和树形结构工具。
 *
 * 模块内部分两层（分类定义见 document/user/components.md「组件分层」）：
 * - **组合组件**：DocViewer / DocEditor / MarkdownRenderer / MarkdownEditor /
 *   DocFlowCanvas —— 由主库基础组件拼装，消费 ProDocNode / ProDocFlowGraph
 *   数据契约，纯渲染层（不持业务状态、不发网络请求）
 * - **元组件**：DocCodeBlock / DocTocNav / TocNodeItem —— 纯 UI 原语，
 *   零领域类型，性质上属于基础组件，可脱离本模块自由组装
 *
 * @example
 * ```ts
 * import { DocViewer, MarkdownRenderer, DocEditor, MarkdownEditor } from '@echolab-auto/ui-frame/doc'
 * import type { ProDocNode, DocTree, DocViewerProps, MarkdownRendererProps } from '@echolab-auto/ui-frame/doc'
 * ```
 */
/**
 * 组件分类元数据：composite 为组合组件（数据契约驱动），
 * meta 为元组件（纯 UI 原语，归基础组件层）。
 */
export declare const componentCategories: {
    readonly composite: readonly ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"];
    readonly meta: readonly ["DocCodeBlock", "DocTocNav", "TocNodeItem"];
};
/** @category 组合组件 */
export { default as DocViewer } from './DocViewer';
export type { DocViewerProps } from './DocViewer';
/** @category 组合组件 */
export { default as MarkdownRenderer } from './MarkdownRenderer';
export type { MarkdownRendererProps } from './MarkdownRenderer';
/** @category 组合组件 */
export { default as DocEditor } from './DocEditor';
export type { DocEditorProps } from './DocEditor';
/** @category 组合组件 */
export { default as MarkdownEditor } from './MarkdownEditor';
export type { MarkdownEditorProps } from './MarkdownEditor';
/** @category 组合组件 */
export { default as DocFlowCanvas } from './DocFlowCanvas';
export type { DocFlowCanvasProps } from './DocFlowCanvas';
/** @category 元组件 */
export { default as DocCodeBlock } from './DocCodeBlock';
export type { DocCodeBlockProps } from './DocCodeBlock';
/** @category 元组件 */
export { default as DocTocNav } from './DocTocNav';
export type { DocTocNavProps } from './DocTocNav';
/** @category 元组件 */
export { default as TocNodeItem } from './TocNodeItem';
export { useMarkdownToc } from './useMarkdownToc';
export type { TocItem, TocNode, UseMarkdownTocReturn } from './useMarkdownToc';
export { useScrollSpy, getScrollBehavior } from './useScrollSpy';
export type { UseScrollSpyOptions, UseScrollSpyReturn } from './useScrollSpy';
export { highlightCode } from './highlight';
export type { ProDocNode, DocTree, ProDocOptions } from './types.js';
export type { ProDocFlowDirection, ProDocFlowNodeShape, ProDocFlowNode, ProDocFlowEdge, ProDocFlowError, ProDocFlowGraph, } from './types.js';
export { parseFrontmatter, pathToId, extractTitle, createNode, buildDocTree } from './parser.js';
export { parseProDocFlow, extractFlowBlocks, writeFlowNodePosition } from './flow-parser.js';
export { layoutProDocFlow } from './flow-layout.js';
export type { FlowLayoutNode, FlowLayoutEdge, FlowLayoutResult } from './flow-layout.js';
export { resolveCanvasGraph, buildHierarchyGraph } from './flow-graph.js';
export { createDocTree, flattenDocTree, getAncestors } from './doc-tree.js';
export { getNodeIcon, nodeToTreeData } from './tree-utils.js';
export type { DocTreeNode } from './tree-utils.js';
export { useDocLayout } from './useDocLayout';
export type { UseDocLayoutOptions, UseDocLayoutReturn } from './useDocLayout';
