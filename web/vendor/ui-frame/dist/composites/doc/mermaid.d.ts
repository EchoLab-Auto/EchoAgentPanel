/**
 * Mermaid 代码块 —— 占位与状态标记（**不含官方渲染器**）。
 *
 * 分工：
 * - `flowchart` / `graph` → `DocFlowCanvas`（画布：跑主题、可缩放、可拖拽）
 * - `sequenceDiagram` → `DocSequenceChart`（图表：宽度跟随正文，高度随内容）
 * - `gantt` → `DocGanttChart`（图表：同上，条长按毫秒比例换算）
 * - 其余图型（class / state / pie / mindmap …）与"图型对但写法超界"一律**保留
 *   源码**，标 `data-mermaid-state="error"`。
 *
 * 为什么不再引入 mermaid 官方渲染器：同一份文档里两种皮肤并排（新拟态圆角
 * 卡片 vs 官方浅蓝方块直角折线），读者会以为它们来自两个产品。宁可看到一段
 * 可读的源码，也不混皮肤——需要图示就写成 `flowchart` 或 `prodoc-flow`。
 *
 * 源码只保存在 `<pre><code>` 的 textContent 中，不复制进 data-* 属性：
 * DOMPurify 的 mXSS 防护可能剥除包含 `-->` 的属性，而箭头正是流程图常规语法。
 *
 * @module composites/doc/mermaid
 */
export declare const MERMAID_CLASS = "mermaid-diagram";
export declare const MERMAID_STATE_ATTR = "data-mermaid-state";
/**
 * 图型标记：原生画布已接手的图型（`flowchart` / `sequence` / `gantt`），或
 * `other`（无原生实现，只能给源码）。
 *
 * 宿主与样式据此区分"这张图为什么只有源码"：**语法超出原生能力** vs **图型不支持**
 * ——两者的处置完全不同（前者改写法就有图，后者只能换图型或等实现）。
 */
export declare const MERMAID_GRAPH_ATTR = "data-mermaid-graph";
/** 有原生渲染器的图型。新增一种图型 = 这里加一项 + 分发处加一个分支。 */
export type MermaidDiagramKind = 'flowchart' | 'sequence' | 'gantt' | 'other';
export type MermaidState = 'loading' | 'done' | 'error';
/** 图表占位：`<pre>` 同时承担加载前的展示与失败后的源码回退。 */
export declare function mermaidPlaceholder(source: string): string;
/** 落状态（挂载点、回退点都走这里，避免各处手写属性名）。 */
export declare function setMermaidState(el: Element, state: MermaidState): void;
