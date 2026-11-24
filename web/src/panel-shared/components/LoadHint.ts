//! `@echo-agent/panel/components/LoadHint` 的运行期入口。
//!
//! 扩展源码写 `import LoadHint from '@echo-agent/panel/components/LoadHint'`，
//! import map 把这个裸标识符指到本文件的产物——于是扩展拿到的是**壳自己那份**
//! 组件（同一实例、同一套 props 与内部状态），而不是各自打包一份副本。

export { default } from '../../components/LoadHint.vue';
