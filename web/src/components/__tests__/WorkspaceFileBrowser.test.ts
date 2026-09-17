//! 工作区文件浏览器契约（2026-09-19 起迁出 WorkspacePanel，位于会话视图右侧边栏）。
//!
//! 行为不变：只读浏览、路径栈导航、根切换、越界错误展示、team 未选择不发命令。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => ({
  sendCommand: vi.fn(),
}));

import WorkspaceFileBrowser from '../WorkspaceFileBrowser.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';
import type { WorkspaceSessionInfo } from '../../protocol';

function seed(sessions: WorkspaceSessionInfo[], active: string | null = null, team = 'EchoCode') {
  state.workspaceSessions = sessions;
  state.workspaceActive = active;
  state.workspaceTeamId = team;
  state.workspaceGitBySession = {};
  state.workspaceFiles = {};
  state.connected = true;
}

function mountBrowser() {
  const session = state.workspaceSessions[0] ?? null;
  return mount(WorkspaceFileBrowser, {
    props: { teamId: state.workspaceTeamId, session },
  });
}

describe('WorkspaceFileBrowser 文件浏览器（右侧边栏）', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    seed([]);
  });

  it('文件浏览器：打开即请求首个根目录，目录可下钻、面包屑可回退', async () => {
    seed([{ id: 'core', name: '框架', directories: ['/srv/core', '/srv/panel'] }]);
    const wrapper = mountBrowser();
    await nextTick();
    let calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const first = calls.find(
      (c) => typeof c === 'object' && 'RequestWorkspaceFiles' in (c as object),
    ) as { RequestWorkspaceFiles: { team_id: string; session_id: string; path: string } };
    expect(first, 'mount 请求首个根目录').toBeTruthy();
    expect(first.RequestWorkspaceFiles).toEqual({
      team_id: 'EchoCode',
      session_id: 'core',
      path: '/srv/core',
    });

    // 回推目录内容：src/ 子目录 + 文件。
    state.workspaceFiles['/srv/core'] = {
      entries: [
        { name: 'src', path: '/srv/core/src', is_dir: true, size: 0 },
        { name: 'Cargo.toml', path: '/srv/core/Cargo.toml', is_dir: false, size: 2048 },
      ],
      error: null,
    };
    await nextTick();
    expect(wrapper.text()).toContain('src');
    expect(wrapper.text()).toContain('Cargo.toml');
    expect(wrapper.text()).toContain('2.0 KB');

    // 点击 src/ → 请求子目录。
    vi.mocked(sendCommand).mockClear();
    const dirRow = wrapper.findAll('.wfb-row').find((r) => r.text().includes('src'));
    expect(dirRow).toBeTruthy();
    await dirRow!.trigger('click');
    calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const drill = calls.find(
      (c) => typeof c === 'object' && 'RequestWorkspaceFiles' in (c as object),
    ) as { RequestWorkspaceFiles: { path: string } };
    expect(drill.RequestWorkspaceFiles.path).toBe('/srv/core/src');
    await nextTick();

    // 面包屑回退到根（点击第一级 crumb）。
    vi.mocked(sendCommand).mockClear();
    const rootCrumb = wrapper.findAll('.wfb-crumb')[0];
    await rootCrumb.trigger('click');
    calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const back = calls.find(
      (c) => typeof c === 'object' && 'RequestWorkspaceFiles' in (c as object),
    ) as { RequestWorkspaceFiles: { path: string } };
    expect(back.RequestWorkspaceFiles.path).toBe('/srv/core');
    wrapper.unmount();
  });

  it('文件浏览器：多根切换与错误展示', async () => {
    seed([{ id: 'core', name: '框架', directories: ['/srv/core', '/srv/panel'] }]);
    const wrapper = mountBrowser();
    await nextTick();
    // 两个根 chip；点第二个切换根。
    const roots = wrapper.findAll('.wfb-root');
    expect(roots.length).toBe(2);
    vi.mocked(sendCommand).mockClear();
    await roots[1].trigger('click');
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    const switched = calls.find(
      (c) => typeof c === 'object' && 'RequestWorkspaceFiles' in (c as object),
    ) as { RequestWorkspaceFiles: { path: string } };
    expect(switched.RequestWorkspaceFiles.path).toBe('/srv/panel');

    // 错误展示（越界/不存在）。
    state.workspaceFiles['/srv/panel'] = {
      entries: [],
      error: '路径不在该会话的工作区目录内',
    };
    await nextTick();
    expect(wrapper.find('.wfb-error').exists()).toBe(true);
    expect(wrapper.text()).toContain('路径不在该会话的工作区目录内');
    wrapper.unmount();
  });

  it('文件浏览器：team 未选择时不发任何命令', async () => {
    seed([{ id: 'core', name: '框架', directories: ['/srv/core'] }]);
    const wrapper = mount(WorkspaceFileBrowser, { props: { teamId: null, session: state.workspaceSessions[0] ?? null } });
    await nextTick();
    const calls = vi.mocked(sendCommand).mock.calls.map((c) => c[0]);
    expect(
      calls.some((c) => typeof c === 'object' && 'RequestWorkspaceFiles' in (c as object)),
    ).toBe(false);
    wrapper.unmount();
  });
});
