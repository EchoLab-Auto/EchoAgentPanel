//! 02a S5 集成：state.ts 两个新臂（InstanceState → instanceUiByKey；
//! InstanceOpResult → invokeInstanceOp Promise resolve）+ removeSessionsOfCore
//! 前缀清理 + upstreams 离线 diff → dropCoreInstanceChannel。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { state, dispatch } from '../store';
import {
  PENDING_MIN_VISIBLE_MS,
  PENDING_VISIBLE_AFTER_MS,
  trackRequest,
  usePending,
} from '../pending';
import { instanceOpKey, invokeInstanceOp, onCoreDropped } from '../instanceOps';
import { removeSessionsOfCore } from '../state';
import { refreshUpstreams } from '../upstreams';
import type { BackendEvent } from '../protocol';

vi.mock('../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true) };
});

import { sendCommand } from '../connection';

vi.mock('../federation-directory', () => ({
  pruneDiscovered: vi.fn(async () => undefined),
  runDiscovery: vi.fn(async () => 0),
}));

const sendCommandMock = vi.mocked(sendCommand);

describe('02a S5 集成：新臂 / 清理钩子', () => {
  beforeEach(() => {
    sendCommandMock.mockReset();
    sendCommandMock.mockReturnValue(true);
    state.instanceUiByKey = {};
    state.knownCores = new Set();
    state.activeRegion = null;
    state.activeTeamId = null;
    state.sessions = [];
    state.teams = [];
    state.checklists = {};
    state.checklistVersions = {};
    state.checklistWatermarks = {};
    state.checklistCapability = {};
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('InstanceState：整文档写入 scopedKey 键（替换不 merge；单上游退化为裸实例名）', () => {
    const doc = { online: true, gate: { mode: 'allowlist' } };
    dispatch({ InstanceState: { instance: 'qq', state: doc } } as unknown as BackendEvent, 'core-a');
    expect(state.instanceUiByKey['core-a\u0000qq']).toEqual(doc);
    // 整文档替换（02a §3.1）：新文档不留旧字段（state 为 Vue 响应式代理，
    // 引用比较走代理，故用深比较断言"就是新文档、无旧字段残留"）。
    const next = { online: false };
    dispatch({ InstanceState: { instance: 'qq', state: next } } as unknown as BackendEvent, 'core-a');
    expect(state.instanceUiByKey['core-a\u0000qq']).toEqual(next);

    // 单上游（无信封）：core=null ⇒ 键退化为裸实例名。
    dispatch({ InstanceState: { instance: 'qq', state: doc } } as unknown as BackendEvent, null);
    expect(state.instanceUiByKey['qq']).toEqual(doc);
  });

  it('InstanceOpResult：dispatch 命中键 → invokeInstanceOp resolve（业务失败也 resolve）', async () => {
    const key = instanceOpKey('core-a', 'qq', 'get_state');
    const p = invokeInstanceOp('core-a', 'qq', 'get_state');
    dispatch(
      {
        InstanceOpResult: { instance: 'qq', method: 'get_state', result: { online: true }, error: null },
      } as unknown as BackendEvent,
      'core-a',
    );
    await expect(p).resolves.toEqual({ result: { online: true }, error: null });
    expect(usePending(key).phase.value).toBe('idle'); // 显式销账

    // 失败路径：{result:null, error} 也 resolve（02a §5.3 约定）。
    const key2 = instanceOpKey('core-a', 'qq', 'update_allowlist');
    const p2 = invokeInstanceOp('core-a', 'qq', 'update_allowlist', { user_ids: [], group_ids: [] });
    dispatch(
      { InstanceOpResult: { instance: 'qq', method: 'update_allowlist', error: '实例未找到' } } as unknown as BackendEvent,
      'core-a',
    );
    await expect(p2).resolves.toEqual({ result: null, error: '实例未找到' });
    expect(usePending(key2).phase.value).toBe('idle');

    // 无命中的迟到结果：静默丢弃（不抛错，02a §6.2-1）。
    expect(() =>
      dispatch(
        { InstanceOpResult: { instance: 'qq', method: 'get_state', result: null, error: null } } as unknown as BackendEvent,
        'core-a',
      ),
    ).not.toThrow();
  });

  it('removeSessionsOfCore：该 core 的实例与清单投影一并清理，别 core 保留', () => {
    state.instanceUiByKey = { 'core-a\u0000qq': 1, 'core-b\u0000qq': 2 };
    for (const core of ['core-a', 'core-b']) {
      dispatch({
        ChecklistUpdated: {
          session_id: 's', team_id: 'alix',
          state: { lists: [], epoch: '11111111-1111-4111-8111-111111111111', revision: 4 },
        },
      } as unknown as BackendEvent, core);
    }
    removeSessionsOfCore(state, 'core-a');
    expect(state.instanceUiByKey['core-a\u0000qq']).toBeUndefined();
    expect(state.instanceUiByKey['core-b\u0000qq']).toBe(2);
    expect(state.checklists['core-a\u0000alix\u0000s']).toBeUndefined();
    expect(state.checklistVersions['core-a\u0000alix\u0000s']).toBeUndefined();
    expect(state.checklistWatermarks['core-a\u0000alix']).toBeUndefined();
    expect(state.checklistCapability['core-a']).toBeUndefined();
    expect(state.checklists['core-b\u0000alix\u0000s']).toEqual([]);
    expect(state.checklistVersions['core-b\u0000alix\u0000s']).toBeDefined();
    expect(state.checklistWatermarks['core-b\u0000alix']).toBeDefined();
    expect(state.checklistCapability['core-b']).toBe(true);
  });

  it('refreshUpstreams：online→offline 触发 dropCoreInstanceChannel（清文档 + 拒在途）', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const upstream = (name: string, connectivity: string) => ({ name, connectivity });

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [upstream('core-a', 'online')] });
    await refreshUpstreams();

    state.instanceUiByKey['core-a\u0000qq'] = { online: true };
    const dropSpy = vi.fn();
    const off = onCoreDropped(dropSpy);
    const p = invokeInstanceOp('core-a', 'qq', 'get_state');
    const rejected = expect(p).rejects.toThrow('核心已离线，操作已取消');

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [upstream('core-a', 'offline')] });
    await refreshUpstreams();

    await rejected;
    expect(dropSpy).toHaveBeenCalledWith('core-a');
    expect(state.instanceUiByKey['core-a\u0000qq']).toBeUndefined();
    off();
  });

  it('上游独立恢复/新增 online：重置该 Core 清单基线并定向补拉', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const upstream = (name: string, connectivity: string) => ({ name, connectivity });
    const epoch1 = '11111111-1111-4111-8111-111111111111';
    const epoch2 = '22222222-2222-4222-8222-222222222222';
    const live = (core: string, name: string, revision: number) => dispatch({
      ChecklistUpdated: {
        session_id: 's', team_id: 'alix',
        state: { lists: [{ id: name, name, archived: false, items: [] }], epoch: epoch1, revision },
      },
    } as unknown as BackendEvent, core);

    live('core-a', 'old-store', 42);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [upstream('core-a', 'offline')] });
    await refreshUpstreams();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [upstream('core-a', 'online')] });
    await refreshUpstreams();

    expect(sendCommandMock).toHaveBeenCalledWith('RequestState', 'core-a');
    expect(state.checklistCapability['core-a']).toBeUndefined();
    expect(state.checklistVersions['core-a\u0000alix\u0000s']).toMatchObject({
      revision: null, epoch: null, authoritative: false,
    });
    dispatch({
      ChecklistsSnapshot: {
        team_id: 'alix', epoch: epoch2, revision: 0,
        states: [{ session_id: 's', state: {
          lists: [{ id: 'new-store', name: 'new-store', archived: false, items: [] }],
          epoch: epoch2, revision: 0,
        } }],
      },
    } as unknown as BackendEvent, 'core-a');
    expect(state.checklists['core-a\u0000alix\u0000s'][0]?.name).toBe('new-store');

    // 运行中新增同名/新上游也走同一补拉路径，而不是等 Panel 自己重连。
    live('core-c', 'stale-c', 12);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [upstream('core-a', 'online'), upstream('core-c', 'online')],
    });
    await refreshUpstreams();
    expect(sendCommandMock).toHaveBeenCalledWith('RequestState', 'core-c');
    expect(state.checklistVersions['core-c\u0000alix\u0000s']).toMatchObject({
      revision: null, epoch: null, authoritative: false,
    });
    expect(state.checklists['core-a\u0000alix\u0000s'][0]?.name).toBe('new-store');
  });

  it('InstanceList 到达：该 core 的启停 pending 键即结算（03b §2.2 收尾）', () => {
    vi.useFakeTimers();
    try {
      const key = 'instance:start:core-a:qq';
      trackRequest(key, 'StartInstance', 'core-a');
      vi.advanceTimersByTime(PENDING_VISIBLE_AFTER_MS);
      expect(usePending(key).phase.value).toBe('pending');

      dispatch({ InstanceList: { instances: [] } } as unknown as BackendEvent, 'core-a');
      vi.advanceTimersByTime(PENDING_MIN_VISIBLE_MS);
      expect(usePending(key).phase.value).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });
});
