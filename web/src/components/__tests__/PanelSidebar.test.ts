//! 侧边栏契约（2026-09-14 会话卡迁出后）。
//!
//! 背景：侧边栏原有「会话」卡（SessionGroups）——多会话上下文上线后，
//! 会话切换统一走入口行「会话」按钮（SessionSwitcher），侧边栏会话卡
//! 已删除（避免两处入口重复/状态分叉）。本测试锁定：
//! - 侧边栏只保留「临时分支」卡，且仅并行多会话模式显示；
//! - 任何模式下都不再渲染「会话」卡（防回流）。

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PanelSidebar from '../PanelSidebar.vue';
import { state } from '../../store';
import type { SessionInfo, TeamInfo } from '../../protocol';

function team(over: Partial<TeamInfo>): TeamInfo {
  return { id: 'alix', name: 'Alix', enabled: true, sessions: 0, ...over } as TeamInfo;
}

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

function mountSidebar() {
  return mount(PanelSidebar, {
    props: { activeBranchId: null },
  });
}

describe('PanelSidebar（会话卡已迁出）', () => {
  beforeEach(() => {
    state.teams = [team({ loop_mode: 'single' })];
    state.activeTeamId = 'alix';
    state.sessions = [session({})];
    state.branchTabs = {};
  });

  it('单会话模式：无任何卡片', () => {
    const wrapper = mountSidebar();
    const text = wrapper.text();
    expect(text).not.toContain('临时分支');
    expect(text).not.toContain('会话');
  });

  it('存在 QQ 会话时也不渲染「会话」卡（切换统一走入口行按钮）', () => {
    state.sessions.push(
      session({
        id: 'qq:dm::1828980067',
        platform: 'qq',
        scope: 'dm',
        user_id: '1828980067',
        nickname: 'Evence',
        last_message: 'hi',
      }),
    );
    const wrapper = mountSidebar();
    expect(wrapper.text()).not.toContain('会话');
    expect(wrapper.text()).not.toContain('Evence');
  });

  it('并行多会话模式：仅「临时分支」卡（会话卡不再出现）', () => {
    state.teams = [team({ loop_mode: 'parallel' })];
    const wrapper = mountSidebar();
    const text = wrapper.text();
    expect(text).toContain('临时分支');
    expect(text).not.toContain('会话');
  });
});
