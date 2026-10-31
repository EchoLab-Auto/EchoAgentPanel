//! 压缩 / 归档进度的**展示口径**（2026-10）。
//!
//! Core 在 `CompactHistory` / `ArchiveHistory` 执行期间持续推 `CompactionProgress`
//! （`preview → archive → summarize → apply → done`），reducer 按 `(core, team)`
//! 归档到 `state.compactions`。本模块只回答两个问题，供**多处**共用：
//!
//! 1. 某条记录此刻该不该展示、该以什么状态展示（`visibleCompaction`）；
//! 2. 全局有哪些操作正在跑（`activeCompactions`）。
//!
//! ## 为什么要抽出来
//!
//! 同一个判定此前内联在 `ContextView.vue` 里。加顶栏全局指示器时若再抄一份，
//! 两处的过期阈值一旦漂移就会出现「顶栏说在跑、面板说已失败」——用户没法判断
//! 哪个是真的。判定只能有一个来源。

import type { AppState, CompactionRun } from './state';
import { isCompactionTerminal } from './protocol';

/** 终态文案的保留时长（够读两行，又不至于一直占着面板）。 */
export const COMPACTION_RESULT_VISIBLE_MS = 12_000;
/**
 * 多久没有新进度就认为"这条进度已经不可信"。
 *
 * 单组 LLM 摘要最长约 2–3 分钟（`summarize` 是最慢的阶段），5 分钟留足余量。
 * 超时后**不能**让进度条继续转——用户会以为还在跑，实际事件早停了。
 */
export const COMPACTION_STALE_MS = 5 * 60_000;

/** 一条压缩记录在某个时刻的展示态。 */
export interface CompactionView {
  run: CompactionRun;
  /** 是否正在进行（据此刻禁用动作按钮）。 */
  running: boolean;
  /** 进度百分比（`total === 0` 的长度不确定阶段为 0，调用方画不确定条）。 */
  pct: number;
}

/**
 * 把一条原始记录解析成"此刻该展示什么"，不该展示时返回 `null`。
 *
 * 三种"不展示"的情形：
 * - 终态且已超过 `COMPACTION_RESULT_VISIBLE_MS`（结果读完了）；
 * - 进行中但已超过 `COMPACTION_STALE_MS` 没有更新 → **转成 `failed`** 而不是
 *   返回 `null`：静默消失会让用户以为"压缩成功但没提示"，明确报一句
 *   "进度已停止更新（连接可能中断）"更接近事实。
 */
export function visibleCompaction(
  run: CompactionRun | null | undefined,
  now: number,
): CompactionView | null {
  if (!run) return null;
  const age = now - run.at;

  if (isCompactionTerminal(run.phase)) {
    if (age > COMPACTION_RESULT_VISIBLE_MS) return null;
    return { run, running: false, pct: pctOf(run) };
  }

  if (age > COMPACTION_STALE_MS) {
    const stale: CompactionRun = {
      ...run,
      phase: 'failed',
      message: '压缩进度已停止更新（连接可能中断）——请刷新后确认结果',
    };
    return { run: stale, running: false, pct: pctOf(stale) };
  }

  return { run, running: true, pct: pctOf(run) };
}

function pctOf(run: CompactionRun): number {
  if (!run.total) return 0;
  return Math.min(100, Math.round((run.done / run.total) * 100));
}

/** `state.compactions` 的键 → `(core, team)`（与 `keys.ts::teamKey` 互逆）。 */
export function parseCompactionKey(key: string): { core: string | null; teamId: string } {
  const i = key.indexOf('\u0000');
  // core 名来自 `[[cores]].name`，按约定不含 `\u0000`（见 keys.ts），首个分隔符可靠。
  if (i < 0) return { core: null, teamId: key };
  return { core: key.slice(0, i), teamId: key.slice(i + 1) };
}

/** 一条进行中的操作（顶栏指示器用）。 */
export interface ActiveCompaction {
  key: string;
  core: string | null;
  teamId: string;
  view: CompactionView;
}

/**
 * 全局**正在进行**的压缩/归档（跨 agent、跨 core）。
 *
 * 只返回 `running` 的：终态在顶栏没有价值（面板里已经显示过结果，且 12s 后自动
 * 收掉）——顶栏常驻一排"已完成"会变成噪音。
 *
 * 排序按 `at` 升序（先开始的在前），保证多任务时顺序稳定、不随对象键序抖动。
 */
export function activeCompactions(state: AppState, now: number): ActiveCompaction[] {
  const out: ActiveCompaction[] = [];
  for (const [key, run] of Object.entries(state.compactions)) {
    const view = visibleCompaction(run, now);
    if (!view?.running) continue;
    // 会话级操作只对**本窗口正在看的会话**亮灯（2026-10 作用域普查）：
    // 压缩/归档是会话级的，别的窗口在压缩会话 B 与本窗口无关，画在顶栏就是
    // "我这格也在压缩"的假象。`sessionId` 缺失（旧 Core/人格级操作）照常显示。
    if (run.sessionId && state.windowSessionId && run.sessionId !== state.windowSessionId) {
      continue;
    }
    const parsed = parseCompactionKey(key);
    // `teamId` 字段由 reducer 显式写入；旧记录没有时退回键解析（键里曾是
    // team id，现在放 session id——仅用于兜底显示，不影响过滤）。
    const teamId = run.teamId ?? parsed.teamId;
    out.push({ key, core: parsed.core, teamId, view });
  }
  return out.sort((a, b) => a.view.run.at - b.view.run.at);
}

/** 阶段名（人话）。面板与顶栏共用，避免两处措辞不一致。 */
export const COMPACTION_PHASE_LABEL: Record<string, string> = {
  preview: '准备',
  archive: '归档快照',
  summarize: '生成摘要',
  apply: '写入历史',
  done: '完成',
  failed: '失败',
};

/** 阶段徽标文案（未知阶段原样回显，不吞掉新 Core 的新阶段）。 */
export function compactionPhaseLabel(phase: string): string {
  return COMPACTION_PHASE_LABEL[phase] ?? phase;
}

/** 计数文案：`3/7 组`；长度不确定时为会话数或空。 */
export function compactionCountText(run: CompactionRun): string {
  if (run.total > 0) return `${run.done}/${run.total} 组`;
  if (run.sessions > 0) return `共 ${run.sessions} 组`;
  return '';
}
