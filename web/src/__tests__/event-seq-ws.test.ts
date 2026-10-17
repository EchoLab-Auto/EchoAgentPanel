//! 事件流跳号 → 自动补拉（2026-10 端到端接线验证）。
//!
//! `event-seq.ts` 的单测只验证判定逻辑；这里验证**接线**：WebSocket 收到
//! 带序号的帧后，跳号确实在客户端触发一次 `RequestTrunkTimeline`（带游标
//! 走增量），而正常连续 / 无序号 / 重连首帧都不触发。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  triggerOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  /** 投递一帧（`seq` 省略 = 旧版 Core 的无序号帧）。 */
  deliver(event: Record<string, unknown>, seq?: number): void {
    const frame: Record<string, unknown> = { type: 'event', payload: event };
    if (seq !== undefined) frame.seq = seq;
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const thinking = (): Record<string, unknown> => ({
  AgentThinking: { session_id: 'local:tui::local_user', team_id: 'Alice' },
});

const resyncCount = (ws: FakeWebSocket): number =>
  ws.sent.filter((f) => f.includes('RequestTrunkTimeline')).length;

describe('事件流跳号 → 自动补拉 timeline', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function connect(): Promise<FakeWebSocket> {
    const { startConnection } = await import('../connection');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]!;
    ws.triggerOpen();
    ws.sent.length = 0; // 丢弃引导期命令
    return ws;
  }

  it('连续序号：不补拉', async () => {
    const ws = await connect();
    ws.deliver(thinking(), 10); // 首帧 = 基线
    ws.deliver(thinking(), 11);
    ws.deliver(thinking(), 12);
    expect(resyncCount(ws)).toBe(0);
  });

  it('跳号：补拉一次 timeline（带游标走增量）', async () => {
    const ws = await connect();
    ws.deliver(thinking(), 1);
    ws.deliver(thinking(), 2);
    ws.deliver(thinking(), 9); // 缺 6 条
    const resyncs = ws.sent.filter((f) => f.includes('RequestTrunkTimeline'));
    expect(resyncs).toHaveLength(1);
    expect(resyncs[0]).toContain('since_seq');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('缺 6 条'),
    );
  });

  it('一次半死连续跳号：节流后只补拉一次', async () => {
    const ws = await connect();
    ws.deliver(thinking(), 1);
    ws.deliver(thinking(), 5);
    ws.deliver(thinking(), 40);
    ws.deliver(thinking(), 90); // 4s 内连续跳号
    expect(resyncCount(ws)).toBe(1);
  });

  it('无序号帧（旧版 Core）：不补拉、不破坏后续连续性', async () => {
    const ws = await connect();
    ws.deliver(thinking()); // 无 seq
    ws.deliver(thinking(), 1); // 基线
    ws.deliver(thinking(), 2);
    expect(resyncCount(ws)).toBe(0);
  });

  it('重连后首帧重新建立基线，不误报跳号', async () => {
    const ws = await connect();
    ws.deliver(thinking(), 100);
    ws.deliver(thinking(), 101);
    // 模拟重连（close → 新连接 onopen 重置基线）
    ws.close();
    ws.triggerOpen();
    ws.sent.length = 0;
    ws.deliver(thinking(), 500); // 首帧 = 基线
    expect(resyncCount(ws)).toBe(0);
  });

  it('多上游按 core 分桶：两个 core 交替发帧不算跳号', async () => {
    const ws = await connect();
    const deliverWrapped = (core: string, seq: number) => {
      ws.onmessage?.({
        data: JSON.stringify({
          core,
          frame: { type: 'event', payload: thinking(), seq },
        }),
      });
    };
    deliverWrapped('A', 1);
    deliverWrapped('B', 900);
    deliverWrapped('A', 2);
    deliverWrapped('B', 901);
    expect(resyncCount(ws)).toBe(0);
  });
});
