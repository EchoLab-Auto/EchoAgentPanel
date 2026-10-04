//! 分布式调度器（2026-10 深度融合 P2）：新任务/会话的节点分配。
//!
//! v1 粒度 = **会话创建**：新建会话（或向尚无会话归属的新对话发
//! 首条消息）时由本模块选定目标 core。策略三选一（localStorage
//! `echo-schedule-policy` 持久化）：
//! - `least_busy`（默认）：按 FederationStatus 快照里各 peer 的
//!   活跃 turn 数取最小者（无负载数据的 peer 视为 0——新节点优先
//!   承接，符合直觉）；本机（local）一并参与比较。
//! - `round_robin`：在线节点轮转（无状态公平分摊）。
//! - `prefer:<name>`：亲和——固定发往指定节点（离线时退 least_busy）。
//!
//! 注意：本模块只做**建议**——最终路由仍经 connection.ts 的
//! coreForCommand/activeRegion 链；调度失败（无在线节点）返回 null，
//! 调用方按现状兜底（广播/本机）。

import { state } from './store';

export type SchedulePolicy = 'least_busy' | 'round_robin' | `prefer:${string}`;

export function schedulePolicy(): SchedulePolicy {
  const raw = window.localStorage.getItem('echo-schedule-policy');
  if (!raw) return 'least_busy';
  if (raw === 'least_busy' || raw === 'round_robin') return raw;
  if (raw.startsWith('prefer:')) return raw as SchedulePolicy;
  return 'least_busy';
}

export function setSchedulePolicy(policy: SchedulePolicy): void {
  window.localStorage.setItem('echo-schedule-policy', policy);
}

/** 在线节点名列表（本机 "local" 恒在；联邦 peers 按链路在线）。 */
function onlineNodes(): string[] {
  const nodes = ['local'];
  const fed = state.federation;
  if (fed?.enabled) {
    for (const peer of fed.peers) {
      if (peer.link === 'Online') nodes.push(peer.name);
    }
  }
  return nodes;
}

/** 节点负载（活跃 turn 数；无数据视为 0）。 */
function loadOf(name: string): number {
  if (name === 'local') {
    return Object.values(state.activities).filter(
      a => a.phase === 'thinking' || a.phase === 'tool' || a.phase === 'subagent',
    ).length;
  }
  const peer = state.federation?.peers.find(p => p.name === name);
  return peer?.active_turns ?? 0;
}

let roundRobinCursor = 0;

/** 选一个目标节点（策略见模块头注释）；无在线节点返回 null。 */
export function scheduleNode(): string | null {
  const nodes = onlineNodes();
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0] === 'local' ? null : nodes[0];

  const policy = schedulePolicy();
  if (policy.startsWith('prefer:')) {
    const want = policy.slice('prefer:'.length);
    if (nodes.includes(want)) return want === 'local' ? null : want;
    // 亲和节点离线 → 退 least_busy。
  }
  if (policy === 'round_robin') {
    const node = nodes[roundRobinCursor % nodes.length];
    roundRobinCursor += 1;
    return node === 'local' ? null : node;
  }
  // least_busy：负载最小者；**平局取后者**——遍历顺序 local 在前，
  // 严格小于才换会让本机赢平局，不符合「空闲节点优先承接」的分布
  // 直觉；改成小于等于（平局让给后出现的远程节点）。
  let best = nodes[0];
  let bestLoad = loadOf(best);
  for (const node of nodes.slice(1)) {
    const load = loadOf(node);
    if (load <= bestLoad) {
      best = node;
      bestLoad = load;
    }
  }
  return best === 'local' ? null : best;
}
