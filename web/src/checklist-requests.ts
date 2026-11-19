//! 清单补拉的**发送侧**（何时向 Core 要权威快照）。
//!
//! ## 触发点（ChatView 里统一接线）
//!
//! | 场景 | 动作 |
//! |---|---|
//! | 页面刷新 / WS 重连 | Core 对 `RequestState` 的响应里自带 `ChecklistsSnapshot`（bootstrap 能力探测）；本模块在能力确认后补发一次定向请求 |
//! | 切换会话 / 切换人格 / 切换运行区域 | 单会话 `RequestChecklists{session_id}` → `ChecklistUpdated` |
//! | 打开清单面板（global 视图） | 当前 core 下**全部运行人格**的 full 快照 |
//!
//! ## 为什么必须"能力确认后才发"
//!
//! 旧 Core 不认识 `RequestChecklists`，收到会回命令错误。未确认能力就按 UI
//! 事件反复重试，等于每次开面板/切会话都刷一遍错误提示——既没用又像故障。
//! 能力探测**只靠 bootstrap 的 `RequestState`**（新 Core 会为全部运行人格
//! 补发 `ChecklistsSnapshot`，空 states 也发），收到首个 snapshot / 带版本
//! 状态才把该 core 标为可用。
//!
//! 旧 Core 的降级是**显式**的：不发请求、面板标"未同步"，绝不把旧式状态
//! 伪装成权威同步结果。

import { state } from './store';
import { sendCommand } from './connection';
import { checklistCoreAuthoritative } from './state_domains/checklists';
import type { BackendCommand, TeamInfo } from './protocol';

/** 目标人格（精确 `(core, id)`；只在运行中才可查）。
 *
 * Core 的 `RequestChecklists` 对不存在的人格**回命令错误**，且绝不回落到
 * 默认人格（见 Core `commands.rs`）。非运行人格本来就没有 store，问了也只会
 * 得到错误——这里直接不发。
 */
function runningTeam(teamId: string, core: string | null): TeamInfo | null {
  return (
    state.teams.find(
      (team) =>
        team.id === teamId && (core == null || (team.core ?? null) === core) && team.running,
    ) ?? null
  );
}

/** 是否能安全地向目标 core 发 `RequestChecklists`：
 * 能力已确认（不是旧 Core）+ 目标人格运行中 + 已连接。 */
export function canRequestChecklistSnapshot(
  teamId: string | null,
  core: string | null = state.activeRegion,
): boolean {
  if (!teamId) return false;
  if (!state.connected) return false;
  if (!checklistCoreAuthoritative(state, core)) return false;
  return runningTeam(teamId, core) != null;
}

/**
 * 请求某人格的权威清单。
 *
 * - `sessionId` 缺省 → 整人格 full（`ChecklistsSnapshot`，空 states 也权威）；
 * - `sessionId` 指定 → 单会话（`ChecklistUpdated`）。
 *
 * 返回是否真的发出（被能力/运行态/连接状态拒绝时 false，调用方无需处理——
 * 不弹错，这是正常的降级路径）。
 */
export function requestChecklistSnapshot(
  teamId: string | null,
  options?: { sessionId?: string | null; core?: string | null },
): boolean {
  if (!teamId) return false;
  const core = options?.core ?? state.activeRegion;
  if (!canRequestChecklistSnapshot(teamId, core)) return false;
  const sessionId = options?.sessionId ?? null;
  // full 与单会话都只带 team_id/session_id：版本在响应里（ChecklistsSnapshot
  // 自带 epoch/revision），Panel 不需要在请求侧记任何"采集时刻"。
  const command: BackendCommand = {
    RequestChecklists: { team_id: teamId, session_id: sessionId },
  };
  return sendCommand(command, core ?? undefined);
}

/**
 * 当前视图的清单补拉。
 *
 * - 会话视图：只拉该会话（便宜，响应小）；
 * - global 聚合：当前 core 下**全部运行人格**的 full（聚合视图跨人格）。
 *
 * 旧 Core / 未确认能力时整体 no-op（不伪装同步，也不刷错误命令）。
 */
export function refreshChecklists(options: {
  teamId: string | null;
  sessionId: string | null;
  core?: string | null;
}): void {
  const core = options.core ?? state.activeRegion;
  if (options.sessionId) {
    requestChecklistSnapshot(options.teamId, { sessionId: options.sessionId, core });
    return;
  }
  if (!checklistCoreAuthoritative(state, core)) return;
  const teams = state.teams.filter(
    (team) => team.running && (core == null || (team.core ?? null) === core),
  );
  // 防御性上限：异常配置（几十个人格同时运行）下也不该在打开面板时刷屏。
  for (const team of teams.slice(0, 16)) {
    requestChecklistSnapshot(team.id, { core });
  }
}
