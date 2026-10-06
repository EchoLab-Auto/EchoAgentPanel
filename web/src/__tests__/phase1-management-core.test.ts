// Phase 1（2026-10）：管理面（设置/QQ/联邦）绑定"管理目标 core"。
// - 无 team/session 的管理事件也注入来源 core；
// - 单值管理面（api/skills/tools/plugins/systemPrompt/adapter/federation）只
//   接受 activeRegion 的响应，避免被广播响应里其他 core 的配置覆盖；
// - QQ 实例名跨 core 可重复，管理态按 (core, adapter) 存放。
import { describe, it, expect, beforeEach } from 'vitest';
import { state, dispatch } from '../store';
import { resetManagementState, defaultQqInstanceState } from '../state';
import { scopedKey } from '../keys';
import type { BackendEvent } from '../protocol';

const apiEvent = (model: string): BackendEvent =>
  ({
    ApiConfigUpdated: {
      provider: 'deepseek',
      model,
      base_url: '',
      api_key_set: false,
      thinking: 'enabled',
      reasoning_effort: 'max',
      system_prompt: '',
      active_api: '',
      profiles: [],
    },
  }) as unknown as BackendEvent;

const skillsEvent = (names: string[]): BackendEvent =>
  ({ SkillsList: { skills: names.map((name) => ({ name })) } }) as unknown as BackendEvent;

describe('Phase 1：管理面绑定 activeRegion', () => {
  beforeEach(() => {
    resetManagementState(state);
    state.knownCores = new Set(['core-a', 'core-b']);
    state.activeRegion = 'core-b';
    state.qqByAdapter = {};
  });

  it('非 activeRegion 的 ApiConfigUpdated 被忽略；activeRegion 的生效', () => {
    dispatch(apiEvent('from-a'), 'core-a');
    expect(state.api).toBeNull();
    dispatch(apiEvent('from-b'), 'core-b');
    expect(state.api?.model).toBe('from-b');
  });

  it('非 activeRegion 的 SkillsList 被忽略', () => {
    dispatch(skillsEvent(['a-skill']), 'core-a');
    expect(state.skills).toHaveLength(0);
    dispatch(skillsEvent(['b-skill']), 'core-b');
    expect(state.skills.map((s) => s.name)).toEqual(['b-skill']);
  });

  it('单上游（core=null）不过滤', () => {
    state.activeRegion = null;
    dispatch(apiEvent('local'), null);
    expect(state.api?.model).toBe('local');
  });

  it('QQ 管理态按 (core, adapter) 存放，同名实例不互相覆盖', () => {
    dispatch(
      { QqOwner: { owner_qq: 111, adapter: 'qq' } } as unknown as BackendEvent,
      'core-a',
    );
    dispatch(
      { QqOwner: { owner_qq: 222, adapter: 'qq' } } as unknown as BackendEvent,
      'core-b',
    );
    expect(state.qqByAdapter[scopedKey('core-a', 'qq')].owner).toBe(111);
    expect(state.qqByAdapter[scopedKey('core-b', 'qq')].owner).toBe(222);
  });

  it('resetManagementState 清空单值管理面缓存', () => {
    dispatch(apiEvent('x'), 'core-b');
    expect(state.api).not.toBeNull();
    resetManagementState(state);
    expect(state.api).toBeNull();
    expect(state.skills).toHaveLength(0);
    expect(state.adapters).toHaveLength(0);
    // 默认实例态结构未被破坏
    expect(defaultQqInstanceState().owner).toBe(0);
  });
});

describe('QQ 列表事件按 (core, adapter) 写入 qqByAdapter（2026-10 修复）', () => {
  beforeEach(() => {
    state.qqByAdapter = {};
    state.activeRegion = 'core-a';
  });

  it('FriendList 写入实例槽位（此前只写废弃全局字段，好友列表永远空）', () => {
    dispatch(
      {
        FriendList: {
          friends: [
            { user_id: 10001, nickname: 'alice' },
            { user_id: 10002, nickname: 'bob' },
          ],
          adapter: 'qq',
        },
      } as unknown as BackendEvent,
      'core-a',
    );
    const slot = state.qqByAdapter[scopedKey('core-a', 'qq')];
    expect(slot, 'FriendList 必须写入 qqByAdapter').toBeTruthy();
    expect(slot.friends).toEqual([
      [10001, 'alice'],
      [10002, 'bob'],
    ]);
  });

  it('多实例：FriendList 按 adapter 分槽，互不覆盖', () => {
    dispatch(
      { FriendList: { friends: [[1, 'a']].map(([user_id, nickname]) => ({ user_id, nickname })), adapter: 'qq' } } as unknown as BackendEvent,
      'core-a',
    );
    dispatch(
      { FriendList: { friends: [{ user_id: 2, nickname: 'b' }], adapter: 'alix-two' } } as unknown as BackendEvent,
      'core-a',
    );
    expect(state.qqByAdapter[scopedKey('core-a', 'qq')].friends).toEqual([[1, 'a']]);
    expect(state.qqByAdapter[scopedKey('core-a', 'alix-two')].friends).toEqual([[2, 'b']]);
  });

  it('GroupList 与 FriendList 互不干扰（同一槽位的两个字段）', () => {
    dispatch(
      {
        GroupList: {
          groups: [{ group_id: 456, group_name: 'g1' }],
          adapter: 'qq',
        },
      } as unknown as BackendEvent,
      'core-a',
    );
    dispatch(
      { FriendList: { friends: [{ user_id: 10001, nickname: 'alice' }], adapter: 'qq' } } as unknown as BackendEvent,
      'core-a',
    );
    const slot = state.qqByAdapter[scopedKey('core-a', 'qq')];
    expect(slot.groups).toEqual([[456, 'g1']]);
    expect(slot.friends).toEqual([[10001, 'alice']]);
  });
});
