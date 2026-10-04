// Phase 1（2026-10）：管理面（设置/QQ/联邦）绑定"管理目标 core"。
// - 无 team/session 的管理事件也注入来源 core；
// - 单值管理面（api/skills/tools/plugins/systemPrompt/adapter/federation）只
//   接受 activeCore 的响应，避免被广播响应里其他 core 的配置覆盖；
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

describe('Phase 1：管理面绑定 activeCore', () => {
  beforeEach(() => {
    resetManagementState(state);
    state.knownCores = new Set(['core-a', 'core-b']);
    state.activeCore = 'core-b';
    state.qqByAdapter = {};
  });

  it('非 activeCore 的 ApiConfigUpdated 被忽略；activeCore 的生效', () => {
    dispatch(apiEvent('from-a'), 'core-a');
    expect(state.api).toBeNull();
    dispatch(apiEvent('from-b'), 'core-b');
    expect(state.api?.model).toBe('from-b');
  });

  it('非 activeCore 的 SkillsList 被忽略', () => {
    dispatch(skillsEvent(['a-skill']), 'core-a');
    expect(state.skills).toHaveLength(0);
    dispatch(skillsEvent(['b-skill']), 'core-b');
    expect(state.skills.map((s) => s.name)).toEqual(['b-skill']);
  });

  it('单上游（core=null）不过滤', () => {
    state.activeCore = null;
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
