//! 联邦设置页契约（2026-10 重构为 **Core 视角**）：
//! - 每个上游 Core 一张卡片：状态按来源 core 归档（`state.federations`）
//! - 命令显式定向：多上游 `sendCommand(cmd, core)`；单上游无壳直发
//! - 跨 Core 配对：邀请方生成邀请 → 接入方保存 peer（自动解析 url/token）
//! - 会话迁移（P3-2b）：会话 + 人格 + 目标 peer
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

function upstream(name: string) {
  return {
    name,
    url: 'ws://127.0.0.1:3132',
    token_set: false,
    online: true,
    connectivity: 'online' as const,
    auth: 'ok' as const,
    last_error: null,
    last_checked: 1,
  };
}

function fed(peers: ReturnType<typeof peer>[], nodeId = 'node-a') {
  return { enabled: true, node_id: nodeId, node_name: null, listen: '', peers };
}

/** 播种：默认单上游（无壳直发）；multi=true 时两个上游（命令定向）。 */
function seed(opts: { multi?: boolean; peers?: ReturnType<typeof peer>[] } = {}) {
  const peers = opts.peers ?? [peer('gpu-box', 'Online'), peer('offline-box', 'Offline')];
  state.upstreams = (opts.multi
    ? [upstream('core'), upstream('ai_station')]
    : [upstream('core')]) as never;
  state.federations = (opts.multi
    ? {
        core: fed([peer('gpu-box', 'Online')], 'node-local'),
        ai_station: fed([peer('relay-box', 'Online')], 'node-remote'),
      }
    : { core: fed(peers) }) as never;
  state.federationInvites = {};
  state.federation = null;
  state.federationInvite = null;
  vi.mocked(sendCommand).mockClear();
}

describe('FederationSettings 会话迁移（会话级）', () => {
  beforeEach(() => seed());

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
    seed({ peers: [peer('offline-box', 'Offline')] });
    const wrapper = mount(FederationSettings, {
      props: { activeSessionId: 'local:tui::local_user', activeTeamId: 'alix' },
    });
    expect(wrapper.find('.fed-migrate .fed-migrate__go').attributes('disabled')).toBeDefined();
  });
});

describe('FederationSettings 授权表单（2026-10）', () => {
  beforeEach(() => seed());

  it('添加 peer 默认满权限：全部工具 + 全部查询（*）+ 接受委派', async () => {
    const wrapper = mount(FederationSettings);
    await wrapper.find('.fed-core .fed-add-peer').trigger('click'); // 添加 peer
    // 填名称（savePeer 要求非空）
    const nameInput = wrapper.find('.fed-form-grid input');
    await nameInput.setValue('gpu-box');
    await wrapper.find('.fed-form .fed-form-save').trigger('click'); // 保存
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
    const current = (state.federations['core'].peers[0] as unknown as Record<string, unknown>);
    current.allow_tools = ['bash', 'read_file'];
    current.allow_queries = ['workspace_files'];
    current.allow_subagent = false;
    const wrapper = mount(FederationSettings);
    const editBtn = wrapper.findAll('.fed-core .fed-peer-edit')[0];
    await editBtn.trigger('click'); // 编辑
    await wrapper.find('.fed-form .fed-form-save').trigger('click'); // 保存
    const call = vi
      .mocked(sendCommand)
      .mock.calls.find(([c]) => typeof c === 'object' && 'SaveFederationPeer' in (c as object));
    expect(call).toBeTruthy();
    const p = (call![0] as unknown as { SaveFederationPeer: { peer: Record<string, unknown> } })
      .SaveFederationPeer.peer;
    expect(p.allow_tools).toEqual(['bash', 'read_file']);
    expect(p.allow_queries).toEqual(['workspace_files']);
    expect(p.allow_subagent).toBe(false);
    // token 留空 = 保留旧值（不覆盖）
    expect(p.token).toBe('');
  });
});

describe('FederationSettings Core 视角（2026-10 重构）', () => {
  it('多上游：每个 Core 一张卡片，刷新命令定向到各自的 core', () => {
    seed({ multi: true });
    const wrapper = mount(FederationSettings);
    expect(wrapper.findAll('.fed-core')).toHaveLength(2);
    const text = wrapper.text();
    expect(text).toContain('node-local');
    expect(text).toContain('node-remote');
    // 状态刷新逐 core 定向（不再依赖"运行区域"）
    expect(sendCommand).toHaveBeenCalledWith({ RequestFederationStatus: null }, 'core');
    expect(sendCommand).toHaveBeenCalledWith({ RequestFederationStatus: null }, 'ai_station');
  });

  it('单上游：无壳直发（命令不带 core 参数）', () => {
    seed();
    mount(FederationSettings);
    expect(sendCommand).toHaveBeenCalledWith({ RequestFederationStatus: null });
    expect(vi.mocked(sendCommand).mock.calls.every((call) => call.length === 1)).toBe(true);
  });

  it('跨 Core 配对：邀请方生成邀请 → 接入方保存 peer（定向 + 解析 url/token）', async () => {
    seed({ multi: true });
    const wrapper = mount(FederationSettings);
    // 默认选中前两个 Core：core（邀请方）/ ai_station（接入方）
    await wrapper.find('.fed-pair .fed-pair__go').trigger('click');
    expect(sendCommand).toHaveBeenCalledWith({ RequestFederationInvite: null }, 'core');
    // 模拟邀请方异步返回邀请串（事件到达 → 归档到 federationInvites）
    state.federationInvites = {
      ...state.federationInvites,
      core: 'echofed://10.0.0.2:3133?name=box#tok123',
    };
    await vi.waitFor(() => {
      const call = vi.mocked(sendCommand).mock.calls.find(
        ([c, target]) =>
          typeof c === 'object' &&
          c !== null &&
          'SaveFederationPeer' in (c as object) &&
          target === 'ai_station',
      );
      expect(call).toBeTruthy();
      const p = (call![0] as unknown as { SaveFederationPeer: { peer: Record<string, unknown> } })
        .SaveFederationPeer.peer;
      expect(p.url).toBe('ws://10.0.0.2:3133');
      expect(p.token).toBe('tok123');
      expect(p.name).toBe('core');
    });
  });

  it('生成邀请/添加/编辑/删除都定向到卡片所属 Core', async () => {
    seed({ multi: true });
    const wrapper = mount(FederationSettings);
    const secondCard = wrapper.findAll('.fed-core')[1]; // ai_station
    await secondCard.find('.fed-gen-invite').trigger('click');
    expect(sendCommand).toHaveBeenCalledWith({ RequestFederationInvite: null }, 'ai_station');

    await secondCard.find('.fed-add-peer').trigger('click');
    const nameInput = wrapper.find('.fed-form-grid input');
    await nameInput.setValue('remote-peer');
    await wrapper.find('.fed-form .fed-form-save').trigger('click');
    const save = vi
      .mocked(sendCommand)
      .mock.calls.find(([c]) => typeof c === 'object' && 'SaveFederationPeer' in (c as object));
    expect(save?.[1]).toBe('ai_station');

    // 编辑（回填现有 peer）→ 保存同样定向
    await secondCard.find('.fed-peer-edit').trigger('click');
    await wrapper.find('.fed-form .fed-form-save').trigger('click');
    const saves = vi
      .mocked(sendCommand)
      .mock.calls.filter(([c]) => typeof c === 'object' && 'SaveFederationPeer' in (c as object));
    expect(saves.length).toBeGreaterThanOrEqual(2);
    expect(saves[saves.length - 1][1]).toBe('ai_station');

    // 删除定向
    await secondCard.find('.fed-peer-del').trigger('click');
    const del = vi
      .mocked(sendCommand)
      .mock.calls.find(([c]) => typeof c === 'object' && 'DeleteFederationPeer' in (c as object));
    expect(del?.[1]).toBe('ai_station');
    expect(
      (del![0] as unknown as { DeleteFederationPeer: { name: string } }).DeleteFederationPeer.name,
    ).toBe('relay-box');
  });
});
