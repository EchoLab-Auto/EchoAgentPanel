//! `@echolab-auto/ui-frame` 的**根入口**（不是某个组件）。
//!
//! 只有 prodoc 的预构建渲染器用裸根入口（`NeumorphismBadge`、`NeumorphismModal`
//! 等一次性要一批）。单组件导入一律走 `components/<Name>`，根入口会让整包
//! （含全部组件与 composables）进共享 chunk——所以它单独一项、只给确实需要的
//! 扩展用。

export * from '@echolab-auto/ui-frame';
