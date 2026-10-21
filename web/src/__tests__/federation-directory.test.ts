//! 联邦节点目录 → 自动发现的**纯逻辑**契约（P2，2026-11）。
//!
//! 这里只测"给定目录快照，该派生哪些接入点"——不发请求、不碰后端。
//! 三条安全边界各有对应用例：
//! 1. 地址优先用对端**宣告值**（本机视角可能是内网，Panel 未必可达）；
//! 2. 已在接入点表里的（地址相同）不再派生；
//! 3. 纯被连入的邻居（无任何地址）跳过，不产生无法连接的僵尸条目。
import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../store';
import {
  candidateUrl,
  deriveName,
  discoveryCandidates,
  duplicateDiscoveredNames,
  normalizeUrl,
  upstreamNodeId,
} from '../federation-directory';
import type { FederationDirectory } from '../state';

function upstream(name: string, url: string) {
  return {
    name,
    url,
    token_set: true,
    access: 'direct' as const,
    ssh: null,
    online: true,
    connectivity: 'online' as const,
    auth: 'ok' as const,
    last_error: null,
    last_checked: 0,
    source: 'manual' as const,
  };
}

function directory(nodes: FederationDirectory['nodes']): FederationDirectory {
  return {
    node_id: 'node-local',
    node_name: 'local',
    listen: '0.0.0.0:3132',
    panel_ready: true,
    panel_access: 'operate',
    nodes,
  };
}

describe('联邦自动发现（目录 → 派生接入点）', () => {
  beforeEach(() => {
    state.upstreams = [];
    state.federationDirectories = {};
    state.federationDirectoryAt = {};
    state.regions = {};
  });

  it('地址优先取对端宣告值，其次取本机视角的拨号地址', () => {
    expect(
      candidateUrl({
        name: 'gpu',
        url: 'ws://10.0.0.9:3132',
        advertise: 'ws://223.109.239.30:17176',
      }),
    ).toBe('ws://223.109.239.30:17176');
    expect(candidateUrl({ name: 'gpu', url: 'ws://10.0.0.9:3132/' })).toBe(
      'ws://10.0.0.9:3132',
    );
    expect(candidateUrl({ name: 'inbound-only', url: '' })).toBe('');
  });

  it('规范化地址只去掉尾部斜杠，不改写协议与端口', () => {
    expect(normalizeUrl(' ws://a:1// ')).toBe('ws://a:1');
    expect(normalizeUrl(null)).toBe('');
  });

  it('派生名把空白/冒号替换掉并在冲突时后缀递增', () => {
    const taken = new Set<string>();
    expect(deriveName('gpu box:1', taken)).toBe('gpu_box_1');
    const withOne = new Set(['gpu-box']);
    expect(deriveName('gpu-box', withOne)).toBe('gpu-box-2');
    expect(deriveName('', new Set())).toBe('peer');
  });

  it('已在接入点表里的地址不再派生（人工配置优先）', () => {
    state.upstreams = [upstream('ai_station', 'ws://10.10.2.250:3132')];
    state.federationDirectories = {
      core: directory([
        // 同一个节点：本机视角地址与人工配置一致 → 跳过。
        { name: 'node-01m436f8', url: 'ws://10.10.2.250:3132' },
        // 新的节点：应当派生。
        { name: 'A100-40g', url: 'ws://223.109.239.30:17176' },
      ]),
    };
    const candidates = discoveryCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      url: 'ws://223.109.239.30:17176',
      via: 'core',
    });
  });

  it('多个 Core 的目录取并集，同一地址只派生一次', () => {
    state.federationDirectories = {
      core: directory([{ name: 'gpu', url: 'ws://gpu:3132' }]),
      ai_station: directory([
        { name: 'gpu', url: 'ws://gpu:3132' }, // 同一个物理节点，换了个视角的地址
        { name: 'cloud', url: 'ws://cloud:3132' },
      ]),
    };
    const urls = discoveryCandidates().map(c => c.url);
    expect(urls).toEqual(['ws://gpu:3132', 'ws://cloud:3132']);
  });

  it('纯被连入的邻居（没有可拨地址）跳过，不产生连不上的条目', () => {
    state.federationDirectories = { core: directory([{ name: 'quiet', url: '' }]) };
    expect(discoveryCandidates()).toEqual([]);
  });
});

// ── 身份去重（2026-10 线上故障：同一个 Core 被连了两遍）──────────────
//
// 故障形状：
//   core           manual      ws://127.0.0.1:3132        ← 人工
//   node-01m3yevt  discovered  ws://10.10.10.100:3132     ← 同一进程的 VPN 地址
// 只比地址永远认不出这是同一台；聚合视图里会话/人格因此各出现两份。
describe('按 node_id 去重（同机不同地址）', () => {
  const discovered = (name: string, url: string) => ({
    ...upstream(name, url),
    source: 'discovered' as const,
  });

  beforeEach(() => {
    state.upstreams = [];
    state.federationDirectories = {};
    state.federationDirectoryAt = {};
    state.regions = {};
  });

  it('应答节点自己的 node_id 就是它的身份（不依赖会话/人格是否先到）', () => {
    state.upstreams = [upstream('core', 'ws://127.0.0.1:3132')];
    state.federationDirectories = {
      core: { ...directory([]), node_id: 'node-aaa' },
    };
    expect(upstreamNodeId('core')).toBe('node-aaa');
  });

  it('区域表只学到「名字当 id」时不算身份（早期回落值要排除）', () => {
    state.upstreams = [upstream('core', 'ws://127.0.0.1:3132')];
    state.regions = { core: { id: 'core', name: 'core' } };
    expect(upstreamNodeId('core')).toBe('');
  });

  it('已在连的机器换个地址出现：不派生第二条（VPN / 多网卡）', () => {
    state.upstreams = [upstream('core', 'ws://127.0.0.1:3132')];
    state.federationDirectories = {
      core: { ...directory([]), node_id: 'node-aaa' },
      // cloud2 的目录把「本机的 VPN 地址」当成一个邻居报了上来——
      // 它的 node_id 与 core 的完全相同。
      'cloud-server-2': {
        ...directory([]),
        node_id: 'node-cloud',
        nodes: [
          { name: 'node-01m3yevt', node_id: 'node-aaa', advertise: 'ws://10.10.10.100:3132' },
        ],
      },
    };
    expect(discoveryCandidates()).toEqual([]);
  });

  it('已在连的机器换个端口出现：同样不派生（NAT 端口映射）', () => {
    state.upstreams = [upstream('A100-40g', 'ws://223.109.239.30:17176')];
    state.federationDirectories = {
      'A100-40g': { ...directory([]), node_id: 'node-a100' },
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        nodes: [
          {
            name: 'A100-40g',
            node_id: 'node-a100',
            url: 'ws://223.109.239.30:17176',
            advertise: 'ws://223.109.239.30:8800',
          },
        ],
      },
    };
    expect(discoveryCandidates()).toEqual([]);
  });

  it('自我引用（把自己列成邻居）不派生', () => {
    state.federationDirectories = {
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        nodes: [{ name: 'self', node_id: 'node-aaa', advertise: 'ws://10.0.0.1:3132' }],
      },
    };
    expect(discoveryCandidates()).toEqual([]);
  });

  it('真正的新节点照常派生，且同批里身份只占一次', () => {
    state.upstreams = [upstream('core', 'ws://127.0.0.1:3132')];
    state.federationDirectories = {
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        nodes: [
          { name: 'gpu', node_id: 'node-gpu', advertise: 'ws://gpu-a:3132' },
          // 同一台 gpu 的另一个地址（多网卡）：身份已占，跳过。
          { name: 'gpu', node_id: 'node-gpu', advertise: 'ws://gpu-b:3132' },
        ],
      },
    };
    const candidates = discoveryCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0].url).toBe('ws://gpu-a:3132');
  });

  it('重复的派生条目按身份点名清理——在线的那条（自己回的目录带 id）', () => {
    state.upstreams = [
      upstream('core', 'ws://127.0.0.1:3132'),
      discovered('node-01m3yevt', 'ws://10.10.10.100:3132'),
    ];
    state.federationDirectories = {
      core: { ...directory([]), node_id: 'node-aaa' },
      // 重复条目自己在线：它回的目录带着自己的 node_id = core 的 node_id。
      'node-01m3yevt': { ...directory([]), node_id: 'node-aaa' },
    };
    expect(duplicateDiscoveredNames()).toEqual(['node-01m3yevt']);
  });

  it('重复的派生条目按地址反查清理——连不上的那条（目录里还挂着它）', () => {
    state.upstreams = [
      upstream('A100-40g', 'ws://223.109.239.30:17176'),
      discovered('A100-40g-2', 'ws://223.109.239.30:8800'),
    ];
    state.federationDirectories = {
      'A100-40g': { ...directory([]), node_id: 'node-a100' },
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        nodes: [
          {
            name: 'A100-40g',
            node_id: 'node-a100',
            advertise: 'ws://223.109.239.30:8800',
          },
        ],
      },
    };
    expect(duplicateDiscoveredNames()).toEqual(['A100-40g-2']);
  });

  it('两个重复的派生条目里只留在线的那条（离线派生条目不占身份）', () => {
    state.upstreams = [
      upstream('core', 'ws://127.0.0.1:3132'),
      { ...discovered('A100-40g-old', 'ws://223.109.239.30:8800'), online: false },
      discovered('A100-40g-2', 'ws://223.109.239.30:17176'),
    ];
    state.federationDirectories = {
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        // 目录里仍挂着那个旧地址（对端一直在宣告它）——正是"连不上还清不掉"
        // 的成因：地址能保住它，身份才能认出它。
        nodes: [{ name: 'A100-40g', node_id: 'node-a100', advertise: 'ws://223.109.239.30:8800' }],
      },
      'A100-40g-2': { ...directory([]), node_id: 'node-a100' },
    };
    // 在线的那条是正主；离线那条身份另有正主，一并清掉。
    expect(duplicateDiscoveredNames()).toEqual(['A100-40g-old']);
  });

  it('离线派生条目不挡住新地址的发现（换端口后要能收敛到新条目）', () => {
    state.upstreams = [
      upstream('core', 'ws://127.0.0.1:3132'),
      { ...discovered('gpu-old', 'ws://gpu-old:3132'), online: false },
    ];
    // 旧派生条目的身份未知（离线、目录里也没有它的新地址），新地址照常派生。
    state.federationDirectories = {
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        nodes: [{ name: 'gpu', node_id: 'node-gpu', advertise: 'ws://gpu-new:3132' }],
      },
    };
    expect(discoveryCandidates().map(c => c.url)).toEqual(['ws://gpu-new:3132']);
  });

  it('配对残留的死邻居（身份未知 + 上报方也连不上）不派生', () => {
    // 形状：某台 Core 的配置里还留着 [federation.peers.node-01m3yevt] 指向
    // 一个早已不存在的地址；对端从没连上过，于是 node_id/advertise 都空。
    state.federationDirectories = {
      core: {
        ...directory([]),
        node_id: 'node-aaa',
        nodes: [
          { name: 'node-01m3yevt', url: 'ws://10.10.10.100:3133', online: false },
          // 对照组：同样是地址未知，但上报方说它在线 → 照常派生。
          { name: 'live', url: 'ws://live:3132', online: true },
        ],
      },
    };
    expect(discoveryCandidates().map(c => c.url)).toEqual(['ws://live:3132']);
  });

  it('认不出人工条目身份时不做删除（宁可留旧条目，也不猜）', () => {
    state.upstreams = [
      upstream('core', 'ws://127.0.0.1:3132'),
      discovered('node-01m3yevt', 'ws://10.10.10.100:3132'),
    ];
    // 目录还没回来：谁的身份都不知道。
    expect(duplicateDiscoveredNames()).toEqual([]);
  });
});
