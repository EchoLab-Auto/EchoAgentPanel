//! 会话注册表复合键契约（多会话，2026-09）。
//!
//! 背景：`SessionUpdated` 原按 `session.id` 单键 upsert——但不同智能体
//! 各自拥有同名会话（都叫 `local:tui::local_user`），后到的智能体会覆盖
//! 先到的（多会话切换器/侧栏因此丢项，入口行「会话」按钮不出现）。
//! 修复：按 (team_id, id) 复合键匹配。

import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../state';
import type { BackendEvent, SessionInfo } from '../protocol';

function sessionEvent(session: Partial<SessionInfo>): BackendEvent {
  return {
    SessionUpdated: {
      session: {
        id: 'local:tui::local_user',
        team_id: 'alix',
        platform: 'local',
        scope: 'tui',
        user_id: 'local_user',
        nickname: 'local user',
        group_name: null,
        last_active: 1,
        last_message: '',
        ...session,
      } as SessionInfo,
    },
  } as BackendEvent;
}

describe('SessionUpdated 复合键', () => {
  it('同名会话按团队各自登记，互不覆盖', () => {
    let state = initialState();
    state = reduce(state, sessionEvent({ team_id: 'alix', last_message: 'a' }));
    state = reduce(state, sessionEvent({ team_id: 'self-coding', last_message: 's' }));
    state = reduce(state, sessionEvent({ team_id: 'alix', last_message: 'a2' }));

    expect(state.sessions).toHaveLength(2);
    const alix = state.sessions.find((s) => s.team_id === 'alix');
    const sc = state.sessions.find((s) => s.team_id === 'self-coding');
    expect(alix?.last_message).toBe('a2');
    expect(sc?.last_message).toBe('s');
  });

  it('同一团队的重复事件是更新而非新增', () => {
    let state = initialState();
    state = reduce(state, sessionEvent({ team_id: 'alix', last_message: 'v1' }));
    state = reduce(state, sessionEvent({ team_id: 'alix', last_message: 'v2' }));
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].last_message).toBe('v2');
  });

  it('不同 id 的会话各自登记', () => {
    let state = initialState();
    state = reduce(state, sessionEvent({ team_id: 'alix' }));
    state = reduce(
      state,
      sessionEvent({ team_id: 'alix', id: 'qq:dm::1828980067', platform: 'qq', scope: 'dm' }),
    );
    expect(state.sessions).toHaveLength(2);
  });
});
