//! 面板服务调用（panel-services.ts）契约：按 `request_id` 配对、拒发即失败、
//! 超时兜底、重置时全部 reject。
//!
//! 为什么这些测试值得写：这条通道的失败模式**全是静默的**——
//! 配对键错一位就永远等、超时不 reject 就永远转圈、重置不清表就泄漏。
//! 而 UI 上的表现都是"面板没反应"，看不出是哪一层。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sent: unknown[] = [];

/** 替身：只记录发出去的命令，`sentResult` 控制"是否发得出去"。 */
let sendSucceeds = true;
vi.mock('../connection', () => ({
  sendCommand: (command: unknown) => {
    sent.push(command);
    return sendSucceeds;
  },
}));

import {
  SERVICE_TIMEOUT_MS,
  consumeServiceResult,
  invokeService,
  newRequestId,
  pendingServiceCalls,
  resetServiceCalls,
} from '../panel-services';

/** 从发出去的命令里取 `request_id`（测试要拿它构造回执）。 */
function lastRequestId(): string {
  const command = sent[sent.length - 1] as {
    InvokeService: { request_id: string };
  };
  return command.InvokeService.request_id;
}

function lastPayload(): unknown {
  const command = sent[sent.length - 1] as { InvokeService: { payload: unknown } };
  return command.InvokeService.payload;
}

function result(requestId: string, ok: boolean, data: unknown, error?: string): unknown {
  return {
    ServiceInvokeResult: {
      service: 'echo-agent.sessions',
      method: 'list',
      request_id: requestId,
      ok,
      data,
      error: error ?? null,
    },
  };
}

describe('panel-services：调用与配对', () => {
  beforeEach(() => {
    sent.length = 0;
    sendSucceeds = true;
    vi.useFakeTimers();
    resetServiceCalls('测试重置');
  });
  afterEach(() => {
    resetServiceCalls('测试清理');
    vi.useRealTimers();
  });

  it('发命令时带上服务名 / 方法 / request_id', () => {
    void invokeService('echo-agent.sessions', 'list').catch(() => {});
    const command = sent[0] as {
      InvokeService: { service: string; method: string; request_id: string };
    };
    expect(command.InvokeService.service).toBe('echo-agent.sessions');
    expect(command.InvokeService.method).toBe('list');
    expect(command.InvokeService.request_id).toBeTruthy();
    expect(pendingServiceCalls()).toBe(1);
  });

  it('回执按 request_id 配对：命中即 resolve 并销账', async () => {
    const promise = invokeService('echo-agent.sessions', 'list');
    const id = lastRequestId();
    expect(consumeServiceResult(result(id, true, { sessions: [{ id: 'a' }] }))).toBe(true);
    await expect(promise).resolves.toEqual({ sessions: [{ id: 'a' }] });
    expect(pendingServiceCalls()).toBe(0);
  });

  /**
   * 失败回执**带** request_id —— 这是相对 `InvokeModuleOp` 的关键改进
   * （那边失败回执里没有 id，前端只能一路等到超时）。
   */
  it('失败回执带 id：当场 reject，原因是 Core 给的原文', async () => {
    const promise = invokeService('echo-agent.sessions', 'list');
    const id = lastRequestId();
    expect(consumeServiceResult(result(id, false, null, '服务不存在；已登记：x'))).toBe(true);
    await expect(promise).rejects.toThrow('服务不存在；已登记：x');
    expect(pendingServiceCalls()).toBe(0);
  });

  /**
   * 两个并发调用的回执顺序可以任意 —— 靠 id 配对才不会串。
   * 靠 `(service, method)` 配对就会在这里出错：两条完全相同。
   */
  it('同一方法的两个并发调用靠 id 区分', async () => {
    const first = invokeService('echo-agent.sessions', 'list');
    const firstId = lastRequestId();
    const second = invokeService('echo-agent.sessions', 'list');
    const secondId = lastRequestId();
    expect(firstId).not.toBe(secondId);

    // 后发的先回：必须只 resolve 第二个。
    expect(consumeServiceResult(result(secondId, true, { tag: 'second' }))).toBe(true);
    await expect(second).resolves.toEqual({ tag: 'second' });
    expect(pendingServiceCalls()).toBe(1);

    consumeServiceResult(result(firstId, true, { tag: 'first' }));
    await expect(first).resolves.toEqual({ tag: 'first' });
  });

  it('陌生 request_id 不被认领（其它窗口的回执 / 已放弃的调用）', () => {
    void invokeService('echo-agent.sessions', 'list').catch(() => {});
    expect(consumeServiceResult(result('svc-unknown', true, {}))).toBe(false);
    expect(pendingServiceCalls()).toBe(1);
  });

  it('非服务回执原样放过（返回 false，交给通用 reducer）', () => {
    expect(consumeServiceResult({ SessionUpdated: { session: { id: 'a' } } })).toBe(false);
    expect(consumeServiceResult(null)).toBe(false);
    expect(consumeServiceResult('nope')).toBe(false);
  });

  /**
   * 拒发（多上游解析不出目标 Core / 未连接）必须**当场失败**：
   * 登记了却没人销账的话，用户只能等到超时，期间什么都看不到。
   */
  it('命令发不出去时立即 reject，不登记等待', async () => {
    sendSucceeds = false;
    await expect(invokeService('echo-agent.sessions', 'list')).rejects.toThrow('未发出');
    expect(pendingServiceCalls()).toBe(0);
  });

  it('超时兜底：到点 reject 并销账（提示"命令没发出去或连接已断"）', async () => {
    const promise = invokeService('echo-agent.sessions', 'list');
    const assertion = expect(promise).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(SERVICE_TIMEOUT_MS + 1);
    await assertion;
    expect(pendingServiceCalls()).toBe(0);
  });

  it('超时之后到达的迟到回执不被认领（不重复 resolve）', async () => {
    const promise = invokeService('echo-agent.sessions', 'list');
    const id = lastRequestId();
    const assertion = expect(promise).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(SERVICE_TIMEOUT_MS + 1);
    await assertion;
    expect(consumeServiceResult(result(id, true, {}))).toBe(false);
  });

  /**
   * 重置时**全部 reject**：静默清表会让调用方的 `await` 挂住，
   * 视图加载态永远收不掉（工作区"看不到文件浏览器"的同款形状）。
   */
  it('重置把在飞调用全部 reject', async () => {
    const first = invokeService('echo-agent.sessions', 'list');
    const second = invokeService('echo-agent.sessions', 'get');
    const a = expect(first).rejects.toThrow('连接已重置');
    const b = expect(second).rejects.toThrow('连接已重置');
    resetServiceCalls('连接已重置');
    await a;
    await b;
    expect(pendingServiceCalls()).toBe(0);
  });

  it('request_id 单调不重复', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i += 1) ids.add(newRequestId());
    expect(ids.size).toBe(100);
  });

  it('team_id 只在内层 payload 里（不改命令形状）', () => {
    void invokeService('echo-agent.sessions', 'list', { extra: 1 }, 'alix').catch(() => {});
    expect(lastPayload()).toEqual({ extra: 1, team_id: 'alix' });
    void invokeService('echo-agent.sessions', 'list', { extra: 1 }, null).catch(() => {});
    expect(lastPayload()).toEqual({ extra: 1 });
  });
});
