// 2026-10 多上游修复：ChecklistUpdated / ContextSnapshot 由全局单值槽改为
// 按 (core, session_id) 复合键存储——A/B 两 core 的同名会话（各自都有
// local:tui::local_user）的快照不得互相覆盖。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { sessionKey } from '../keys';
import type { BackendEvent, TeamInfo } from '../protocol';

function team(id: string, core: string | null): TeamInfo {
  return { id, name: id, description: '', enabled: true, sessions: 0, core };
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

  it('ContextSnapshot：旧 Core 缺 session_id 时归入 sessionKey(core, \'\')', () => {
    dispatch(contextEvent(null, 777), 'core-a');
    expect(state.contexts[sessionKey('core-a', '')].total_tokens).toBe(777);
    // 单上游裸帧：键为裸空串。
    dispatch(contextEvent(null, 888), null);
    expect(state.contexts[''].total_tokens).toBe(888);
  });
});
