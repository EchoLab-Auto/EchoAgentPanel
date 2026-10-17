//! 断线重连退避：可见时上限 3s、不可见时 30s；回到前台立即重连。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(): void {}
  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }
  /** 测试辅助：模拟连接失败/断开。 */
  fail(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
}

describe('断线重连退避（可见性感知）', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setVisibility('visible');
  });

  it('nextRetryMs：可见封顶 3s，不可见封顶 30s', async () => {
    const { nextRetryMs } = await import('../connection');
    expect(nextRetryMs(500, true)).toBe(1000);
    expect(nextRetryMs(2000, true)).toBe(3000);
    expect(nextRetryMs(3000, true)).toBe(3000);
    expect(nextRetryMs(16000, false)).toBe(30000);
    expect(nextRetryMs(30000, false)).toBe(30000);
  });

  it('可见时连续失败，每次等待都 ≤3s', async () => {
    setVisibility('visible');
    const { startConnection } = await import('../connection');
    startConnection();
    for (let i = 0; i < 8; i += 1) {
      const count = FakeWebSocket.instances.length;
      FakeWebSocket.instances[count - 1].fail();
      vi.advanceTimersByTime(2_999);
      if (FakeWebSocket.instances.length === count) vi.advanceTimersByTime(1);
      expect(FakeWebSocket.instances.length).toBe(count + 1);
    }
  });

  it('不可见时退避可增长到 30s；切回可见立即重连', async () => {
    setVisibility('hidden');
    const { startConnection } = await import('../connection');
    startConnection();
    // 0.5+1+2+4+8+16 → 下一次等待 > 3s
    for (let i = 0; i < 6; i += 1) {
      FakeWebSocket.instances[FakeWebSocket.instances.length - 1].fail();
      vi.advanceTimersByTime(30_000);
    }
    const before = FakeWebSocket.instances.length;
    FakeWebSocket.instances[before - 1].fail();
    vi.advanceTimersByTime(5_000);
    expect(FakeWebSocket.instances.length).toBe(before); // 后台：仍在长退避
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeWebSocket.instances.length).toBe(before + 1); // 立即重连
  });
});
