// 2026-11 清单可靠化：权威快照 / 版本判据 / 全量清理 / 旧 Core 降级。
//
// 覆盖的契约（全部来自 Core 的清单存储：epoch/revision 是 per-persona store
// 的文件级版本，reset 换 epoch 但不重置 revision）：
// - 旧事件不得回滚新版本（同 epoch 拒小 revision；跨 epoch revision 仍单调）；
// - 未知新实例的空 epoch + 更低 revision 只有权威 full 能接受；
// - full 清掉该 (core, team) 的旧投影（**空 states 也清**）；
// - full 不能覆盖"采集后到达的"更高 revision live 更新（全 persona 水位）；
// - 旧 Core（无 ChecklistsSnapshot / 无版本）显式降级：不请求、标未同步；
// - 多 core：能力与清理都按 core 隔离。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import {
  checklistCoreAuthoritative,
  checklistEntrySynced,
  checklistRegionUnsynced,
  checklistScopeUnsynced,
  checklistSessionSynced,
  resetChecklistSyncForCore,
  resetChecklistSyncForReconnect,
} from '../state_domains/checklists';
import { canRequestChecklistSnapshot, refreshChecklists } from '../checklist-requests';
import { resolveTargetCore } from '../connection';
import { checklistEntryKey, checklistsForRegion, checklistsForSession } from '../state';
import { checklistKey } from '../keys';
import type { BackendEvent, TeamInfo } from '../protocol';

const SID_A = 'local:tui::local_user';
const SID_B = 'local:tui::other';
const EPOCH_1 = '11111111-1111-4111-8111-111111111111';
const EPOCH_2 = '22222222-2222-4222-8222-222222222222';

function team(id: string, core: string | null, running = true): TeamInfo {
  return {
    id,
    node_id: null,
    region_name: null,
    name: id,
    description: '',
    enabled: true,
    running,
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

/** 一行清单（新形状：id/archived/items[].id/done/total）。 */
function listState(name: string, done = false, id = `list-${name}`) {
  return {
    id,
    name,
    archived: false,
    done: done ? 1 : 0,
    total: 1,
    items: [{ id: `item-${name}`, text: `${name}-text`, done }],
  };
}

function snapshotState(
  lists: ReturnType<typeof listState>[],
  epoch: string | null,
  revision: number | null,
) {
  return { lists, epoch, revision };
}

function liveEvent(
  sessionId: string,
  teamId: string | null,
  payload: Record<string, unknown>,
): BackendEvent {
  return {
    ChecklistUpdated: { session_id: sessionId, team_id: teamId, state: payload },
  } as unknown as BackendEvent;
}

/** 权威 full：envelope 带文件级 epoch/revision（空 states 也带）。 */
function fullEvent(
  teamId: string,
  states: Array<{ session_id: string; state: Record<string, unknown> }>,
  epoch: string | null = EPOCH_1,
  revision: number | null = 3,
): BackendEvent {
  return {
    ChecklistsSnapshot: { team_id: teamId, epoch, revision, states },
  } as unknown as BackendEvent;
}

/** 旧 Core 的 shapes：没有 epoch/revision，items 没有 id。 */
function legacyState(name: string) {
  return {
    lists: [{ name, items: [{ text: `${name}-text`, done: false }] }],
  };
}

function reset(): void {
  state.teams = [team('alix', 'core-a'), team('bob', 'core-a'), team('alix', 'core-b')];
  state.activeTeamId = 'alix';
  state.activeRegion = 'core-a';
  state.connected = true;
  state.checklists = {};
  state.checklistVersions = {};
  state.checklistWatermarks = {};
  state.checklistCapability = {};
  state.sessions = [];
}

beforeEach(reset);

describe('版本判据：旧事件不得回滚新版本', () => {
  it('同 epoch：更小 revision 被拒绝，更新 revision 生效', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('v3')], EPOCH_1, 3)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('v3');

    // 晚到的旧事件（rev 2）不能把面板回滚。
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('v2')], EPOCH_1, 2)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('v3');

    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('v4')], EPOCH_1, 4)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('v4');
  });

  it('跨 epoch：revision 仍单调（reset 不重置），更高 revision 照常接受', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('e1-r5')], EPOCH_1, 5)), 'core-a');
    // reset 换 epoch，revision 继续 +1（6）→ 接受。
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('e2-r6')], EPOCH_2, 6)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('e2-r6');
    // 即便换了 epoch，更小的 revision 仍是旧事件。
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('e2-r1')], EPOCH_2, 1)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('e2-r6');
  });

  it('旧式（无版本）事件不能覆盖已版本化的权威投影', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('new')], EPOCH_1, 7)), 'core-a');
    dispatch(liveEvent(SID_A, 'alix', legacyState('legacy')), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('new');
  });

  it('低 revision 的 full 同样不能覆盖更高 revision 的 live（即使 epoch 不同）', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('before')], EPOCH_1, 9)), 'core-a');
    // 新实例（epoch 换了，revision 从 0 重新开始）：live 不得回滚……
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('live-reset')], EPOCH_2, 0)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('before');
    // ……权威 full 也不能（Core 契约：revision 跨 reset 单调，低 revision 永远是旧数据）。
    dispatch(
      fullEvent(
        'alix',
        [{ session_id: SID_A, state: snapshotState([listState('full-reset')], EPOCH_2, 0) }],
        EPOCH_2,
        0,
      ),
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('before');
  });

  it('真正换库（revision 归零）只能靠重连清基线收敛，随后 full 建立新基线', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('before')], EPOCH_1, 9)), 'core-a');
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(true);
    // WS 重连：版本/水位/能力全部标脏。
    resetChecklistSyncForReconnect(state);
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(false);
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(false);
    expect(checklistScopeUnsynced(state, 'core-a', checklistsForRegion(state))).toBe(true);
    // 新连接的 bootstrap full（新库 revision 0）：旧投影被权威替换。
    dispatch(
      fullEvent(
        'alix',
        [{ session_id: SID_A, state: snapshotState([listState('after-reconnect')], EPOCH_2, 0) }],
        EPOCH_2,
        0,
      ),
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('after-reconnect');
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(true);
  });

  it('旧 replay 先于 bootstrap 到达时，不阻止新 epoch 的低 revision full', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('before')], EPOCH_1, 9)), 'core-a');
    resetChecklistSyncForReconnect(state);
    // 上一连接的补发事件先到了：只展示，不得恢复旧高水位或伪装已同步。
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('replay')], EPOCH_1, 10)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('replay');
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(false);
    expect(state.checklistWatermarks[`core-a\u0000alix`].revision).toBeNull();

    dispatch(
      fullEvent(
        'alix',
        [{ session_id: SID_A, state: snapshotState([listState('new-store')], EPOCH_2, 0) }],
        EPOCH_2,
        0,
      ),
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('new-store');
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(true);
  });

  it('单个上游重连只重置该 Core，其他 Core 的权威投影不受影响', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('a-old')], EPOCH_1, 9)), 'core-a');
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('b-current')], EPOCH_1, 8)), 'core-b');
    resetChecklistSyncForCore(state, 'core-a');
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(false);
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(false);
    expect(checklistCoreAuthoritative(state, 'core-b')).toBe(true);
    expect(checklistSessionSynced(state, 'core-b', 'alix', SID_A)).toBe(true);

    dispatch(
      fullEvent(
        'alix',
        [{ session_id: SID_A, state: snapshotState([listState('a-new')], EPOCH_2, 0) }],
        EPOCH_2,
        0,
      ),
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('a-new');
    state.activeRegion = 'core-b';
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('b-current');
  });

  it('旧 Core 的旧式状态照常显示，但标记未同步（能力未确认）', () => {
    dispatch(liveEvent(SID_A, 'alix', legacyState('legacy')), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('legacy');
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(false);
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(false);
    // 旧 Core 绝不发请求（避免反复请求未知命令）。
    expect(canRequestChecklistSnapshot('alix', 'core-a')).toBe(false);
    refreshChecklists({ teamId: 'alix', sessionId: SID_A, core: 'core-a' });
    // 没有发出任何命令：版本/水位保持未版本化（只展示，不伪装同步）。
    expect(state.checklistVersions[checklistKey('core-a', 'alix', SID_A)].authoritative).toBe(false);
  });
});

describe('权威 full：整体替换 + 空 states 清理', () => {
  it('清掉快照里没有的旧投影（按 (core, team) 精确作用域）', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('a')], EPOCH_1, 2)), 'core-a');
    dispatch(liveEvent(SID_B, 'alix', snapshotState([listState('b')], EPOCH_1, 2)), 'core-a');
    // 另一 core / 另一 persona 的同名会话：不得被 core-a+alix 的快照清掉。
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('b-core')], EPOCH_1, 2)), 'core-b');
    dispatch(liveEvent(SID_A, 'bob', snapshotState([listState('bob')], EPOCH_1, 2)), 'core-a');

    dispatch(
      fullEvent('alix', [{ session_id: SID_A, state: snapshotState([listState('a')], EPOCH_1, 3) }], EPOCH_1, 3),
      'core-a',
    );

    expect(checklistsForSession(state, SID_A, 'alix')).toHaveLength(1);
    expect(checklistsForSession(state, SID_B, 'alix')).toEqual([]);
    expect(checklistsForSession(state, SID_A, 'alix')[0].name).toBe('a');
    // 其他作用域原样保留。
    expect(checklistsForSession(state, SID_A, 'bob')[0].name).toBe('bob');
    state.activeRegion = 'core-b';
    expect(checklistsForSession(state, SID_A, 'alix')[0].name).toBe('b-core');
  });

  it('空 states 是权威"没有清单"：清掉全部旧投影', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('a')], EPOCH_1, 2)), 'core-a');
    dispatch(liveEvent(SID_B, 'alix', snapshotState([listState('b')], EPOCH_1, 2)), 'core-a');
    dispatch(fullEvent('alix', [], EPOCH_1, 3), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')).toEqual([]);
    expect(checklistsForSession(state, SID_B, 'alix')).toEqual([]);
    expect(Object.keys(state.checklistVersions)).toEqual([]);
  });

  it('full 删除会话后，迟到的旧 live / 无版本事件不能复活它', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('old-r2')], EPOCH_1, 2)), 'core-a');
    dispatch(fullEvent('alix', [], EPOCH_1, 3), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')).toEqual([]);

    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('ghost-r2')], EPOCH_1, 2)), 'core-a');
    dispatch(liveEvent(SID_A, 'alix', legacyState('legacy-ghost')), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')).toEqual([]);

    // 真正在 full 之后创建的新会话有更高 revision，仍可正常出现。
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('new-r4')], EPOCH_1, 4)), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('new-r4');
  });

  it('空 states 带 envelope revision：高于它的 live 保留，低于/等于的旧投影清掉', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('old-r3')], EPOCH_1, 3)), 'core-a');
    dispatch(liveEvent(SID_B, 'alix', snapshotState([listState('new-r4')], EPOCH_1, 4)), 'core-a');
    // 空快照采集于 revision 3：sess-A（rev3）在采集时不存在/已删 → 清；
    // sess-B 的 rev4 是采集后才到的 live 更新 → 保留。
    dispatch(fullEvent('alix', [], EPOCH_1, 3), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')).toEqual([]);
    expect(checklistsForSession(state, SID_B, 'alix')[0]?.name).toBe('new-r4');
  });

  it('full 快照不覆盖采集后到达的更高 revision live 更新（同 epoch 拒小 revision）', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('live-r5')], EPOCH_1, 5)), 'core-a');
    // 采集于 rev 3 的 full 晚到：条目 rev 3 < 5 → 保留 live。
    dispatch(
      fullEvent('alix', [{ session_id: SID_A, state: snapshotState([listState('stale-r3')], EPOCH_1, 3) }], EPOCH_1, 3),
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('live-r5');
  });

  it('过期 full 不推进权威水位，缺席会话仍保持未同步', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('live-r5')], EPOCH_1, 5)), 'core-a');
    dispatch(fullEvent('alix', [], EPOCH_1, 4), 'core-a');
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('live-r5');
    expect(state.checklistWatermarks[`core-a\u0000alix`].snapshotAt).toBeNull();
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_B)).toBe(false);
  });
});
describe('坏帧防御', () => {
  it('坏 live 不写空；含坏条目的 full 整包拒绝，不做部分提交', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('keep')], EPOCH_1, 2)), 'core-a');
    dispatch(
      { ChecklistUpdated: { session_id: SID_A, team_id: 'alix', state: null } } as unknown as BackendEvent,
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('keep');
    dispatch(
      fullEvent('alix', [
        { session_id: SID_A, state: null as unknown as Record<string, unknown> },
        { session_id: SID_B, state: snapshotState([listState('b')], EPOCH_1, 3) },
      ], EPOCH_1, 3),
      'core-a',
    );
    expect(checklistsForSession(state, SID_A, 'alix')[0]?.name).toBe('keep');
    expect(checklistsForSession(state, SID_B, 'alix')).toEqual([]);
    expect(state.checklistWatermarks[`core-a\u0000alix`].snapshotAt).toBeNull();
  });

  it('缺 revision 的 full 不是能力证据，也不能清空投影', () => {
    dispatch(
      { ChecklistsSnapshot: { team_id: 'alix', epoch: EPOCH_1, states: [] } } as unknown as BackendEvent,
      'core-a',
    );
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(false);
    expect(state.checklistVersions).toEqual({});
    expect(state.checklistWatermarks).toEqual({});
  });
});

describe('能力探测与跨 core 路由', () => {
  it('首个 ChecklistsSnapshot 确认该 core 能力（即使 states 为空），别 core 不受影响', () => {
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(false);
    dispatch(fullEvent('alix', [], EPOCH_1, 1), 'core-a');
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(true);
    expect(checklistCoreAuthoritative(state, 'core-b')).toBe(false);
    // 能力确认后、人格运行中才允许请求。
    expect(canRequestChecklistSnapshot('alix', 'core-a')).toBe(true);
    expect(canRequestChecklistSnapshot('bob', 'core-a')).toBe(true);
    // 人格不存在 / 未运行 → 不请求（Core 会回命令错误）。
    expect(canRequestChecklistSnapshot('nobody', 'core-a')).toBe(false);
    state.teams = [team('alix', 'core-a', false)];
    expect(canRequestChecklistSnapshot('alix', 'core-a')).toBe(false);
  });

  it('带版本的单会话事件同样是能力证据（旧式状态则不是）', () => {
    dispatch(liveEvent(SID_A, 'alix', legacyState('legacy')), 'core-a');
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(false);
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('v1')], EPOCH_1, 1)), 'core-a');
    expect(checklistCoreAuthoritative(state, 'core-a')).toBe(true);
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(true);
  });

  it('同步标记：full 没列出的会话 = 权威地没有清单（不再标未同步）', () => {
    dispatch(fullEvent('alix', [], EPOCH_1, 1), 'core-a');
    expect(checklistSessionSynced(state, 'core-a', 'alix', SID_A)).toBe(true);
    // 只有该人格的 full 才算数；另一个人格仍是未知。
    expect(checklistSessionSynced(state, 'core-a', 'bob', SID_A)).toBe(false);
  });

  it('global 空视图要等每个运行人格的 full，不能提前显示已同步', () => {
    expect(checklistRegionUnsynced(state, 'core-a', [])).toBe(true);
    dispatch(fullEvent('alix', [], EPOCH_1, 1), 'core-a');
    expect(checklistRegionUnsynced(state, 'core-a', [])).toBe(true);
    dispatch(fullEvent('bob', [], EPOCH_1, 1), 'core-a');
    expect(checklistRegionUnsynced(state, 'core-a', [])).toBe(false);
    expect(checklistRegionUnsynced(state, 'core-b', [])).toBe(true);
  });

  it('UI 未同步判定：旧 Core 恒未同步；权威快照后同作用域转已同步', () => {
    expect(checklistScopeUnsynced(state, 'core-a', [])).toBe(true);
    dispatch(liveEvent(SID_A, 'alix', legacyState('legacy')), 'core-a');
    expect(checklistScopeUnsynced(state, 'core-a', checklistsForRegion(state))).toBe(true);
    dispatch(
      fullEvent('alix', [
        { session_id: SID_A, state: snapshotState([listState('authoritative')], EPOCH_1, 1) },
      ], EPOCH_1, 1),
      'core-a',
    );
    expect(checklistScopeUnsynced(state, 'core-a', checklistsForRegion(state))).toBe(false);
  });

  it('旧式投影条目在 global 聚合里逐条判未同步', () => {
    dispatch(liveEvent(SID_A, 'alix', legacyState('legacy')), 'core-a');
    const entries = checklistsForRegion(state);
    expect(entries).toHaveLength(1);
    expect(checklistEntrySynced(state, entries[0])).toBe(false);
    // 权威快照到达后同一条目变为已同步。
    dispatch(
      fullEvent('alix', [
        { session_id: SID_A, state: snapshotState([listState('authoritative')], EPOCH_1, 1) },
      ], EPOCH_1, 1),
      'core-a',
    );
    const after = checklistsForRegion(state);
    expect(after[0].name).toBe('authoritative');
    expect(checklistEntrySynced(state, after[0])).toBe(true);
  });
});

describe('多 core 路由（coreForCommand 按 team_id 统一）', () => {
  const command = {
    RequestChecklists: { team_id: 'alix', session_id: null },
  } as const;

  it('显式 core 优先；未指定时按人格归属解析，activeRegion 不拥有人格则重定向', () => {
    state.teams = [team('alix', 'core-a'), team('alix', 'core-b')];
    state.activeRegion = 'core-b';
    // 显式目标 core 拥有人格 → 尊重显式（同名人格跨 core 时也能定向）。
    expect(resolveTargetCore(command as never, 'core-a')).toBe('core-a');
    // 未指定：coreForCommand 按 team_id 找到 activeRegion 那一份。
    expect(resolveTargetCore(command as never)).toBe('core-b');

    // activeRegion 换成不拥有人格的 core：一致性守卫重定向到拥有者的 core。
    state.teams = [team('alix', 'core-a')];
    state.activeRegion = 'core-b';
    expect(resolveTargetCore(command as never)).toBe('core-a');
  });
});

describe('新 state 形状：id / archived 保留', () => {
  it('清单 id、归档标记与 item id 原样保留（行键/展示用）', () => {
    dispatch(
      liveEvent(
        SID_A,
        'alix',
        snapshotState(
          [
            {
              id: 'list-1',
              name: '归档清单',
              archived: true,
              done: 1,
              total: 2,
              items: [
                { id: 'i1', text: 'a', done: true },
                { id: 'i2', text: 'b', done: false },
              ],
            },
          ],
          EPOCH_1,
          1,
        ),
      ),
      'core-a',
    );
    const [entry] = checklistsForSession(state, SID_A, 'alix');
    expect(entry.id).toBe('list-1');
    expect(entry.archived).toBe(true);
    expect(entry.items.map((item) => item.id)).toEqual(['i1', 'i2']);
    expect(entry.done).toBe(1);
    expect(entry.total).toBe(2);
    expect(entry.source).toEqual({ core: 'core-a', teamId: 'alix', sessionId: SID_A });
    // 版本按 (core, team, session) 复合键记录，来源可辨（多 core 不互相覆盖）。
    expect(state.checklistVersions[checklistKey('core-a', 'alix', SID_A)]).toMatchObject({
      core: 'core-a',
      teamId: 'alix',
      sessionId: SID_A,
    });
    const rowKey = checklistEntryKey(entry);
    expect(checklistEntryKey({ ...entry, name: '改名后' })).toBe(rowKey);
  });
});

describe('水位与基线状态（reducer 可靠性）', () => {
  it('水位取 live/full revision 的并集，且版本记录不丢来源', () => {
    dispatch(liveEvent(SID_A, 'alix', snapshotState([listState('a')], EPOCH_1, 3)), 'core-a');
    dispatch(
      fullEvent('alix', [{ session_id: SID_A, state: snapshotState([listState('a')], EPOCH_1, 5) }], EPOCH_1, 5),
      'core-a',
    );
    const watermark = state.checklistWatermarks[`core-a\u0000alix`];
    expect(watermark.revision).toBe(5);
    expect(watermark.snapshotRevision).toBe(5);
    expect(watermark.snapshotAt).not.toBeNull();
    const version = state.checklistVersions[checklistKey('core-a', 'alix', SID_A)];
    expect(version).toMatchObject({
      core: 'core-a',
      teamId: 'alix',
      sessionId: SID_A,
      epoch: EPOCH_1,
      revision: 5,
      authoritative: true,
    });
  });
});
