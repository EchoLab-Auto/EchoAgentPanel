//! 重连引导契约（2026-09-13 去主智能体 / 多实例）。
//!
//! 背景：Core 侧 team_id 变为必填；QQ 管理命令在无实例时会被明确拒绝。
//! 引导阶段发送的命令必须"必成功"——否则面板每次打开都会弹出无意义提示：
//! - 不发送 team_id 为空的 RequestTrunkTimeline（等 TeamsList 到达后由
//!   App 的 watcher 用列表首个发起）；
//! - 不预取实例管理数据（打开通用实例面板时按实例自行刷新）。

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

  it('sendPending 拒发时不登记等待（否则白挂 20 秒"正在加载"）', async () => {
    // 背景：多上游下解析不出目标时 `sendCommand` 拒发（弹 toast、return false），
    // 命令根本没出去。若此前已 `trackRequest` 登记，这条等待没人销账，
    // `usePending` 会一路推到 timeout（20s）——面板显示"正在加载"、内容空白。
    const { startConnection, sendPending } = await import('../connection');
    const { state } = await import('../store');
    const { usePending } = await import('../pending');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.triggerOpen();

    // 制造"多上游但解析不出目标"：knownCores > 1 且无 activeRegion/会话归属。
    state.knownCores.clear();
    state.knownCores.add('core-a');
    state.knownCores.add('core-b');
    state.activeRegion = null;
    state.sessions = [];

    const before = ws.sent.length;
    sendPending({ RequestWorkspaceSessions: { team_id: null } }, 'test:rejected');
    // 拒发：没有新帧出站
    expect(ws.sent.length).toBe(before);
    // 且没有留下等待登记
    expect(usePending('test:rejected').phase.value).toBe('idle');
  });

  it('不预取实例管理数据（连接建立不动实例通道）', async () => {
    const sent = await bootstrapCommands();
    // 旧 QQ 命令已随泛化删除；新通道（InvokeInstanceOp）同样不在握手期预取。
    expect(sent.some((c) => c.includes('InvokeInstanceOp'))).toBe(false);
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

  it('握手期排队的命令在补发时重新解析目标 core（不在入队时烤死）', async () => {
    // 2026-10 修复：入队时 teams 尚未到达，路由会落到 activeRegion；onopen
    // 后 TeamsList 校正了人格归属，补发必须按**校正后**的归属重新路由。
    const { startConnection, sendCommand } = await import('../connection');
    const { state, dispatch } = await import('../store');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    // 入队时：activeRegion 是 core-a，teams 表里还没有任何人格。
    state.activeRegion = 'core-a';
    state.teams = [];
    sendCommand({ SendMessage: { session_id: 'local:tui::local_user', team_id: 'bot', content: 'hi' } });
    expect(ws.sent.some((c) => c.includes('SendMessage'))).toBe(false);
    // onopen 前 TeamsList 到达：人格 bot 实际归属 core-b。
    dispatch(
      { TeamsList: { teams: [{ id: 'bot', name: 'bot', description: '', enabled: true, sessions: 0 }] } } as never,
      'core-b',
    );
    ws.triggerOpen();
    const queued = ws.sent.find((c) => c.includes('SendMessage'));
    expect(queued).toBeTruthy();
    const parsed = JSON.parse(queued as string) as { core?: string };
    // 补发的信封必须路由到 core-b（人格真实归属），而不是入队时的 core-a。
    expect(parsed.core).toBe('core-b');
  });

  it('连接不存在时仍给出明确提示（命令确实没发出去）', async () => {
    const { sendCommand } = await import('../connection');
    const { state } = await import('../store');
    // 02a S3：返回值 = false（拒发）。
    expect(sendCommand({ RequestShellSessions: {} })).toBe(false);
    expect(state.toasts.length).toBe(1);
    expect(state.toasts[0].text).toContain('未连接到 Core');
  });

  it('sendCommand 返回值（02a S3）：握手期排队 / 已连接发送 = true', async () => {
    const { startConnection, sendCommand } = await import('../connection');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    expect(sendCommand({ RequestShellSessions: {} })).toBe(true); // 握手期已排队
    ws.triggerOpen();
    expect(sendCommand('RequestState')).toBe(true); // 已连接已发送
  });

  it('sendCommand 返回值（02a S3）：多上游解析不出目标 = false（拒发）', async () => {
    const { sendCommand } = await import('../connection');
    const { state } = await import('../store');
    state.knownCores = new Set(['core-a', 'core-b']);
    state.activeRegion = null;
    state.activeTeamId = null;
    state.sessions = [];
    state.teams = [];
    expect(sendCommand('RequestTeamsList')).toBe(false);
    expect(state.toasts[state.toasts.length - 1]?.text).toContain('尚未选择 agent');
  });

  it('重连引导：区域已知时管理面命令定向补发', async () => {
    // 刷新/重连场景：App.vue 会把 localStorage 的 activeRegion 同步进
    // state（此处在测试里直接预置，等价效果）。
    const { state } = await import('../store');
    state.activeRegion = 'core-a';
    const sent = await bootstrapCommands();
    for (const cmd of [
      'RequestState',
      'RequestInstanceStatus',
      'RequestTeamsList',
      'RequestShellSessions',
    ]) {
      expect(sent.some((c) => c.includes(cmd)), cmd).toBe(true);
    }
  });

  it('首访（区域未定）不盲发单值管理面命令——避免「尚未选择 agent」误报', async () => {
    const sent = await bootstrapCommands();
    // 广播发现命令照常（只读、覆盖全部上游）。
    for (const cmd of ['RequestState', 'RequestTeamsList']) {
      expect(sent.some((c) => c.includes(cmd)), cmd).toBe(true);
    }
    // 单值管理面（实例/Shell 会话）：区域未定时跳过；TeamsList 到达后
    // 由 App.vue 的 activeRegion watcher 统一拉取（2026-10 审计修复）。
    expect(sent.some((c) => c.includes('RequestInstanceStatus'))).toBe(false);
    expect(sent.some((c) => c.includes('RequestShellSessions'))).toBe(false);
  });
});
