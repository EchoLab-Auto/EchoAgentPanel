//! 边栏卡片拖动期间的全局禁选（2026-11-27）。
//!
//! 缺陷：卡头本身写了 `user-select: none`，但拖动时指针会划过主会话区和其他
//! 卡片，浏览器按**指针坐标**扩展文本选区——与 pointer capture 的事件目标无关
//! ——于是把聊天正文一起框进去，松手后高亮仍留着。
//!
//! 做法：按下瞬间给 `<html>` 挂 `rail-dragging`（规则见 styles.css，用
//! `!important` 压掉各组件自己的 `user-select`），并清掉已有选区；拖动结束
//! 移除该类即恢复可选。引用计数让左右两列、分隔条各自加锁时不会互相解锁
//! ——少解一次只是少一层保护，绝不会把「禁选」永久留在页面上（class 是否
//! 存在只看计数是否 > 0，且界面上每次加锁都有对应的释放路径）。

/** 挂在 `<html>` 上的类名（CSS 规则在 styles.css）。 */
export const RAIL_DRAG_SELECTION_CLASS = 'rail-dragging';

/** 当前持锁者数量（左右两列 / 分隔条可能各自加锁）。 */
let depth = 0;

function apply() {
  try {
    document.documentElement.classList.toggle(RAIL_DRAG_SELECTION_CLASS, depth > 0);
  } catch {
    // 极端环境没有 documentElement：禁选失效不影响拖动本身
  }
}

/** 清掉已有的文本选区（拖动前选中的文字不该在拖动后还亮着）。 */
export function clearTextSelection() {
  try {
    window.getSelection()?.removeAllRanges();
  } catch {
    // 老 WebView 无 getSelection：忽略
  }
}

/** 加锁：指针按下的那一刻调用（此时浏览器尚未锚定选区）。 */
export function lockRailSelection(): void {
  depth += 1;
  apply();
  clearTextSelection();
}

/** 解锁：与 `lockRailSelection` 一一配对；多余调用会被忽略。 */
export function unlockRailSelection(): void {
  if (depth > 0) depth -= 1;
  apply();
}

/**
 * 强制归零：组件卸载等「无法再配对」的路径用它兜底。
 * 只可能少一层保护，不会让页面永久不可选。
 */
export function resetRailSelectionLock(): void {
  depth = 0;
  apply();
}

/** 是否处于禁选状态（测试用）。 */
export function isRailSelectionLocked(): boolean {
  return depth > 0;
}
