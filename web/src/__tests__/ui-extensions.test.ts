import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import {
  __resetPanelExtensionsForTest,
  beforeSessionPick,
  panelEntryActions,
  panelRailCardIds,
  panelRailCards,
  registerPanelExtension,
  setupPanelExtensions,
  teamLanding,
} from '../extensions/registry';

const component = defineComponent({ template: '<div />' });

describe('Panel UI 扩展注册表', () => {
  beforeEach(() => __resetPanelExtensionsForTest());
  afterEach(() => __resetPanelExtensionsForTest());

  it('默认没有业务入口、覆盖层卡片或会话落点', () => {
    expect(panelEntryActions({ teamId: 'alix', sessionId: 'local:tui::local_user', core: null })).toEqual([]);
    expect(panelRailCards('alix')).toEqual([]);
    expect(teamLanding('alix')).toBeNull();
  });

  it('扩展使用隔离 id 注入入口、卡片和应用钩子', () => {
    const beforePick = vi.fn();
    registerPanelExtension({
      id: 'example.module',
      railCardSlots: ['summary'],
      entries: [{ id: 'manage', label: '示例', icon: 'folder', when: ({ teamId }) => teamId === 'alix' }],
      railCards: () => [{ id: 'summary', title: '摘要', component }],
      hooks: {
        beforeSessionPick: beforePick,
        teamLanding: (teamId) => teamId === 'alix' ? 'example:session' : null,
      },
    });
    const context = { teamId: 'alix', sessionId: 'local:tui::local_user', core: null };
    expect(panelEntryActions(context)[0].overlayId).toBe('extension:example.module:manage');
    expect(panelEntryActions({ ...context, teamId: 'other' })).toEqual([]);
    expect(panelRailCards('alix')[0].id).toBe('extension:example.module:summary');
    expect(panelRailCardIds()).toEqual(['extension:example.module:summary']);
    expect(teamLanding('alix')).toBe('example:session');

    setupPanelExtensions({
      teamId: ref('alix'), sessionId: ref('local:tui::local_user'), core: ref(null),
      selectSession: vi.fn(), setSession: vi.fn(), syncTeamCore: vi.fn(),
    });
    beforeSessionPick('example:session');
    expect(beforePick).toHaveBeenCalledOnce();
  });

  it('拒绝重复或非法扩展 id', () => {
    registerPanelExtension({ id: 'example.module' });
    expect(() => registerPanelExtension({ id: 'example.module' })).toThrow('duplicate');
    expect(() => registerPanelExtension({ id: 'bad id' })).toThrow('invalid');
  });
});
