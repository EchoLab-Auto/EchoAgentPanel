//! 会话切换面板契约（多会话上下文入口行按钮，2026-09）。
//!
//! 背景：单会话模式下每个群/私聊拥有独立上下文；入口行「会话」按钮
//! （ChatView 提供，>1 个会话时显示）弹出本面板用于切换。

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionSwitcher from '../SessionSwitcher.vue';
import { state } from '../../store';
import type { SessionInfo } from '../../protocol';

function session(over: Partial<SessionInfo>): SessionInfo {
  return {
    id: 'local:tui::local_user',
    team_id: 'alix',
    platform: 'local',
    scope: 'tui',
    user_id: 'local_user',
    nickname: 'local user',
    group_name: null,
    last_active: 1,
    last_message: '',
    ...over,
  } as SessionInfo;
}

function mountSwitcher(activeSessionId = 'local:tui::local_user') {
  return mount(SessionSwitcher, {
    props: { activeTeamId: 'alix', activeSessionId },
  });
}

describe('SessionSwitcher 会话切换', () => {
  beforeEach(() => {
    state.teams = [{ id: 'alix', name: 'Alix', enabled: true, sessions: 0 } as never];
    state.sessions = [
      session({}),
      session({
        id: 'qq:dm::1828980067',
        platform: 'qq',
        scope: 'dm',
        user_id: '1828980067',
        nickname: 'Evence',
      }),
      session({
        id: 'qq:group:999:42',
        platform: 'qq',
        scope: 'group',
        user_id: '42',
        nickname: '群友',
        group_name: '测试群',
      }),
      // 其他智能体的会话不应出现
      session({ id: 'qq:dm::10001', team_id: 'self-coding', platform: 'qq', scope: 'dm' }),
    ];
    state.activities = {};
  });

  it('按平台分组展示当前智能体的会话（他属会话不显示）', () => {
    const wrapper = mountSwitcher();
    const text = wrapper.text();
    expect(text).toContain('Local');
    expect(text).toContain('QQ 私聊');
    expect(text).toContain('Evence');
    expect(text).toContain('QQ 群');
    expect(text).toContain('测试群');
    expect(text).not.toContain('10001');
  });

  it('当前会话高亮', () => {
    const wrapper = mountSwitcher('qq:dm::1828980067');
    const active = wrapper.find('.sw-item.is-active');
    expect(active.exists()).toBe(true);
    expect(active.text()).toContain('Evence');
  });

  it('点击会话发出 select 事件', async () => {
    const wrapper = mountSwitcher();
    const evence = wrapper.findAll('.sw-item').find((b) => b.text().includes('Evence'));
    expect(evence).toBeTruthy();
    await evence!.trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['qq:dm::1828980067']);
  });

  it('运行中会话显示忙碌点', () => {
    state.activities = {
      'qq:dm::1828980067': { phase: 'thinking', detail: null, startedAt: 1, toolsCompleted: 0, subagentsCompleted: 0, promptTokens: 0, completionTokens: 0 },
    } as typeof state.activities;
    const wrapper = mountSwitcher();
    const evence = wrapper.findAll('.sw-item').find((b) => b.text().includes('Evence'));
    expect(evence!.find('.sw-busy').exists()).toBe(true);
  });
});
