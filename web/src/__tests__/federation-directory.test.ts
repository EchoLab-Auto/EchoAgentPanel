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
  normalizeUrl,
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
