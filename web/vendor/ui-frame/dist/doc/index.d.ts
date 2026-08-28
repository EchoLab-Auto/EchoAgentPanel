/**
 * @echolab-auto/ui-frame/doc — 文档渲染模块
 *
 * 提供 Markdown 渲染、文档查看器和编辑器组件，
 * 以及文档解析和树形结构工具。
 *
 * @example
 * ```ts
 * import { DocViewer, MarkdownRenderer, DocEditor, MarkdownEditor } from '@echolab-auto/ui-frame/doc'
 * import type { ProDocNode, DocTree, DocViewerProps, MarkdownRendererProps } from '@echolab-auto/ui-frame/doc'
 * ```
 */
export { default as DocViewer } from './DocViewer';
export type { DocViewerProps } from './DocViewer';
export { default as MarkdownRenderer } from './MarkdownRenderer';
export type { MarkdownRendererProps } from './MarkdownRenderer';
export { default as DocEditor } from './DocEditor';
export type { DocEditorProps } from './DocEditor';
export { default as MarkdownEditor } from './MarkdownEditor';
export type { MarkdownEditorProps } from './MarkdownEditor';
export { default as DocFlowCanvas } from './DocFlowCanvas';
export type { DocFlowCanvasProps } from './DocFlowCanvas';
export { default as DocCodeBlock } from './DocCodeBlock';
export type { DocCodeBlockProps } from './DocCodeBlock';
export { default as DocTocNav } from './DocTocNav';
export type { DocTocNavProps } from './DocTocNav';
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
