//! 联邦节点的显示名与路由名分离。
//!
//! node_id 是唯一身份；Panel 人工接入点名是对用户最稳定的显示名。
//! peer 配置名、node_name 只作为后备或调用别名，不参与身份判定。

import { state } from './store';
import { upstreamNodeId } from './federation-directory';

function presentable(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** node_id → 人工接入点名（人工条目优先，未知身份不猜）。 */
export function nodeDisplayNameById(): Map<string, string> {
  const out = new Map<string, string>();
  for (const upstream of state.upstreams) {
    const name = presentable(upstream.name);
    const id = upstreamNodeId(upstream.name);
    if (!name || !id || (upstream.source === 'discovered' && out.has(id))) continue;
    if (upstream.source !== 'discovered' || !out.has(id)) out.set(id, name);
  }
  return out;
}

/** peer 配置名 / node_id → 当前聚合视图中的友好名。 */
export function federatedPeerLabel(peer: string, nodeId?: string | null, nodeName?: string | null): string {
  const raw = presentable(peer);
  const id = presentable(nodeId);
  if (id) {
    const manual = nodeDisplayNameById().get(id);
    if (manual) return manual;
  }
  const upstream = state.upstreams.find((u) => u.name === raw);
  if (upstream) return upstream.name;
  // 区域相关视图（工作区/目录选择器）拿到的是当前 Core 的单值快照；
  // 它可能尚未复制进 federations，不能因此丢掉 node_id 映射。
  const local = state.federation?.peers.find((p) => p.name === raw);
  if (local?.node_id) {
    const manual = nodeDisplayNameById().get(local.node_id);
    if (manual) return manual;
  }
  if (local && presentable(local.node_name)) return presentable(local.node_name);
  for (const [core, fed] of Object.entries(state.federations)) {
    for (const p of fed.peers ?? []) {
      if (p.name !== raw || !p.node_id) continue;
      const manual = nodeDisplayNameById().get(p.node_id);
      if (manual) return manual;
      const advertised = presentable(p.node_name);
      if (advertised) return advertised;
    }
    for (const node of state.federationDirectories[core]?.nodes ?? []) {
      if (node.name !== raw || !node.node_id) continue;
      const manual = nodeDisplayNameById().get(node.node_id);
      if (manual) return manual;
      const advertised = presentable(node.node_name);
      if (advertised) return advertised;
    }
  }
  return presentable(nodeName) || raw;
}

/** node://peer/path 仅替换显示，不改变真实路由参数。 */
export function remoteDirectoryLabel(directory: string): string {
  if (!directory.startsWith('node://')) return directory;
  const rest = directory.slice('node://'.length);
  const slash = rest.indexOf('/');
  const peer = slash < 0 ? rest : rest.slice(0, slash);
  const path = slash < 0 ? '' : rest.slice(slash);
  return `node://${federatedPeerLabel(peer)}${path}`;
}
