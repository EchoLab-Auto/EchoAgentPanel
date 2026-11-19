// 2026-10 多上游修复：ChecklistUpdated / ContextSnapshot 由全局单值槽改为
// 按 (core, session_id) 复合键存储——A/B 两 core 的同名会话（各自都有
// local:tui::local_user）的快照不得互相覆盖。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import {
  activeTeam,
  checklistEntryKey,
  checklistSourceLabel,
  checklistsForRegion,
  checklistsForSession,
  resetManagementState,
} from '../state';
import { checklistKey, sessionKey } from '../keys';
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

function checklistEvent(sessionId: string) {
  return {
    ChecklistUpdated: {
      session_id: sessionId,
      state: {
        lists: [
          {
            name: `list-of-${sessionId}`,
            items: [
              { text: 'a', done: true },
              { text: 'b', done: false },
            ],
          },
        ],
      },
    },
  } as unknown as BackendEvent;
}

function contextEvent(sessionId: string | null, total: number) {
  return {
    ContextSnapshot: {
      session_id: sessionId,
      messages: [],
      blocks: [],
      total_tokens: total,
      limit_tokens: 131072,
    },
  } as unknown as BackendEvent;
}

describe('多上游：checklists / contexts 按 (core, session_id) 隔离', () => {
  beforeEach(() => {
    state.teams = [team('default', 'core-a'), team('default', 'core-b')];
    state.activeTeamId = 'default';
    state.activeRegion = 'core-a';
    state.checklists = {};
    state.contexts = {};
  });

  it('ChecklistUpdated：同名会话跨 core 各自独立、互不覆盖', () => {
    dispatch(checklistEvent(SID), 'core-a');
    dispatch(checklistEvent(SID), 'core-b');

    const keyA = sessionKey('core-a', SID);
    const keyB = sessionKey('core-b', SID);
    expect(state.checklists[keyA]).toHaveLength(1);
    expect(state.checklists[keyB]).toHaveLength(1);
    expect(state.checklists[keyA][0].done).toBe(1);
    expect(state.checklists[keyA][0].total).toBe(2);

    // B core 再次更新只覆盖自己的槽位。
    dispatch(checklistEvent(SID), 'core-b');
    expect(state.checklists[keyA]).toHaveLength(1);
    expect(state.checklists[keyB][0].name).toBe(`list-of-${SID}`);
  });

  it('ChecklistUpdated：单上游（core=null）退化为裸 session_id 键', () => {
    dispatch(checklistEvent(SID), null);
    expect(state.checklists[SID]).toHaveLength(1);
    expect(state.checklists[SID][0].done).toBe(1);
  });

  it('ContextSnapshot：同名会话跨 core 各自独立、互不覆盖', () => {
    dispatch(contextEvent(SID, 1000), 'core-a');
    dispatch(contextEvent(SID, 2000), 'core-b');

    expect(state.contexts[sessionKey('core-a', SID)].total_tokens).toBe(1000);
    expect(state.contexts[sessionKey('core-b', SID)].total_tokens).toBe(2000);

    // A core 再响应不覆盖 B。
    dispatch(contextEvent(SID, 1500), 'core-a');
    expect(state.contexts[sessionKey('core-b', SID)].total_tokens).toBe(2000);
  });

  it('ContextSnapshot：未带 session_id 时归入 sessionKey(core, \'\')', () => {
    dispatch(contextEvent(null, 777), 'core-a');
    expect(state.contexts[sessionKey('core-a', '')].total_tokens).toBe(777);
    // 单上游裸帧：键为裸空串。
    dispatch(contextEvent(null, 888), null);
    expect(state.contexts[''].total_tokens).toBe(888);
  });
});

describe('清单 team 维度（同一 core 多 persona 同名会话）', () => {
  beforeEach(() => {
    state.teams = [team('EchoCode', 'core-a'), team('alix', 'core-a')];
    state.activeTeamId = 'EchoCode';
    state.activeRegion = 'core-a';
    state.checklists = {};
  });

  function teamEvent(sessionId: string, teamId: string | null) {
    return {
      ChecklistUpdated: {
        session_id: sessionId,
        team_id: teamId,
        state: {
          lists: [
            { name: `list-${teamId ?? 'none'}`, items: [{ text: 'x', done: false }] },
          ],
        },
      },
    } as unknown as BackendEvent;
  }

  it('同一 core 内两个 persona 的同名会话清单各自独立', () => {
    dispatch(teamEvent(SID, 'EchoCode'), 'core-a');
    dispatch(teamEvent(SID, 'alix'), 'core-a');
    expect(state.checklists[checklistKey('core-a', 'EchoCode', SID)]).toHaveLength(1);
    expect(state.checklists[checklistKey('core-a', 'alix', SID)]).toHaveLength(1);
    expect(state.checklists[checklistKey('core-a', 'EchoCode', SID)][0].name).toBe('list-EchoCode');
    expect(state.checklists[checklistKey('core-a', 'alix', SID)][0].name).toBe('list-alix');
  });

  it('读助手：优先 team 键（当前 agent 的清单），不串他 persona', () => {
    dispatch(teamEvent(SID, 'EchoCode'), 'core-a');
    dispatch(teamEvent(SID, 'alix'), 'core-a');
    // 当前 agent = EchoCode → 只看到自己的
    expect(checklistsForSession(state, SID)[0].name).toBe('list-EchoCode');
    state.activeTeamId = 'alix';
    expect(checklistsForSession(state, SID)[0].name).toBe('list-alix');
  });

  it('读助手：team 不匹配的会话不串显（各自独立键）', () => {
    dispatch(teamEvent(SID, 'alix'), 'core-a');
    // 当前 agent = EchoCode：alix 的清单不可见。
    expect(checklistsForSession(state, SID)).toHaveLength(0);
    state.activeTeamId = 'alix';
    expect(checklistsForSession(state, SID)).toHaveLength(1);
  });
});

describe('区域切换与 global 聚合（2026-11 作用域基础修复）', () => {
  beforeEach(() => {
    state.teams = [team('EchoCode', 'core-a'), team('alix', 'core-a'), team('EchoCode', 'core-b')];
    state.activeTeamId = 'EchoCode';
    state.activeRegion = 'core-a';
    state.checklists = {};
  });

  function namedEvent(sessionId: string, teamId: string | null, name: string) {
    return {
      ChecklistUpdated: {
        session_id: sessionId,
        team_id: teamId,
        state: { lists: [{ name, items: [{ text: 'x', done: false }] }] },
      },
    } as unknown as BackendEvent;
  }

  it('区域切换保留各 core 的清单快照（resetManagementState 不再清空 checklists）', () => {
    dispatch(namedEvent(SID, 'EchoCode', 'a-list'), 'core-a');
    dispatch(namedEvent(SID, 'EchoCode', 'b-list'), 'core-b');

    resetManagementState(state);

    expect(state.checklists[checklistKey('core-a', 'EchoCode', SID)]?.[0]?.name).toBe('a-list');
    expect(state.checklists[checklistKey('core-b', 'EchoCode', SID)]?.[0]?.name).toBe('b-list');
    // 切走再切回：读到的仍是本区域那一份，不是空也不是别 core 的。
    state.activeRegion = 'core-b';
    expect(checklistsForSession(state, SID)[0]?.name).toBe('b-list');
    state.activeRegion = 'core-a';
    expect(checklistsForSession(state, SID)[0]?.name).toBe('a-list');
  });

  it('global 聚合：只取当前区域；同名清单的来源/行键可辨（不解析复合键）', () => {
    dispatch(namedEvent('local:tui::s1', 'EchoCode', 'todo'), 'core-a');
    dispatch(namedEvent('local:tui::s2', 'EchoCode', 'todo'), 'core-a');
    // 别 core 的同名会话不得混入。
    dispatch(namedEvent('local:tui::s1', 'EchoCode', 'todo'), 'core-b');

    const aggregated = checklistsForRegion(state);
    expect(aggregated.map((list) => list.name)).toEqual(['todo', 'todo']);
    expect(aggregated.map((list) => list.source?.sessionId)).toEqual([
      'local:tui::s1',
      'local:tui::s2',
    ]);
    expect(aggregated.every((list) => list.source?.core === 'core-a')).toBe(true);
    // 行键用来源三元组而不是 list.name：两条同名清单不撞 key。
    expect(new Set(aggregated.map((list, index) => checklistEntryKey(list, index))).size).toBe(2);
    const labels = aggregated.map((list) => checklistSourceLabel(list.source));
    expect(labels[0]).toContain('core-a');
    expect(labels[0]).toContain('local:tui::s1');
    expect(labels[1]).toContain('local:tui::s2');
    expect(labels[0]).not.toBe(labels[1]);
  });

  it('同名清单跨 persona：读侧按显式 teamId 取，互不串显', () => {
    dispatch(namedEvent(SID, 'EchoCode', 'ec-list'), 'core-a');
    dispatch(namedEvent(SID, 'alix', 'alix-list'), 'core-a');

    expect(checklistsForSession(state, SID)[0]?.name).toBe('ec-list');
    expect(checklistsForSession(state, SID, 'alix')[0]?.name).toBe('alix-list');
    expect(checklistsForSession(state, SID, 'EchoCode')[0]?.name).toBe('ec-list');
  });
  it('区域已指定时，同名人格不得跨 Core 回退权限画像', () => {
    state.teams = [team('EchoCode', 'core-a')];
    state.activeTeamId = 'EchoCode';
    state.activeRegion = 'core-b';
    expect(activeTeam(state)).toBeNull();
    expect(activeTeam(state, 'EchoCode')).toBeNull();
    state.activeRegion = 'core-a';
    expect(activeTeam(state)?.core).toBe('core-a');
  });
});
