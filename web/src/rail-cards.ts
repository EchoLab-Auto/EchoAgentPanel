//! 边栏卡片注册表（单一真源）：卡片定义 + 门控。
//!
//! 为什么独立成模块：**两处需要同一份事实**——
//! - `PanelSidebar`（渲染）：本列有哪些卡片、标题/计数是什么；
//! - `ChatView`（布局）：某列是否有可见卡片（决定列显隐与消息区留白）。
//!
//! 门控只决定「是否可见」，不决定「放哪一列」——归属与顺序在
//! `rail-layout.ts`（用户拖动结果，持久化）。

import { state } from './store';
import { loopModeOf } from './protocol';
import { teamPluginEnabled, teamToolAvailable } from './capabilities';
import { railLayout, type RailSide } from './rail-layout';
import type { RailCardDef } from './components/RailStack.vue';

/** 当前激活人格（用于卡片门控与计数）。 */
function currentTeam(teamId: string | null) {
  const id = teamId ?? state.teams[0]?.id ?? null;
  return state.teams.find((t) => t.id === id) ?? null;
}

/**
 * 文件浏览器卡的激活工作区会话。
 * 门控：workspace 插件与工具均可用、列表归属当前 agent、且存在激活会话。
 */
export function workspaceCardFor(teamId: string | null) {
  const team = currentTeam(teamId);
  const ok = teamPluginEnabled(team, 'echo-agent.workspace') && teamToolAvailable(team, 'workspace');
  const synced = state.workspaceTeamId === (teamId ?? state.teams[0]?.id ?? null);
  if (!ok || !synced || !state.workspaceActive) return null;
  return state.workspaceSessions.find((s) => s.id === state.workspaceActive) ?? null;
}

/** 临时分支卡可见性：仅并行多会话模式（单会话模式 Core 不发 ReplyBranch*）。 */
export function branchCardVisible(teamId: string | null): boolean {
  return loopModeOf(currentTeam(teamId)) === 'parallel';
}

/** 当前 agent 的 Shell 会话数（与 Shell 视图的口径一致）。 */
export function shellSessionCount(teamId: string | null): number {
  const scope = teamId ?? state.teams[0]?.id ?? null;
  return state.shellSessions.filter(
    (s) => s.team_id === undefined || s.team_id === null || s.team_id === scope,
  ).length;
}

/**
 * 指定列（+ agent 作用域）实际渲染的卡片定义，按用户排序。
 *
 * 注意 `files` / `shell` / `branches` 依赖 `teamId`（门控与计数），
 * 因此这里以参数传入而不是模块级缓存——同一视图内左右两列使用同一 teamId。
 */
export function railCardsFor(side: RailSide, teamId: string | null): RailCardDef[] {
  const workspace = workspaceCardFor(teamId);
  const defs: Record<string, RailCardDef | null> = {
    status: { id: 'status', title: '连接状态', compact: true },
    files: workspace
      ? { id: 'files', title: `文件浏览器 · ${workspace.name}` }
      : null,
    shell: {
      id: 'shell',
      title: 'Shell',
      count: shellSessionCount(teamId),
      countTitle: '当前 agent 的会话数',
    },
    branches: branchCardVisible(teamId)
      ? {
          id: 'branches',
          title: '临时分支',
          count: Object.keys(state.branchTabs).length,
          countTitle: '运行中的分支数',
        }
      : null,
  };
  return railLayout[side]
    .map((id) => defs[id])
    .filter((card): card is RailCardDef => !!card);
}

/**
 * 某列是否**登记**过卡片（桌面两列的显隐与消息区留白的唯一判据，2026-10）。
 *
 * 与 [`railHasVisibleCards`]（「当前可见」）的区别是本函数的全部意义：门控
 * 依赖异步到达的 Core 状态（workspace 激活态 / loopMode / teams 列表 / 插件
 * 能力），切 agent、工作区会话结束、断连重连的瞬时窗口都会让门控短暂失败。
 * 此前列显隐用「可见卡片数」——左列一旦只放了条件性卡片（文件浏览器 /
 * 临时分支），这些瞬时失败会让**整列**消失再重现，观感就是用户反馈的
 * 「左侧栏莫名隐藏」（正文行宽跟着在 324px 与 0 之间闪）。
 *
 * 登记列表（`railLayout[side]`）只在用户拖动落位时变化，是稳定信号：
 * 列的存在性不再随业务状态闪烁，卡片进出改为列内部增删（空列由 RailStack
 * 渲染占位提示）。登记为空 = 用户从未往这列放过卡片，或把最后一张卡拖走了
 * ——列该消失（显式意图，不算闪烁）。
 */
export function railRegistered(side: RailSide): boolean {
  return railLayout[side].length > 0;
}

/**
 * 某列是否有**可见**卡片（门控 × 用户排序）。
 *
 * 桌面两列的显隐**不再**用它（见 [`railRegistered`]）；目前只有移动端
 * 「卡片」抽屉用它——抽屉里没有「列占位」概念，门控不满足的列整块不渲染，
 * 空态由抽屉自己的「（当前无可见卡片）」承担。
 */
export function railHasVisibleCards(side: RailSide, teamId: string | null): boolean {
  return railCardsFor(side, teamId).length > 0;
}
