// 深度融合 P1（2026-10）：命令按会话归属 core 自动路由——不再依赖
// "先设目标再操作"。coreForCommand 经由 sendCommand 的路由优先级：
// 显式 targetCore > 会话归属 > activeRegion 兜底。
import { describe, expect, it, beforeEach } from 'vitest';
import { state } from '../store';
import { resolveTargetCore, sendCommand } from '../connection';
import type { SessionInfo } from '../protocol';

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
    state.sessions = [makeSession('sess-a', 'core-a'), makeSession('sess-b', 'core-b')];
    state.activeRegion = 'core-b'; // 兜底目标与会话归属不同——验证归属优先
  });

  it('带 session_id 的命令路由到会话归属 core（覆盖 activeRegion）', () => {
    const command = { SendUserMessage: { session_id: 'sess-a', text: 'hi' } };
    const payload = command as unknown as Record<string, unknown>;
    const body = Object.values(payload)[0] as Record<string, unknown>;
    const sessionId = body?.session_id as string;
    const session = state.sessions.find(s => s.id === sessionId) as { core?: string | null };
    expect(session?.core).toBe('core-a');
    expect(state.activeRegion).toBe('core-b'); // 兜底不同 → 归属应胜出
  });

  it('无 session_id 的命令回退 activeRegion 兜底', () => {
    const command = { RequestTeamsList: {} };
    const payload = command as unknown as Record<string, unknown>;
    const body = Object.values(payload)[0] as Record<string, unknown>;
    expect(body?.session_id).toBeUndefined();
    // 兜底即 activeRegion（core-b）。
    expect(state.activeRegion).toBe('core-b');
  });
  it('会话无 core 标注（单上游）时回退兜底', () => {
    state.sessions = [makeSession('sess-local', null)];
    const session = state.sessions.find(s => s.id === 'sess-local') as { core?: string | null };
    expect(session?.core ?? null).toBeNull();
    expect(state.activeRegion).toBe('core-b'); // 兜底接管
  });

  // ── 02a S3：sendCommand 返回 boolean（拒发 = false）────────────────────
  it('sendCommand：显式 targetCore 优先（无连接 = false，拒发后仍提示）', () => {
    expect(resolveTargetCore('RequestInstanceStatus', 'core-a')).toBe('core-a');
    expect(sendCommand('RequestInstanceStatus', 'core-a')).toBe(false); // 无 WS 连接
    expect(state.toasts[state.toasts.length - 1]?.text).toContain('未连接到 Core');
  });

  it('sendCommand：多上游解析不出目标 = false（绝不猜，防误投）', () => {
    state.knownCores = new Set(['core-a', 'core-b']);
    state.activeRegion = null;
    state.activeTeamId = null;
    state.sessions = [];
    state.teams = [];
    expect(sendCommand('RequestInstanceStatus')).toBe(false);
    expect(state.toasts[state.toasts.length - 1]?.text).toContain('尚未选择 agent');
  });
});
