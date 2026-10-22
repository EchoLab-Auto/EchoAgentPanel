//! 工作区 git 状态卡契约（workspace 插件，2026-10 从「工作区会话管理」面板迁入边栏）。
//!
//! 本卡只做三件事：按绑定的工作区会话拉一次 `RequestWorkspaceGitStatus`、
//! 把 `state.workspaceGitBySession` 的快照渲染成**每目录一行**（点行展开细节）、
//! 提供手动刷新。锁定：请求时机（挂载 / 切会话 / 重连 / 手动）、行式渲染
//! （名称 / 分支 / 同步 / 变更数 / 非仓库错误）、展开态默认值（单目录展开、
//! 多目录收起、点过之后以用户为准）、以及「加载态不挂死」。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return { sendCommand, sendPending: vi.fn() };
});

import WorkspaceGitCard from '../WorkspaceGitCard.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';
import { sessionKey } from '../../keys';
import type { WorkspaceGitInfo, WorkspaceSessionInfo } from '../../protocol';

function workspace(over: Partial<WorkspaceSessionInfo> = {}): WorkspaceSessionInfo {
  return {
    id: 'core',
    name: '框架',
    description: '',
    directories: ['/srv/core'],
    ...over,
  } as WorkspaceSessionInfo;
}

function info(over: Partial<WorkspaceGitInfo> = {}): WorkspaceGitInfo {
  return { directory: '/srv/core', is_repo: true, ...over } as WorkspaceGitInfo;
}

/** 本次测试里发出的 git 请求（按顺序）。 */
function gitCalls() {
  return vi
    .mocked(sendCommand)
    .mock.calls.map((c) => c[0])
    .filter(
      (c): c is { RequestWorkspaceGitStatus: { team_id?: string | null; session_id: string } } =>
        typeof c === 'object' && c !== null && 'RequestWorkspaceGitStatus' in c,
    );
}

describe('WorkspaceGitCard（工作区 git 状态卡）', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    state.connected = true;
    state.activeRegion = null;
    state.workspaceGitBySession = {};
  });

  it('挂载即拉取：命令带 team_id 与 session_id', async () => {
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    const calls = gitCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].RequestWorkspaceGitStatus.team_id).toBe('EchoCode');
    expect(calls[0].RequestWorkspaceGitStatus.session_id).toBe('core');
    wrapper.unmount();
  });

  it('无会话 / 未连接 / 无 team 都不发请求，并给出空态', async () => {
    const noSession = mount(WorkspaceGitCard, { props: { teamId: 'EchoCode', session: null } });
    await nextTick();
    expect(gitCalls().length).toBe(0);
    expect(noSession.text()).toContain('没有激活的工作区会话');
    noSession.unmount();

    const noTeam = mount(WorkspaceGitCard, { props: { teamId: null, session: workspace() } });
    await nextTick();
    expect(gitCalls().length).toBe(0);
    noTeam.unmount();

    state.connected = false;
    const offline = mount(WorkspaceGitCard, { props: { teamId: 'EchoCode', session: workspace() } });
    await nextTick();
    expect(gitCalls().length).toBe(0);
    offline.unmount();
    state.connected = true;
  });

  it('单目录默认展开：分支/同步/计数/父目录/最近提交/文件 chip 全渲染', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [
        info({
          directory: '/home/evence/code_file/gitlab/echo-tech/ui-frame',
          branch: 'main',
          ahead: 2,
          behind: 1,
          staged: 1,
          modified: 3,
          untracked: 2,
          changed_files: ['src/main.rs', 'README.md'],
          last_commit: 'abc1234 初始提交',
        }),
      ],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    const text = wrapper.text();
    // 行：目录名取末段 + 分支 + 同步 + 变更总数（1+3+2=6）
    expect(text).toContain('ui-frame');
    expect(text).toContain('main');
    expect(wrapper.find('.wgc-sync').text()).toBe('↑2');
    expect(wrapper.findAll('.wgc-sync')[1].text()).toBe('↓1');
    expect(wrapper.find('.wgc-row__count').text()).toBe('6');
    // 展开块：计数全称 + 父目录 + 提交 + 文件 chip
    expect(text).toContain('已暂存 1');
    expect(text).toContain('已修改 3');
    expect(text).toContain('未跟踪 2');
    expect(text).toContain('/home/evence/code_file/gitlab/echo-tech');
    expect(text).toContain('abc1234 初始提交');
    expect(text).toContain('src/main.rs');
    // 行 title = 全路径 + 分支/计数/提交（收起态下也读得到全部）
    const rowTip = wrapper.find('.wgc-row').attributes('title') ?? '';
    expect(rowTip).toContain('/home/evence/code_file/gitlab/echo-tech/ui-frame');
    expect(rowTip).toContain('已修改 3');
    expect(rowTip).toContain('abc1234 初始提交');
    // 快照到达即收掉加载态（不必等 8s 超时）
    expect(wrapper.text()).not.toContain('读取中…');
    wrapper.unmount();
  });

  it('多目录默认收起：行上只有分支/计数，点行展开才出细节', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [
        info({ directory: '/srv/a', branch: 'main', modified: 2, changed_files: ['a.rs'] }),
        info({ directory: '/srv/b', branch: 'dev', untracked: 1 }),
      ],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    expect(wrapper.findAll('.wgc-row').length).toBe(2);
    expect(wrapper.findAll('.wgc-detail').length).toBe(0);
    expect(wrapper.findAll('.wgc-row__branch').map((e) => e.text())).toEqual(['⑂ main', '⑂ dev']);
    expect(wrapper.findAll('.wgc-row__count').map((e) => e.text())).toEqual(['2', '1']);
    expect(wrapper.findAll('.wgc-row__name').map((e) => e.text())).toEqual(['a', 'b']);

    await wrapper.findAll('.wgc-row')[0].trigger('click');
    expect(wrapper.findAll('.wgc-detail').length).toBe(1);
    expect(wrapper.text()).toContain('a.rs');
    await wrapper.findAll('.wgc-row')[0].trigger('click');
    expect(wrapper.findAll('.wgc-detail').length).toBe(0);
    wrapper.unmount();
  });

  it('单目录默认展开，但点一下收起后以用户为准（刷新不再自动展开）', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [info({ branch: 'main', modified: 1 })],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    expect(wrapper.findAll('.wgc-detail').length).toBe(1);
    await wrapper.find('.wgc-row').trigger('click');
    expect(wrapper.findAll('.wgc-detail').length).toBe(0);
    // 刷新（新快照）后仍保持收起
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [info({ branch: 'main', modified: 1 })],
    };
    await nextTick();
    expect(wrapper.findAll('.wgc-detail').length).toBe(0);
    wrapper.unmount();
  });

  it('干净仓库行显示 ✓；非仓库行显示 Core 的错误原因且不可展开', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [
        info({ directory: '/srv/core', branch: 'main' }),
        info({ directory: '/srv/missing', is_repo: false, error: '目录不存在' }),
      ],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    expect(wrapper.findAll('.wgc-row__count').map((e) => e.text())).toEqual(['✓']);
    expect(wrapper.findAll('.wgc-row__count')[0].classes()).toContain('wgc-row__count--clean');
    expect(wrapper.text()).toContain('目录不存在');
    // 非仓库行没有 caret / 分支，点它也不会展开
    const errRow = wrapper.findAll('.wgc-row')[1];
    expect(errRow.find('.wgc-caret').exists()).toBe(false);
    expect(errRow.find('.wgc-row__branch').exists()).toBe(false);
    await errRow.trigger('click');
    expect(wrapper.findAll('.wgc-detail').length).toBe(0);
    wrapper.unmount();
  });

  it('重名目录：补父目录末段消歧；唯一目录不加后缀', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [
        info({ directory: '/w/echo-agent-core/source', branch: 'main' }),
        info({ directory: '/w/echo-agent-panel/source', branch: 'main' }),
        info({ directory: '/w/ui-frame', branch: 'main' }),
      ],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    const names = wrapper.findAll('.wgc-row__name').map((e) => e.text());
    expect(names).toEqual(['source', 'source', 'ui-frame']);
    // 两个 source 各带父目录末段；ui-frame 唯一 → 无后缀
    expect(wrapper.findAll('.wgc-row__hint').map((e) => e.text())).toEqual([
      'echo-agent-core',
      'echo-agent-panel',
    ]);
    wrapper.unmount();
  });

  it('跨机目录：显示节点徽标，父目录剥掉 node://host 前缀', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [
        info({ directory: 'node://A100-40g/home/evence/echo-agent-ui', branch: 'main' }),
      ],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    expect(wrapper.find('.wgc-node').text()).toBe('A100-40g');
    // 单目录 → 展开：父目录剥掉 node://host 前缀，只留本机路径
    expect(wrapper.text()).toContain('/home/evence');
    expect(wrapper.text()).not.toContain('node://A100-40g/home/evence');
    wrapper.unmount();
  });

  it('切换会话 → 重新拉取新会话的状态（旧快照不串台，展开态重置）', async () => {
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [info({ branch: 'main', modified: 1 })],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace({ id: 'core' }) },
    });
    await nextTick();
    expect(wrapper.findAll('.wgc-detail').length).toBe(1);
    // 新会话没有快照 → 回到「正在读取」空态（不残留旧会话的行）
    await wrapper.setProps({ session: workspace({ id: 'panel', name: '面板' }) });
    await nextTick();
    const calls = gitCalls();
    expect(calls.length).toBe(2);
    expect(calls[1].RequestWorkspaceGitStatus.session_id).toBe('panel');
    expect(wrapper.findAll('.wgc-row').length).toBe(0);
    expect(wrapper.text()).toContain('正在读取 git 状态');
    wrapper.unmount();
  });

  it('重连后重新拉取（缓存已被连接层清空）', async () => {
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    const before = gitCalls().length;
    state.connected = false;
    await nextTick();
    state.connected = true;
    await nextTick();
    expect(gitCalls().length).toBe(before + 1);
    wrapper.unmount();
  });

  it('刷新按钮：再发一次同一会话的请求；未连接时禁用', async () => {
    // 已有快照 → 挂载时不进加载态（按钮可点）且不闪「读取中…」
    state.workspaceGitBySession = {
      [sessionKey(null, 'core')]: [info({ branch: 'main' })],
    };
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    expect(wrapper.text()).toContain('刷新');
    expect(wrapper.text()).not.toContain('读取中…');
    const before = gitCalls().length;
    await wrapper.find('button').trigger('click');
    expect(gitCalls().length).toBe(before + 1);

    state.connected = false;
    await nextTick();
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
    state.connected = true;
  });

  it('加载态不挂死：请求后固定 8s 收敛回可点（事件缺失也不永久转圈）', async () => {
    vi.useFakeTimers();
    const wrapper = mount(WorkspaceGitCard, {
      props: { teamId: 'EchoCode', session: workspace() },
    });
    await nextTick();
    expect(wrapper.text()).toContain('读取中…');
    vi.advanceTimersByTime(8000);
    await nextTick();
    expect(wrapper.text()).toContain('刷新');
    wrapper.unmount();
    vi.useRealTimers();
  });
});
