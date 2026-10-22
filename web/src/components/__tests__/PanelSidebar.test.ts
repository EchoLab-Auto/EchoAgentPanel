//! 边栏卡片栈契约（RailStack，2026-09-19；2026-09-24 起左右两列 + 拖动换列）。
//!
//! 卡片：连接状态（常驻，紧凑卡）/ 文件浏览器（workspace 插件 + 激活会话时）/
//! Shell（常驻）/ 临时分支（并行模式）。卡片可折叠为横条；分隔条拖动调整
//! 上下空间；卡片可在两列之间拖动（`side` + rail-layout）。
//! 本测试锁定：卡片门控、列归属与换列、折叠行为、分隔条结构、会话切换卡不回流。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发，
    // 调用记录并入 sendCommand 的 mock，请求类断言无需两处查。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

import PanelSidebar from '../PanelSidebar.vue';
import { state } from '../../store';
import { moveToOtherSide, resetRailLayout, sideOf } from '../../rail-layout';
import { sessionKey } from '../../keys';
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

async function mountSidebar(side: 'left' | 'right' = 'right') {
  // 右栏卡片（连接状态 / 文件浏览器 / Shell 列表）为异步组件
  // （2026-10 按需加载）：加载链含多层 promise（loader → 渲染 → 子组件）。
  //
  // 有界轮询等待 `.conn-card` 挂载（2026-10 巡检修 flaky）：固定 6 轮
  // 微任务在并发全量跑（CPU 忙 → 动态 import 排队）时会不够——实测全量
  // 跑偶发「连接状态卡缺失」失败、单文件跑必过。改为最多 2s 的完成式
  // 等待（正常 <50ms 即出现），末尾再推进静默帧保证子组件内部稳定。
  const wrapper = mount(PanelSidebar, {
    props: { activeBranchId: null, teamId: 'alix', side },
  });
  const deadline = Date.now() + 2000;
  while (!wrapper.find('.conn-card').exists() && Date.now() < deadline) {
    await flushPromises();
    await nextTick();
    await new Promise((r) => setTimeout(r, 10));
  }
  for (let i = 0; i < 3; i++) {
    await flushPromises();
    await nextTick();
  }
  return wrapper;
}

describe('PanelSidebar（边栏卡片栈）', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRailLayout();
    state.teams = [team({ loop_mode: 'single' })];
    state.activeTeamId = 'alix';
    state.sessions = [session({})];
    state.branchTabs = {};
    state.shellSessions = [];
    state.connected = true;
    state.workspaceSessions = [];
    state.workspaceActive = null;
    state.workspaceTeamId = null;
    state.workspaceGitBySession = {};
  });

  it('卡片顺序与门控：连接状态置顶常驻、Shell 常驻（在文件浏览器下方）、临时分支仅并行模式、无激活工作区时无文件浏览器卡', async () => {
    const wrapper = await mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles[0]).toContain('连接状态');
    expect(titles.some((t) => t.startsWith('Shell'))).toBe(true);
    expect(titles.some((t) => t.includes('临时分支'))).toBe(false);
    expect(titles.some((t) => t.includes('文件浏览器'))).toBe(false);
  });

  it('连接状态卡：Core 状态 + QQ 实例（紧凑卡固定高度、不参与 flex 分配）', async () => {
    state.instances = [
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
    ] as typeof state.instances;
    const wrapper = await mountSidebar();
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
    state.instances = [];
  });

  it('连接状态卡：断连时展示重连提示；无实例时显示空态', async () => {
    state.connected = false;
    state.instances = [];
    const wrapper = await mountSidebar();
    const status = wrapper.find('.conn-card');
    expect(status.text()).toContain('连接中');
    expect(status.text()).toContain('正在自动重连');
    expect(status.text()).toContain('（无实例）');
    state.connected = true;
  });

  it('有激活工作区会话：文件浏览器与 Git 状态卡在连接状态下方、Shell 在其下', async () => {
    state.workspaceSessions = [
      { id: 'core', name: '框架', description: '', directories: ['/srv/core'] },
    ];
    state.workspaceActive = 'core';
    state.workspaceTeamId = 'alix';
    const wrapper = await mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    // [连接状态, 文件浏览器, Git, Shell]——Git 卡紧跟文件浏览器（同一工作区）
    expect(titles[0]).toContain('连接状态');
    expect(titles[1]).toContain('文件浏览器');
    expect(titles[1]).toContain('框架');
    expect(titles[2]).toContain('Git');
    expect(titles[2]).toContain('框架');
    expect(titles[3]).toContain('Shell');
  });

  it('Git 状态卡：无激活工作区时不渲染（与文件浏览器同一门控）', async () => {
    const wrapper = await mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles.some((t) => t.includes('Git'))).toBe(false);
  });

  it('Git 状态卡：徽标 = 未提交变更文件数（已暂存 + 已修改 + 未跟踪）', async () => {
    state.workspaceSessions = [
      { id: 'core', name: '框架', description: '', directories: ['/srv/core', '/srv/panel'] },
    ];
    state.workspaceActive = 'core';
    state.workspaceTeamId = 'alix';
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [
        { directory: '/srv/core', is_repo: true, staged: 2, modified: 3, untracked: 1 },
        { directory: '/srv/panel', is_repo: true, staged: 0, modified: 4, untracked: 0 },
      ],
    } as never;
    const wrapper = await mountSidebar();
    const gitTitle = wrapper
      .findAll('.rail-stack__title')
      .find((t) => t.text().includes('Git'))!;
    expect(gitTitle.text()).toContain('10');
    state.workspaceGitBySession = {};
  });

  it('并行多会话模式：临时分支卡出现在栈尾', async () => {
    state.teams = [team({ loop_mode: 'parallel' })];
    const wrapper = await mountSidebar();
    const titles = wrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(titles[titles.length - 1]).toContain('临时分支');
  });

  it('卡片可折叠为横条：点卡头收起内容（折叠态持久化）', async () => {
    const wrapper = await mountSidebar();
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
    const wrapper = await mountSidebar();
    // 卡片：[连接状态(紧凑), 文件浏览器, Git, Shell]；与紧凑卡相邻的分隔条不可拖，
    // 其余（文件浏览器 ↔ Git ↔ Shell）都可拖。
    const dividers = wrapper.findAll('.rail-stack__divider');
    expect(dividers.length).toBe(3);
    expect(dividers[0].classes()).not.toContain('rail-stack__divider--draggable');
    expect(dividers[1].classes()).toContain('rail-stack__divider--draggable');
    expect(dividers[2].classes()).toContain('rail-stack__divider--draggable');
    // 折叠上方卡片（文件浏览器）后该分隔条不可拖
    const filesHead = wrapper
      .findAll('.rail-stack__head')
      .find((h) => h.text().includes('文件浏览器'))!;
    await filesHead.trigger('click');
    expect(wrapper.findAll('.rail-stack__divider')[1].classes()).not.toContain(
      'rail-stack__divider--draggable',
    );
  });

  it('左右列共用组件：side 决定渲染本列卡片（默认布局右列全有、左列为空）', async () => {
    const rightWrapper = await mountSidebar('right');
    const rightTitles = rightWrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(rightTitles.some((t) => t.includes('连接状态'))).toBe(true);
    expect(rightTitles.some((t) => t.startsWith('Shell'))).toBe(true);

    const leftWrapper = await mountSidebar('left');
    expect(leftWrapper.findAll('.rail-stack__title').length).toBe(0);
    expect(leftWrapper.find('.rail-stack').exists()).toBe(true);
  });

  it('卡片归属由 rail-layout 决定：换列后只在本列渲染', async () => {
    moveToOtherSide('shell');
    const leftWrapper = await mountSidebar('left');
    const leftTitles = leftWrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(leftTitles.some((t) => t.startsWith('Shell'))).toBe(true);

    const rightWrapper = await mountSidebar('right');
    const rightTitles = rightWrapper.findAll('.rail-stack__title').map((t) => t.text());
    expect(rightTitles.some((t) => t.startsWith('Shell'))).toBe(false);
    expect(rightTitles.some((t) => t.includes('连接状态'))).toBe(true);
  });

  it('卡头「移到另一侧」按钮：迁移布局并冒泡 relocate 事件', async () => {
    const wrapper = await mountSidebar('right');
    const shellHead = wrapper
      .findAll('.rail-stack__head')
      .find((h) => h.text().includes('Shell'))!;
    expect(shellHead.find('.rail-stack__relocate').attributes('title')).toBe('移到左侧栏');
    await shellHead.find('.rail-stack__relocate').trigger('click');
    expect(sideOf('shell')).toBe('left');
    expect(wrapper.emitted('relocate')?.[0]).toEqual(['shell', 'left']);
  });

  it('分隔条拖动比例与折叠态按卡片 id 存（换列后保留）', async () => {
    const rightWrapper = await mountSidebar('right');
    const shellHead = rightWrapper
      .findAll('.rail-stack__head')
      .find((h) => h.text().includes('Shell'))!;
    await shellHead.trigger('click'); // 折叠
    const saved = JSON.parse(localStorage.getItem('echo-panel-rail-cards') ?? '{}');
    expect(saved.open?.shell).toBe(false);

    moveToOtherSide('shell');
    const leftWrapper = await mountSidebar('left');
    // 换列后仍是折叠态（状态按 id 存，与所在列无关）
    expect(leftWrapper.find('.rail-stack__body').exists()).toBe(false);
  });

  it('分隔条净占位为 0：卡片间距 = 槽位间距（不因 divider 负边距被压缩）', async () => {
    // 结构不变量：轨道槽位里「divider + 卡片」的总占位必须等于 0 偏移，
    // 否则卡间距会被 divider 的负 margin 吃掉（2026-09-24 实测回归：1px）。
    // 这里锁定 DOM 结构与类名契约（像素级由 Playwright 实测守护）。
    const wrapper = await mountSidebar('right');
    const slots = wrapper.findAll('.rail-stack__slot');
    expect(slots.length).toBeGreaterThan(1);
    // 第二个槽（含 divider 的常规槽）应同时包含 divider 与卡片，且顺序为 divider → card
    const second = slots[1];
    const children = Array.from(second.element.children).map((el) => el.className);
    const dividerIndex = children.findIndex((c) => c.includes('rail-stack__divider'));
    expect(dividerIndex).toBe(0);
    expect(children.some((c) => c.includes('rail-stack__card'))).toBe(true);
  });

  it('落点指示线绝对定位（不参与布局，出现/消失不推挤卡片）', async () => {
    const { railDrag } = await import('../../rail-drag');
    const wrapper = await mountSidebar('right');
    // 制造拖动中的落点状态（dropSide 命中本列、index 0）
    railDrag.active = true;
    railDrag.dropSide = 'right';
    railDrag.dropIndex = 0;
    await nextTick();
    const line = wrapper.find('.rail-stack__drop-line');
    expect(line.exists()).toBe(true);
    expect(line.classes()).toContain('rail-stack__drop-line');
    // 类契约：CSS 里是 absolute（样式断言在快照级；此处避免读取 jsdom 未计算样式）
    railDrag.active = false;
    railDrag.dropSide = null;
    railDrag.dropIndex = null;
  });

  it('不渲染「会话」切换卡（切换统一走入口行按钮）', async () => {
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
    const wrapper = await mountSidebar();
    expect(wrapper.text()).not.toContain('Evence');
  });
});
