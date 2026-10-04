//! 刷新/重开的“零等待”首屏（2026-09 刷新加速）。
//!
//! 痛点：每次刷新页面都要等 WS 全量时间线（实测 1024 条上限打满，压缩前
//! 1.4MB / 瘦身后 ~0.6MB）+ 网络往返后才开始渲染，"panel 内容要很久
//! 才显示"。而内容其实和上次离开时几乎一样。
//!
//! 方案：把**服务器同步副本**（`state.teamTimelines`——每个 team 的
//! `{seq, msgs}`，与 Core 的条目级 seq 游标严格对应）按 team 缓存到
//! localStorage。
//! - 页面加载时 [`hydrateTrunkCache`] 立即还原（渲染不等网络）；
//! - 引导请求带 `since_seq = 缓存游标`（见 `connection.ts`），Core 只回
//!   缺口（`trunk.rs` 的缺口/超前检测保证窗口失效时自动回退全量）；
//! - 周期性 + 页面隐藏/离开时 [`installTrunkCacheAutosave`] 落盘。
//!
//! 一致性依据："缓存内容 ⊇ 所有 seq ≤ 缓存游标的条目"，因此
//! "缓存渲染 + since_seq 增量" 与 "全量重建" 等价；多标签页互相覆盖也
//! 不影响正确性（各自都只会请求自己游标之后的缺口）。
//!
//! 为什么用 `teamTimelines` 而不是 `state.trunk`：trunk 里还混有实时推送
//! （用户消息/回答/推理）的条目，它们带各自的服务器 seq 但 trunk 没有
//! 对应游标——落盘再增量会对同一批条目重复投递（重复行）。teamTimelines
//! 是纯服务器投影，内容与 seq 严格配对。
//!
//! 缓存里存的是**已转换的 DisplayMessage**，因此渲染层的升级（例如
//! 2026-09-28 子代理回报从"原始 JSON 用户气泡"改为紧凑行）对旧缓存不生效
//! ——[`hydrateTrunkCache`] 在还原时做一次**就格式升级补齐**（当前补齐
//! 项：`<subagent_event>` 用户消息 → subagent 行），避免"刷新后仍是旧样子"
//! 的困惑。新增渲染升级时在此追加补齐逻辑。

import { state } from './store';
import { nextKey, parseSubagentEvent } from './state_domains/timeline';
import { teamKey } from './keys';
import type { DisplayMessage } from './state';

const STORAGE_KEY = 'echo-panel-trunk-cache';
const VERSION = 1;
/** 持久化总预算（UTF-16 字符数）。localStorage 常见上限 5MB，留足其它键空间。 */
export const MAX_TOTAL_CHARS = 2_200_000;
/** 单个 team 的缓存上限，超出的快照不值得序列化/写盘成本。 */
export const MAX_SINGLE_CHARS = 1_800_000;
/** 自动落盘周期（仅页面可见时）。 */
const AUTOSAVE_INTERVAL_MS = 10_000;

interface CachedTeam {
  seq: number;
  msgs: DisplayMessage[];
}

interface CachePayload {
  v: number;
  teams: Record<string, CachedTeam>;
}

/** 最近一次写入的原文，避免无变化时空写（10s 一次的检查几乎零成本）。 */
let lastWritten = '';

/** 当前选中的人格复合键 `(core, team_id)`；与 `state.teamTimelines` 键一致。 */
function activeTeamKey(): string {
  try {
    const id = localStorage.getItem('echo-panel-active-team') ?? '';
    const core = localStorage.getItem('echo-panel-active-team-core');
    return teamKey(core, id);
  } catch {
    return '';
  }
}

/** 轻量形状校验：只认字段齐备的对象，脏数据直接丢弃（不冒险渲染）。 */
function isDisplayMessageLike(value: unknown): value is DisplayMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DisplayMessage>;
  return (
    typeof candidate.role === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.time === 'number'
  );
}

/**
 * 从 localStorage 还原时间线缓存（页面启动时调用一次）。
 * - 每个 team 的条目重新编号（`nextKey`，避免与本次页面新消息的 key 撞车）
 *   并强制 `animate: false`（历史回放不播入场动画）；
 * - 当前 team 的缓存同时立即可视（`state.trunk`）。
 */
export function hydrateTrunkCache(): void {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return; // 隐私模式等：无缓存可用，照常走网络。
  }
  if (!raw) return;
  let payload: CachePayload;
  try {
    payload = JSON.parse(raw) as CachePayload;
  } catch {
    return; // 旧版/损坏内容：忽略，全量加载兜底。
  }
  if (!payload || payload.v !== VERSION || !payload.teams) return;
  const active = activeTeamKey();
  for (const [key, entry] of Object.entries(payload.teams)) {
    if (!entry || typeof entry.seq !== 'number' || !Array.isArray(entry.msgs)) continue;
    const msgs: DisplayMessage[] = [];
    for (const message of entry.msgs) {
      if (!isDisplayMessageLike(message)) continue;
      const restored: DisplayMessage = { ...message, key: nextKey(), animate: false };
      // 就格式升级：旧缓存里的子代理回报是 role='user' + 原始钩子 JSON，
      // 补成 subagent 行（否则刷新后仍显示原始 JSON，直到缓存自然过期）。
      if (restored.role === 'user' && !restored.subagent) {
        const subagent = parseSubagentEvent(restored.content);
        if (subagent) {
          restored.role = 'subagent';
          restored.subagent = subagent;
          restored.content = subagent.task || restored.content;
        }
      }
      msgs.push(restored);
    }
    if (!msgs.length) continue;
    state.teamTimelines[key] = { seq: entry.seq, msgs };
    if (key === active) {
      // 与缓存解除数组别名（同全量分支的约定）：实时推送不污染缓存。
      state.trunk = msgs.map((message) => ({ ...message }));
      state.trunkTeamId = key;
    }
  }
}

/** 组装待写入的原文；预算内优先当前 team，其余按缓存体积装填。 */
export function serializeTrunkCache(): string | null {
  const active = activeTeamKey();
  const entries = Object.entries(state.teamTimelines).filter(
    ([, cache]) => cache && Array.isArray(cache.msgs) && cache.msgs.length > 0,
  );
  // 当前 team 优先（刷新后第一个看到的就是它），其余维持插入序。
  entries.sort(([a], [b]) => Number(b === active) - Number(a === active));
  const chunks: string[] = [];
  let budget = MAX_TOTAL_CHARS;
  for (const [key, cache] of entries) {
    const chunk = JSON.stringify({ seq: cache.seq, msgs: cache.msgs });
    if (chunk.length > MAX_SINGLE_CHARS || chunk.length > budget) continue;
    budget -= chunk.length;
    chunks.push(`${JSON.stringify(key)}:${chunk}`);
  }
  if (!chunks.length) return null;
  return `{"v":${VERSION},"teams":{${chunks.join(',')}}}`;
}

/** 立即落盘（有变化才写）。配额满/隐私模式下静默放弃——缓存只是加速。 */
export function saveTrunkCacheNow(): void {
  const payload = serializeTrunkCache();
  if (payload === null || payload === lastWritten) return;
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    lastWritten = payload;
  } catch {
    // 配额满等：放弃本次写入，不影响功能。
  }
}

/**
 * 安装自动落盘：10s 周期（仅可见时）+ 页面隐藏 / `pagehide` 时兜底。
 * 返回卸载函数（测试/热更新用）。
 */
export function installTrunkCacheAutosave(): () => void {
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') saveTrunkCacheNow();
  }, AUTOSAVE_INTERVAL_MS);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') saveTrunkCacheNow();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', saveTrunkCacheNow);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', saveTrunkCacheNow);
  };
}

/** 测试辅助：清掉"最近写入"记忆（模块级状态，跨用例隔离）。 */
export function resetTrunkCacheStateForTests(): void {
  lastWritten = '';
}
