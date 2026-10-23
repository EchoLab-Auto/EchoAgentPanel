//! 入口行覆盖面板的**单一**打开状态（2026-10 从 `ChatView.vue` 提出来）。
//!
//! ## 为什么不留在组件里
//!
//! 顶栏的压缩进度指示器（`CompactionIndicator.vue`）要能"点一下 → 打开上下文
//! 面板"，而它和 `ChatView` 是兄弟关系；顶栏写不了子组件的内部 `ref`。提到模块级
//! 与 `mobile-sheets.ts` / `rail-drag.ts` 同一套做法（先例）。
//!
//! ## 互斥是结构性的
//!
//! 用户要求「唤起一个就关掉另一个」。互斥不靠「打开前逐个关」——那样每加一个
//! 弹层就要改 N 处；这里只留**一个** id，任何时刻最多一个为真。

import { ref } from 'vue';

export type EntryOverlayId =
  | 'config'
  | 'context'
  | 'checklist'
  | 'sessions'
  | 'workspace'
  | 'instance'
  | 'tasks';

/** 当前打开的覆盖面板（null = 全关）。 */
export const entryOverlay = ref<EntryOverlayId | null>(null);

/** 打开指定面板（自动关掉其它），或传 `null` 全关。 */
export function setEntryOverlay(id: EntryOverlayId | null): void {
  entryOverlay.value = id;
}

/** 切换指定面板（已开则关）。 */
export function toggleEntryOverlay(id: EntryOverlayId): void {
  entryOverlay.value = entryOverlay.value === id ? null : id;
}
