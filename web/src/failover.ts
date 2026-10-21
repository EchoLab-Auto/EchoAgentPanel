//! 主节点失效转移（P3，2026-11）：**换节点、换会话**，不是会话迁移。
//!
//! ## 为什么叫「failover」而不是「容错」
//!
//! 按联邦设计原则（**大脑集中**），会话的 LLM 上下文与 trunk 只存在于**所属**
//! 节点。主节点 A 挂掉 ⇒ A 上的会话**不可访问**，浏览器不可能"接着聊"——任何
//! 让 UI 看起来"对话没断"的实现都必须复制 trunk，那与设计冲突。
//!
//! 所以这里做的是**视图切换**：
//!
//! 1. 检测到 primary（`activeRegion`）连续离线（≥ `FAILURE_THRESHOLD` 轮）；
//! 2. 挑一个在线候选（调度器口径，排除 A）；
//! 3. **bootstrap 到 B**：`RequestTeamsList` / `RequestAgentsList` / 时间线 / 联邦状态；
//! 4. `activeRegion := B`；A 上的会话明确**标注不可达**（保留但不显示为可聊）；
//! 5. A 恢复时**不自动切回**——只提示（与"地址漂移一键修复"同一条取向：人工
//!    确认，避免抖）。
//!
//! ## 两条安全/稳定性约束（代码强制）
//!
//! - **只对用户视角持续失效（连续 ≥ 阈值）才切**：一次 WS 抖动（中继重连
//!   几秒内就会恢复）绝不动 activeRegion；
//! - **没有选定主节点时不介入**：`activeRegion == null`（单上游/未选定）不
//!   切——那种情况 Panel 本来就在等中继把"唯一的上游"连回来。

import { state } from './store';
import { coreForTeam, currentRegion, pushToast, resetManagementState } from './state';
import { requestTimeline, sendCommand } from './connection';
import { teamKey } from './keys';
import { scheduleNode } from './scheduler';
import type { UpstreamStatus } from './state';

/** 连续离线判定阈值（轮询 8s 一次；约 24s 判定——比"WS 断一下"长得多）。 */
export const FAILURE_THRESHOLD = 3;

/** 各上游连续离线计数（任一在线帧即清零；见 `evaluateFailover`）。 */
const consecutiveFailures = new Map<string, number>();

/** 是否正在切换（`evaluateFailover` 重入守卫；UI 也可据此显示「正在切…」）。 */
let switchingTo: string | null = null;
/** 已提示过的恢复目标（避免同一轮恢复刷 N 条 toast）。 */
const recoverNotified = new Set<string>();
/** failover 开关（`localStorage` 持久化；默认开）。 */
const ENABLE_KEY = 'echo-failover-enable';

/** 测试注入：清空全部运行期状态。 */
export function resetFailoverState(): void {
  consecutiveFailures.clear();
  switchingTo = null;
  recoverNotified.clear();
  if (typeof window !== 'undefined') window.localStorage.removeItem(ENABLE_KEY);
}

export function failoverSwitchingTo(): string | null {
  return switchingTo;
}

/** 是否启用自动转移（UI 设置可关；默认 true）。 */
export function failoverEnabled(): boolean {
  // Vue 的响应式依赖：读写都走响应式 state（设置页改动立即生效）。
  // localStorage 只是持久化（刷新后恢复）。
  return state.failoverEnabled;
}

export function setFailoverEnabled(enabled: boolean): void {
  state.failoverEnabled = enabled;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ENABLE_KEY, enabled ? '1' : '0');
}

/** 从 localStorage 恢复开关（`store` 初始值调用一次）。 */
export function loadFailoverEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(ENABLE_KEY) !== '0';
}

export function primaryFailedTimes(primary: string): number {
  return consecutiveFailures.get(primary) ?? 0;
}

/**
 * 每次上游轮询后调用（`refreshUpstreams` 的唯一调点）。
 *
 * 语义：**pure 判定 + 显式动作**——只在对 primary 连续 ≥ 阈值且存在在线候选
 * 时才触发一次 `promote`；不做任何隐式后台计时器（测试可逐帧驱动）。
 */
export function evaluateFailover(list: UpstreamStatus[]): void {
  // 记账（切换与否都要记——恢复提示也靠"曾经失联"这个记号）。
  for (const u of list) {
    if (u.connectivity === 'online') {
      // 在线即"曾经失联"的记号为"已恢复"：若它之前确实失败过，提示一次。
      const had = consecutiveFailures.delete(u.name);
      if (had != null) maybeNotifyRecover(u.name);
    } else {
      consecutiveFailures.set(u.name, (consecutiveFailures.get(u.name) ?? 0) + 1);
    }
  }

  if (!failoverEnabled()) return;
  const primary = currentRegion(state);
  if (primary == null || switchingTo != null) return;
  if (primaryFailedTimes(primary) < FAILURE_THRESHOLD) return;
  const candidate = pickCandidate(primary);
  if (candidate == null) return; // 没有在线节点可去：留在原地等恢复
  promote(primary, candidate);
}

/** 挑候选：调度器口径（least_busy），显式排除刚失联的 primary。 */
export function pickCandidate(failed: string): string | null {
  const online = state.upstreams
    .filter(u => u.connectivity === 'online')
    .map(u => u.name);
  if (!online.length) return null;
  const suggested = scheduleNode();
  // 调度器返回 null（建议本机=不切）或恰好是失败节点本身时，退确定性
  // 兜底：第一个在线且非失败节点（稳定，便于测试）。
  if (suggested == null || suggested === failed) {
    return online.find(name => name !== failed) ?? null;
  }
  return suggested;
}

/** 会话是否属于失联节点（不可用但仍展示；UI 用它打标）。 */
export function sessionUnreachable(activeRegion: string | null, sessionCore: string | null | undefined): boolean {
  return activeRegion != null && sessionCore != null && sessionCore !== activeRegion;
}

/**
 * 切换到候选节点（一次完整的 bootstrap 引导）。
 *
 * 顺序刻意如此：
 * 1. 先把目标记为"切换中"（`evaluateFailover` 重入守卫）；
 * 2. **先把 `activeRegion` 指向 B**——这样后续所有按区域路由的命令/查询都
 *    落到 B；清空单值管理面（同一切区域语义）；
 * 3. 发 bootstrap 命令（**显式定向** B，多上游必须带 core）；
 * 4. 切当前 agent：若 B 上有**同名**人格则换到它（跨 core 同名人很常见——
 *    Panel 的调度语义是"同名即同一逻辑人格"），否则切到 B 上的第一个 agent；
 * 5. 提示用户：**A 上的会话不可达**（语义必须说清，见模块头注释）。
 */
export function promote(failed: string, candidate: string): void {
  switchingTo = candidate;
  try {
    // ① 区域切换：命令路由立即指向 B。
    resetManagementState(state);
    state.activeRegion = candidate;

    // ② Bootstrap：只拉"面板工作必需"的那几份（时间线按当前 agent 再定向，
    //    见 ③；目录由 upstreams 巡检继续周期拉，不在这里抢）。
    sendCommand('RequestState', candidate);
    sendCommand('RequestSystemPrompt', candidate);
    sendCommand('RequestInstanceStatus', candidate);
    sendCommand('RequestPluginsList', candidate);
    sendCommand({ RequestShellSessions: {} }, candidate);
    sendCommand('RequestFederationStatus', candidate);
    sendCommand('RequestTeamsList', candidate);

    // ③ 当前 agent：若 B 上**存在同名**人格则保留当前 agent id（跨 core 同名
    //    很常见——同名 = 同一逻辑人格）；否则切到 B 上的第一个 agent。
    //    注意：identity 是 (core, id)，这里只换归属不换名字，所以 activeTeamId
    //    的**值不变**，路由由 activeRegion 决定。
    const id = state.activeTeamId;
    const sameName = id != null ? coreForTeam(state, id, candidate) : undefined;
    const owner =
      sameName != null
        ? id
        : state.teams.find(t => (t.core ?? null) === candidate)?.id ?? null;
    state.activeTeamId = owner;
    // 时间线按新归属定向补拉（缓存有游标走增量，没有走首屏窗口）。
    requestTimeline(owner, state.teamTimelines[teamKey(candidate, owner)]?.seq ?? 0, candidate);

    // ④ 提示（**明确语义**：旧会话不可达，不是丢了）。
    pushToast(
      state,
      `主节点 ${failed} 失联 → 已切到 ${candidate}；${failed} 上的会话暂不可达（它恢复后仍在）`,
      'error',
    );
  } finally {
    switchingTo = null;
  }
}

/**
 * 恢复提示（手动切回；不自动）。
 *
 * 只提示一次："A 回来了，可以切回去"。用户自己用运行区域切换器切——
 * **不做** `activeRegion` 的自动回写（与地址漂移一键修复同取向：人工确认，
 * 避免网络抖动在两台之间来回横跳）。
 */
export function maybeNotifyRecover(recovered: string): void {
  if (recoverNotified.has(recovered)) return;
  if (currentRegion(state) === recovered) return;
  recoverNotified.add(recovered);
  pushToast(
    state,
    `${recovered} 已恢复在线——如需切回它，请在「运行区域」选择器手动切换（不自动切回，避免抖动）`,
    'info',
  );
}
