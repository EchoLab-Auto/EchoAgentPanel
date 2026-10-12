//! 联邦设置页契约（2026-10 重构为 **Core 视角** + 组建向导）：
//! - 每个上游 Core 一张卡片：状态按来源 core 归档（`state.federations`）
//! - 命令显式定向：多上游 `sendCommand(cmd, core)`；单上游无壳直发
//! - 组建向导：创建联邦 / 添加节点 → 全互联补全（邀请 → 接入 → 等链路；
//!   失败自动换向重试一次、失败清理已保存条目）
//! - 拓扑视图：从 FederationStatus 推导互联边（node_id 精确 + 名字兜底）
//! - 会话迁移（P3-2b）：会话 + 人格 + 目标 peer
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return { sendCommand, sendPending: vi.fn((c: unknown) => sendCommand(c as never)) };
});

import FederationSettings, { wizardTimeouts } from '../FederationSettings.vue';
import { state } from '../../store';
import { sendCommand } from '../../connection';

function peer(name: string, link: 'Online' | 'Offline', nodeId?: string) {
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
    node_id: nodeId,
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

describe('FederationSettings 组建向导（2026-10）', () => {
  // 向导等待参数注入小值（真实默认 8s/20s 不可测）。
  beforeEach(() => {
    wizardTimeouts.inviteMs = 250;
    wizardTimeouts.linkMs = 800;
    wizardTimeouts.pollMs = 25;
  });

  /** 向导场景播种：core ⇄ ai_station；linked 控制是否已互联（node_id 精确匹配）。 */
  function seedWizard(opts: { linked?: boolean } = {}) {
    state.upstreams = [upstream('core'), upstream('ai_station')] as never;
    state.federations = {
      core: fed(opts.linked ? [peer('ai_station', 'Online', 'node-remote')] : [], 'node-local'),
      ai_station: fed(opts.linked ? [peer('core', 'Online', 'node-local')] : [], 'node-remote'),
    } as never;
    state.federationInvites = {};
    state.federation = null;
    state.federationInvite = null;
    vi.mocked(sendCommand).mockClear();
  }

  function callsWith(key: string, target?: string) {
    return vi.mocked(sendCommand).mock.calls.filter(
      ([c, t]) =>
        typeof c === 'object' && c !== null && key in (c as object) && (!target || t === target),
    );
  }

  it('未配置联邦：展示拓扑空态与「创建联邦」入口；向导默认全选在线节点', async () => {
    seedWizard();
    const wrapper = mount(FederationSettings);
    expect(wrapper.find('.fed-create').text()).toContain('创建联邦');
    expect(wrapper.find('.fed-topo__empty').exists()).toBe(true);

    await wrapper.find('.fed-create').trigger('click');
    expect(wrapper.find('.fed-wizard').exists()).toBe(true);
    // 两个节点默认全选（在线）→ 1 对将新建
    expect(wrapper.findAll('.fed-wizard__node')).toHaveLength(2);
    expect(wrapper.text()).toContain('将新建');
    expect(wrapper.find('.fed-wizard__go').attributes('disabled')).toBeUndefined();
  });

  it('已全部互联：拓扑显示边、「添加节点」入口与「无需配置」提示', async () => {
    seedWizard({ linked: true });
    const wrapper = mount(FederationSettings);
    expect(wrapper.find('.fed-create').text()).toContain('添加节点');
    expect(wrapper.find('.fed-topo__edges').exists()).toBe(true);
    expect(wrapper.findAll('.fed-topo__edge')).toHaveLength(1);

    await wrapper.find('.fed-create').trigger('click');
    expect(wrapper.text()).toContain('无需配置');
    expect(wrapper.find('.fed-wizard__go').attributes('disabled')).toBeDefined();
  });

  it('执行配对：邀请 → 接入保存 peer → 链路在线 → 任务成功', async () => {
    seedWizard();
    const wrapper = mount(FederationSettings);
    await wrapper.find('.fed-create').trigger('click');
    await wrapper.find('.fed-wizard__go').trigger('click');

    // 1. 邀请方（core）生成邀请
    expect(callsWith('RequestFederationInvite', 'core')).toHaveLength(1);
    // 2. 模拟邀请事件回程 → 接入方（ai_station）保存 peer
    state.federationInvites = {
      ...state.federationInvites,
      core: 'echofed://10.0.0.2:3133?name=core#tok1',
    };
    await vi.waitFor(() => {
      const calls = callsWith('SaveFederationPeer', 'ai_station');
      expect(calls).toHaveLength(1);
      const p = (calls[0][0] as unknown as { SaveFederationPeer: { peer: Record<string, unknown> } })
        .SaveFederationPeer.peer;
      expect(p.url).toBe('ws://10.0.0.2:3133');
      expect(p.token).toBe('tok1');
      expect(p.allow_tools).toEqual(['*']);
    });
    // 3. 模拟链路建立（core 侧出现指向 ai_station 的在线条目）
    state.federations = {
      ...state.federations,
      core: fed([peer('ai_station', 'Online', 'node-remote')], 'node-local'),
    } as never;
    await vi.waitFor(
      () => {
        expect(wrapper.find('.fed-wizard__task').text()).toContain('已建立');
      },
      { timeout: 4000 },
    );
    expect(wrapper.text()).toContain('1/1');
  });

  it('首次方向失败自动换向重试：反向成功', async () => {
    seedWizard();
    const wrapper = mount(FederationSettings);
    await wrapper.find('.fed-create').trigger('click');
    await wrapper.find('.fed-wizard__go').trigger('click');

    // 第一次方向（core 邀请）不回邀请串 → inviteMs 超时 → 换向（ai_station 邀请）
    await vi.waitFor(
      () => {
        expect(callsWith('RequestFederationInvite', 'ai_station')).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    // 换向后：ai_station 邀请回程 → core（接入方）保存 peer
    state.federationInvites = {
      ...state.federationInvites,
      ai_station: 'echofed://10.0.0.9:3133?name=ai#tok2',
    };
    await vi.waitFor(
      () => {
        expect(callsWith('SaveFederationPeer', 'core')).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    // 模拟链路（ai_station 侧指向 core 在线）
    state.federations = {
      ...state.federations,
      ai_station: fed([peer('core', 'Online', 'node-local')], 'node-remote'),
    } as never;
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('换向重试成功');
      },
      { timeout: 4000 },
    );
  });

  it('两方向均失败：任务失败并清理已保存条目', async () => {
    seedWizard();
    const wrapper = mount(FederationSettings);
    await wrapper.find('.fed-create').trigger('click');
    await wrapper.find('.fed-wizard__go').trigger('click');

    // 方向 1：core 邀请 → 回程 → ai_station 保存；链路不建立（linkMs 超时）
    state.federationInvites = { ...state.federationInvites, core: 'echofed://a:3133#t1' };
    await vi.waitFor(
      () => {
        expect(callsWith('SaveFederationPeer', 'ai_station')).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    // 方向 2：ai_station 邀请 → 回程 → core 保存；仍不建立 → 终判失败
    await vi.waitFor(
      () => {
        expect(callsWith('RequestFederationInvite', 'ai_station')).toHaveLength(1);
      },
      { timeout: 8000 },
    );
    state.federationInvites = {
      ...state.federationInvites,
      ai_station: 'echofed://b:3133#t2',
    };
    await vi.waitFor(
      () => {
        expect(callsWith('SaveFederationPeer', 'core')).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('双向均未在限时内建立链路');
      },
      { timeout: 8000 },
    );
    // 两方向失败后各清理一次（DeleteFederationPeer 定向对应接入方）。
    expect(callsWith('DeleteFederationPeer', 'ai_station').length).toBeGreaterThanOrEqual(1);
    expect(callsWith('DeleteFederationPeer', 'core').length).toBeGreaterThanOrEqual(1);
  });

  it('节点离线：不可勾选、不计入计划', async () => {
    seedWizard();
    state.upstreams = [
      upstream('core'),
      { ...upstream('ai_station'), online: false, connectivity: 'offline' as const },
    ] as never;
    const wrapper = mount(FederationSettings);
    await wrapper.find('.fed-create').trigger('click');
    // 离线节点行有禁用样式；计划只含 1 个节点 → 提示至少 2 个
    expect(wrapper.find('.fed-wizard__node--off').exists()).toBe(true);
    expect(wrapper.text()).toContain('至少选择 2 个在线节点');
    expect(wrapper.find('.fed-wizard__go').attributes('disabled')).toBeDefined();
  });
});
