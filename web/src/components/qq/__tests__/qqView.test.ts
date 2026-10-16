//! qqView 纯函数 / 覆盖层（02b §4.5）：投影默认值、string→number、docRef 失配
//! 回落、无 doc 时 online 为 undefined；applyRead 形状守卫与合并、按 core 清理。

import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '../../../store';
import {
  applyLoginStatus,
  applyRead,
  docOf,
  dropReadOverlayOfCore,
  readOverlay,
  READS,
  toQqView,
  type QqReadOverlay,
} from '../qqView';

function clearOverlay() {
  for (const key of Object.keys(readOverlay)) delete readOverlay[key];
}

beforeEach(() => {
  state.adapterUiByKey = {};
  state.activeRegion = null;
  clearOverlay();
});

describe('toQqView：状态文档 + 覆盖层投影（02b §1.1）', () => {
  it('null 文档 + 无覆盖层：默认值（与旧 defaultQqInstanceState 同形）', () => {
    const view = toQqView(null, undefined);
    expect(view.filter).toEqual({
      allowlist_users: [],
      allowlist_groups: [],
      denylist_users: [],
      denylist_groups: [],
    });
    expect(view.gateMode).toBe('none');
    expect(view.owner).toBe(0);
    expect(view.groups).toEqual([]);
    expect(view.friends).toEqual([]);
    // 无 doc 且无 ov.login → undefined（QqLoginSection 回落 AdapterStatus；02b §2.1）
    expect(view.online).toBeUndefined();
    expect(view.selfId).toBeUndefined();
  });

  it('文档字符串 id → number 投影；groups/friends 覆盖层 [{id,name}] → [number,string]', () => {
    const doc = {
      gate: {
        mode: 'allowlist',
        allowlist_users: ['7', '8'],
        allowlist_groups: ['123'],
        denylist_users: [],
        denylist_groups: ['9'],
      },
      owner: 42,
      online: true,
      self_id: '10001',
    };
    const ov: QqReadOverlay = {
      docRef: doc,
      groups: [{ id: '11', name: '群甲' }],
      friends: [{ id: '22', name: '好友乙' }],
    };
    const view = toQqView(doc, ov);
    expect(view.filter.allowlist_users).toEqual([7, 8]);
    expect(view.filter.allowlist_groups).toEqual([123]);
    expect(view.filter.denylist_groups).toEqual([9]);
    expect(view.gateMode).toBe('allowlist');
    expect(view.owner).toBe(42);
    expect(view.groups).toEqual([[11, '群甲']]);
    expect(view.friends).toEqual([[22, '好友乙']]);
    expect(view.online).toBe(true);
    expect(view.selfId).toBe('10001');
  });

  it('docRef 失配：filter/owner/login 回落文档值；groups/friends 仍取覆盖层', () => {
    const oldDoc = { gate: {}, owner: 1, online: true, self_id: '1' };
    const newDoc = {
      gate: {
        mode: 'denylist',
        allowlist_users: ['5'],
        allowlist_groups: [],
        denylist_users: [],
        denylist_groups: [],
      },
      owner: 9,
      online: false,
      self_id: '2',
    };
    const ov: QqReadOverlay = {
      docRef: oldDoc, // 到达时引用 ≠ 当前文档（新 AdapterState 已整文档替换）
      filter: {
        allowlist_users: ['777'],
        allowlist_groups: [],
        denylist_users: [],
        denylist_groups: [],
      },
      owner: 77,
      login: { online: true, user_id: '777' },
      friends: [{ id: '3', name: '还在' }],
    };
    const view = toQqView(newDoc, ov);
    expect(view.filter.allowlist_users).toEqual([5]); // 文档值，不是 777
    expect(view.gateMode).toBe('denylist');
    expect(view.owner).toBe(9);
    expect(view.online).toBe(false);
    expect(view.selfId).toBe('2');
    expect(view.friends).toEqual([[3, '还在']]); // groups/friends 恒取覆盖层
  });

  it('无 doc：ov.login（docRef=null 同代）时 online/selfId 采用覆盖层，否则 undefined', () => {
    expect(toQqView(null, { docRef: null }).online).toBeUndefined();
    expect(toQqView(null, { docRef: null }).selfId).toBeUndefined();
    const ov: QqReadOverlay = { docRef: null, login: { online: true, user_id: '9' } };
    expect(toQqView(null, ov).online).toBe(true);
    expect(toQqView(null, ov).selfId).toBe('9');
  });

  it('不可解析的 id（NaN）在投影时丢弃', () => {
    const doc = {
      gate: {
        allowlist_users: ['7', 'abc', null],
        allowlist_groups: [],
        denylist_users: [],
        denylist_groups: [],
      },
    };
    const view = toQqView(doc, {
      docRef: doc,
      friends: [{ id: 'x', name: 'bad' }, { id: '5', name: 'ok' }],
    });
    expect(view.filter.allowlist_users).toEqual([7]);
    expect(view.friends).toEqual([[5, 'ok']]);
  });

  it('READS：五条读类方法齐全（02b §1.2 调用表）', () => {
    expect(READS.map(([m]) => m)).toEqual([
      'get_groups',
      'get_friends',
      'get_filter_config',
      'get_owner',
      'login_status',
    ]);
  });
});

describe('applyRead / readOverlay：形状守卫、合并与清理（02b §3）', () => {
  it('分次读结果合并写入覆盖层；docRef 记录到达时文档引用', () => {
    state.adapterUiByKey['qq'] = { online: true };
    const friendsApply = READS.find(([m]) => m === 'get_friends')![1];
    const groupsApply = READS.find(([m]) => m === 'get_groups')![1];
    applyRead('qq', friendsApply, { friends: [{ id: '5', name: 'n' }] });
    applyRead('qq', groupsApply, { groups: [{ id: '6', name: 'g' }] });
    expect(readOverlay['qq'].friends).toEqual([{ id: '5', name: 'n' }]);
    expect(readOverlay['qq'].groups).toEqual([{ id: '6', name: 'g' }]); // 合并保留
    // docRef = 到达时 state.adapterUiByKey['qq'] 的引用（响应式代理同一性）。
    expect(readOverlay['qq'].docRef).toBe(state.adapterUiByKey['qq']);
  });

  it('非对象 result / 缺键：静默不写', () => {
    applyRead('qq', applyLoginStatus, null);
    expect(readOverlay['qq']).toBeUndefined();
    applyRead('qq', applyLoginStatus, 'oops');
    expect(readOverlay['qq']).toBeUndefined();
    applyRead('qq', applyLoginStatus, {}); // 缺 online：键级守卫丢弃
    expect(readOverlay['qq'].login).toBeUndefined();
  });

  it('dropReadOverlayOfCore：按 core 前缀清理，别的 core 不动', () => {
    state.adapterUiByKey = {
      'core-a\u0000qq': { online: true },
      'core-b\u0000qq': { online: false },
    };
    applyRead('core-a\u0000qq', applyLoginStatus, { online: true, user_id: '1' });
    applyRead('core-b\u0000qq', applyLoginStatus, { online: false, user_id: '2' });
    dropReadOverlayOfCore('core-a');
    expect(readOverlay['core-a\u0000qq']).toBeUndefined();
    expect(readOverlay['core-b\u0000qq']).toBeDefined();
  });

  it('docOf：按 (activeRegion, 实例) 读状态文档', () => {
    state.activeRegion = 'core-a';
    state.adapterUiByKey = { 'core-a\u0000qq': { online: true }, qq: { online: false } };
    expect(docOf('qq')?.online).toBe(true);
  });
});
