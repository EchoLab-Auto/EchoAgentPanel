//! 请求-响应跟踪（pending.ts）契约：三态推进、防闪烁、销账、覆盖登记。
//!
//! 时间线（fake timers）：
//!   0ms ──(150ms)──▶ pending ──(6s)──▶ slow ──(20s)──▶ timeout
//! 响应到达即销账；已可见的加载态保证 ≥400ms 最短可见。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import {
  PENDING_MIN_VISIBLE_MS,
  PENDING_SLOW_AFTER_MS,
  PENDING_TIMEOUT_AFTER_MS,
  PENDING_VISIBLE_AFTER_MS,
  REQUEST_RESPONSES,
  commandName,
  dropPendingOfCore,
  releasePending,
  resolvePendingEvent,
  settleInstanceOpsOfCore,
  settlePending,
  trackRequest,
  usePending,
} from '../pending';
import type { BackendCommand } from '../protocol';

const contextCommand = (): BackendCommand =>
  ({ RequestContext: { team_id: 't', session_id: 's' } }) as BackendCommand;

describe('pending：阶段推进', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('时间线：150ms 前 idle → pending → 6s slow → 20s timeout', () => {
    trackRequest('t', contextCommand());
    const { phase, loading, failed } = usePending('t');

    expect(phase.value).toBe('idle');
    expect(loading.value).toBe(false);

    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS - 1);
    expect(phase.value).toBe('idle');

    vi.advanceTimersByTime(1);
    expect(phase.value).toBe('pending');
    expect(loading.value).toBe(true);

    vi.advanceTimersByTime(PENDING_SLOW_AFTER_MS - PENDING_VISIBLE_AFTER_MS);
    expect(phase.value).toBe('slow');
    expect(loading.value).toBe(true);

    vi.advanceTimersByTime(PENDING_TIMEOUT_AFTER_MS - PENDING_SLOW_AFTER_MS);
    expect(phase.value).toBe('timeout');
    expect(failed.value).toBe(true);
    expect(loading.value).toBe(false);
  });

  it('快请求不闪：150ms 内完成 → 全程 idle', () => {
    trackRequest('t', 'RequestSkillsList');
    const { phase } = usePending('t');
    vi.advanceTimersByTime(80);
    expect(phase.value).toBe('idle');

    resolvePendingEvent({ SkillsList: { skills: [] } });
    vi.advanceTimersByTime(5_000);
    expect(phase.value).toBe('idle');
  });

  it('已可见的加载态：最短 400ms 可见，之后销账', () => {
    trackRequest('t', contextCommand());
    const { phase } = usePending('t');
    vi.advanceTimersByTime(200); // 已可见（visibleAt=150，elapsed=50）
    expect(phase.value).toBe('pending');

    resolvePendingEvent({ ContextSnapshot: { messages: [], blocks: [], total_tokens: 0, limit_tokens: 0 } });
    // 最短可见窗口未走完：保持 pending
    vi.advanceTimersByTime(PENDING_MIN_VISIBLE_MS - 50 - 1);
    expect(phase.value).toBe('pending');

    vi.advanceTimersByTime(1);
    expect(phase.value).toBe('idle');
  });

  it('无关事件不销账', () => {
    trackRequest('t', 'RequestPluginsList');
    const { phase } = usePending('t');
    resolvePendingEvent({ Error: { session_id: null, message: 'x' } });
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(phase.value).toBe('pending');
  });

  it('重复登记（重试）覆盖旧计时：从未可见窗口重新开始', () => {
    trackRequest('t', contextCommand());
    const { phase } = usePending('t');
    vi.advanceTimersByTime(5_000);
    expect(phase.value).toBe('pending');

    trackRequest('t', contextCommand());
    expect(phase.value).toBe('idle');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS - 1);
    expect(phase.value).toBe('idle');
    vi.advanceTimersByTime(1);
    expect(phase.value).toBe('pending');
  });

  it('releasePending：卸载即清理（超时 error 面板随之关闭）', () => {
    trackRequest('t', contextCommand());
    const { phase } = usePending('t');
    vi.advanceTimersByTime(PENDING_TIMEOUT_AFTER_MS);
    expect(phase.value).toBe('timeout');

    releasePending('t');
    expect(phase.value).toBe('idle');
  });

  it('动态 key（getter）：切换后自动追踪新 key 的登记', () => {
    // getter 内读响应式源（真实场景：实例面板的选中实例 ref）——
    // ref 变化使 computed 失效并改追踪新 key。
    const name = ref('a');
    const { phase } = usePending(() => `instance-op:core:/${name.value}:get_state`);
    trackRequest('instance-op:core:/a:get_state', contextCommand());
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(phase.value).toBe('pending');

    // 切到实例 b：b 未登记 → idle；登记后可见。
    name.value = 'b';
    expect(phase.value).toBe('idle');
    trackRequest('instance-op:core:/b:get_state', contextCommand());
    expect(phase.value).toBe('idle');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(phase.value).toBe('pending');
  });

  it('多个 key 独立跟踪：一个销账不影响另一个', () => {
    trackRequest('a', contextCommand());
    trackRequest('b', 'RequestTeamsList');
    const a = usePending('a');
    const b = usePending('b');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);

    resolvePendingEvent({ ContextSnapshot: { messages: [], blocks: [], total_tokens: 0, limit_tokens: 0 } });
    vi.advanceTimersByTime(PENDING_MIN_VISIBLE_MS);
    expect(a.phase.value).toBe('idle');
    expect(b.phase.value).toBe('pending');
  });
});

describe('pending：关联表与命令名', () => {
  it('commandName 支持裸串与对象两种命令形态', () => {
    expect(commandName('RequestState')).toBe('RequestState');
    expect(commandName(contextCommand())).toBe('RequestContext');
  });

  it('关联表覆盖面板的请求类命令（抽查关键项）', () => {
    // 这些是各视图打开时的数据请求：映射错了加载态就永远等不到销账。
    expect(REQUEST_RESPONSES.RequestContext).toBe('ContextSnapshot');
    expect(REQUEST_RESPONSES.RequestTeamsList).toBe('TeamsList');
    expect(REQUEST_RESPONSES.RequestShellSessions).toBe('ShellSessionsList');
    // 刻意不收：时间线（状态标志判定）与 RequestState（多事件响应）
    expect(REQUEST_RESPONSES.RequestTrunkTimeline).toBeUndefined();
    expect(REQUEST_RESPONSES.RequestState).toBeUndefined();
  });
});

describe('pending：显式销账与按 core 清理（02a §5.1，S2）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('settlePending：按精确键销账（已显示走最短可见，未显示立即清）', () => {
    trackRequest('explicit:a', contextCommand(), null);
    const a = usePending('explicit:a');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(a.phase.value).toBe('pending');

    settlePending('explicit:a');
    // 已可见：最短可见窗口内保持 pending，随后清（与响应到达同语义）。
    vi.advanceTimersByTime(PENDING_MIN_VISIBLE_MS);
    expect(a.phase.value).toBe('idle');

    // 未显示（150ms 内）：立即清，不再进入 pending。
    trackRequest('explicit:b', contextCommand(), null);
    const b = usePending('explicit:b');
    settlePending('explicit:b');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(b.phase.value).toBe('idle');
  });

  it('dropPendingOfCore：只清目标 core 的登记（null 需显式传入）', () => {
    trackRequest('drop:a', contextCommand(), 'core-a');
    trackRequest('drop:b', contextCommand(), 'core-b');
    trackRequest('drop:n', contextCommand(), null);
    dropPendingOfCore('core-a');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(usePending('drop:a').phase.value).toBe('idle');
    expect(usePending('drop:b').phase.value).toBe('pending');
    expect(usePending('drop:n').phase.value).toBe('pending');

    // 单上游（core=null）需显式传入才清。
    dropPendingOfCore(null);
    expect(usePending('drop:n').phase.value).toBe('idle');

    // 清理本用例剩余登记（测试隔离：pending 是模块级单例）。
    dropPendingOfCore('core-b');
    expect(usePending('drop:b').phase.value).toBe('idle');
  });

  it('settleInstanceOpsOfCore：按 core 段结算启停键（instance-op: 与异 core 不受影响）', () => {
    trackRequest('instance:start::qq', contextCommand(), null);
    trackRequest('instance:restart:core-a:qq-2', contextCommand(), 'core-a');
    trackRequest('instance-op:core-a\u0000qq:get_state', contextCommand(), 'core-a');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(usePending('instance:start::qq').phase.value).toBe('pending');
    expect(usePending('instance:restart:core-a:qq-2').phase.value).toBe('pending');
    expect(usePending('instance-op:core-a\u0000qq:get_state').phase.value).toBe('pending');

    // 只结算 core 段 === 'core-a' 的登记：空 core 段与 `instance-op:` 前缀不动。
    settleInstanceOpsOfCore('core-a');
    vi.advanceTimersByTime(PENDING_MIN_VISIBLE_MS); // 已可见：走最短可见后清
    expect(usePending('instance:restart:core-a:qq-2').phase.value).toBe('idle');
    expect(usePending('instance:start::qq').phase.value).toBe('pending');
    expect(usePending('instance-op:core-a\u0000qq:get_state').phase.value).toBe('pending');

    // core=null 只结算空 core 段（单上游）；可见窗口已走完 → 立即清。
    settleInstanceOpsOfCore(null);
    expect(usePending('instance:start::qq').phase.value).toBe('idle');

    // 测试隔离：清理剩余登记（pending 为模块级单例）。
    releasePending('instance-op:core-a\u0000qq:get_state');
  });

  it('settleInstanceOpsOfCore：未显示（150ms 内）立即清', () => {
    trackRequest('instance:stop:core-b:qq', contextCommand(), 'core-b');
    settleInstanceOpsOfCore('core-b');
    vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
    expect(usePending('instance:stop:core-b:qq').phase.value).toBe('idle');
  });
});
