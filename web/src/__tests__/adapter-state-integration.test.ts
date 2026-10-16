//! 02a S5 集成：state.ts 两个新臂（AdapterState → adapterUiByKey；
//! AdapterOpResult → invokeAdapterOp Promise resolve）+ removeSessionsOfCore
//! 前缀清理 + upstreams 离线 diff → dropCoreAdapterChannel。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { state, dispatch } from '../store';
import { usePending } from '../pending';
import { adapterOpKey, invokeAdapterOp, onCoreDropped } from '../adapterOps';
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
    state.adapterUiByKey = {};
    state.knownCores = new Set();
    state.activeRegion = null;
    state.activeTeamId = null;
    state.sessions = [];
    state.teams = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('AdapterState：整文档写入 scopedKey 键（替换不 merge；单上游退化为裸实例名）', () => {
    const doc = { online: true, gate: { mode: 'allowlist' } };
    dispatch({ AdapterState: { adapter: 'qq', state: doc } } as unknown as BackendEvent, 'core-a');
    expect(state.adapterUiByKey['core-a\u0000qq']).toEqual(doc);
    // 整文档替换（02a §3.1）：新文档不留旧字段（state 为 Vue 响应式代理，
    // 引用比较走代理，故用深比较断言"就是新文档、无旧字段残留"）。
    const next = { online: false };
    dispatch({ AdapterState: { adapter: 'qq', state: next } } as unknown as BackendEvent, 'core-a');
    expect(state.adapterUiByKey['core-a\u0000qq']).toEqual(next);

    // 单上游（无信封）：core=null ⇒ 键退化为裸实例名。
    dispatch({ AdapterState: { adapter: 'qq', state: doc } } as unknown as BackendEvent, null);
    expect(state.adapterUiByKey['qq']).toEqual(doc);
  });

  it('AdapterOpResult：dispatch 命中键 → invokeAdapterOp resolve（业务失败也 resolve）', async () => {
    const key = adapterOpKey('core-a', 'qq', 'get_state');
    const p = invokeAdapterOp('core-a', 'qq', 'get_state');
    dispatch(
      {
        AdapterOpResult: { adapter: 'qq', method: 'get_state', result: { online: true }, error: null },
      } as unknown as BackendEvent,
      'core-a',
    );
    await expect(p).resolves.toEqual({ result: { online: true }, error: null });
    expect(usePending(key).phase.value).toBe('idle'); // 显式销账

    // 失败路径：{result:null, error} 也 resolve（02a §5.3 约定）。
    const key2 = adapterOpKey('core-a', 'qq', 'update_allowlist');
    const p2 = invokeAdapterOp('core-a', 'qq', 'update_allowlist', { user_ids: [], group_ids: [] });
    dispatch(
      { AdapterOpResult: { adapter: 'qq', method: 'update_allowlist', error: '适配器实例未找到' } } as unknown as BackendEvent,
      'core-a',
    );
    await expect(p2).resolves.toEqual({ result: null, error: '适配器实例未找到' });
    expect(usePending(key2).phase.value).toBe('idle');

    // 无命中的迟到结果：静默丢弃（不抛错，02a §6.2-1）。
    expect(() =>
      dispatch(
        { AdapterOpResult: { adapter: 'qq', method: 'get_state', result: null, error: null } } as unknown as BackendEvent,
        'core-a',
      ),
    ).not.toThrow();
  });

  it('removeSessionsOfCore：该 core 前缀的 adapterUiByKey 一并清理', () => {
    state.adapterUiByKey = { 'core-a\u0000qq': 1, 'core-b\u0000qq': 2 };
    removeSessionsOfCore(state, 'core-a');
    expect(state.adapterUiByKey['core-a\u0000qq']).toBeUndefined();
    expect(state.adapterUiByKey['core-b\u0000qq']).toBe(2);
  });

  it('refreshUpstreams：online→offline 触发 dropCoreAdapterChannel（清文档 + 拒在途）', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const upstream = (name: string, connectivity: string) => ({ name, connectivity });

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [upstream('core-a', 'online')] });
    await refreshUpstreams();

    state.adapterUiByKey['core-a\u0000qq'] = { online: true };
    const dropSpy = vi.fn();
    const off = onCoreDropped(dropSpy);
    const p = invokeAdapterOp('core-a', 'qq', 'get_state');
    const rejected = expect(p).rejects.toThrow('核心已离线，操作已取消');

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [upstream('core-a', 'offline')] });
    await refreshUpstreams();

    await rejected;
    expect(dropSpy).toHaveBeenCalledWith('core-a');
    expect(state.adapterUiByKey['core-a\u0000qq']).toBeUndefined();
    off();
  });
});
