/**
 * Mermaid 图表 —— 可选依赖 + 延迟渲染管线。
 *
 * 渲染入口只属于 ui-frame：MarkdownRenderer 把 mermaid 代码块变成占位，
 * 本模块负责动态加载、初始化、逐图渲染及失败回退。宿主（Panel / DocViewer /
 * MarkdownEditor）不需要再实现一套图表逻辑，只需安装可选 peer `mermaid`。
 *
 * 源码只保存在 `<pre><code>` 的 textContent 中，不复制进 data-* 属性：
 * DOMPurify 的 mXSS 防护可能剥除包含 `-->` 的属性，而箭头又是 Mermaid 的
 * 常规语法。未安装、加载失败或单图语法错误时都保留这份可读源码。
 *
 * @module composites/doc/mermaid
 */
export declare const MERMAID_CLASS = "mermaid-diagram";
export declare const MERMAID_STATE_ATTR = "data-mermaid-state";
export type MermaidState = 'loading' | 'done' | 'error';
/** 图表占位：`<pre>` 同时承担加载前展示与失败后的源码回退。 */
export declare function mermaidPlaceholder(source: string): string;
/**
 * 渲染 root 下所有尚未完成的 Mermaid 占位。
 *
 * 每张图独立失败，不连坐其他图或正文。Markdown 流式更新会替换整棵 v-html
 * 子树；异步返回时用 `isConnected` 丢弃旧占位的迟到结果，避免渲染已被
 * 卸载的 SVG，也避免在旧 DOM 上继续积累工作。
 */
export declare function renderMermaidDiagrams(root: ParentNode | null): Promise<void>;
