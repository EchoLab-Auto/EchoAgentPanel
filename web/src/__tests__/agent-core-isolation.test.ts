// 多上游（多 core）人格隔离回归（2026-10）：
// 人格身份是 (core, id)。此前 TeamsList 整体覆盖 + 路由不看 team 归属，导致
// 把 A core 的 `default` 发给 B core →「智能体 default 不存在」。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state, dispatch } from '../store';
import { belongsToActiveTeam, coreForTeam } from '../state';
import type { BackendEvent, TeamInfo } from '../protocol';

function team(id: string, core: string | null, over: Partial<TeamInfo> = {}): TeamInfo {
  return { id, name: id, description: '', enabled: true, sessions: 0, core, ...over };
}

const teamsEvent = (teams: TeamInfo[]): BackendEvent =>
  ({ TeamsList: { teams } }) as unknown as BackendEvent;

describe('多上游人格 (core, id) 隔离', () => {
  beforeEach(() => {
    state.teams = [];
    state.activeTeamId = null;
    state.activeTeamCore = null;
    state.sessions = [];
    state.activeCore = null;
    state.knownCores = new Set();
  });

  it('TeamsList 按 core 合并，绝不整体覆盖', () => {
    dispatch(teamsEvent([team('default', 'core-a')]), 'core-a');
    dispatch(teamsEvent([team('alix', 'core-b')]), 'core-b');
    expect(state.teams.map((t) => `${t.core}:${t.id}`)).toEqual([
      'core-a:default',
      'core-b:alix',
    ]);
  });

  it('同名 team 跨 core 同时保留（身份是 (core, id)）', () => {
    dispatch(teamsEvent([team('default', 'core-a')]), 'core-a');
    dispatch(teamsEvent([team('default', 'core-b')]), 'core-b');
    expect(state.teams).toHaveLength(2);
    expect(state.teams.map((t) => t.core).sort()).toEqual(['core-a', 'core-b']);
  });

  it('同一 core 的 TeamsList 刷新只替换该 core 的切片', () => {
    dispatch(teamsEvent([team('a', 'core-a'), team('b', 'core-a')]), 'core-a');
    dispatch(teamsEvent([team('x', 'core-b')]), 'core-b');
    dispatch(teamsEvent([team('a', 'core-a')]), 'core-a');
    expect(state.teams.map((t) => `${t.core}:${t.id}`).sort()).toEqual([
      'core-a:a',
      'core-b:x',
    ]);
  });

  it('coreForTeam 优先 activeTeamCore 消歧，否则取带 core 的条目', () => {
    dispatch(teamsEvent([team('default', 'core-a')]), 'core-a');
    dispatch(teamsEvent([team('default', 'core-b')]), 'core-b');
    state.activeTeamCore = 'core-b';
    expect(coreForTeam(state, 'default')).toBe('core-b');
    expect(coreForTeam(state, 'default', 'core-a')).toBe('core-a');
    expect(coreForTeam(state, 'missing')).toBeUndefined();
  });

  it('belongsToActiveTeam 按 (id, core) 过滤，同名跨 core 不串显', () => {
    dispatch(teamsEvent([team('default', 'core-a'), team('default', 'core-b')]), null);
    state.activeTeamId = 'default';
    state.activeTeamCore = 'core-a';
    expect(belongsToActiveTeam(state, 'default', 'core-a')).toBe(true);
    expect(belongsToActiveTeam(state, 'default', 'core-b')).toBe(false);
    // 事件未带 core（单上游/旧 core）时不过滤，保持兼容。
    expect(belongsToActiveTeam(state, 'default')).toBe(true);
  });
});

// ── sendCommand 人格一致性守卫 ──
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
}

describe('sendCommand 人格归属路由守卫', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  async function connect() {
    const { startConnection } = await import('../connection');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.triggerOpen();
    ws.sent.length = 0; // 丢弃引导命令，只看后续
    return ws;
  }

  it('目标 core 不拥有人格时重定向到拥有人格的 core', async () => {
    const { sendCommand } = await import('../connection');
    const { state: s } = await import('../store');
    const ws = await connect();
    s.teams = [team('default', 'core-a'), team('alix', 'core-b')];
    s.activeTeamCore = 'core-a';
    // 调度选到了 core-b，但命令带 core-a 的人格 → 必须改发 core-a。
    sendCommand({ RequestTrunkTimeline: { team_id: 'default' } }, 'core-b');
    const last = JSON.parse(ws.sent[ws.sent.length - 1]) as { core: string };
    expect(last.core).toBe('core-a');
  });

  it('目标 core 拥有人格时保留调度选择', async () => {
    const { sendCommand } = await import('../connection');
    const { state: s } = await import('../store');
    const ws = await connect();
    s.teams = [team('alix', 'core-a'), team('alix', 'core-b')];
    s.activeTeamCore = 'core-a';
    sendCommand({ RequestTrunkTimeline: { team_id: 'alix' } }, 'core-b');
    const last = JSON.parse(ws.sent[ws.sent.length - 1]) as { core: string };
    expect(last.core).toBe('core-b');
  });

  it('无 targetCore 时按人格归属定向', async () => {
    const { sendCommand } = await import('../connection');
    const { state: s } = await import('../store');
    const ws = await connect();
    s.teams = [team('default', 'core-a')];
    sendCommand({ SendMessage: { session_id: 'new', content: 'hi', team_id: 'default' } });
    const last = JSON.parse(ws.sent[ws.sent.length - 1]) as { core: string };
    expect(last.core).toBe('core-a');
  });
});
