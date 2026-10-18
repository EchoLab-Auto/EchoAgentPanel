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

  it('removeSessionsOfCore：该 core 前缀的 instanceUiByKey 一并清理', () => {
    state.instanceUiByKey = { 'core-a\u0000qq': 1, 'core-b\u0000qq': 2 };
    removeSessionsOfCore(state, 'core-a');
    expect(state.instanceUiByKey['core-a\u0000qq']).toBeUndefined();
    expect(state.instanceUiByKey['core-b\u0000qq']).toBe(2);
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
