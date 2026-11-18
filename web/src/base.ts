//! 应用基址（vite `base`）。
//!
//! # 为什么需要它
//!
//! 面板默认独占一个 host 根（`/`）。被挂在反向代理的子路径下（例如
//! `https://example.com/agent-panel`）时，浏览器解析 `index.html` 里的**绝对**
//! 路径（`/assets/…`、`/ws`、`/media/…`）会落到站点根，也就是**别人的应用**上
//! —— 表现是 HTML 拿到了、JS 全 404/401、页面白屏。
//!
//! vite 的 `base` 会重写它自己生成的引用（HTML 里的 script/link、动态 import、
//! CSS 里的 url()），但它**不会**碰手写的字符串。所以所有手写的绝对路径都必须
//! 经过 [`withBase`]。
//!
//! # 约定
//!
//! `BASE` 恒以 `/` 结尾（根部署是 `/`，子路径部署是 `/agent-panel/`），因此
//! `withBase('/ws')` 用字符串拼接即可，不需要处理分隔符。
//!
//! 只对以 `/` 开头的**站内绝对路径**加前缀：`http(s)://`、`data:`、`blob:`、
//! 相对路径一律原样返回 —— 媒体引用里 `data:` URI 与绝对 URL 都是合法输入。

/** 应用基址，恒以 `/` 结尾（由 vite 的 `base` 注入）。 */
export const BASE: string = import.meta.env.BASE_URL;

/**
 * 给站内绝对路径加上应用基址；其它形态原样返回。
 *
 * ```ts
 * withBase('/ws')        // 根部署 → '/ws'；子路径 → '/agent-panel/ws'
 * withBase('data:image') // 原样
 * ```
 */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${BASE}${path.slice(1)}`;
}
