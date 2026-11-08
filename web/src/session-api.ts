//! **当前会话真正生效的** API profile（单一解析口径）。
//!
//! 解析顺序与 Core 完全一致（会话级覆盖 → persona 引用 → 全局激活 → 顶层默认）：
//!
//!   ① 会话级覆盖 `state.sessionApiOverrides[sessionId]`
//!      （工作区对话自己的 `api_profile`，Core 侧 `set_session_provider`）
//!   ② 目标 agent 的 `[agent.teams.*].api_profile`
//!      （Core `apply_named_profile`：把该 profile 的 provider/model **合入**
//!      这个 persona 自己的顶层字段，只影响该 agent 的会话）
//!   ③ 全局 `active_api`（`[agent].active_api`，`apply_active_profile`）
//!   ④ 都没有 → 顶层默认配置（`[agent].provider` / `[agent].model`）
//!
//! ## 为什么必须只有一处实现
//!
//! 这个解析曾经在徽标里漏了第 ② 层（2026-10 用户报障）：切到 `api_profile`
//! 与全局 `active_api` 不同的 agent 时，**入口行卡片写着 `deepseek-flash`、
//! 徽标却仍显示 `kimi / k3.1-pro`**——同一个界面对"这条回答用哪个 API"给了
//! 两个互相矛盾的答案。现在状态行与侧栏卡片共用本模块，不可能再打架。

import type { AppState } from './state';
import type { BackendCommand } from './protocol';

/** 生效的 profile 与其来源层级。 */
export interface EffectiveSessionApi {
  /** profile 名（空 = 没有任何 profile 生效，走顶层默认配置）。 */
  name: string;
  /** 来源说明（"本会话覆盖" / "agent「X」" / "全局激活" / "顶层默认配置"）。 */
  scope: string;
  /** 展示文本 `provider / model`（取不到时为空串）。 */
  label: string;
}

/**
 * 解析某会话实际生效的 API。
 *
 * `teamId` 必须由调用方显式给出：它是"这条会话属于哪个 persona"的事实来源。
 * 缺省（null）时才退回 `state.activeTeamId` / 首个 agent——那只是给"还没解析
 * 出归属"的早期渲染兜底，不应作为常规路径。
 */
export function effectiveSessionApi(
  state: AppState,
  sessionId: string | null | undefined,
  teamId: string | null | undefined,
): EffectiveSessionApi {
  const api = state.api;
  const resolvedTeamId = teamId ?? state.activeTeamId ?? state.teams[0]?.id ?? null;
  const team =
    state.teams.find(
      (item) => item.id === resolvedTeamId && (item.core ?? null) === (state.activeRegion ?? null),
    ) ??
    state.teams.find((item) => item.id === resolvedTeamId) ??
    null;

  const resolve = (): { name: string; scope: string } => {
    const override = sessionId ? (state.sessionApiOverrides[sessionId] ?? '') : '';
    if (override) return { name: override, scope: '本会话覆盖' };
    const persona = team?.api_profile ?? '';
    if (persona) return { name: persona, scope: `agent「${team?.name || team?.id || ''}」` };
    const global = api?.active_api ?? '';
    if (global) return { name: global, scope: '全局激活' };
    return { name: '', scope: '顶层默认配置' };
  };

  const { name, scope } = resolve();
  if (!api) return { name, scope, label: '' };
  const profile = name ? api.profiles?.find((item) => item.name === name) : undefined;
  const provider = profile?.provider || api.provider || '';
  const model = profile?.model || api.model || '';
  const label = !provider && !model ? '' : !provider ? model : !model ? provider : `${provider} / ${model}`;
  return { name, scope, label };
}

/**
 * profile 引用是否悬空（被删/改名）。
 *
 * Core 的 `apply_named_profile` 会保留顶层值，所以徽标会回落——但必须能说明
 * 白，否则用户会以为徽标在骗人。
 */
export function profileMissing(state: AppState, name: string): boolean {
  return !!name && !!state.api && !state.api.profiles?.some((item) => item.name === name);
}

/** 会话级覆盖是否有持久化载体（Core 侧同判据：只有工作区通道）。 */
export function sessionApiPersistent(sessionId: string): boolean {
  return sessionId.startsWith('local:workspace:');
}

// ── 非工作区会话的覆盖：Panel 侧记住，重连后重放 ───────────────────────────
//
// ## 为什么必须由 Panel 记
//
// Core 只给**工作区通道**持久化会话级覆盖（`persist_session_api_profile`：
// 解析不出 `local:workspace:` 就直接返回，把覆盖留在 `session_providers`
// 内存表里）。于是本地 TUI / QQ / shell 这些通道：
//
// - 页面刷新后，Panel 没有任何事件能读到 Core 内存里的那份覆盖
//   （`WorkspaceSessions` 只描述工作区对话；`ApiConfigUpdated` 只有
//   persona / 全局层级）→ 徽标回落成 persona 值，而 Core 仍在按覆盖路由。
//   界面与实际路由打架，这正是 2026-11 用户报"刷新后不保留"的现场。
// - Core 重启后内存表清空，覆盖真的没了（这一半是设计边界，不装成 bug）。
//
// ## 折中口径（本模块的行为契约）
//
// Panel 把这类覆盖记在 localStorage，**连上 Core 时重放一次**（`SetSessionApi`
// 对任意会话都合法）。于是：刷新页面 → 仍是用户选的那个（且与 Core 路由一致）；
// Core 重启 → 重放把覆盖重新装回去；只有在 Core 重启后**没有任何 Panel 连上来**
// 时才回到 persona 配置。界面上如实写出这个边界（触发器 title + 浮层脚注）。

/** localStorage 键：`{ "<core>|<team>": { "<sessionId>": "<profile>" } }`。 */
const CACHE_KEY = 'echo-panel:session-api-overrides';

/** 缓存结构（core 为空串 = 未解析出区域时的兜底槽）。 */
export type SessionApiCache = Record<string, Record<string, string>>;

/** 缓存槽键：覆盖必须按 (core, team) 分开——同名会话 id 在每个 core 上都有。 */
function cacheSlot(core: string | null, teamId: string | null): string {
  return `${core ?? ''}|${teamId ?? ''}`;
}

/** 读缓存（坏数据一律当空——这是可丢弃的便捷状态，不该影响启动）。 */
export function readSessionApiCache(): SessionApiCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: SessionApiCache = {};
    for (const [slot, claims] of Object.entries(parsed as Record<string, unknown>)) {
      if (!claims || typeof claims !== 'object') continue;
      const clean: Record<string, string> = {};
      for (const [sessionId, profile] of Object.entries(claims as Record<string, unknown>)) {
        if (typeof profile === 'string' && profile) clean[sessionId] = profile;
      }
      if (Object.keys(clean).length) out[slot] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

function writeSessionApiCache(cache: SessionApiCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 隐私模式/配额满：记不住就算了，本次运行仍然生效（不抛给用户）。
  }
}

/**
 * 记住（或遗忘）某个会话的覆盖。
 *
 * **只对非工作区通道调用**：工作区对话的覆盖由 Core 写进对话 JSON，Panel 再
 * 记一份就成了第二个事实源——用户在别处清除时这里会把它"复活"。
 */
export function rememberSessionApiOverride(
  core: string | null,
  teamId: string | null,
  sessionId: string,
  profile: string | null,
): void {
  if (!sessionId || sessionApiPersistent(sessionId)) return;
  const cache = readSessionApiCache();
  const slot = cacheSlot(core, teamId);
  const claims = cache[slot] ?? {};
  if (profile) claims[sessionId] = profile;
  else delete claims[sessionId];
  if (Object.keys(claims).length) cache[slot] = claims;
  else delete cache[slot];
  writeSessionApiCache(cache);
}

/** 某个 (core, team) 记住的覆盖（拷贝；调用方随便改）。 */
export function cachedSessionApiOverrides(
  core: string | null,
  teamId: string | null,
): Record<string, string> {
  return { ...(readSessionApiCache()[cacheSlot(core, teamId)] ?? {}) };
}

/** 已经重放过的槽（同一 (core, team) 只重放一次，免得重连风暴里反复发命令）。 */
const replayed = new Set<string>();

/**
 * 连上 Core 后把缓存的覆盖重放一遍。
 *
 * 三件事按序做：
 * 1. 先把缓存值**填进** `state.sessionApiOverrides`——徽标立刻显示用户选的值，
 *    不用等 Core 回推（Core 回推的是 persona 快照，会把徽标改回去）；
 * 2. 逐条发 `SetSessionApi`（Core 侧重建该会话的 provider）；
 * 3. 供应商池里已经不存在、或已改名的 profile 直接丢弃缓存条目——否则每次
 *    连接都会弹一条"profile 不存在"的提示，而用户根本没做操作。
 *
 * 调用时机由宿主决定（[`App.vue`] 在 region + team + 供应商池都就绪时调）：
 * 依赖任何一项缺失都会误判 profile 悬空。
 */
export function replaySessionApiOverrides(
  state: AppState,
  core: string | null,
  teamId: string | null,
  send: (command: BackendCommand) => void,
): number {
  if (!teamId) return 0;
  const slot = cacheSlot(core, teamId);
  if (replayed.has(slot)) return 0;
  const claims = cachedSessionApiOverrides(core, teamId);
  const known = new Set((state.api?.profiles ?? []).map((p) => p.name));
  replayed.add(slot);
  let sent = 0;
  for (const [sessionId, profile] of Object.entries(claims)) {
    if (!known.has(profile)) {
      rememberSessionApiOverride(core, teamId, sessionId, null);
      continue;
    }
    state.sessionApiOverrides[sessionId] = profile;
    send({ SetSessionApi: { team_id: teamId, session_id: sessionId, profile } });
    sent += 1;
  }
  return sent;
}

/** 测试用：清掉"已重放"标记（相当于重新打开一次页面）。 */
export function resetReplayGuard(): void {
  replayed.clear();
}
