//! 思考（推理块）打字机动画的播放准入（2026-10 用户需求）。
//!
//! 背景：面板的推理消息以「打字机」效果逐字显示，营造"正在思考"的观感。
//! 但实时到达的消息带 `animate: true` 标记且长期保留在 trunk 里——切换
//! 会话再切回、局部重挂载等“重新显示已完成的思考卡片”场景会把整段打字
//! 动画重播一遍，看起来像还在推演。用户要求：
//!   **只有正在进行输出的思考才有打字效果；已经完成的思考卡片（重新）
//!   加载时直接全量显示。**
//!
//! 准入规则（在 ChatView 渲染时对每条推理消息判定一次，命中即登记）：
//!   1. 消息带实时标记（`animate !== false`，历史回放恒为 false）；
//!   2. 消息仍「新鲜」——到达时间距今不超过 [`REASONING_FRESH_MS`]；
//!   3. 所属会话当前仍在运行（thinking / tool / subagent）。
//! 三条全部命中且该 key 首次申请时才播放；此后该 key 永不二次播放——
//! 切会话回来、重挂载等任何重新显示都走全量显示路径。
//!
//! 注：登记表为模块级（SPA 生命周期内有效）；页面刷新后时间线来自
//! 历史回放（animate: false），天然不播动画，无需持久化。

/** 打字动画「新鲜」窗口：到达超过该时长的消息视为已完成输出，不补播动画。 */
export const REASONING_FRESH_MS = 30_000;

/** 已播放（或已放弃播放判定）的推理消息 key 集合；FIFO 淘汰防无界增长。 */
const claimed = new Set<string>();
const MAX_CLAIMED = 4000;

export interface ReasoningAnimInput {
  /** 消息实时标记（历史回放 = false） */
  animate?: boolean;
  /** 消息 key（DisplayMessage.key 经适配层映射为 ChatMessage.id） */
  key: string;
  /** 消息到达时间（秒级 Unix 时间戳） */
  time: number;
  /** 所属会话当前是否仍在运行（thinking / tool / subagent） */
  sessionRunning: boolean;
  /** 判定时刻（ms；测试注入用，缺省取当前时间） */
  nowMs?: number;
}

/**
 * 申请一次思考打字机播放。
 *
 * 命中（返回 true）即登记——同一 key 此后恒为 false（不重播）。
 * 未命中（已完成 / 过期 / 会话静止）不登记，直接返回 false（全量显示）。
 */
export function claimReasoningAnimation(input: ReasoningAnimInput): boolean {
  if (input.animate === false) return false;
  if (claimed.has(input.key)) return false;
  const now = input.nowMs ?? Date.now();
  const ageMs = now - input.time * 1000;
  // ageMs < 0（时钟回拨/时间戳超前）按新鲜处理，偏保守地保留动画。
  if (!(ageMs <= REASONING_FRESH_MS)) return false;
  if (!input.sessionRunning) return false;
  claimed.add(input.key);
  if (claimed.size > MAX_CLAIMED) {
    const oldest = claimed.values().next();
    if (!oldest.done) claimed.delete(oldest.value);
  }
  return true;
}

/** 测试用：清空登记表。 */
export function resetReasoningAnimForTests(): void {
  claimed.clear();
}
