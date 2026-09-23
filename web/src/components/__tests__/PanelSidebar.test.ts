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

  it('卡片顺序与门控：连接状态置顶常驻、Shell 常驻（在文件浏览器下方）、临时分支仅并行模式、无激活工作区时无文件浏览器卡', () => {
    const wrapper = mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles[0]).toContain('连接状态');
    expect(titles.some((t) => t.startsWith('Shell'))).toBe(true);
    expect(titles.some((t) => t.includes('临时分支'))).toBe(false);
    expect(titles.some((t) => t.includes('文件浏览器'))).toBe(false);
  });

  it('连接状态卡：Core 状态 + QQ 适配器实例（紧凑卡固定高度、不参与 flex 分配）', () => {
    state.adapters = [
      {
        name: 'qq',
        display_name: 'QQ（alix）',
        connected: true,
        running: true,
        self_id: '2911759808',
        bind_address: '0.0.0.0:3131',
        started_at: null,
        persona: 'alix',
      },
      {
        name: 'alix-two',
        display_name: 'QQ（alix / alix-two）',
        connected: false,
        running: true,
        self_id: null,
        bind_address: '0.0.0.0:3140',
        started_at: null,
        persona: 'alix',
      },
    ] as typeof state.adapters;
    const wrapper = mountSidebar();
    // 置顶且为紧凑卡（不参与剩余空间分配）
    const cards = wrapper.findAll('.rail-stack__card');
    expect(cards[0].classes()).toContain('rail-stack__card--compact');
    const status = wrapper.find('.conn-card');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('Core');
    expect(status.text()).toContain('已连接');
    expect(status.text()).toContain('QQ（alix）');
    expect(status.text()).toContain('2911759808');
    expect(status.text()).toContain('等待连接');
    // 紧凑卡与相邻卡之间的分隔条不可拖动
    const divider = wrapper.find('.rail-stack__divider');
    expect(divider.classes()).not.toContain('rail-stack__divider--draggable');
    state.adapters = [];
  });

  it('连接状态卡：断连时展示重连提示；无适配器时显示空态', () => {
    state.connected = false;
    state.adapters = [];
    const wrapper = mountSidebar();
    const status = wrapper.find('.conn-card');
    expect(status.text()).toContain('连接中');
    expect(status.text()).toContain('正在自动重连');
    expect(status.text()).toContain('（无适配器）');
    state.connected = true;
  });

  it('有激活工作区会话：文件浏览器卡在连接状态下方、Shell 在其下', () => {
    state.workspaceSessions = [
      { id: 'core', name: '框架', description: '', directories: ['/srv/core'] },
    ];
    state.workspaceActive = 'core';
    state.workspaceTeamId = 'alix';
    const wrapper = mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    // [连接状态, 文件浏览器, Shell]
    expect(titles[0]).toContain('连接状态');
    expect(titles[1]).toContain('文件浏览器');
    expect(titles[1]).toContain('框架');
    expect(titles[2]).toContain('Shell');
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
    // 卡片：[连接状态(紧凑), 文件浏览器, Shell]；与紧凑卡相邻的分隔条不可拖，
    // 文件浏览器 ↔ Shell 之间的那条可拖。
    const dividers = wrapper.findAll('.rail-stack__divider');
    expect(dividers.length).toBe(2);
    expect(dividers[0].classes()).not.toContain('rail-stack__divider--draggable');
    expect(dividers[1].classes()).toContain('rail-stack__divider--draggable');
    // 折叠上方卡片（文件浏览器）后该分隔条不可拖
    const filesHead = wrapper
      .findAll('.rail-stack__head')
      .find((h) => h.text().includes('文件浏览器'))!;
    await filesHead.trigger('click');
    expect(wrapper.findAll('.rail-stack__divider')[1].classes()).not.toContain(
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
