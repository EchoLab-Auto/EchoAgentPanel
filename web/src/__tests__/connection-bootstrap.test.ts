//! 重连引导契约（2026-09-13 去主智能体 / 多实例）。
//!
//! 背景：Core 侧 team_id 变为必填；QQ 管理命令在无实例时会被明确拒绝。
//! 引导阶段发送的命令必须"必成功"——否则面板每次打开都会弹出无意义提示：
//! - 不发送 team_id 为空的 RequestTrunkTimeline（等 TeamsList 到达后由
//!   App 的 watcher 用列表首个发起）；
//! - 不预取 QQ 过滤配置（QqPanel/QqLoginSection 打开时按实例自行刷新）。

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

  /** 测试辅助：模拟连接建立，触发引导逻辑。 */
  triggerOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

async function bootstrapCommands(): Promise<string[]> {
  const { startConnection } = await import('../connection');
  startConnection();
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  ws.triggerOpen();
  return ws.sent;
}

describe('重连引导命令（去主智能体）', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('没有保存的 Agent 时不发送空 team_id 的 TrunkTimeline', async () => {
    const sent = await bootstrapCommands();
    expect(sent.some((c) => c.includes('RequestTrunkTimeline'))).toBe(false);
  });

  it('只读发现命令用显式 broadcast 信封（中继不再按命令名猜只读）', async () => {
    const sent = await bootstrapCommands();
    const state = sent.find((c) => c.includes('RequestState'));
    const teams = sent.find((c) => c.includes('RequestTeamsList'));
    for (const payload of [state, teams]) {
      expect(payload).toBeTruthy();
      const parsed = JSON.parse(payload as string) as { broadcast?: boolean; frame?: unknown };
      expect(parsed.broadcast).toBe(true);
      expect(parsed.frame).toBeTruthy();
    }
  });

  it('不预取 QQ 过滤配置（无 QQ 部署下必被拒）', async () => {
    const sent = await bootstrapCommands();
    expect(sent.some((c) => c.includes('RequestQqFilterConfig'))).toBe(false);
  });

  it('保存过 Agent 时按其 id 请求时间线', async () => {
    localStorage.setItem('echo-panel-active-team', 'self-coding');
    const sent = await bootstrapCommands();
    const timeline = sent.find((c) => c.includes('RequestTrunkTimeline'));
    expect(timeline).toBeTruthy();
    expect(timeline).toContain('self-coding');
  });

  it('握手期（CONNECTING）发送的命令排队，连接建立后补发且不弹错', async () => {
    const { startConnection, sendCommand } = await import('../connection');
    const { state } = await import('../store');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    // 刷新页面后组件挂载即发请求，此刻握手未完成。
    sendCommand({ RequestShellSessions: { team_id: null } });
    expect(state.toasts.length).toBe(0); // 不再误报"未连接到 Core"
    expect(ws.sent.some((c) => c.includes('RequestShellSessions'))).toBe(false);
    ws.triggerOpen();
    expect(ws.sent.some((c) => c.includes('RequestShellSessions'))).toBe(true);
    // 补发只做一次：重复 onopen 不再重复投递。
    expect(ws.sent.filter((c) => c.includes('team_id\":null')).length).toBe(1);
  });

  it('连接不存在时仍给出明确提示（命令确实没发出去）', async () => {
    const { sendCommand } = await import('../connection');
    const { state } = await import('../store');
    sendCommand({ RequestShellSessions: {} });
    expect(state.toasts.length).toBe(1);
    expect(state.toasts[0].text).toContain('未连接到 Core');
  });

  it('其余引导命令照常发送', async () => {
    const sent = await bootstrapCommands();
    for (const cmd of [
      'RequestState',
      'RequestAdapterStatus',
      'RequestTeamsList',
      'RequestShellSessions',
    ]) {
      expect(sent.some((c) => c.includes(cmd)), cmd).toBe(true);
    }
  });
});
