import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '../store';
import { federatedPeerLabel, remoteDirectoryLabel } from '../federation-names';
import { upstreamNodeId } from '../federation-directory';
import type { FederationPeerInfo } from '../protocol';

const NODE = 'node-01m436f84jtxye5ga61dmnz94p';

function peer(name: string, nodeId?: string): FederationPeerInfo {
  return {
    name,
    node_id: nodeId ?? null,
    url: '',
    token_set: true,
    allow_tools: ['*'],
    allow_subagent: true,
    require_confirm: [],
    allow_queries: ['*'],
    link: 'Online',
    consecutive_failures: 0,
    active_turns: 0,
  };
}

beforeEach(() => {
  state.upstreams = [];
  state.federations = {};
  state.federationDirectories = {};
  state.regions = {};
});

describe('联邦节点统一显示名', () => {
  it('人工 upstream 名优先，原始 peer 名继续作为路由值', () => {
    state.upstreams = [{ name: 'ai_station', source: 'manual', url: 'ws://10.10.2.250:3132' } as never];
    state.federations.ai_station = { enabled: true, node_id: NODE, listen: '', peers: [] };
    state.federations.core = { enabled: true, node_id: 'local', listen: '', peers: [peer('node-01m436f8', NODE)] };

    expect(upstreamNodeId('ai_station')).toBe(NODE);
    expect(federatedPeerLabel('node-01m436f8', NODE)).toBe('ai_station');
    expect(remoteDirectoryLabel(`node://node-01m436f8/root/repo`)).toBe('node://ai_station/root/repo');
  });

  it('不能识别身份时保留原名，不按相似名字猜测', () => {
    expect(federatedPeerLabel('node-01m436f8')).toBe('node-01m436f8');
    expect(remoteDirectoryLabel('/local/repo')).toBe('/local/repo');
  });
});
