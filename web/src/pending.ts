//! 请求-响应跟踪：面板各视图「加载中」的三态判定（2026-09-30）。
//!
//! 背景：面板到 Core 是 fire-and-forget 命令模型（无请求 id）。命令发出后、
//! 响应到达前，界面上原来直接显示「（暂无…）」——与"确实为空"无法区分，
//! Core 慢时（重启中、QQ 网络查询）用户以为面板坏了。本模块提供统一的
//! 等待态跟踪：
//!
//! - **登记**：`connection.ts::sendPending(cmd, key)` 在发命令的同时登记
//!   「请求命令 → 等待的响应事件」（映射表见 `REQUEST_RESPONSES`）；
//! - **销账**：`store.ts::dispatch` 收到响应事件即销账（`resolvePendingEvent`）；
//! - **推进**：按时间阈值把阶段从 `idle` 推到 `pending → slow → timeout`：
//!   - 0–150ms：不显示任何加载态（快请求不闪）；
//!   - ≥150ms：`pending`——骨架 / 转圈；
//!   - ≥6s：`slow`——附「仍在加载…」提示（Core 可能重启中）；
//!   - ≥20s：`timeout`——错误态，调用方给重试（请求命令幂等，重发安全）。
//! - **防闪烁**：加载态一旦可见，保证至少 400ms 的最短可见时长（响应
//!   到达即准备内容，到点替换）——避免骨架闪一下。
//!
//! UI 契约（各模块交互文档同步）：`phase==='idle'` 的「（暂无…）」空态
//! **只在确认无数据时展示**；断连（最高优先态）由视图自行判断
//! `state.connected`，优先于本模块阶段。

import { computed, reactive, type ComputedRef } from 'vue';
import type { BackendCommand } from './protocol';

export type PendingPhase = 'idle' | 'pending' | 'slow' | 'timeout';

/** 可见阈值：请求在此时限内完成则不显示加载态（防闪烁）。 */
export const PENDING_VISIBLE_AFTER_MS = 150;
/** 加载态最短可见时长（自可见起算）。 */
export const PENDING_MIN_VISIBLE_MS = 400;
/** 慢阈值：超过则附「仍在加载…」提示。 */
export const PENDING_SLOW_AFTER_MS = 6_000;
/** 超时阈值：超过则进入错误态（调用方可重试）。 */
export const PENDING_TIMEOUT_AFTER_MS = 20_000;

/**
 * 「请求命令 → 响应事件」关联表（单一来源）。
 *
 * 只收录**一次性请求**：响应事件到达即视为该请求完成。刻意不收
 * `RequestTrunkTimeline`（聊天区用状态标志判定，见 ChatView）与
 * `RequestState`（多事件响应、数量不定）——它们的完成信号靠状态推导。
 */
export const REQUEST_RESPONSES: Record<string, string> = {
  RequestContext: 'ContextSnapshot',
  RequestSkillsList: 'SkillsList',
  RequestToolsList: 'ToolsList',
  RequestPluginsList: 'PluginsList',
  RequestTeamsList: 'TeamsList',
  RequestShellSessions: 'ShellSessionsList',
  RequestWorkspaceSessions: 'WorkspaceSessions',
  RequestWorkspaceFiles: 'WorkspaceFiles',
  RequestWorkspaceGitStatus: 'WorkspaceGitStatus',
  RequestQqFilterConfig: 'QqFilterConfig',
  RequestQqOwner: 'QqOwner',
  RequestQqLoginStatus: 'QqLoginStatus',
  RequestQqQrcode: 'QqQrcode',
  RequestGroupList: 'GroupList',
  RequestFriendList: 'FriendList',
  RequestSystemPrompt: 'SystemPrompt',
  TestApi: 'ApiTestResult',
  QueryApiBalance: 'ApiBalanceResult',
};

/** 响应事件 → 等待它的请求命令集（由关联表反向构建）。 */
const RESPONSE_TO_COMMANDS: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [command, event] of Object.entries(REQUEST_RESPONSES)) {
    (out[event] ??= []).push(command);
  }
  return out;
})();

interface PendingEntry {
  /** 登记的请求命令名（裸串变体或 `{ Variant: … }` 的首键）。 */
  command: string;
  visible: boolean;
  slow: boolean;
  timedOut: boolean;
  visibleAt: number;
  timers: number[];
}

const entries = reactive<Record<string, PendingEntry>>({});

/** 从命令对象提取变体名（裸串 `'RequestState'` 或 `{ SendMessage: … }`）。 */
export function commandName(command: BackendCommand | string): string {
  if (typeof command === 'string') return command;
  const keys = Object.keys(command);
  return keys[0] ?? '';
}

function clearTimers(entry: PendingEntry): void {
  for (const timer of entry.timers) window.clearTimeout(timer);
  entry.timers = [];
}

function drop(key: string): void {
  const entry = entries[key];
  if (entry) clearTimers(entry);
  delete entries[key];
}

/**
 * 登记一次请求（发送命令前调用；`connection.ts::sendPending` 已封装）。
 * 同一 key 重复登记即覆盖（重试/切换会话重拉的语义）。
 */
export function trackRequest(key: string, command: BackendCommand | string): void {
  drop(key);
  entries[key] = {
    command: commandName(command),
    visible: false,
    slow: false,
    timedOut: false,
    visibleAt: 0,
    timers: [],
  };
  // 定时器回调必须经 `entries[key]`（reactive 代理）改状态——闭包直改原始
  // 对象会绕过 Proxy，不触发依赖更新（computed 永不失效）。
  const advance = (mutate: (entry: PendingEntry) => void) => {
    const current = entries[key];
    if (current) mutate(current);
  };
  const entry = entries[key];
  entry.timers.push(
    window.setTimeout(
      () =>
        advance((e) => {
          e.visible = true;
          e.visibleAt = Date.now();
        }),
      PENDING_VISIBLE_AFTER_MS,
    ),
    window.setTimeout(() => advance((e) => (e.slow = true)), PENDING_SLOW_AFTER_MS),
    window.setTimeout(() => advance((e) => (e.timedOut = true)), PENDING_TIMEOUT_AFTER_MS),
  );
}

/** 销账（响应到达）：立即清未显示的；已显示则等到最短可见时长后清。 */
function finish(key: string): void {
  const entry = entries[key];
  if (!entry) return;
  clearTimers(entry);
  if (!entry.visible) {
    delete entries[key];
    return;
  }
  const rest = PENDING_MIN_VISIBLE_MS - (Date.now() - entry.visibleAt);
  if (rest <= 0) {
    delete entries[key];
    return;
  }
  entry.timers.push(
    window.setTimeout(() => {
      delete entries[key];
    }, rest),
  );
}

/**
 * dispatch 挂钩：事件到达时销掉等待该响应的事件（`store.ts::dispatch` 调用）。
 * 误销窗口：同一响应事件也被其他操作触发时（如 SaveTeam 后的 TeamsList），
 * 会把正在等待的登记一并销账——低频且无害（数据确实是最新的）。
 */
export function resolvePendingEvent(event: object): void {
  const name = Object.keys(event)[0];
  if (!name) return;
  const commands = RESPONSE_TO_COMMANDS[name];
  if (!commands) return;
  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    if (commands.includes(entry.command)) finish(key);
  }
}

/** 释放登记（组件卸载时调用；超时态 error 面板会保留到此时）。 */
export function releasePending(key: string): void {
  drop(key);
}

/** 视图侧读取阶段：`usePending('context')` 等；key 也可传 getter（动态 key，
 *  如 QQ 多实例 `() => `qq:filter:${activeName}``），切换时自动追踪新 key。 */
export function usePending(key: string | (() => string)): {
  phase: ComputedRef<PendingPhase>;
  loading: ComputedRef<boolean>;
  failed: ComputedRef<boolean>;
} {
  const keyOf = typeof key === 'function' ? key : () => key;
  const phase = computed<PendingPhase>(() => {
    const entry = entries[keyOf()];
    if (!entry) return 'idle';
    if (entry.timedOut) return 'timeout';
    if (entry.slow) return 'slow';
    if (entry.visible) return 'pending';
    return 'idle';
  });
  return {
    phase,
    loading: computed(() => phase.value === 'pending' || phase.value === 'slow'),
    failed: computed(() => phase.value === 'timeout'),
  };
}
