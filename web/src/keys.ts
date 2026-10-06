//! 多上游复合键（2026-10 Phase 0）。
//!
//! 会话 id（如 `local:tui::local_user`）与人格 id（如 `default`）在每个 core
//! 上可以完全相同——线上身份是 `(core, id)`。本模块提供统一的复合键：
//! **core 为空（单上游/未标注）时退化为裸 id**，保证单 core 行为与既有磁盘
//! 缓存零变化；多 core 时为 `<core>\u0000<id>`。
//!
//! 取值范围约定：core 名来自中继信封（`[[cores]]` 的 name），不含 `\u0000`；
//! 因此 `\u0000` 可安全作为分隔符。

/** core 为空的复合键（= 裸 id）。 */
export function scopedKey(core: string | null | undefined, id: string): string {
  return core ? `${core}\u0000${id}` : id;
}

/** 会话复合键 `(core, session_id)`。 */
export function sessionKey(core: string | null | undefined, sessionId: string): string {
  return scopedKey(core, sessionId);
}

/** 清单复合键 `(core, team_id, session_id)`（2026-10）：同一 core 内多
 * persona 的同名会话（各自的 `local:tui::local_user`）的清单不互相覆盖。
 * team_id 为 null（旧 core 未标注）时退化为 `(core, session_id)`。 */
export function checklistKey(
  core: string | null | undefined,
  teamId: string | null | undefined,
  sessionId: string,
): string {
  return teamId ? scopedKey(core, `${teamId}\u0000${sessionId}`) : sessionKey(core, sessionId);
}

/** 人格复合键 `(core, team_id)`（null team_id → 空 id）。 */
export function teamKey(core: string | null | undefined, teamId: string | null | undefined): string {
  return scopedKey(core, teamId ?? '');
}
