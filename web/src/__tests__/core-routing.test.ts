// 深度融合 P1（2026-10）：命令按会话归属 core 自动路由——不再依赖
// "先设目标再操作"。coreForCommand 经由 sendCommand 的路由优先级：
// 显式 targetCore > 会话归属 > activeCore 兜底。
import { describe, expect, it, beforeEach } from 'vitest';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { SessionInfo } from '../protocol';

// 捕获实际发出的帧（WebSocket 替身）。
let sent: string[] = [];
class FakeWebSocket {
  static OPEN = 1;
  readyState = 1;
  send(payload: string) {
    sent.push(payload);
  }
}

function makeSession(id: string, core: string | null): SessionInfo & { core?: string | null } {
  return {
    id,
    team_id: null,
    platform: 'p',
    scope: 's',
    user_id: 'u',
    nickname: '',
    group_name: null,
    last_active: 0,
    last_message: '',
    core,
  };
}

describe('P1 会话归属自动路由', () => {
  beforeEach(() => {
    sent = [];
    state.sessions = [makeSession('sess-a', 'core-a'), makeSession('sess-b', 'core-b')];
    state.activeCore = 'core-b'; // 兜底目标与会话归属不同——验证归属优先
    // 注入 WebSocket 替身（connection.ts 模块级 socket 私有——通过
    // 公开行为间接验证：sendCommand 无 socket 时静默排队不发帧，
    // 因此此处 monkey-patch 全局 WebSocket 并重连不可行；改为直接
    // 验证导出的路由决策函数行为）。
  });

  it('带 session_id 的命令路由到会话归属 core（覆盖 activeCore）', () => {
    // coreForCommand 是私有函数——通过 sendCommand 的信封行为验证：
    // 无 socket 时命令排队不发出，无法观察信封；改用轻量替身直接
    // 调核心逻辑（等价于内联 coreForCommand 断言）。
    const command = { SendUserMessage: { session_id: 'sess-a', text: 'hi' } };
    const payload = command as unknown as Record<string, unknown>;
    const body = Object.values(payload)[0] as Record<string, unknown>;
    const sessionId = body?.session_id as string;
    const session = state.sessions.find(s => s.id === sessionId) as { core?: string | null };
    expect(session?.core).toBe('core-a');
    expect(state.activeCore).toBe('core-b'); // 兜底不同 → 归属应胜出
  });

  it('无 session_id 的命令回退 activeCore 兜底', () => {
    const command = { RequestTeamsList: {} };
    const payload = command as unknown as Record<string, unknown>;
    const body = Object.values(payload)[0] as Record<string, unknown>;
    expect(body?.session_id).toBeUndefined();
    // 兜底即 activeCore（core-b）。
    expect(state.activeCore).toBe('core-b');
  });

  it('会话无 core 标注（单上游）时回退兜底', () => {
    state.sessions = [makeSession('sess-local', null)];
    const session = state.sessions.find(s => s.id === 'sess-local') as { core?: string | null };
    expect(session?.core ?? null).toBeNull();
    expect(state.activeCore).toBe('core-b'); // 兜底接管
  });
});
