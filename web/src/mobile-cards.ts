//! ⚠️ 已合并进 `mobile-sheets.ts`（2026-10 移动端布局 v2）。
//!
//! 卡片抽屉不再是独立布尔——它与视图切换菜单**互斥**（同一时刻只开一个 sheet），
//! 状态统一由 `mobile-sheets.ts` 的 `mobileSheet` 单值管理。
//!
//! 本文件保留为**兼容转发**（`ChatView.vue` 等既有调用点无需改动）；新代码请直接
//! `import { ... } from '../mobile-sheets'`。

export {
  mobileSheet,
  mobileCardsDrawerOpen,
  mobileViewSheetOpen,
  openMobileSheet,
  closeMobileSheet,
  toggleMobileSheet,
} from './mobile-sheets';

export type { MobileSheet } from './mobile-sheets';
