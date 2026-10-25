<script setup lang="ts">
//! 延迟加载的 Markdown 渲染（2026-10 首屏加载优化）。
//!
//! 背景：`@echolab-auto/ui-frame/doc` 的 MarkdownRenderer 组合（75KB 源码，
//! 含 TOC/代码块/表格等）此前被 MessageItem **静态导入**——连同其依赖
//! marked（73KB）一起打进首屏关键路径（index chunk + markdown chunk 均
//! 为首屏 modulepreload，实测占 1.5Mbps 慢网络首屏传输约 50KB gzip）。
//!
//! 消息渲染不需要它们与首屏 JS 同步就绪：改为异步 chunk——
//! - 首屏 JS 求值/挂载不再等待 doc 模块（Vue 挂载提前）；
//! - 无 agent 消息的会话（新会话/仅本地消息）完全不加载 doc；
//! - 加载期间以**纯文本回退**呈现（保留换行）→ 内容即刻可见，
//!   chunk 到达后无跳变地增强为完整 Markdown。
//!
//! 同一模块的多次加载由 ESM 缓存共享（全页仅一次网络请求）。
//!
//! 2026-10：公式渲染（KaTeX）随本模块一起按需加载（`katex/dist/katex.min.css`
//! 并入同一 loader）。公式本身由 `<doc 模块 MarkdownRenderer>` 的延迟管线
//! 渲染（占位 → 挂载后 `import('katex')`），未装 katex 的宿主导出的是 TeX
//! 原文而非空白，见 ui-frame `composites/doc/math.ts`。

import { defineAsyncComponent, defineComponent, h } from 'vue';
import { isChunkLoadError, tryAutoReload } from '../lazy';

const props = defineProps<{
  content: string;
}>();

/** 加载期回退：纯文本渲染（行内组件，无额外依赖）。
 *  `defineComponent` 包装以获得正确的组件类型（async 的
 *  loadingComponent 槽位要求 Component 类型）。 */
const PlainFallback = defineComponent({
  props: { content: { type: String, default: '' } },
  setup(p) {
    return () => h('div', { class: 'md-lazy-plain' }, p.content);
  },
});

const LazyMarkdown = defineAsyncComponent({
  loader: () =>
    Promise.all([
      import('@echolab-auto/ui-frame/doc'),
      // 数学公式（KaTeX）样式：与 Markdown 模块同批按需加载 —— 既不进首屏
      // 关键路径，也不必等公式出现才请求。字体文件由 CSS 的 url() 声明，
      // 浏览器只为实际用到的字族下载 woff2（多数会话一条都不下载）。
      import('katex/dist/katex.min.css'),
    ]).then(([m]) => m.MarkdownRenderer),
  loadingComponent: PlainFallback,
  // 立即显示回退（慢网络下消息文本先行）；不设 delay，避免回退出现前
  // 的空白帧。
  delay: 0,
  // 加载失败（部署后旧 chunk 缺失等）：保持纯文本回退而不是空白；
  // chunk 类失败按 lazy.ts 的一次性自动重载策略处理（10s 防循环）。
  errorComponent: PlainFallback,
  onError(error, _retry, fail) {
    if (isChunkLoadError(error) && tryAutoReload()) return;
    fail();
  },
});
</script>

<template>
  <LazyMarkdown :content="props.content" :show-toc="false" />
</template>

<style scoped>
/* 回退样式尽量贴近 MarkdownRenderer 的正文排版，减少替换时的跳动。 */
.md-lazy-plain {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: inherit;
  line-height: inherit;
}
</style>
