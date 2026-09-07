//! 当前 agent 能力推导（前端只读，与后端 persona 白/黑名单语义一致）。
//! 后端权威：enabled_* 非空=仅列出的可用；disabled_* 黑名单优先；
//! 包维度插件（tools.builtin/skills.dir/adapter.qq/management.panel）禁用
//! 即其注册表整体不可见。这里复刻同一语义供 UI 入口显隐。

import type { TeamInfo } from './protocol';
import type { AppState } from './state';
/** 工具是否被包级插件禁用（内置工具集关闭时全部工具不可用） */
function toolPackageDisabled(team: TeamInfo | null | undefined): boolean {
  if (!team) return false;
  if (team.disabled_plugins?.includes('echo-agent.tools.builtin')) return true;
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

/** 某插件对当前 agent 是否启用（黑名单优先；空白名单=全部启用） */
export function teamPluginEnabled(team: TeamInfo | null | undefined, pluginId: string): boolean {
  if (!team) return true;
  if (team.disabled_plugins?.includes(pluginId)) return false;
  if (team.enabled_plugins && team.enabled_plugins.length > 0) {
    return team.enabled_plugins.includes(pluginId);
  }
  return true;
}

/** 当前 agent 的 team（null = 默认/主 agent） */
export function currentTeam(state: AppState): TeamInfo | null | undefined {
  const id = state.activeTeamId;
  if (!id) return state.teams.find((t) => t.is_default) ?? state.teams[0] ?? null;
  return state.teams.find((t) => t.id === id) ?? null;
}
