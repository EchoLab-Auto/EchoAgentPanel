//! 会话去重契约：会话身份 = (id, team_id)，`core`（运行区域）只是归属标注。
//! 曾经的 bug：去重要求 core 精确相等 → 中继加壳抖动期间的同一个会话以
//! `core=null` 与 `core='core'` 两份并存，切换器出现**同名重复会话**。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import type { BackendEvent, SessionInfo } from '../protocol';

const SID = 'local:workspace:echo-prodoc:local_user';

function session(core: string | null): BackendEvent {
  const s = {
    id: SID,
    node_id: 'node-a',
    region_name: '本机',
    core,
    team_id: 'EchoCode',
    platform: 'local',
    scope: 'workspace',
    user_id: 'local_user',
    nickname: 'echo-prodoc',
    group_name: null,
    last_active: 1,
    last_message: '',
  } as SessionInfo;
  return { SessionUpdated: { session: s } } as unknown as BackendEvent;
}

describe('会话去重（core 只是归属，不是身份）', () => {
  beforeEach(() => {
    state.sessions = [];
    state.regions = {};
    state.knownCores = new Set();
  });

  it('先来无归属、后来带归属 → 收编为一条（不重复）', () => {
    dispatch(session(null), null);
    expect(state.sessions).toHaveLength(1);
    dispatch(session('core'), 'core');
    expect(state.sessions).toHaveLength(1);
    expect((state.sessions[0] as { core?: string | null }).core).toBe('core');
  });

  it('先来带归属、后来无归属副本 → 丢弃副本', () => {
    dispatch(session('core'), 'core');
    dispatch(session(null), null);
    expect(state.sessions).toHaveLength(1);
    expect((state.sessions[0] as { core?: string | null }).core).toBe('core');
  });

  it('同一会话的多个无归属副本不会累积', () => {
    dispatch(session(null), null);
    dispatch(session(null), null);
    expect(state.sessions).toHaveLength(1);
  });

  it('不同 team 的同名会话互相独立', () => {
    dispatch(session('core'), 'core');
    const other: SessionInfo = {
      id: SID,
      core: 'core',
      team_id: 'alix',
      platform: 'local',
      scope: 'workspace',
      user_id: 'local_user',
      nickname: 'echo-prodoc',
      group_name: null,
      last_active: 1,
      last_message: '',
    };
    dispatch({ SessionUpdated: { session: other } } as unknown as BackendEvent, 'core');
    expect(state.sessions).toHaveLength(2);
  });
});
