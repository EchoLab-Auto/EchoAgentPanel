//! 会话类命令的 `team_id` 守卫（2026-11）。
//!
//! ## 为什么需要它
//!
//! 去主智能体之后 Core 没有"默认人格"：17 条会话命令缺 `team_id` 一律被拒
//! （`agent-module-loop/src/agent/commands.rs` 的 `requires_explicit_team`）。
//! 而面板的 `activeTeamId` 是**异步解析**的——它来自 `sessionStorage` /
//! `localStorage`，拿不到就等 `TeamsList` 到达后由 `App.vue` 的 watcher 补。
//! 这中间有一个真实窗口：换个标签页、换端口/域名（storage 是 per-origin 的）、
//! 清过站点数据、隐私模式、或者刚装完还没建人格——`activeTeamId` 全是 null。
//!
//! 窗口里挂载的组件照样发命令（上下文卡片 `onMounted`、工作区面板挂载即拉
//! 列表、时间线兜底、会话级 API 选择……），于是每发一条就弹一次
//! 「该命令必须指定 team_id」。用户看到的是"一直显示这个错"，而根本原因是
//! **命令发早了**，不是配置缺失。
//!
//! ## 做法
//!
//! 命中"会话类且此刻没有 team"的命令**不入网**，进本模块的暂存队列；等
//! `activeTeamId` 解析出来（且确实存在于 `state.teams`）再按序重放，
//! 重放时把 `team_id` 改写成解析结果。
//!
//! 为什么不是"等到有 team 再让组件自己重试"：组件不知道自己要等什么，各自
//! 加重试只会把同一个窗口放大成 N 份重复请求。收在一处（`sendCommand` 的
//! 唯一入口）才能覆盖全部发送方——**包括扩展仓里的 panel-ui**（工作区面板
//! 住在 `agent-module-workspace`，壳里 grep 不到它的发送点）。
//!
//! 宽限期到点仍未解析 → 丢弃队列并让调用方给一条可操作的提示（"还没选智能体"）。
//! 静默丢是不可接受的：视图会永远停在加载态，而用户不知道为什么。

import type { BackendCommand } from './protocol';

/**
 * 必须显式带 `team_id` 的会话命令（Core `requires_explicit_team` 的镜像）。
 *
 * 两边的清单必须一致——Core 那边加了新命令而这里没跟上，症状就退回"发一次
 * 弹一次错"。`RequestSessionHistory` / `Shell*` 虽然也按 team 路由，但 Core
 * 不强制，所以不在这里：把它们也拦住会误伤"零人格也能用的进程级能力"。
 */
export const SESSION_TEAM_COMMANDS: ReadonlySet<string> = new Set([
  'SendMessage',
  'CancelRequestedWork',
  'RequestTrunkTimeline',
  'RequestTimelineEarlier',
  'RequestContext',
  'ClearHistory',
  'ArchiveHistory',
  'CompactHistory',
  'RequestWorkspaceSessions',
  'SaveWorkspaceSession',
  'DeleteWorkspaceSession',
  'ActivateWorkspaceSession',
  'RequestWorkspaceGitStatus',
  'FetchWorkspaceGit',
  'RequestWorkspaceFiles',
  'SetSessionApi',
  'ClearSessionApi',
]);

/** 命令的变体名（裸串或 `{ Variant: … }` 的首键）。 */
export function variantOf(command: BackendCommand): string {
  if (typeof command === 'string') return command;
  return Object.keys(command as unknown as Record<string, unknown>)[0] ?? '';
}

/** 命令载荷（裸串命令没有载荷）。 */
function payloadOf(command: BackendCommand): Record<string, unknown> | null {
  if (typeof command === 'string') return null;
  const body = (command as unknown as Record<string, unknown>)[variantOf(command)];
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
}

/**
 * 该命令是否属于会话类**且**此刻缺 `team_id`（缺 = 交给 [`hold`] 暂存）。
 *
 * 只认 `null` / `undefined` / 空串：`team_id` 存在但指向一个已删人格是另一
 * 回事（Core 会回「智能体 X 不存在」），在 Core 有自己更准确的说法之前不该
 * 被这里静默吞掉。
 */
export function requiresTeam(command: BackendCommand): boolean {
  if (!SESSION_TEAM_COMMANDS.has(variantOf(command))) return false;
  const body = payloadOf(command);
  if (!body || !('team_id' in body)) return false;
  const teamId = body.team_id;
  return teamId == null || teamId === '';
}

/** 暂存上限：正常只有挂载期那一小波（个位数），上限纯属防御。 */
export const HELD_LIMIT = 64;

const held: BackendCommand[] = [];

/** 暂存一条命令（返回 false = 队列已满，调用方按拒发处理）。 */
export function hold(command: BackendCommand): boolean {
  if (held.length >= HELD_LIMIT) return false;
  held.push(command);
  return true;
}

/** 当前暂存条数（测试与会话诊断用）。 */
export function heldCount(): number {
  return held.length;
}

/**
 * 取出暂存命令并**改写** `team_id` 为 `teamId`（调用方按序重发）。
 *
 * 改写是必要的：命令是挂载期构造的，`team_id` 在那一刻就已经是 `null`；
 * 原样重发等于再撞一次同一条拒绝。
 */
export function takeHeldForTeam(teamId: string): BackendCommand[] {
  const queued = held.splice(0, held.length);
  for (const command of queued) {
    const body = payloadOf(command);
    if (body && 'team_id' in body) body.team_id = teamId;
  }
  return queued;
}

/** 丢弃暂存（宽限期到点仍未解析 → 一句话说明，不静默留着）。 */
export function dropHeld(): void {
  held.length = 0;
}

/** 测试用：清空队列。 */
export function resetHeld(): void {
  held.length = 0;
}
