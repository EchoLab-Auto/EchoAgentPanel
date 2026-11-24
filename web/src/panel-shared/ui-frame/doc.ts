//! `@echolab-auto/ui-frame/doc` 的运行期入口（文档渲染组件）。
//!
//! 消费方是 prodoc 的**预构建渲染器**（`panel-ui/vendor/prodoc-renderer`）：
//! 它由上游仓构建好后随模块发布，内部按 ui-frame 官方文档的写法 import 这个
//! 子包。共享壳这一份保证文档组件的样式与行为只有一套。

export * from '@echolab-auto/ui-frame/doc';
