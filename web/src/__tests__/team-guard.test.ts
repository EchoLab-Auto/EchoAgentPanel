//! 会话命令的 `team_id` 守卫（2026-11）。
//!
//! 现场：面板一直弹「该命令必须指定 team_id」。Core 只在命令**真的**缺
//! `team_id` 时拒绝，而 `activeTeamId` 是异步解析的（storage → `TeamsList`）
//! ——挂载期发出的会话命令正好落在这个窗口里。守卫把命令暂存，解析后重放。

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  heldCount,
  hold,
  requiresTeam,
  resetHeld,
  takeHeldForTeam,
} from '../team-guard';
import type { BackendCommand } from '../protocol';

/** 每次新建：暂存重放会**就地改写** `team_id`，共用一份会串味。 */
function sendWithNullTeam(): BackendCommand {
  return { SendMessage: { session_id: 's', content: 'hi', images: [], files: [], team_id: null } };
}

describe('requiresTeam：哪些命令必须等 agent 解析完', () => {
  beforeEach(() => resetHeld());

  it('会话命令缺 team_id → 必须等', () => {
    expect(requiresTeam(sendWithNullTeam())).toBe(true);
    expect(requiresTeam({ RequestContext: { team_id: null, session_id: 's' } })).toBe(true);
    expect(requiresTeam({ RequestWorkspaceSessions: { team_id: null } })).toBe(true);
  });

  it('已有 team_id → 不等（原样发）', () => {
    expect(
      requiresTeam({
        SendMessage: { session_id: 's', content: 'hi', images: [], files: [], team_id: 'base' },
      }),
    ).toBe(false);
  });

  it('进程级命令即使 team_id 为空也不拦', () => {
    // Shell 会话列表刻意用 null 表示"进程级"：拦下来等于让外壳面板永远空。
    expect(requiresTeam({ RequestShellSessions: { team_id: null } })).toBe(false);
    expect(requiresTeam('RequestState')).toBe(false);
    expect(requiresTeam('RequestTeamsList')).toBe(false);
  });

  it('不在清单里的命令不受影响', () => {
    expect(requiresTeam({ RequestSessionHistory: { team_id: null, session_id: 's' } } as never)).toBe(
      false,
    );
  });
});

describe('暂存与重放', () => {
  beforeEach(() => resetHeld());

  it('重放时把 team_id 改写成解析出的 agent', () => {
    expect(hold(sendWithNullTeam())).toBe(true);
    expect(hold({ RequestContext: { team_id: null, session_id: 's' } })).toBe(true);
    expect(heldCount()).toBe(2);

    const replayed = takeHeldForTeam('base');
    expect(replayed).toHaveLength(2);
    expect(
      (replayed[0] as { SendMessage: { team_id: string } }).SendMessage.team_id,
    ).toBe('base');
    expect(
      (replayed[1] as { RequestContext: { team_id: string } }).RequestContext.team_id,
    ).toBe('base');
    expect(heldCount()).toBe(0);
  });
});

// ── 集成：sendCommand 的收口 ────────────────────────────────────────────────

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

describe('sendCommand：未解析 agent 时会话命令不入网', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('先暂存，解析出 agent 后按序重放（team_id 已改写）', async () => {
    const { nextTick } = await import('vue');
    const conn = await import('../connection');
    const { state } = await import('../store');
    const guard = await import('../team-guard');

    conn.startConnection();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.triggerOpen();

    state.activeTeamId = null;
    state.teams = [];
    const before = ws.sent.length;

    // 挂载期那条命令：此刻没有 agent，但**不该**弹错、也不该发出去。
    expect(conn.sendCommand(sendWithNullTeam())).toBe(true);
    expect(ws.sent.length).toBe(before);
    expect(guard.heldCount()).toBe(1);

    // TeamsList 到达 → App 解析出 agent。
    state.teams = [{ id: 'base', name: 'base', core: null } as never];
    state.activeTeamId = 'base';
    await nextTick();

    // 单上游无 core 外壳 → 帧形状是 `{type:'command', payload}`；有上游时是
    // `{core, frame:{…}}`。两种都接受，只关心载荷里的 team_id。
    const teamIds = ws.sent
      .slice(before)
      .filter((text) => text.includes('SendMessage'))
      .map((text) => {
        const parsed = JSON.parse(text) as {
          payload?: { SendMessage?: { team_id?: string | null } };
          frame?: { payload?: { SendMessage?: { team_id?: string | null } } };
        };
        return (parsed.frame?.payload ?? parsed.payload)?.SendMessage?.team_id;
      });
    expect(teamIds).toEqual(['base']);
    expect(guard.heldCount()).toBe(0);

    conn.resetHeldTeamCommands();
  });
});
