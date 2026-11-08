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
