//! 侧边栏会话卡可见性契约（2026-09-14）。
//!
//! 背景：QQ 会话存在但面板看不到（single 模式隐藏了整张「会话」卡，
//! 聊天区又只按默认 local 会话过滤）——多来源人格的 QQ 对话完全不可达。
//! 规则：
//! - 并行多会话模式：会话卡 + 临时分支卡都显示（原语义）；
//! - 单会话模式：默认隐藏两张卡；但一旦该智能体存在非 local 来源的
//!   会话（QQ 私聊/群等），**会话卡必须显示**，否则这些会话不可达；
//!   临时分支卡仍只属于并行模式（后端 single 不发 ReplyBranch*）。

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
    props: { activeSessionId: 'local:tui::local_user', activeBranchId: null },
  });
}

describe('PanelSidebar 会话卡可见性', () => {
  beforeEach(() => {
    state.teams = [team({ loop_mode: 'single' })];
    state.activeTeamId = 'alix';
    state.sessions = [session({})];
    state.branchTabs = {};
  });

  it('单会话 + 仅 local 会话：两张卡都隐藏（原语义，本地单源不需要会话管理）', () => {
    const wrapper = mountSidebar();
    expect(wrapper.text()).not.toContain('会话');
    expect(wrapper.text()).not.toContain('临时分支');
  });

  it('单会话 + 存在 QQ 会话：会话卡显示（QQ 会话可达），临时分支卡仍隐藏', () => {
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
    const text = wrapper.text();
    expect(text).toContain('会话');
    expect(text).toContain('QQ 私聊');
    expect(text).toContain('Evence');
    // 单会话模式不发 ReplyBranch*，分支卡无内容可展示
    expect(text).not.toContain('临时分支');
  });

  it('其他智能体的 QQ 会话不触发本智能体的会话卡', () => {
    state.sessions.push(
      session({ id: 'qq:dm::10001', team_id: 'self-coding', platform: 'qq', scope: 'dm' }),
    );
    const wrapper = mountSidebar();
    expect(wrapper.text()).not.toContain('会话');
  });

  it('并行多会话模式：两张卡都显示（原语义）', () => {
    state.teams = [team({ loop_mode: 'parallel' })];
    const wrapper = mountSidebar();
    const text = wrapper.text();
    expect(text).toContain('会话');
    expect(text).toContain('临时分支');
  });
});
