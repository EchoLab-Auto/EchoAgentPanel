// Phase 0（2026-10）：会话/运行态/缓存按 (core, id) 复合键隔离。
// 会话 id（每个 core 都有 local:tui::local_user）与 shell id（每 core 都从
// sh-1 起）跨 core 相同，必须用复合键，否则运行态/终端/时间线互相覆盖。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state, dispatch } from '../store';
import { sessionKey, sessionScopedKey, teamKey } from '../keys';
import type { BackendEvent, TeamInfo } from '../protocol';

/** TeamInfo 工厂：只写用例关心的字段，其余取 Core 的缺省值。 */
function team(id: string, core: string | null): TeamInfo {
  return {
    id,
    node_id: null,
    region_name: null,
    name: id,
    description: '',
    enabled: true,
    running: true,
    system_skills: [],
    sessions: 0,
    system_prompt: '',
    disabled_tools: [],
    disabled_skills: [],
    enabled_modules: [],
    enabled_tools: [],
    enabled_skills: [],
    memory_limit_tokens: null,
    context_window_tokens: null,
    api_profile: null,
    available_modules: [],
    available_tools: [],
    core,
  };
}

const SID = 'local:tui::local_user';

describe('Phase 0：运行态/缓存按 (core, id) 隔离', () => {
  beforeEach(() => {
    state.teams = [team('default', 'core-a'), team('default', 'core-b')];
    state.activeTeamId = 'default';
    state.activeRegion = 'core-a';
    state.activeRegion = 'core-a';
    state.activities = {};
    state.tasks = [];
    state.teamTimelines = {};
    state.shellSessions = [];
    state.shellTerminals = {};
    state.trunkTeamId = null;
    state.trunk = [];
  });

  it('activities 用三元键（core, team, session）：同名会话跨 core 各自独立', () => {
    dispatch(
      { AgentThinking: { session_id: SID, team_id: 'default' } } as unknown as BackendEvent,
      'core-a',
    );
    state.activeRegion = 'core-b';
    dispatch(
      { AgentThinking: { session_id: SID, team_id: 'default' } } as unknown as BackendEvent,
      'core-b',
    );
    expect(Object.keys(state.activities).sort()).toEqual(
      [sessionScopedKey('core-a', 'default', SID), sessionScopedKey('core-b', 'default', SID)].sort(),
    );
  });

  it('teamTimelines 用 teamKey：同名 team 跨 core 各自缓存', () => {
    const ev = (content: string): BackendEvent =>
      ({
        TrunkTimeline: { messages: [], seq: 1, team_id: 'default', full: true, _tag: content },
      }) as unknown as BackendEvent;
    dispatch(ev('a'), 'core-a');
    state.activeRegion = 'core-b';
    dispatch(ev('b'), 'core-b');
    expect(state.teamTimelines[teamKey('core-a', 'default')]).toBeTruthy();
    expect(state.teamTimelines[teamKey('core-b', 'default')]).toBeTruthy();
  });

  it('shellTerminals 用 sessionKey：同名 sh-1 跨 core 不串终端', () => {
    const started = (): BackendEvent =>
      ({
        ShellSessionStarted: {
          session: {
            session_id: 'sh-1',
            team_id: 'default',
            workdir: '/tmp',
            created_at_ms: 0,
            last_active_ms: 0,
            exec_count: 0,
            running: true,
          },
        },
      }) as unknown as BackendEvent;
    dispatch(started(), 'core-a');
    dispatch(started(), 'core-b');
    expect(state.shellSessions).toHaveLength(2);
    expect(state.shellTerminals[sessionKey('core-a', 'sh-1')]).toBeTruthy();
    expect(state.shellTerminals[sessionKey('core-b', 'sh-1')]).toBeTruthy();
  });
});

// ── 会话路由：同名会话优先 activeRegion ──
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

describe('Phase 0：同名会话路由优先 activeRegion', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('两个 core 都有该 session_id 时按 activeRegion 定向', async () => {
    const { startConnection, sendCommand } = await import('../connection');
    const { state: s } = await import('../store');
    startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.triggerOpen();
    ws.sent.length = 0;
    s.sessions = [
      { id: SID, core: 'core-a', team_id: 'default', platform: 'local', scope: 'tui', user_id: 'u', nickname: '', group_name: null, last_active: 0, last_message: '' },
      { id: SID, core: 'core-b', team_id: 'default', platform: 'local', scope: 'tui', user_id: 'u', nickname: '', group_name: null, last_active: 0, last_message: '' },
    ];
    s.teams = [team('default', 'core-a'), team('default', 'core-b')];
    s.activeRegion = 'core-b';
    s.activeRegion = 'core-b';
    sendCommand({
      SendMessage: { session_id: SID, content: 'hi', images: [], files: [], team_id: 'default' },
    });
    const last = JSON.parse(ws.sent[ws.sent.length - 1]) as { core: string };
    expect(last.core).toBe('core-b');
  });
});
