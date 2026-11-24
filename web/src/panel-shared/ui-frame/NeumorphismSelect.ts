//! `@echolab-auto/ui-frame/components/NeumorphismSelect` 的运行期入口。
//!
//! 扩展直接用 ui-frame 的组件名（ui-frame 的文档就是这个写法），但 ui-frame
//! 有 19 MB 源码——绝不能每个扩展各打一份。import map 指到这里，全站共享壳
//! 那一份（含它的样式：`ui-frame.css` 由 `main.ts` 全局引入）。

export { default } from '@echolab-auto/ui-frame/components/NeumorphismSelect';
