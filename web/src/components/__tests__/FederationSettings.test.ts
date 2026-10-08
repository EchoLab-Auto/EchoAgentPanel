//! 联邦设置页契约：peer 列表渲染 + 会话迁移触发（P3-2b）。
//! 迁移必须带当前会话 id + 人格 id + 目标 peer，交给 Core 分块搬运。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return { sendCommand, sendPending: vi.fn((c: unknown) => sendCommand(c as never)) };
});

import FederationSettings from '../FederationSettings.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';

function peer(name: string, link: 'Online' | 'Offline') {
  return {
    name,
    url: `ws://${name}:3133`,
    token_set: true,
    allow_tools: [],
    allow_subagent: true,
    require_confirm: [],
    allow_queries: [],
    link,
    active_turns: 0,
  };
}

describe('FederationSettings 会话迁移', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    state.federation = {
      enabled: true,
      node_id: 'node-a',
      node_name: null,
      listen: '',
      peers: [peer('gpu-box', 'Online'), peer('offline-box', 'Offline')],
    };
    state.federationInvite = null;
  });

  it('点击迁移发送 MigrateSession（会话 + 人格 + 目标 peer）', async () => {
    const wrapper = mount(FederationSettings, {
      props: { activeSessionId: 'local:tui::local_user', activeTeamId: 'alix' },
    });
    await wrapper.find('.fed-migrate .fed-migrate__go').trigger('click');
    expect(sendCommand).toHaveBeenCalledWith({
      MigrateSession: {
        session_id: 'local:tui::local_user',
        team_id: 'alix',
        target_peer: 'gpu-box',
      },
    });
  });

  it('全局视图无单一会话时禁用迁移', () => {
    const wrapper = mount(FederationSettings, {
      props: { activeSessionId: 'global', activeTeamId: 'alix' },
    });
    expect(wrapper.find('.fed-migrate .fed-migrate__go').attributes('disabled')).toBeDefined();
  });

  it('无在线节点时禁用迁移', () => {
    state.federation = {
      enabled: true,
      node_id: 'node-a',
      node_name: null,
      listen: '',
      peers: [peer('offline-box', 'Offline')],
    };
    const wrapper = mount(FederationSettings, {
      props: { activeSessionId: 'local:tui::local_user', activeTeamId: 'alix' },
    });
    expect(wrapper.find('.fed-migrate .fed-migrate__go').attributes('disabled')).toBeDefined();
  });
});

describe('FederationSettings 授权表单（2026-10）', () => {
  beforeEach(() => {
    vi.mocked(sendCommand).mockClear();
    state.federation = {
      enabled: true,
      node_id: 'node-a',
      node_name: null,
      listen: '',
      peers: [peer('gpu-box', 'Online')],
    };
    state.federationInvite = null;
  });

  it('添加 peer 默认满权限：全部工具 + 全部查询（*）+ 接受委派', async () => {
    const wrapper = mount(FederationSettings);
    await wrapper.find('.fed-actions button:last-child').trigger('click'); // 添加 peer
    // 填名称（savePeer 要求非空）
    const nameInput = wrapper.find('.fed-form-grid input');
    await nameInput.setValue('gpu-box');
    await wrapper.find('.fed-form .fed-btn--primary').trigger('click'); // 保存
    const call = vi.mocked(sendCommand).mock.calls.find(([c]) =>
      typeof c === 'object' && 'SaveFederationPeer' in (c as object),
    );
    expect(call).toBeTruthy();
    const p = (call![0] as unknown as { SaveFederationPeer: { peer: Record<string, unknown> } })
      .SaveFederationPeer.peer;
    expect(p.allow_tools).toEqual(['*']);
    expect(p.allow_queries).toEqual(['*']);
    expect(p.allow_subagent).toBe(true);
    expect(p.require_confirm).toEqual([]);
  });

  it('编辑回填现有授权（不以默认覆盖）：收紧的查询不因编辑静默变回全量', async () => {
    // 已有 peer：仅两项查询、工具白名单非全量。
    const current = (state.federation!.peers[0] as unknown as Record<string, unknown>);
    current.allow_tools = ['bash', 'read_file'];
    current.allow_queries = ['workspace_files'];
    current.allow_subagent = false;
    const wrapper = mount(FederationSettings);
    const editBtn = wrapper.findAll('.fed-peer-actions button')[0];
    await editBtn.trigger('click'); // 编辑
    await wrapper.find('.fed-form .fed-btn--primary').trigger('click'); // 保存
    const call = vi.mocked(sendCommand).mock.calls.find(([c]) =>
      typeof c === 'object' && 'SaveFederationPeer' in (c as object),
    );
    const p = (call![0] as unknown as { SaveFederationPeer: { peer: Record<string, unknown> } })
      .SaveFederationPeer.peer;
    expect(p.allow_tools).toEqual(['bash', 'read_file']);
    expect(p.allow_queries).toEqual(['workspace_files']);
    expect(p.allow_subagent).toBe(false);
  });
});
