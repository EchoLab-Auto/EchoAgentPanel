//! 「事件目标是否落在 ui-frame 的 teleport 浮层内」——入口弹层与覆盖层共用。
//!
//! 背景：`pointerdown` 在捕获阶段先于选项自身的 `click` 派发。若把 ui-frame
//! 下拉浮层内的按下当成「点了面板外」，外层容器会立刻卸载整个面板（`v-if`
//! 拆掉 slot 内容）→ 选项连 click 都收不到，表现为「下拉点不动 / 面板一闪就
//! 关」。2026-10 报障：会话弹层右侧「会话级 API」下拉选不了模型
//! （`SessionSwitcher` 的 `NeumorphismSelect` 正是 teleport 浮层；
//! `DirectoryPicker` 的位置切换同理）。
//!
//! 为什么独立成模块：`PanelPopover`（锚定浮层，Agent 切换等）与
//! `SessionOverlay`（会话区覆盖面板，入口行其余弹层）各自实现过一次「点外面
//! 关闭」，选择器一旦分叉就会出现「某个弹层里下拉能点、另一个不能」的漂移。

/** ui-frame 浮层的根类名：由面板内控件 teleport 到 body，DOM 上不在面板里。 */
export const FLOATING_LAYER_SELECTOR = [
  '.nm-select__dropdown',
  '.nm-autocomplete__dropdown',
  '.nm-menu__submenu',
  '.nm-popover-wrapper',
  '.nm-tooltip-wrapper',
  '.nm-toast',
].join(',');

/** 事件目标是否落在 ui-frame 的 teleport 浮层内（视同面板内部）。 */
export function isInsideFloatingLayer(target: Node): boolean {
  const el =
    target.nodeType === Node.ELEMENT_NODE
      ? (target as Element)
      : ((target.parentElement as Element | null) ?? null);
  return !!el?.closest?.(FLOATING_LAYER_SELECTOR);
}
