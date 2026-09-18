/**
 * 简易代码高亮（零依赖正则实现）。
 *
 * 两遍式：注释与字符串先替换为占位符（其内部不再参与词法高亮，
 * 也避免插入的 span 标记被后续正则破坏），词法轮次完成后再还原为 span。
 * 输出为 escape 后的 HTML + token-* span，由 DocCodeBlock / MarkdownRenderer 共用。
 */
export declare function highlightCode(code: string, lang?: string): string;
