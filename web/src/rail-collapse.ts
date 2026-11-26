//! 侧边栏列的**收起**状态（左右各一，互不影响）。
//!
//! ## 与 `rail-layout.ts` 的分工
//!
//! `rail-layout` 管「哪张卡在哪一列、列内顺序」——它决定列**有没有内容**；
//! 本模块管「这一列现在是否让位给正文」——它决定列**显示不显示**。两者是
//! 正交维度：
//!
//! - 列没登记卡片 → 整列不存在（`railRegistered` 判据，见 `rail-cards.ts`）；
//! - 列有卡片但被收起 → 列不渲染、正文用满宽度，贴边留一个把手。
//!
//! ## 为什么收起必须持久化
//!
//! 收起是**用户对工作区的偏好**（写代码时想让正文宽一点），不是一次性动作。
//! 不持久化的话每次刷新、每次切视图（ChatView 在 KeepAlive 里，但整页刷新
//! 会重建）都要重新点一次——这个功能就退化成噪声。
//!
//! ## 与拖动/换列的关系（关键）
//!
//! 收起的列**没有 DOM**，因此拖动命中测试找不到它、`registerRail` 也没注册。
//! 两个入口都必须能自己把列叫回来：
//!
//! 1. **拖动中**：`railDragEngaged` 在视图层强制出列（见 ChatView 的
//!    `leftRailVisible`）——两个方向都是投放区；
//! 2. **落位/换列**：`placeCardAfter` / `placeCard` 落位后调用
//!    [`setRailCollapsed`] 展开目标列——否则卡片"拖进去了但列是收起的"，
//!    用户看到的是"卡片凭空消失"。
//!
//! 第 2 条是实现顺序上的硬约束：它必须发生在**写布局之后**（列刚有内容才
//! 有意义），且要在同一个同步段里完成（`flush: 'sync'` 落盘，视觉上零闪烁）。

import { reactive, watch } from 'vue';
import type { RailSide } from './rail-layout';

/** `localStorage` 键（与 `echo-panel-rail-layout` / `echo-panel-rail-cards` 同族）。 */
export const STORAGE_KEY = 'echo-panel-rail-collapsed';

export interface RailCollapse {
  left: boolean;
  right: boolean;
}

/** 默认：两列都展开（与「收起」这个能力出现之前的行为一致，零迁移）。 */
export function defaultCollapse(): RailCollapse {
  return { left: false, right: false };
}

/**
 * 归一化一份持久化文档（导出以便直接测试）。
 *
 * 刻意**宽松**：任何非布尔值都当 `false`（展开）。理由不对称——把「坏数据」
 * 当成收起，用户会看到面板突然缺了一列且不知道点哪儿能回来；当成展开则是
 * 回到既有行为，最多多显示一列。宁可见到，不可藏起。
 */
export function normalizeCollapse(raw: string | null): RailCollapse {
  const out = defaultCollapse();
  if (!raw) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== 'object') return out;
  const record = parsed as Record<string, unknown>;
  for (const side of ['left', 'right'] as const) {
    if (record[side] === true) out[side] = true;
  }
  return out;
}

function load(): RailCollapse {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // 隐私模式等：退默认（两列展开）
  }
  return normalizeCollapse(raw);
}

/** 响应式单例（模块级：所有读写方共享同一份）。 */
export const railCollapsed = reactive<RailCollapse>(load());

watch(
  railCollapsed,
  (value) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ left: value.left, right: value.right }),
      );
    } catch {
      // 存储不可用：折叠状态仅内存生效
    }
  },
  // 与 rail-layout 同口径：收起是用户动作，写盘不等下一帧。
  { deep: true, flush: 'sync' },
);

/** 该列当前是否收起。 */
export function isRailCollapsed(side: RailSide): boolean {
  return railCollapsed[side] === true;
}

/**
 * 显式设置某列的收起状态（`placeCard*` 落位时用它展开目标列）。
 *
 * 幂等：值未变时不写（避免无意义的 `localStorage.setItem`）。
 */
export function setRailCollapsed(side: RailSide, collapsed: boolean): void {
  if (railCollapsed[side] === collapsed) return;
  railCollapsed[side] = collapsed;
}

/** 切换某列的收起状态，返回切换**后**的状态（供 UI 播报/断言）。 */
export function toggleRailCollapsed(side: RailSide): boolean {
  const next = !isRailCollapsed(side);
  railCollapsed[side] = next;
  return next;
}

/** 测试辅助：复位模块级状态（跨用例隔离）。 */
export function resetRailCollapseForTests(): void {
  railCollapsed.left = false;
  railCollapsed.right = false;
}
