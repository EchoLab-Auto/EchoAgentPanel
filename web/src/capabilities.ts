//! 当前 agent 能力推导（前端只读，与后端 persona 名单语义一致）。
//! 后端权威：enabled_* 非空 = 仅列出的可用（空白名单 = 全部可用）；工具/技能
//! 另有 disabled_tools/disabled_skills 黑名单细化。插件维度自 2026-09-11 起
//! 只有白名单（黑名单已移除）：包维度插件（tools.builtin/skills.dir/adapter.qq/
//! workspace/management.panel）不在白名单即其注册表整体不可见。这里复刻同一
//! 语义供 UI 入口显隐。
//! 2026-09：选单（menu）与任务清单（checklist）先后降级为普通工具——插件维度
//! 移除，开关在工具级白/黑名单（`已不再出现在「启用插件」勾选区`）。

import type { TeamInfo } from './protocol';
import type { AppState } from './state';

/**
 * 包维度门控插件 id（单一来源）——「启用插件」勾选区除 adapter/management/
 * interaction 类之外的补充成员。
 *
 * 其中多数（tools.builtin / skills.dir / workspace）的 kind 是 `tool`，
 * 但它们是**整类能力开关**（禁用 = 其包内全部工具/技能对 LLM 不可见），
 * 因此必须出现在智能体配置弹层（⚙ 配置）与设置视图智能体编辑器的
 * 「启用插件」勾选区里；adapter.qq 由 kind 判定即已覆盖，列在此处是为了与
 * Core 的 `GATED_PLUGIN_IDS` 保持逐项镜像（对齐测试守护）。选单
 * （present_menu）与任务清单（checklist）已降级为普通工具，不再有插件
 * 维度，其开关在工具白/黑名单里进行。
 *
 * 维护规则（对应 Core 端 `echo-agent/src/plugins.rs::GATED_PLUGIN_IDS`）：
 * **新增包维度门控插件时，同步：
 *   1. Core `GATED_PLUGIN_IDS` / `BUILTIN_PLUGIN_IDS`；
 *   2. `scripts/update.sh` 插件校验清单；
 *   3. 本常量（Panel 两处勾选区共用）。**
 * **新增插件 type（Core `PluginKind`）时，同步：
 *   1. 本文件 `PLUGIN_KIND_LABELS`（中文显示名；
 *      测试覆盖 Core 全部 wire 名）；
 *   2. 若新类型属于「整类能力开关」（adapter/management/interaction 同层），
 *      加入 `isPluginCheckboxVisible` 的 kind 类判定。**
 * 回归测试见 `src/__tests__/capabilities.test.ts`。
 */
export const PACKAGE_GATED_PLUGIN_IDS = [
  'echo-agent.tools.builtin',
  'echo-agent.skills.dir',
  'echo-agent.workspace',
  'echo-agent.adapter.qq',
  'echo-agent.subagent',
] as const;

/** 包维度门控插件的中文显示名（工具/技能按包分组时的可读名）。 */
export const PACKAGE_DISPLAY_NAMES: Record<string, string> = {
  'echo-agent.adapter.qq': 'QQ 适配器包',
  'echo-agent.orchestration': '编排工具包',
  'echo-agent.tools.builtin': '内置工具集',
  'echo-agent.skills.dir': '技能目录',
  'echo-agent.workspace': '工作区会话',
  'echo-agent.subagent': 'Subagent 委派',
};

/**
 * 插件是否属于「启用插件」勾选区（kind 类 + 包维度门控清单）。
 *
 * kind 类 = adapter / management / interaction——这三类的存在方式就是
 * 「整类能力开关」（适配器进程、管理通道、人在环交互通道），按 kind
 * 即应出现在勾选区；其余 kind 需要显式列入包维度门控清单。
 */
export function isPluginCheckboxVisible(plugin: {
  id: string;
  kind: string;
}): boolean {
  if (
    plugin.kind === 'adapter' ||
    plugin.kind === 'management' ||
    plugin.kind === 'interaction'
  ) {
    return true;
  }
  return (PACKAGE_GATED_PLUGIN_IDS as readonly string[]).includes(plugin.id);
}

/** 插件 kind 的中文显示名（设置视图插件列表 / 勾选区标签共用，单一来源）。 */
export const PLUGIN_KIND_LABELS: Record<string, string> = {
  skill: '技能',
  tool: '工具',
  provider: 'LLM Provider',
  loop: 'Turn Runner',
  adapter: '适配器',
  orchestration: '编排',
  management: '管理面',
  interaction: '交互',
};
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
