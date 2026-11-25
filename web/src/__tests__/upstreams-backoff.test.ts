//! 上游状态轮询的**自适应退避**（2026-11 远程访问优化）。
//!
//! ## 要解决的问题
//!
//! 原来是固定 8s 的 `setInterval`：远程访问下就是**每分钟 7 次完整 HTTP
//! 往返**，而上游状态绝大多数时间不变。空转的请求既占带宽，也让笔记本网卡
//! 无法进入低功耗（MacBook 上直接体现为续航）。
//!
//! 改为「有实质变化 → 保持 8s；连续无变化 → 8→16→24→30s」。
//!
//! ## 这里锁定的核心不变量
//!
//! **签名必须排除 `last_checked`。** 后端每次探活都会更新它——若把它算进
//! "是否有变化"，每轮都会被判为变化，退避永远不会触发（功能看起来写了，
//! 实际一次也没生效）。这是本改动唯一的隐蔽失效点，所以单独用测试钉住。

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { state } from '../store';
import { startUpstreamsPolling, upstreamSignature, refreshUpstreams } from '../upstreams';
import type { UpstreamStatus } from '../state';

const base = (over: Partial<UpstreamStatus> = {}): UpstreamStatus => ({
  name: 'core-a',
  url: 'ws://127.0.0.1:8080/ws',
  token_set: true,
  access: 'direct',
  ssh: null,
  online: true,
  connectivity: 'online',
  auth: 'ok',
  last_error: null,
  last_checked: 1_700_000_000,
  ...over,
});

describe('实质状态签名', () => {
  it('last_checked 走动不改变签名（否则退避永远不生效）', () => {
    const a = upstreamSignature([base({ last_checked: 100 })]);
    const b = upstreamSignature([base({ last_checked: 200 })]);
    expect(b).toBe(a);
  });

  it('connectivity 变化改变签名', () => {
    expect(upstreamSignature([base({ connectivity: 'offline' })])).not.toBe(
      upstreamSignature([base()]),
    );
  });

  it('auth 变化改变签名', () => {
    expect(upstreamSignature([base({ auth: 'failed' })])).not.toBe(upstreamSignature([base()]));
  });

  it('last_error 变化改变签名（恢复/新增错误都要立刻抓）', () => {
    expect(upstreamSignature([base({ last_error: 'connection refused' })])).not.toBe(
      upstreamSignature([base()]),
    );
  });

  it('条目增减改变签名', () => {
    expect(upstreamSignature([base(), base({ name: 'core-b' })])).not.toBe(
      upstreamSignature([base()]),
    );
  });

  it('列表顺序不影响签名', () => {
    const one = base({ name: 'a' });
    const two = base({ name: 'b' });
    expect(upstreamSignature([one, two])).toBe(upstreamSignature([two, one]));
  });
});

describe('refreshUpstreams 的返回值', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    state.upstreams = [];
    state.teams = [];
    state.sessions = [];
    state.knownCores.clear();
  });

  const stub = (list: () => UpstreamStatus[]) => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(list()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
  };

  it('首轮算"有变化"，同样的状态再来一轮算"无变化"', async () => {
    stub(() => [base({ last_checked: 1 })]);
    expect(await refreshUpstreams()).toBe(true);
    // last_checked 变了（后端每次探活都会更新），但实质状态没变。
    stub(() => [base({ last_checked: 2 })]);
    expect(await refreshUpstreams()).toBe(false);
  });

  it('掉线 → 算"有变化"（要立刻回到快节奏）', async () => {
    stub(() => [base()]);
    await refreshUpstreams();
    stub(() => [base({ connectivity: 'offline', online: false })]);
    expect(await refreshUpstreams()).toBe(true);
  });
});

describe('轮询退避节奏', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('无变化时逐轮拉长，上限 30s', async () => {
    vi.useFakeTimers();
    state.upstreams = [];
    const calls: number[] = [];
    let now = 0;
    globalThis.fetch = vi.fn(async () => {
      calls.push(now);
      return new Response(JSON.stringify([base()]), { status: 200 });
    }) as unknown as typeof fetch;

    const stop = startUpstreamsPolling();
    // 初始那次立即执行（不计入节奏断言）。
    await vi.advanceTimersByTimeAsync(0);
    const firstRound = calls.length;

    // 8s 后第二轮、之后 16s、之后 24s、之后封顶 30s。
    for (const step of [8_000, 16_000, 24_000, 30_000, 30_000]) {
      now += step;
      await vi.advanceTimersByTimeAsync(step);
    }
    stop();
    // 初始 1 次 + 上面 5 轮；若退避失效会是 8 次以上。
    expect(calls.length).toBeLessThanOrEqual(firstRound + 5);
    expect(calls.length).toBeGreaterThan(firstRound);
  });

  it('停止后不再调度', async () => {
    vi.useFakeTimers();
    let count = 0;
    globalThis.fetch = vi.fn(async () => {
      count += 1;
      return new Response(JSON.stringify([base()]), { status: 200 });
    }) as unknown as typeof fetch;
    const stop = startUpstreamsPolling();
    await vi.advanceTimersByTimeAsync(0);
    const afterStart = count;
    stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(count).toBe(afterStart);
  });
});
