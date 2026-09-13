//! 当前 agent 能力推导（前端只读，与后端 persona 名单语义一致）。
//! 后端权威：enabled_* 非空 = 仅列出的可用（空白名单 = 全部可用）；工具/技能
//! 另有 disabled_tools/disabled_skills 黑名单细化。插件维度自 2026-09-11 起
//! 只有白名单（黑名单已移除）：包维度插件（tools.builtin/skills.dir/adapter.qq/
//! management.panel）不在白名单即其注册表整体不可见。这里复刻同一语义供 UI
//! 入口显隐。

import type { TeamInfo } from './protocol';
import type { AppState } from './state';
/** 工具是否被包级插件禁用（内置工具集关闭时全部工具不可用） */
function toolPackageDisabled(team: TeamInfo | null | undefined): boolean {
  if (!team) return false;
  if (team.enabled_plugins && team.enabled_plugins.length > 0) {
    return !team.enabled_plugins.includes('echo-agent.tools.builtin');
  }
  return false;
}

/** 某工具对当前 agent 是否可见/可用 */
export function teamToolAvailable(team: TeamInfo | null | undefined, toolName: string): boolean {
  if (toolPackageDisabled(team)) return false;
  if (!team) return true;
  if (team.disabled_tools?.includes(toolName)) return false;
  if (team.enabled_tools && team.enabled_tools.length > 0) {
    return team.enabled_tools.includes(toolName);
  }
  return true;
}

/** 某插件对当前 agent 是否启用（空白名单 = 全部启用；插件黑名单已移除） */
export function teamPluginEnabled(team: TeamInfo | null | undefined, pluginId: string): boolean {
  if (!team) return true;
  if (team.enabled_plugins && team.enabled_plugins.length > 0) {
    return team.enabled_plugins.includes(pluginId);
  }
  return true;
}

/** 当前 agent 的 team（去主智能体：无 id 时回退列表首个）。 */
export function currentTeam(state: AppState): TeamInfo | null | undefined {
  const id = state.activeTeamId;
  if (!id) return state.teams[0] ?? null;
  return state.teams.find((t) => t.id === id) ?? null;
}
