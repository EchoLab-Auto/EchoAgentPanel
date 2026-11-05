//! 当前 agent 能力推导（前端只读，与后端 persona 名单语义一致）。
//! 后端权威：enabled_* 非空 = 仅列出的可用（空白名单 = 全部可用）；工具/技能
//! 另有 disabled_tools/disabled_skills 黑名单细化。模块维度自 2026-09-11 起
//! 只有白名单（黑名单已移除）：包维度模块（tools.builtin/skills.dir/
//! workspace/management.panel）不在白名单即其注册表整体不可见。这里复刻同一
//! 语义供 UI 入口显隐。
//! 2026-09：任务清单（checklist）降级为普通工具——模块维度移除，开关在
//! 工具级白/黑名单（`已不再出现在「启用模块」勾选区`）。

import type { TeamInfo } from './protocol';
import { activeTeam, type AppState } from './state';

/**
 * 包维度门控模块 id（单一来源）——「启用模块」勾选区中除 kind 类
 * （instance / management / interaction）之外的补充成员。
 *
 * 这些模块的 kind 多为 `tool`，但它们是**整类能力开关**（禁用 = 其包内全部
 * 工具/技能对 LLM 不可见），因此必须出现在智能体配置弹层（⚙ 配置）与设置
 * 视图智能体编辑器的「启用模块」勾选区里。
 *
 * **实例不在本清单内**——与 Core 一致，按 kind 运行期推导：
 * Core `gated_module_ids()` 遍历模块注册表，`kind == "instance"` 即纳入，
 * 因此框架里没有任何平台名；本文件的对应实现就是 `isModuleCheckboxVisible`
 * 的 kind 判定。这样新增平台（`echo-agent.instance.<platform>`）两侧都自动
 * 生效、无需改清单（2026-10 实例解耦后 QQ 已从两侧清单移除，本清单与 Core
 * `GATED_MODULE_IDS` 的 5 项逐项镜像 + session/transcript 两项**待 Core 侧接线**）。任务清单（checklist）已降级为普通
 * 工具，不再有模块维度，其开关在工具白/黑名单里进行。
 *
 * 维护规则（对应 Core 端 `echo-agent/src/modules.rs::GATED_MODULE_IDS`）：
 * **新增包维度门控模块时，同步：
 *   1. Core `GATED_MODULE_IDS` / `BUILTIN_MODULE_IDS`；
 *   2. `scripts/update.sh` 模块校验清单；
 *   3. 本常量（Panel 两处勾选区共用）。**
 * **新增模块 type（Core `ModuleKind`）时，同步：
 *   1. 本文件 `MODULE_KIND_LABELS`（中文显示名；
 *      测试覆盖 Core 全部 wire 名）；
 *   2. 若新类型属于「整类能力开关」（instance/management/interaction 同层），
 *      加入 `isModuleCheckboxVisible` 的 kind 类判定。**
 * 回归测试见 `src/__tests__/capabilities.test.ts`。
 */
/**
 * **已删除**：这里曾有一份 `PACKAGE_GATED_MODULE_IDS` 模块清单（最多长到 18 项），
 * 用来决定「哪些模块出现在启用勾选区」。
 *
 * 它删掉的原因是它**必然漂移**：Core 侧 `GATED_MODULE_IDS` 与本清单是同一件事
 * 的两份手写真相，跨仓库改一处忘另一处就出错。实测错过两轮——
 *
 * - `echo-agent.shell` 从 `tools.builtin` 拆出后 Core 补了、这里没补
 *   → 面板上**没有 shell 开关**，用户无法通过 UI 给任何 persona 启用 `bash-*`；
 * - `session` / `transcript` 这里加了、Core 没加
 *   → 两个**勾了不生效**的假开关。
 *
 * 现在判据只有一处：Core 按 manifest 的 `kind` 算作用域（
 * `echo_agent::modules::scope::KIND_SCOPE`），随 `ModuleInfo.gating` 下发。
 * Panel 只读不算——新增模块不可能再造成跨仓漂移。
 */

/**
 * 包/模块的中文显示名（工具·技能按包分组、模块勾选区、模块列表共用）。
 *
 * 只影响**显示**，不参与可见性判定——因此这里可以出现具体平台名
 * （`instance.qq` 是 QQ 模块自己声明的工具包 id，见
 * `AdapterToolSpec.package`），框架逻辑本身不枚举平台。
 */
export const PACKAGE_DISPLAY_NAMES: Record<string, string> = {
  'echo-agent.instance.qq': 'QQ 实例包',
  // 旧 id（2026-10 去适配器化前）。保留是为了「新 Panel + 旧 Core」以及
  // 尚未迁移 `package:` 的 SKILL.md 仍显示可读名；新 id 优先。
  'echo-agent.adapter.qq': 'QQ 实例包',
  'echo-agent.orchestration': '编排工具包',
  'echo-agent.tools.builtin': '内置工具集',
  'echo-agent.skills.dir': '技能目录',
  'echo-agent.workspace': '工作区会话',
  'echo-agent.subagent': 'Subagent 委派',
  'echo-agent.session': '会话',
  'echo-agent.transcript': '显示层',
  'echo-agent.shell': 'Shell 会话',
  'echo-agent.panel.web': '内嵌 Web Panel',
};

/**
 * 实例类模块的 kind 取值（新 `instance` + 旧 `adapter` 双认）。
 *
 * 2026-10 去适配器化把 wire 名改成 `instance`；旧 Core 仍发 `adapter`。
 * 前端同时接受两者，避免「升级 Panel 就看不到平台通道」或反之。
 */
export const INSTANCE_MODULE_KINDS = ['instance', 'adapter'] as const;

/** 该 kind 是否属于「实例类」（平台通道）模块。 */
export function isInstanceModuleKind(kind: string): boolean {
  return (INSTANCE_MODULE_KINDS as readonly string[]).includes(kind);
}

/**
 * 勾选区里一个模块的三态。
 *
 * - `enabled`：可勾可取消。勾选写 `enabled_modules` 白名单，取消即真的关掉
 *   该包的工具/技能/实例（= Core 判定 `gating === 'persona'`）；
 * - `readonly`：**显示但不可改**。进程级能力（管理面 WS、显示/交互面）对
 *   每个人格都始终生效，把它藏起来会让用户以为"这模块不存在"——所以显示成
 *   勾住且置灰，并注明"进程级"；
 * - `hidden`：完全不显示（循环模式由分段控件管理、provider 由 API 设置管理
 *   ——它们的开关在别处）。
 */
export type ModuleCheckboxState = 'enabled' | 'readonly' | 'hidden';

/**
 * 「进程级但值得显示」的 kind：管理面与交互面。
 *
 * 判据是**能力类别**（用户心智里"这个人格有没有管理/交互能力"），不是
 * "能不能关"——它们关不掉，但看得见。
 */
const READONLY_MODULE_KINDS = ['management', 'panel', 'interaction'] as const;

/**
 * 模块在勾选区里的三态。**只读 Core 的判定**（`ModuleInfo.gating`）。
 *
 * 不自己按 id/kind 猜：跨仓库各写一份判据必然漂移——见上面那段
 * `PACKAGE_GATED_MODULE_IDS` 的墓志铭。
 *
 * 旧 Core 不带 `gating` 字段时退回 2026-11 之前的 kind 类判定（且一律可勾）：
 * 宁可多显示一个可能无效的开关，也不要让老 Core 的模块在 UI 里凭空消失。
 */
export function moduleCheckboxState(module: {
  id: string;
  kind: string;
  gating?: string;
}): ModuleCheckboxState {
  if (module.gating === 'persona') return 'enabled';
  if (module.gating === 'process') {
    return (READONLY_MODULE_KINDS as readonly string[]).includes(module.kind)
      ? 'readonly'
      : 'hidden';
  }
  // ── 旧 Core 兼容（无 gating 字段）──
  if (
    isInstanceModuleKind(module.kind) ||
    module.kind === 'management' ||
    module.kind === 'interaction' ||
    module.kind === 'panel'
  ) {
    return 'enabled';
  }
  return 'hidden';
}

/** 模块是否出现在勾选区（含只读项）。 */
export function isModuleCheckboxVisible(module: {
  id: string;
  kind: string;
  gating?: string;
}): boolean {
  return moduleCheckboxState(module) !== 'hidden';
}

/** 模块 kind 的中文显示名（设置视图模块列表 / 勾选区标签共用，单一来源）。 */
export const MODULE_KIND_LABELS: Record<string, string> = {
  skill: '技能',
  tool: '工具',
  provider: 'LLM Provider',
  loop: '循环驱动',
  instance: '平台实例',
  /** 旧 wire 名（2026-10 去适配器化前的 `adapter`）。 */
  adapter: '平台实例',
  orchestration: '编排',
  session: '会话',
  management: '管理面',
  panel: '内嵌 Panel',
  interaction: '交互',
  /** Core↔Core 对等链路（2026-11 之前就漏了这个标签——`modules.md` 早就
   *  提醒过「新增 kind 时要记得同步它」，实测漏了两轮）。 */
  federation: '联邦',
  /** 安全能力（脱敏）：人格关不掉的进程级不变量。 */
  security: '安全',
  /** 运行地基（2026-11 取消「中间层 / 模块」二分）：词汇 / 线契约 /
   *  注册表 / 事件日志 / 配置存储 / 循环驱动。**不可禁用**——Core 侧写
   *  `enabled = false` 会让启动失败并点名。 */
  kernel: '运行地基',
};
/** 工具是否被包级模块禁用（内置工具集关闭时全部工具不可用） */
function toolPackageDisabled(team: TeamInfo | null | undefined): boolean {
  if (!team) return false;
  if (team.enabled_modules && team.enabled_modules.length > 0) {
    return !team.enabled_modules.includes('echo-agent.tools.builtin');
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

/** 某模块对当前 agent 是否启用（空白名单 = 全部启用；模块黑名单已移除） */
export function teamModuleEnabled(team: TeamInfo | null | undefined, moduleId: string): boolean {
  if (!team) return true;
  if (team.enabled_modules && team.enabled_modules.length > 0) {
    return team.enabled_modules.includes(moduleId);
  }
  return true;
}

/** 当前 agent 的 team（去主智能体：无 id 时回退列表首个；(core, id) 精确匹配）。 */
export function currentTeam(state: AppState): TeamInfo | null | undefined {
  return activeTeam(state);
}
