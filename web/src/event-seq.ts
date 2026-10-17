//! 事件流连续性校验（2026-10）——「序号跳号 = 中间有帧没到」的判定。
//!
//! ## 背景
//!
//! Core 给每条下发到 Panel 的事件分配一个**进程内单调递增**的序号，作为
//! 顶层字段附在事件帧上（`{"type":"event","payload":{…},"seq":N}`，见
//! `echo-protocol/src/bridge.rs::serialize_event_sequenced`，以及 Core 侧
//! `management::EventBroker`）。
//!
//! 在加这个校验之前，事件一旦静默丢失（中继半死、连接重建窗口、标签页
//! 后台节流……），前端**无从得知**：某条 `ToolResult` 丢了，工具行就永远
//! 停在「运行中」一直读秒，只能刷新页面才好。回合收尾兜底
//! （`settleRunningTools`）只能救"一直读秒"这个表现，救不回真正丢掉的
//! 内容（工具输出、回答片段、会话列表更新……）。
//!
//! ## 职责边界
//!
//! 本模块只做**观察与判定**，不发命令、不碰 store——便于单测：
//!
//! - `contiguous`：序号连续（正常）；
//! - `baseline`：本连接/本 core 的首帧，建立基线（中途订阅的 Panel 从当前
//!   进度起收，不能当成跳号）；
//! - `gap`：跳号，`missed` = 缺了几条 → 调用方按游标补拉 timeline；
//! - `reset`：序号回退（Core 重启归 1、中继补发旧帧）→ 重取基线，不报警；
//! - `ignored`：帧上没有序号（旧版 Core）→ 跳过校验，保持向后兼容。
//!
//! ## 为什么按 core 分桶
//!
//! 多上游（联邦）下每个 Core 有各自的计数器；混在一起会把"两个 core 交替
//! 发帧"误判成持续跳号。单上游时帧无信封、`core` 为 null，落 `''` 桶。

export interface SeqObservation {
  kind: 'baseline' | 'contiguous' | 'gap' | 'reset' | 'ignored';
  /** gap 时缺了几条（其他情况为 0）。 */
  missed: number;
  /** 观察后的最新序号（ignored 时为已知基线，可能为 null）。 */
  last: number | null;
}

/** core 名 → 已见的最大序号。 */
const lastByCore = new Map<string, number>();
let gapCount = 0;
let missedTotal = 0;

const keyOf = (core: string | null): string => core ?? '';

/**
 * 观察一条事件的序号，返回连续性判定。
 *
 * 纯状态机：同一 `(core, seq)` 序列重复观察是幂等的（重复帧走 `reset`）。
 */
export function observeEventSeq(core: string | null, seq: number | null | undefined): SeqObservation {
  const key = keyOf(core);
  const known = lastByCore.get(key) ?? null;
  if (typeof seq !== 'number' || !Number.isFinite(seq) || seq <= 0) {
    return { kind: 'ignored', missed: 0, last: known };
  }
  if (known === null) {
    lastByCore.set(key, seq);
    return { kind: 'baseline', missed: 0, last: seq };
  }
  if (seq === known + 1) {
    lastByCore.set(key, seq);
    return { kind: 'contiguous', missed: 0, last: seq };
  }
  if (seq <= known) {
    // 回退：Core 重启（序号归 1）或中继补发了更旧的帧。重取基线不报警——
    // 重连路径本身就会按游标补拉，重复报警只会刷屏。
    lastByCore.set(key, seq);
    return { kind: 'reset', missed: 0, last: seq };
  }
  const missed = seq - known - 1;
  lastByCore.set(key, seq);
  gapCount += 1;
  missedTotal += missed;
  return { kind: 'gap', missed, last: seq };
}

/** 清空全部基线（重连时调用：新连接的第一帧重新建立基线）。 */
export function resetEventSeq(): void {
  lastByCore.clear();
  gapCount = 0;
  missedTotal = 0;
}

/** 累计统计（诊断 / 测试断言用）。 */
export function eventSeqStats(): { gaps: number; missed: number } {
  return { gaps: gapCount, missed: missedTotal };
}

/** 某 core 已见的最大序号（null = 尚未见到带序号的帧）。 */
export function lastEventSeq(core: string | null): number | null {
  return lastByCore.get(keyOf(core)) ?? null;
}
