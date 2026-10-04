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
    await wrapper.find('.fed-migrate button').trigger('click');
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
    expect(wrapper.find('.fed-migrate button').attributes('disabled')).toBeDefined();
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
    expect(wrapper.find('.fed-migrate button').attributes('disabled')).toBeDefined();
  });
});
