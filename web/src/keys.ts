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
 * team_id 为 null（无归属）时退化为 `(core, session_id)`。 */
export function checklistKey(
  core: string | null | undefined,
  teamId: string | null | undefined,
  sessionId: string,
): string {
  return teamId ? scopedKey(core, `${teamId}\u0000${sessionId}`) : sessionKey(core, sessionId);
}

/**
 * 会话运行态 / 上下文快照 / 压缩进度的复合键 `(core, team, session)`。
 *
 * 与 [`checklistKey`] 同一口径（2026-10 作用域普查）：同一个 core 内多个人格
 * 都可能有 `local:tui::local_user` 这个会话 id，只按 `(core, session)` 存会让
 * A 人格的运行态/快照/进度覆盖 B 人格的——切人格后看到别人的"正在思考"、
 * 别人的 tokens、别人的压缩进度。
 *
 * `team` 缺失（旧 Core / 无人格归属的广播）时退化成两维，读侧按同样的顺序回退。
 */
export function sessionScopedKey(
  core: string | null | undefined,
  teamId: string | null | undefined,
  sessionId: string,
): string {
  return checklistKey(core, teamId, sessionId);
}

/** 人格复合键 `(core, team_id)`（null team_id → 空 id）。 */
export function teamKey(core: string | null | undefined, teamId: string | null | undefined): string {
  return scopedKey(core, teamId ?? '');
}

/**
 * 压缩前归档的复合键 `(core, team, archive)`（2026-11）。
 *
 * 同一会话可能有多份归档（每次压缩一份），而且归档是**人格级文件**
 * （`echo-sessions-<team>-…json`）——键里必须同时带上这三个维度，
 * 否则 A 会话的归档回放会顶掉 B 的。
 */
export function archiveKey(
  core: string | null | undefined,
  teamId: string | null | undefined,
  archive: string,
): string {
  return scopedKey(core, `${teamId ?? ''}\u0000${archive}`);
}
