//! 上下文快照的读取口径（单一来源）。
//!
//! `ContextSnapshot` 由 Core 回推，Panel 按 `(core, team, session)` 复合键存
//! （见 `state.ts` 的同名 case）。写入侧的 `core` 来自事件载荷，读取侧的
//! `core` 来自「会话归属 / 当前运行区域」——两者**不保证**同时有值：
//!
//! - 单上游直连时 Panel 后端不加壳，事件里没有 `core`（null）；
//! - 而卡片/面板的读取侧可能已经知道 upstream 名（`'core'`），或反之。
//!
//! 只按精确键取就会出现"Core 明明回了，界面永远『正在读取上下文』直到
//! 20s 超时"——这是本模块存在的唯一理由：精确优先，退化为**唯一**的
//! 同 (team, session) 命中，绝不跨会话猜。

import type { AppState, ContextSnapshotData } from './state';
import { sessionScopedKey } from './keys';

/** 该 (team, session) 在缓存里的全部键（诊断/退化查找共用）。 */
function keysOf(state: AppState, teamId: string | null, sessionId: string): string[] {
  const suffix = `${teamId ?? ''}\u0000${sessionId}`;
  return Object.keys(state.contexts).filter(
    (key) => key === suffix || key.endsWith(`\u0000${suffix}`),
  );
}

/**
 * 按 `(core, team, session)` 取上下文快照；`core` 不对称时退化为唯一命中。
 *
 * 退化只在**恰好一个**候选时生效：多个候选说明确实有多台 core 回过同一
 * (team, session)，此时必须由调用方给出确定的 core，宁可空着也不能串显。
 */
export function contextSnapshotFor(
  state: AppState,
  core: string | null | undefined,
  teamId: string | null | undefined,
  sessionId: string,
): ContextSnapshotData | null {
  const exact = state.contexts[sessionScopedKey(core, teamId, sessionId)];
  if (exact) return exact;
  if (!sessionId) return null;
  const candidates = keysOf(state, teamId ?? null, sessionId);
  if (candidates.length !== 1) return null;
  return state.contexts[candidates[0]!] ?? null;
}
