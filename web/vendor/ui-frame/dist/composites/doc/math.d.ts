import { TokenizerAndRendererExtension } from 'marked';

/** 占位元素类名（行内与块级共用；块级另加 `--block` 修饰符） */
export declare const MATH_MOUNT_CLASS = "md-math-mount";
/** 占位元素内保存 TeX 原文的类名（渲染成功后随 innerHTML 一起被替换） */
export declare const MATH_SOURCE_CLASS = "md-math-src";
/** 渲染状态：`done` 已渲染 / `raw` 降级保留原文（避免重复尝试） */
export declare const MATH_STATE_ATTR = "data-math-state";
/** 公式源码（定界符已剥离）——用于渲染的身份键 */
interface MathMatch {
    /** 完整匹配（含定界符；marked 用它推进源码位置） */
    raw: string;
    /** 纯 TeX（定界符已剥离） */
    tex: string;
}
/** `$$…$$` 块级：独占一行（其后只允许空白与换行），可跨行。 */
export declare function matchBlockDollar(src: string): MathMatch | null;
/** `\[…\]` 块级（LaTeX 习惯定界符），同样要求闭合后到行尾。 */
export declare function matchBlockBracket(src: string): MathMatch | null;
/**
 * `$…$` 行内：KaTeX auto-render 的保守规则。
 *
 * - 起始 `$` 后不得紧跟空白或数字（否则 `$100` 这类价格会被吞）；
 * - 闭合 `$` 前不得是空白（`a $ 和 $ b` 不是公式）；
 * - 不跨行；
 * - 内容为空不算。
 */
export declare function matchInlineDollar(src: string): MathMatch | null;
/** `\(…\)` 行内（LaTeX 习惯定界符）：不跨空行。 */
export declare function matchInlineParen(src: string): MathMatch | null;
/** 行内 `$$…$$`（不独占行，如 `公式 $$a^2$$ 在这里`）：不跨空行。 */
export declare function matchInlineDoubleDollar(src: string): MathMatch | null;
/** `\\[…\\]` 行内（同一行内成对出现，不要求独占行）：不跨空行。 */
export declare function matchInlineBracket(src: string): MathMatch | null;
/** 从"带定界符的原文"剥离定界符（占位元素 data-tex 缺失时的回退路径）。 */
export declare function stripMathDelimiters(text: string): string;
/**
 * marked 扩展：块级 `$$…$$` / `\[…\]` 与行内 `$…$` / `\(…\)`。
 *
 * 不提供 `start()`：让 marked 逐个位置尝试本 tokenizer。首字符不匹配即
 * 返回 `undefined`（成本可忽略），换来的是**绝不跳过**内置规则 —— 尤其
 * 是行内代码（`` `$x$` `` 必须保持字面）。
 */
export declare const mathExtensions: TokenizerAndRendererExtension[];
/**
 * 把 `root` 内的公式占位替换为 KaTeX 输出（幂等，可反复调用）。
 *
 * 失败路径一律**保留 TeX 原文**并打上 `data-math-state="raw"`：
 * - katex 未安装 / 动态导入失败（离线、宿主未声明依赖）；
 * - 单条公式渲染抛错。
 *
 * 每次调用只处理尚未标记状态的占位，因此内容更新（v-html 全量替换后会
 * 生成新占位）与首次挂载可以共用同一个入口。
 */
export declare function renderMath(root: ParentNode | null | undefined): Promise<void>;
/** 清空渲染缓存（测试用） */
export declare function clearMathCacheForTests(): void;
export {};
