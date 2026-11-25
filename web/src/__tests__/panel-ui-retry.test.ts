//! `startPanelUiLoading` 的重试契约（2026-11「Core 重启后工作区 UI 整块消失」）。
//!
//! ## 背景
//!
//! 运行期 UI 扩展的清单只在"连上 Core"时拉一次。此前的实现是首连触发一次后
//! 立刻停掉 watcher——而 Core 重启后的头几百毫秒里，WebSocket 已经能连上、
//! 模块服务表却还没就绪，`echo-agent.panel-ui.list` 必然失败。那次失败之后
//! 永不重试，于是文件浏览器卡、Git 卡、工作区会话管理入口整块消失，用户只能
//! 手动刷新页面自救。
//!
//! 一个用例走完整条时间线（`panelUiStatus` 是模块单例，`startPanelUiLoading`
//! 又会装 watcher——拆成多个用例时前一个的异步尾巴会污染后一个，在这里得不
//! 到任何额外信息）：
//!
//! 未连接 → 一次都不打；首连 `unavailable` → 按节奏重试；服务就绪 → 加载并
//! 收工；此后长推进不再打服务端。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `vi.mock` 的工厂会被提升到文件顶部，**不能闭包捕获**下面声明的变量
 * （会撞 TDZ）。所以共享状态放在 `vi.hoisted` 里先建好。
 */
const h = vi.hoisted(() => {
  return {
    /** 可控连接状态（`extension-loader` 只读 `state.connected`）。 */
    state: { connected: false },
    serviceCalls: 0,
    serviceError: null as Error | null,
    serviceResult: null as unknown,
  };
});

vi.mock('../store', async () => {
  const { reactive } = await import('vue');
  // 换成响应式的同一份对象：`watch(() => state.connected)` 需要能触发。
  const live = reactive(h.state);
  Object.assign(h, { state: live });
  return { state: live };
});

vi.mock('../panel-services', () => ({
  invokeService: () => {
    h.serviceCalls += 1;
    if (h.serviceError) return Promise.reject(h.serviceError);
    return Promise.resolve(h.serviceResult);
  },
}));

import { startPanelUiLoading } from '../extension-loader';
import { panelUiStatus, setPanelUiStatus } from '../panel-ui-status';

describe('panel-ui 清单的加载与重试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    h.serviceCalls = 0;
    h.serviceError = new Error('模块服务表未就绪');
    h.serviceResult = null;
    h.state.connected = false;
    // 本地 SDK 版本：`loadPanelExtensions` 从 meta 标签读。
    document.head.innerHTML = '<meta name="panel-ui-sdk" content="1">';
    setPanelUiStatus({ phase: 'idle', sdk: '1', loaded: [], failed: [], reason: '' });
  });
  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = '';
  });

  it('未连接不打服务端；首连 unavailable 会重试；就绪后加载并收工', async () => {
    startPanelUiLoading();

    // ① 还没连上：一次都不打。
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.serviceCalls).toBe(0);
    expect(panelUiStatus.value.phase).toBe('idle');

    // ② 首连：服务不可用 → phase=unavailable，但**不能**就此收工。
    h.state.connected = true;
    await vi.advanceTimersByTimeAsync(0);
    expect(h.serviceCalls).toBe(1);
    expect(panelUiStatus.value.phase).toBe('unavailable');

    // ③ 服务仍未就绪：推进一个重试间隔，应出现第二次调用
    //    （证明没被"首连试一次就停"的一次性守卫掐死——那正是本次故障）。
    await vi.advanceTimersByTimeAsync(400);
    expect(h.serviceCalls).toBe(2);
    expect(panelUiStatus.value.phase).toBe('unavailable');

    // ④ 模块服务表就绪（空清单也是合法结果：这个部署一个扩展都没装）→
    //    下次重试拿到清单，phase 变 ready。
    h.serviceError = null;
    h.serviceResult = { sdk_version: '1', extensions: [] };
    await vi.advanceTimersByTimeAsync(1200);
    expect(h.serviceCalls).toBe(3);
    expect(panelUiStatus.value.phase).toBe('ready');

    // ⑤ 收工：再推进很久也不再打服务端。
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.serviceCalls).toBe(3);
  });
});
