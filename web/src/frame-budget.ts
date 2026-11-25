//! 主线程**帧预算探针**（2026-11 远程访问 / 通用性能兜底）。
//!
//! ## 为什么需要它
//!
//! 渲染层的降级手段（Retina 折半、`prefers-reduced-transparency`）都建立在
//! **媒体查询**上，而真正让面板变卡的条件组合往往查不出来：
//!
//! - 外接 5K 屏（DPR 2 + 巨大像素面积）；
//! - MacBook Air 无风扇降频、低电量模式把 rAF 限到 30Hz；
//! - 同时开着两个标签页、或另一个标签页在跑三维渲染；
//! - 远程链路上帧到达的**批量突发**（网络抖动把 8 条帧挤进同一帧渲染）。
//!
//! 这些情形下浏览器照样报 `min-resolution: 2dppx`，CSS 无从区分。所以补一个
//! **运行时**判据：真掉帧就关掉最贵的那一层（毛玻璃）。
//!
//! ## 判据与代价
//!
//! 采样 rAF 帧间隔，连续 [`CONSECUTIVE_SLOW`] 帧超过 [`SLOW_FRAME_MS`]
//! （≈45fps）→ 判定低性能，给 `<html>` 打 `data-perf="low"`，CSS 侧
//! （`styles.css`）据此把 `--panel-glass-filter` 置 `none`。
//!
//! 采样在首屏稳定后开始、最多跑 [`SAMPLE_LIMIT_MS`]，之后**完全停止**——
//! 常驻的帧采样器自己就是一份持续开销，这个模块只在前几秒付一次。
//!
//! 判定是**单向**的（会话内不回退）：降级发生在"已经在掉帧"时，若在负载稍缓
//! 时又恢复毛玻璃，会形成"关—开—关"的视觉闪烁，比一直关着更糟。

/** 单帧超过这个时长视为掉帧（22ms ≈ 45fps；60Hz 预算 16.7ms，120Hz 8.3ms）。 */
const SLOW_FRAME_MS = 22;

/** 连续掉帧达到这个数量才判定低性能（偶发一次不降级）。 */
const CONSECUTIVE_SLOW = 12;

/** 采样窗口上限：超过就不再采样（探针自身不能成为常驻开销）。 */
const SAMPLE_LIMIT_MS = 6_000;

/** 首屏稳定后再开始采样：避开"JS 解析 + 首次布局"必然的掉帧。 */
const SAMPLE_DELAY_MS = 2_000;

export const PERF_ATTR = 'perf';

let installed = false;
let lowPerf = false;

/** 当前是否已判定为低性能设备（供 JS 侧决策，例如收紧渲染窗口）。 */
export function isLowPerf(): boolean {
  return lowPerf;
}

/**
 * 安装探针。幂等，可安全重复调用；非浏览器环境（SSR / 单测）直接返回。
 */
export function installFrameBudget(): void {
  if (installed) return;
  installed = true;
  if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return;

  const startSampling = () => {
    const start = performance.now();
    let last = start;
    let slow = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      // 标签页被冻结后唤醒、或切换到后台再回来，delta 会异常大（几百到几千
      // ms）：那不是"渲染慢"，直接丢弃，否则一次切屏就误判低性能。
      if (delta > 0 && delta < 400) {
        if (delta > SLOW_FRAME_MS) {
          slow += 1;
        } else {
          // 一次正常帧抵掉两次计数（而不是清零）：偶发抖动不该被当成持续卡顿。
          slow = Math.max(0, slow - 2);
        }
        if (slow >= CONSECUTIVE_SLOW) {
          markLowPerf();
          return; // 已降级，停止采样
        }
      }
      if (now - start > SAMPLE_LIMIT_MS) return; // 采样窗口结束
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  window.setTimeout(startSampling, SAMPLE_DELAY_MS);
}

/** 打上低性能标记（导出以便测试；生产只有探针会调用）。 */
export function markLowPerf(): void {
  if (lowPerf) return;
  lowPerf = true;
  if (typeof document === 'undefined') return;
  document.documentElement.dataset[PERF_ATTR] = 'low';
}

/** 测试辅助：复位模块级状态（跨用例隔离）。 */
export function resetFrameBudgetForTests(): void {
  installed = false;
  lowPerf = false;
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset[PERF_ATTR];
  }
}
