//! 移动端底部 Sheet 的互斥开关（2026-10 移动端布局 v2）。
//!
//! 移动端（< 768px）有两个底部 Sheet：
//! - `cards`：信息卡片抽屉（侧栏卡片在窄屏的替代）——入口在顶栏右侧
//! - `view`：视图切换菜单（聊天 / 设置 / Shell）——入口在顶栏左侧 `☰`
//!
//! 二者**互斥**：同时只可能开一个（同一时刻只有一个 sheet 占着底部），所以用一个
//! `mobileSheet` 单值而不是两个独立布尔——后者会出现「打开卡片时视图菜单还开着」
//! 的叠层事故。
//!
//! 桌面（≥768px）：两个 Sheet 都不渲染，本模块无消费者（值恒 null）。
//!
//! 跨组件通信：入口在 `App.vue` 顶栏，`cards` 的抽屉本体在 `ChatView.vue`，
//! `view` 的 Sheet 本体是 `MobileViewSheet.vue`——三者是兄弟/父子关系，用模块级
//! ref 通信比往 App 里塞子组件的内部状态干净（同 `railSessionId` 的先例）。

import { computed, ref } from 'vue';

export type MobileSheet = 'cards' | 'view' | null;

/** 当前打开的 Sheet（null = 都关闭）。 */
export const mobileSheet = ref<MobileSheet>(null);

/** 打开指定 Sheet（自动关掉另一个）。 */
export function openMobileSheet(sheet: Exclude<MobileSheet, null>): void {
  mobileSheet.value = sheet;
}

/** 关闭全部 Sheet。 */
export function closeMobileSheet(): void {
  mobileSheet.value = null;
}

/** 切换指定 Sheet（已开则关）。 */
export function toggleMobileSheet(sheet: Exclude<MobileSheet, null>): void {
  mobileSheet.value = mobileSheet.value === sheet ? null : sheet;
}

/**
 * 卡片抽屉的开关（兼容既有调用点 `ChatView.vue`）。
 *
 * v2 之前它是独立的 `ref(false)`；现在只是 `mobileSheet === 'cards'` 的视图，
 * 这样与视图菜单天然互斥。
 */
export const mobileCardsDrawerOpen = computed<boolean>({
  get: () => mobileSheet.value === 'cards',
  set: (value: boolean) => {
    mobileSheet.value = value ? 'cards' : null;
  },
});

/** 视图菜单的开关（`App.vue` 顶栏 `☰` 用）。 */
export const mobileViewSheetOpen = computed<boolean>({
  get: () => mobileSheet.value === 'view',
  set: (value: boolean) => {
    mobileSheet.value = value ? 'view' : null;
  },
});
