//! 帧预算探针（`frame-budget.ts`）的契约。
//!
//! 这是渲染层降级的**运行时**判据：媒体查询枚举不了"外接 5K + 低电量 +
//! 无风扇降频"这类组合，只能靠"真的掉帧了"来判断。所以要钉住两点：
//!
//! 1. **不误判**：偶发一次慢帧（或标签页切回前台时那个巨大的 delta）不该
//!    触发降级——一旦降级，本次会话内不会恢复（避免"关—开—关"的闪烁）；
//! 2. **该判就判**：持续掉帧必须在采样窗口内触发，否则这块代码等于没写。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  installFrameBudget,
  isLowPerf,
  markLowPerf,
  resetFrameBudgetForTests,
} from '../frame-budget';

const perfOf = () => document.documentElement.dataset.perf;

beforeEach(() => {
  resetFrameBudgetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetFrameBudgetForTests();
});

describe('标记', () => {
  it('打标后 <html> 上有 data-perf="low" 且 isLowPerf 为真', () => {
    expect(isLowPerf()).toBe(false);
    markLowPerf();
    expect(perfOf()).toBe('low');
    expect(isLowPerf()).toBe(true);
  });

  it('重复标记幂等', () => {
    markLowPerf();
    markLowPerf();
    expect(perfOf()).toBe('low');
  });

  it('复位清掉标记（测试隔离用）', () => {
    markLowPerf();
    resetFrameBudgetForTests();
    expect(perfOf()).toBeUndefined();
    expect(isLowPerf()).toBe(false);
  });
});

describe('采样判定', () => {
  /**
   * 假 rAF + 假时钟。`run` 驱动 N 帧；每帧回调内部会重新申请 rAF，
   * 所以队列自然延续（与浏览器行为一致）。
   */
  function setup() {
    vi.useFakeTimers();
    let now = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      queue.push(cb);
      return queue.length;
    });
    return {
      /** 推进时钟越过 SAMPLE_DELAY_MS，取出首个 rAF 回调。 */
      async begin() {
        await vi.advanceTimersByTimeAsync(2_100);
        return queue.shift();
      },
      /** 连续驱动 `frames` 帧、每帧耗时 `deltaMs`。返回实际驱动帧数。 */
      run(first: FrameRequestCallback | undefined, frames: number, deltaMs: number): number {
        let cb = first;
        let done = 0;
        while (cb && done < frames) {
          now += deltaMs;
          cb(now);
          done += 1;
          cb = queue.shift();
        }
        return done;
      },
      /** 仍在等待执行的回调数（0 = 探针已停止调度）。 */
      pending() {
        return queue.length;
      },
    };
  }

  it('持续掉帧 → 降级', async () => {
    const harness = setup();
    installFrameBudget();
    const first = await harness.begin();
    expect(first).toBeTypeOf('function');
    // 40ms/帧 ≈ 25fps：连续 20 帧足够越过阈值（12）。
    harness.run(first, 20, 40);
    expect(perfOf()).toBe('low');
    expect(isLowPerf()).toBe(true);
  });

  it('偶发慢帧不降级（正常帧会抵掉计数）', async () => {
    const harness = setup();
    installFrameBudget();
    const first = await harness.begin();
    harness.run(first, 40, 16);
    expect(perfOf()).toBeUndefined();
  });

  it('标签页冻结后唤醒的异常 delta 不算掉帧', async () => {
    const harness = setup();
    installFrameBudget();
    const first = await harness.begin();
    // 切后台 5 秒再回来：单帧 delta 5100ms，必须被丢弃而不是当成"极慢帧"。
    harness.run(first, 3, 5_100);
    expect(perfOf()).toBeUndefined();
  });

  it('采样窗口结束后停止调度 rAF（探针自身不能是常驻开销）', async () => {
    const harness = setup();
    installFrameBudget();
    const first = await harness.begin();
    // 16ms/帧跑满 6 秒窗口需要 ~375 帧；给足 500 帧的驱动额度。
    const driven = harness.run(first, 500, 16);
    expect(driven).toBeLessThan(500); // 自己提前停了
    expect(harness.pending()).toBe(0);
    expect(perfOf()).toBeUndefined(); // 窗口内没掉帧 → 不降级
  });
});
