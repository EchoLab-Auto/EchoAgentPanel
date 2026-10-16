//! 适配器状态视图（03b §2.2 / S1）：状态文案 + 状态点语义的共享计算。
//!
//! 侧栏 ConnectionStatusCard 与通用 AdapterPanel 对同一个 `AdapterStatus`
//! 需要一致的「运行/连接」呈现（已停止 / 已连接 / 等待连接）。抽成纯函数
//! 单一来源，避免两处各写一份 if 链漂移；纯函数也便于单测。

import type { AdapterStatus } from '../protocol';

/** 状态点语义：connected（绿）/ running 未连（呼吸）/ stopped（灰）。 */
export type AdapterDotStatus = 'offline' | 'online' | 'connecting';

/** 单个适配器的状态行视图。 */
export interface AdapterStatusView {
  /** 状态文案：已停止 / 已连接 / 等待连接。 */
  stateText: string;
  /** 状态点语义（NeumorphismStatusDot 的 status）。 */
  dot: AdapterDotStatus;
}

/**
 * 由 `AdapterStatus` 推导状态行文案与状态点（纯函数）。
 *
 * 判定优先级：未运行 → 已停止（灰）；运行且连接 → 已连接（绿）；
 * 运行未连接 → 等待连接（呼吸）——与迁移前 ConnectionStatusCard.vue
 * 的计算逐字一致。
 */
export function adapterStatusView(a: AdapterStatus): AdapterStatusView {
  if (!a.running) return { stateText: '已停止', dot: 'offline' };
  if (a.connected) return { stateText: '已连接', dot: 'online' };
  return { stateText: '等待连接', dot: 'connecting' };
}
