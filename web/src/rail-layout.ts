//! 边栏卡片布局（左侧 / 右侧）：卡片归属与顺序的唯一状态源。
//!
//! 背景（2026-09-24 双侧边栏）：右侧栏卡片栈（RailStack）此前是固定的一列，
//! 卡片集合由门控决定。现在卡片可以在**左右两列之间拖动**（含列内排序），
//! 归属与顺序必须脱离组件、持久化，否则切换视图/刷新即丢。
//!
//! 存储：`localStorage: echo-panel-rail-layout` = `{ left: string[], right: string[] }`。
//! 只存**显式**归属；未来新增的卡片 id 不在任何列表里时，按
//! [`RAIL_CARD_ORDER`] 的规范顺序补进 `right`（老用户升级不丢卡片）。
//!
//! 与 `echo-panel-rail-cards`（折叠态 + flex 比例，见 RailStack）的分工：
//! 那份状态**按卡片 id** 存，与所在列无关——卡片换列后折叠态与高度比例保留。

import { reactive, watch } from 'vue';

export type RailSide = 'left' | 'right';

/**
 * 卡片 id 的规范顺序（新增卡片时在此登记；用于未归属卡片的补位与默认布局）。
 * 与 `PanelSidebar` 里的卡片注册表一致。
 */
export const RAIL_CARD_ORDER = ['status', 'files', 'shell', 'branches'] as const;

export interface RailLayout {
  left: string[];
  right: string[];
}

const STORAGE_KEY = 'echo-panel-rail-layout';

/** 默认布局：全部卡片在右侧（与双侧边栏之前的行为一致，零迁移）。 */
function defaultLayout(): RailLayout {
  return { left: [], right: [...RAIL_CARD_ORDER] };
}

/**
 * 归一化一份持久化文档（测试用：直接喂 JSON 字符串，验证过滤/去重/补位）。
 * 生产路径见 [`load`]（读 localStorage 后走同一函数）。
 */
export function __normalizeForTest(raw: string | null): RailLayout {
  return normalize(raw);
}

function normalize(raw: string | null): RailLayout {
  if (!raw) return defaultLayout();
  let parsed: Partial<RailLayout>;
  try {
    parsed = JSON.parse(raw) as Partial<RailLayout>;
  } catch {
    return defaultLayout();
  }
  const normalized: RailLayout = {
    left: Array.isArray(parsed.left) ? parsed.left.filter(isKnownCard) : [],
    right: Array.isArray(parsed.right) ? parsed.right.filter(isKnownCard) : [],
  };
  // 去重：同一 id 只保留第一次出现（左优先），防止手改 localStorage 造成重复渲染。
  const seen = new Set<string>();
  for (const side of ['left', 'right'] as const) {
    normalized[side] = normalized[side].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  fillUnplaced(normalized, seen);
  return normalized;
}

function load(): RailLayout {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // 隐私模式等：退默认
  }
  if (!raw) return defaultLayout();
  let parsed: Partial<RailLayout>;
  try {
    parsed = JSON.parse(raw) as Partial<RailLayout>;
  } catch {
    return defaultLayout();
  }
  const normalized: RailLayout = {
    left: Array.isArray(parsed.left) ? parsed.left.filter(isKnownCard) : [],
    right: Array.isArray(parsed.right) ? parsed.right.filter(isKnownCard) : [],
  };
  // 去重：同一 id 只保留第一次出现（左优先），防止手改 localStorage 造成重复渲染。
  const seen = new Set<string>();
  for (const side of ['left', 'right'] as const) {
    normalized[side] = normalized[side].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  fillUnplaced(normalized, seen);
  return normalized;
}

function isKnownCard(id: unknown): id is string {
  return typeof id === 'string' && (RAIL_CARD_ORDER as readonly string[]).includes(id);
}

/**
 * 未归属卡片（新版本新增、或用户手改过存储）补进 `right`：按规范顺序插到
 * 第一个「规范序号更大」的右侧卡片之前，保持既定视觉顺序。
 */
function fillUnplaced(layout: RailLayout, seen: Set<string>): void {
  for (const id of RAIL_CARD_ORDER) {
    if (seen.has(id)) continue;
    const index = layout.right.findIndex(
      (existing) =>
        RAIL_CARD_ORDER.indexOf(existing as (typeof RAIL_CARD_ORDER)[number]) >
        RAIL_CARD_ORDER.indexOf(id),
    );
    if (index === -1) layout.right.push(id);
    else layout.right.splice(index, 0, id);
    seen.add(id);
  }
}

/** 响应式布局单例（模块级：所有边栏实例共享同一份）。 */
export const railLayout = reactive<RailLayout>(load());

watch(
  railLayout,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: value.left, right: value.right }));
    } catch {
      // 存储不可用：布局仅内存生效
    }
  },
  // flush: 'sync' —— 落位是用户动作，写盘不等下一帧（关页/切视图都不丢）。
  { deep: true, flush: 'sync' },
);

/** 某卡片当前所在列（未登记 = 右）。 */
export function sideOf(cardId: string): RailSide {
  return railLayout.left.includes(cardId) ? 'left' : 'right';
}

/** 卡片在列内的序号（未找到 = 末尾）。 */
export function indexOf(cardId: string, side: RailSide): number {
  const index = railLayout[side].indexOf(cardId);
  return index === -1 ? railLayout[side].length : index;
}

/** 把某列的有序 id 列表按「可见卡片集合」过滤（门控不满足的卡片不渲染）。 */
export function cardsFor(side: RailSide, visible: (id: string) => boolean): string[] {
  return railLayout[side].filter(visible);
}

/** 把卡片从两列中摘除（落位第一步；摘除后索引语义才与「插入前」一致）。 */
function detach(cardId: string): void {
  for (const target of ['left', 'right'] as const) {
    const at = railLayout[target].indexOf(cardId);
    if (at !== -1) railLayout[target].splice(at, 1);
  }
}

/**
 * 落位：把卡片插到 `afterId` **之后**（`null` = 插到列首）。
 *
 * 为什么按 id 而不是序号：列表里含有**门控不可见**的卡片（如未激活工作区
 * 时的文件浏览器卡），而拖动落点是按**可见卡片**算的——用可见序号直接
 * splice 会错位（实测：同列重排时被静默挪到不可见卡之间）。锚定到「某张
 * 可见卡之后」，两侧语义就对齐了；锚点卡消失（门控翻转）时退化为列尾。
 */
export function placeCardAfter(cardId: string, side: RailSide, afterId: string | null): void {
  detach(cardId);
  if (afterId === null) {
    railLayout[side].unshift(cardId);
    return;
  }
  const index = railLayout[side].indexOf(afterId);
  if (index === -1) railLayout[side].push(cardId);
  else railLayout[side].splice(index + 1, 0, cardId);
}

/** 按序号落位（仅用于内部/测试；可见性与存储列表一致时才可直接用）。 */
export function placeCard(cardId: string, side: RailSide, index: number): void {
  detach(cardId);
  const clamped = Math.max(0, Math.min(index, railLayout[side].length));
  railLayout[side].splice(clamped, 0, cardId);
}

/** 移到另一列（追加到列尾）——卡片头部按钮的快捷操作。 */
export function moveToOtherSide(cardId: string): RailSide {
  const target: RailSide = sideOf(cardId) === 'left' ? 'right' : 'left';
  placeCard(cardId, target, railLayout[target].length);
  return target;
}

/** 重置为默认布局（全部卡片回右侧）。 */
export function resetRailLayout(): void {
  const defaults = defaultLayout();
  railLayout.left = defaults.left;
  railLayout.right = defaults.right;
}
