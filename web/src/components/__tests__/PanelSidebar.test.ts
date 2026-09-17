//! 右侧边栏卡片容器契约（2026-09-19：迁入 chat-rail，新增 Shell 卡）。
//!
//! 背景：左侧边栏已移除；容器现承载「临时分支」（并行模式门控）与
//! 「Shell」（常驻）两类卡片。会话切换统一走入口行「会话」按钮。
//! 本测试锁定：
//! - Shell 卡常驻（含计数徽标 = 会话数）；
//! - 临时分支卡仅并行多会话模式显示；
//! - 不再渲染「会话」切换卡（防回流）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
}));

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

describe('PanelSidebar（右侧边栏卡片容器）', () => {
  beforeEach(() => {
    state.teams = [team({ loop_mode: 'single' })];
    state.activeTeamId = 'alix';
    state.sessions = [session({})];
    state.branchTabs = {};
    state.shellSessions = [];
    state.connected = true;
  });

  it('Shell 卡常驻，计数徽标 = 会话数；单会话模式无临时分支卡', () => {
    const wrapper = mountSidebar();
    const text = wrapper.text();
    expect(text).toContain('Shell');
    expect(text).not.toContain('临时分支');
  });

  it('卡片可折叠：点击 Shell 卡头收起内容，再点展开', async () => {
    const wrapper = mountSidebar();
    const head = wrapper.findAll('.sidebar-card-head').find((el) =>
      el.text().includes('Shell'),
    );
    expect(head).toBeTruthy();
    await head!.trigger('click');
    // 收起后终端面板内容隐藏（v-show：仍在 DOM 但不可见）
    const body = wrapper.findAll('.sidebar-card-body').find((el) =>
      (el.element as HTMLElement).innerHTML.includes('shell-panel'),
    );
    expect(body).toBeTruthy();
    expect((body!.element as HTMLElement).style.display).toBe('none');
  });

  it('并行多会话模式：临时分支卡 + Shell 卡并存', () => {
    state.teams = [team({ loop_mode: 'parallel' })];
    const wrapper = mountSidebar();
    const text = wrapper.text();
    expect(text).toContain('临时分支');
    expect(text).toContain('Shell');
  });

  it('不渲染「会话」切换卡（切换统一走入口行按钮）', () => {
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
    expect(wrapper.text()).not.toContain('Evence');
  });
});
