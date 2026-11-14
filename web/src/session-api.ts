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

// ── 非工作区会话的覆盖：Core 持久化，Panel 只读 ────────────────────────────
//
// ## 历史：这里曾经有一套 localStorage 缓存 + 重连重放
//
// 曾经的缺口是真的：Core 只给**工作区通道**持久化会话级覆盖
// （`persist_session_api_profile` 解析不出 `local:workspace:` 就直接返回，把
// 覆盖留在 `session_providers` 内存表里）。于是本地 TUI / QQ / shell 这些通道：
//
// - 页面刷新后没有任何事件能读到 Core 内存里的那份覆盖 → 徽标回落成 persona 值，
//   而 Core 仍在按覆盖路由。界面与实际路由打架。
// - Core 重启后内存表清空，覆盖真的没了。
//
// Panel 当时的补偿是"自己记一份、连上时重放"。它解决了第一个缺口，但引入了
// 第二份真相：两个浏览器同时开，A 设 deepseek、B 拿旧缓存回放 kimi，谁也没错，
// 而 Core 的路由只可能是其中一个——而且 B 的这次重放会**覆盖** A 的选择。
//
// ## 现在
//
// Core 持久化**全部通道**的覆盖（`session_api_store`，旁路文件
// `echo-session-api-{persona}.json`）并随 `SessionApiOverrides` 事件下发，
// 与路由依据同源。Panel 删掉了缓存与重放，只消费事件：
//
// - `state.sessionApiOverrides` 由 `SessionApiOverrides` 事件整体替换；
// - 选择器只发命令，不再写本地存储。
//
// 这样"界面显示的"与"Core 实际路由的"是同一个值的两种呈现。
