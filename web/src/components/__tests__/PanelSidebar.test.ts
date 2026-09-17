//! 右侧边栏卡片栈契约（RailStack，2026-09-19）。
//!
//! 卡片：文件浏览器（workspace 插件 + 激活会话时）/ Shell（常驻）/
//! 临时分支（并行模式）。卡片可折叠为横条；分隔条拖动调整上下空间。
//! 本测试锁定：卡片门控、折叠行为、会话切换卡不回流。

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
    props: { activeBranchId: null, teamId: 'alix' },
  });
}

describe('PanelSidebar（右侧边栏卡片栈）', () => {
  beforeEach(() => {
    localStorage.clear();
    state.teams = [team({ loop_mode: 'single' })];
    state.activeTeamId = 'alix';
    state.sessions = [session({})];
    state.branchTabs = {};
    state.shellSessions = [];
    state.connected = true;
    state.workspaceSessions = [];
    state.workspaceActive = null;
    state.workspaceTeamId = null;
  });

  it('卡片顺序与门控：Shell 常驻（在文件浏览器下方）、临时分支仅并行模式、无激活工作区时无文件浏览器卡', () => {
    const wrapper = mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles.some((t) => t.startsWith('Shell'))).toBe(true);
    expect(titles.some((t) => t.includes('临时分支'))).toBe(false);
    expect(titles.some((t) => t.includes('文件浏览器'))).toBe(false);
  });

  it('有激活工作区会话：文件浏览器卡在最上方，Shell 在其下方', () => {
    state.workspaceSessions = [
      { id: 'core', name: '框架', description: '', directories: ['/srv/core'] },
    ];
    state.workspaceActive = 'core';
    state.workspaceTeamId = 'alix';
    const wrapper = mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles[0]).toContain('文件浏览器');
    expect(titles[0]).toContain('框架');
    expect(titles[1]).toContain('Shell');
  });

  it('并行多会话模式：临时分支卡出现在栈尾', () => {
    state.teams = [team({ loop_mode: 'parallel' })];
    const wrapper = mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles[titles.length - 1]).toContain('临时分支');
  });

  it('卡片可折叠为横条：点卡头收起内容（折叠态持久化）', async () => {
    const wrapper = mountSidebar();
    const head = wrapper.findAll('.rail-stack__head').find((el) => el.text().includes('Shell'));
    expect(head).toBeTruthy();
    await head!.trigger('click');
    // 折叠后内容区从 DOM 移除（v-if），卡片收缩为横条
    expect(wrapper.find('.shell-list').exists()).toBe(false);
    const saved = JSON.parse(localStorage.getItem('echo-panel-rail-cards') ?? '{}');
    expect(saved.open?.shell).toBe(false);
    await head!.trigger('click');
    expect(wrapper.find('.shell-list').exists()).toBe(true);
  });

  it('两张卡都展开时分隔条可拖动（draggable 标记），折叠后不可拖', async () => {
    state.workspaceSessions = [
      { id: 'core', name: '框架', description: '', directories: ['/srv/core'] },
    ];
    state.workspaceActive = 'core';
    state.workspaceTeamId = 'alix';
    const wrapper = mountSidebar();
    const divider = wrapper.find('.rail-stack__divider');
    expect(divider.exists()).toBe(true);
    expect(divider.classes()).toContain('rail-stack__divider--draggable');
    // 折叠上方卡片后分隔条不可拖
    const head = wrapper.findAll('.rail-stack__head')[0];
    await head.trigger('click');
    expect(wrapper.find('.rail-stack__divider').classes()).not.toContain(
      'rail-stack__divider--draggable',
    );
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
