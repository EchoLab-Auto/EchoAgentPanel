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

/** 是否为"打开 Sheet"压入过一条 history（用于 Android 返回键，见下）。 */
let historyPushed = false;
/** 正在响应 popstate 的自关闭（此时不能再调 history.back()，否则连退两层）。 */
let closingByPop = false;

/**
 * 打开指定 Sheet（自动关掉另一个）。
 *
 * ## 为什么动 history（2026-11 移动端逻辑补全）
 *
 * 手机（尤其 Android Chrome / PWA 独立窗口）的「返回」是**系统级手势/按键**。
 * 本应用是固定视口 SPA、没有路由，返回键在没有历史记录时直接**退出应用**——
 * 于是"打开卡片抽屉 → 按返回想关掉它 → 应用没了"。这是移动端最常见的一类
 * 逻辑缺陷，桌面根本不会暴露。
 *
 * 修法（标准做法）：打开 Sheet 时压入一条历史条目，按返回时先消费掉它并关
 * 面板；用户主动关闭（点遮罩 / 选中项）时把这条还回去，避免历史栈越攒越深
 * （否则要按 N 次返回才能退出）。
 *
 * 用 `try` 包住：部分 WebView 在 file:// / 受限上下文里不允许 pushState。
 */
export function openMobileSheet(sheet: Exclude<MobileSheet, null>): void {
  if (mobileSheet.value === sheet) return;
  mobileSheet.value = sheet;
  if (historyPushed) return;
  try {
    window.history.pushState({ echoSheet: sheet }, '');
    historyPushed = true;
  } catch {
    historyPushed = false;
  }
}

/** 关闭全部 Sheet（用户主动关闭会把 history 条目还回去）。 */
export function closeMobileSheet(): void {
  if (mobileSheet.value === null && !historyPushed) return;
  mobileSheet.value = null;
  if (!historyPushed) return;
  historyPushed = false;
  // 响应 popstate 的自关闭：那一条已经被"返回"消费掉了，不能再后退。
  if (closingByPop) {
    closingByPop = false;
    return;
  }
  try {
    window.history.back();
  } catch {
    // 没有可回退的历史：忽略（面板已关，功能不受影响）
  }
}

/** 切换指定 Sheet（已开则关）。 */
export function toggleMobileSheet(sheet: Exclude<MobileSheet, null>): void {
  if (mobileSheet.value === sheet) closeMobileSheet();
  else openMobileSheet(sheet);
}

/**
 * 挂上返回键监听（幂等；`App.vue` 启动时调一次）。
 *
 * 只在**有 Sheet 打开**时拦截：其它情况下不干预历史，交给浏览器默认行为
 * （用户确实想离开时就应该离开）。
 */
let popListening = false;
export function initMobileSheetHistory(): void {
  if (popListening || typeof window === 'undefined') return;
  popListening = true;
  window.addEventListener('popstate', () => {
    if (mobileSheet.value === null) return;
    closingByPop = true;
    closeMobileSheet();
  });
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
    if (value) openMobileSheet('cards');
    else closeMobileSheet();
  },
});

/** 视图菜单的开关（`App.vue` 顶栏 `☰` 用）。 */
export const mobileViewSheetOpen = computed<boolean>({
  get: () => mobileSheet.value === 'view',
  set: (value: boolean) => {
    if (value) openMobileSheet('view');
    else closeMobileSheet();
  },
});
