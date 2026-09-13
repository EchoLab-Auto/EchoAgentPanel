//! 工作区会话面板契约（workspace 插件，2026-09-13）。
//!
//! 面板按 team 寻址（去主智能体后会话类命令 team_id 必填）：
//! - 打开面板即请求会话列表 + 选中会话的 git 状态；
//! - 新建/编辑经 `SaveWorkspaceSession` 提交（目录按行解析为列表）；
//! - 激活/取消激活经 `ActivateWorkspaceSession`；
//! - team 未选择时不发任何命令（Core 会拒绝无 team_id 的请求）。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
}));

import WorkspacePanel from '../WorkspacePanel.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';
import type { WorkspaceSessionInfo } from '../../protocol';

function seed(sessions: WorkspaceSessionInfo[], active: string | null = null, team = 'EchoCode') {
  state.workspaceSessions = sessions;
  state.workspaceActive = active;
  state.workspaceTeamId = team;
  state.workspaceGitBySession = {};
  state.connected = true;
}

describe('WorkspacePanel 工作区会话', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    seed([]);
  });

  it('打开面板请求列表与选中会话 git 状态', async () => {
    seed([
      { id: 'core', name: '框架', directories: ['/srv/core', '/srv/panel'] },
    ]);
    const wrapper = mount(WorkspacePanel, { props: { teamId: 'EchoCode' } });
    await nextTick();
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const list = calls.find(
      (c) => typeof c === 'object' && 'RequestWorkspaceSessions' in (c as object),
    ) as { RequestWorkspaceSessions: { team_id: string } };
    expect(list).toBeTruthy();
    expect(list.RequestWorkspaceSessions.team_id).toBe('EchoCode');
    const git = calls.find(
      (c) => typeof c === 'object' && 'RequestWorkspaceGitStatus' in (c as object),
    ) as { RequestWorkspaceGitStatus: { session_id: string } };
    expect(git).toBeTruthy();
    expect(git.RequestWorkspaceGitStatus.session_id).toBe('core');
    wrapper.unmount();
  });

  it('team 未选择（null）时不发任何命令', async () => {
    const wrapper = mount(WorkspacePanel, { props: { teamId: null } });
    await nextTick();
    expect(vi.mocked(sendCommand)).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('新建：目录按行解析、空行剔除，命令带 team_id', async () => {
    const wrapper = mount(WorkspacePanel, { props: { teamId: 'EchoCode' } });
    await nextTick();
    vi.mocked(sendCommand).mockClear();
    // 点「新建」
    const newBtn = wrapper.findAll('button').find((b) => b.text() === '新建');
    expect(newBtn).toBeTruthy();
    await newBtn!.trigger('click');
    await nextTick();
    await wrapper.find('.ws-input').setValue('EchoAgent 框架');
    await wrapper.find('.ws-textarea').setValue('/srv/core\n\n/srv/panel\n');
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === '保存');
    await saveBtn!.trigger('click');
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const save = calls.find(
      (c) => typeof c === 'object' && 'SaveWorkspaceSession' in (c as object),
    ) as { SaveWorkspaceSession: { team_id: string; session: WorkspaceSessionInfo } };
    expect(save).toBeTruthy();
    expect(save.SaveWorkspaceSession.team_id).toBe('EchoCode');
    expect(save.SaveWorkspaceSession.session.name).toBe('EchoAgent 框架');
    expect(save.SaveWorkspaceSession.session.directories).toEqual(['/srv/core', '/srv/panel']);
    wrapper.unmount();
  });

  it('激活/取消激活：已激活会话发出 id=null', async () => {
    seed([{ id: 'core', name: '框架', directories: [] }], 'core');
    const wrapper = mount(WorkspacePanel, { props: { teamId: 'EchoCode' } });
    await nextTick();
    vi.mocked(sendCommand).mockClear();
    const deactivate = wrapper.findAll('button').find((b) => b.text() === '取消激活');
    expect(deactivate).toBeTruthy();
    await deactivate!.trigger('click');
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const act = calls.find(
      (c) => typeof c === 'object' && 'ActivateWorkspaceSession' in (c as object),
    ) as { ActivateWorkspaceSession: { team_id: string; id: string | null } };
    expect(act).toBeTruthy();
    expect(act.ActivateWorkspaceSession.id).toBeNull();
    wrapper.unmount();
  });

  it('git 状态：分支/计数/最近提交与文件列表渲染，非仓库显示错误', async () => {
    seed([{ id: 'core', name: '框架', directories: ['/srv/core', '/srv/missing'] }], 'core', 'EchoCode');
    state.workspaceGitBySession = {
      core: [
        {
          directory: '/srv/core',
          is_repo: true,
          branch: 'main',
          ahead: 2,
          behind: 1,
          staged: 1,
          modified: 3,
          untracked: 2,
          changed_files: ['src/main.rs', 'README.md'],
          last_commit: 'abc1234 初始提交',
          error: null,
        },
        {
          directory: '/srv/missing',
          is_repo: false,
          error: '目录不存在',
        },
      ],
    };
    const wrapper = mount(WorkspacePanel, { props: { teamId: 'EchoCode' } });
    await nextTick();
    const text = wrapper.text();
    expect(text).toContain('main');
    expect(text).toContain('↑2');
    expect(text).toContain('↓1');
    expect(text).toContain('已暂存 1');
    expect(text).toContain('已修改 3');
    expect(text).toContain('未跟踪 2');
    expect(text).toContain('abc1234 初始提交');
    expect(text).toContain('src/main.rs');
    expect(text).toContain('目录不存在');
    wrapper.unmount();
  });

  it('跨 team 的陈旧列表不渲染（freshness 校验）', async () => {
    seed([{ id: 'other', name: '别的会话', directories: [] }], null, 'self-coding');
    const wrapper = mount(WorkspacePanel, { props: { teamId: 'EchoCode' } });
    await nextTick();
    expect(wrapper.text()).not.toContain('别的会话');
    wrapper.unmount();
  });
});
