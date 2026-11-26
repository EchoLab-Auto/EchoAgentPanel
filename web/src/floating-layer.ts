//! 「事件目标是否落在浮层内」——入口弹层、覆盖层与**扩展自绘浮层**共用。
//!
//! ## 为什么需要它
//!
//! `pointerdown` 在捕获阶段先于目标元素自身的 `click` 派发。若把浮层内的按下
//! 当成「点了面板外」，外层容器会立刻卸载整个面板（`v-if` 拆掉 slot 内容）→
//! 目标连 click 都收不到，表现为「点不动的 / 面板一闪就关」。2026-10 报障：
//! 会话弹层右侧「会话级 API」下拉选不了模型（`SessionSwitcher` 的
//! `NeumorphismSelect` 正是 teleport 浮层）。
//!
//! ## 两条识别途径
//!
//! 1. **ui-frame 自带浮层的类名**（[`UI_FRAME_LAYER_SELECTOR`]）——库组件
//!    teleport 到 body 后 DOM 不在面板里，只能按类名认。
//! 2. **`data-panel-floating-layer` 属性**（[`PANEL_FLOATING_LAYER_ATTR`]）——
//!    给**扩展自己画的浮层**用。
//!
//! 第 2 条是 2026-11 加的第二起同类事故的产物：工作区的目录选择器
//! （`DirectoryPicker`）为躲开外壳的 `backdrop-filter` 裁剪而 `Teleport to
//! body`，于是它在工作区覆盖面板眼里成了"外面"。点它的面包屑 / 目录行 /
//! 甚至标题空白，都会先把**整个工作区面板**关掉（连带丢掉编辑表单里的一切），
//! 选择器自己反而来不及响应——用户看到的就是"点一下就闪退"。
//!
//! 类名枚举这条路扩展走不通（它不该、也不能给自己的 DOM 取 `.nm-*` 名字：
//! 那是库的命名空间）。所以给一个**显式的属性契约**：扩展在自己的浮层根节点
//! 上写 `data-panel-floating-layer`，面板就把它当自己人。
//!
//! ## 为什么是字面量而不是 import
//!
//! 扩展侧**不要** `import { PANEL_FLOATING_LAYER_ATTR }`：多一个导出会让"用新
//! 面板构建、被旧面板加载"的扩展在 `import()` 阶段就抛（整块 UI 消失，而不是
//! 少一个特性）。属性名是**跨仓契约的字面量**，两处各自写死并在注释里互相指路
//! ——代价是改名要改两处，收益是任意新旧组合都能降级成"没有这个特性"。

/** 浮层根节点的属性名（跨仓契约；扩展侧按字面量使用）。 */
export const PANEL_FLOATING_LAYER_ATTR = 'data-panel-floating-layer';

/** ui-frame 自带浮层的根类名（库组件 teleport 到 body 后只能按类名认）。 */
export const UI_FRAME_LAYER_SELECTOR = [
  '.nm-select__dropdown',
  '.nm-autocomplete__dropdown',
  '.nm-menu__submenu',
  '.nm-popover-wrapper',
  '.nm-tooltip-wrapper',
  '.nm-toast',
].join(',');

/** 完整选择器：ui-frame 类名 ∪ 扩展声明属性。 */
export const FLOATING_LAYER_SELECTOR = `${UI_FRAME_LAYER_SELECTOR},[${PANEL_FLOATING_LAYER_ATTR}]`;

/** 事件目标是否落在浮层内（视同面板内部 → 外层不关闭）。 */
export function isInsideFloatingLayer(target: Node): boolean {
  const el =
    target.nodeType === Node.ELEMENT_NODE
      ? (target as Element)
      : ((target.parentElement as Element | null) ?? null);
  return !!el?.closest?.(FLOATING_LAYER_SELECTOR);
}
