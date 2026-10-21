//! 联邦节点目录 → 自动发现接入点（P2，2026-11）。
//!
//! ## 为什么发现放在 Panel 而不是 Core
//!
//! 联邦没有中心成员表（设计原则：节点对等、不做 gossip）。Core 只能回答
//! 「我知道的直接邻居是谁、地址是什么」（`RequestFederationDirectory`），
//! 「全网有哪些节点」必须由**汇总方**算出来——那个汇总方就是 Panel。
//! 好处是零新增信任面：每个节点只暴露它本来就对邻居暴露的信息。
//!
//! ## 接入怎么发生
//!
//! Panel 后端持有一份**Panel 身份密钥**（`[federation] panel_key`，对应
//! Core 侧 `[federation] panel_keys`）。发现到的新节点被写成一条
//! `source = "discovered"` 的接入点，中继用它去连——于是"连一台 → 看到全网"
//! 而不需要给 Panel 配 N 份管理令牌。
//!
//! ## 三条安全/稳定性约束（都在代码里强制）
//!
//! 1. **人工优先**：同名人工接入点永不被派生条目覆盖（后端 `upsert` 拒绝，
//!    前端也不尝试）；
//! 2. **只在有身份密钥时发现**：没配 `panel_key` 时整条链路不启动
//!    （`GET /api/panel-identity` 的回答说了算）——不会产生"永远 401"的条目；
//! 3. **目录收敛才清理**：只在这一轮目录**至少有一个节点在线**时才删掉
//!    "目录里不再出现"的派生条目。全网离线时宁可留着旧条目，也不要把
//!    Panel 自己的接入点清空。

import { state } from './store';
import { panelFetch } from './connection';
import type { FederatedNodeInfo } from './state';

/** `GET /api/panel-identity` 的回答（后端 `PanelIdentityView`）。 */
export interface PanelIdentityView {
  panel_key_set: boolean;
  discover: boolean;
}

/** 发现节流：两轮发现之间的最短间隔（目录事件可能很密）。 */
export const DISCOVER_RETRY_MS = 60_000;

/** 上次执行时刻（`source` → ms）：避免每个目录事件都打一轮 HTTP。 */
const lastAttempt = new Map<string, number>();

/** 缓存后端能力一问（进程内基本不变，省掉每次目录事件的 HTTP 往返）。 */
let identityCache: PanelIdentityView | null = null;

async function panelIdentity(): Promise<PanelIdentityView> {
  if (identityCache) return identityCache;
  try {
    const res = await panelFetch('/api/panel-identity');
    if (!res.ok) return { panel_key_set: false, discover: false };
    const view = (await res.json()) as PanelIdentityView;
    identityCache = {
      panel_key_set: !!view.panel_key_set,
      discover: !!view.discover,
    };
    return identityCache;
  } catch {
    // 后端不可达：本帧不做发现（下次事件再试）。
    return { panel_key_set: false, discover: false };
  }
}

/** 测试注入：清空能力缓存与节流表。 */
export function resetDiscoveryState(): void {
  identityCache = null;
  lastAttempt.clear();
}

/** 规范化地址：`ws://host:port` 去掉尾部斜杠，便于去重。 */
export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

/**
 * 从一个邻居条目里挑出**最可能可达**的地址。
 *
 * 优先级：对端宣告地址（`advertise`，它自己说"别人该连我这个"）→ 回答者的
 * 拨号地址（`url`，那是**回答者视角**，可能是内网/VPN）。两者都空 = 该邻居
 * 只听不连（纯被连入），跳过。
 */
export function candidateUrl(node: FederatedNodeInfo): string {
  return normalizeUrl(node.advertise) || normalizeUrl(node.url);
}

/** 已配置接入点的地址集合（含 SSH 上游的空地址——它们不参与 URL 去重）。 */
function configuredUrls(): Set<string> {
  const urls = new Set<string>();
  for (const u of state.upstreams) {
    const url = normalizeUrl(u.url);
    if (url) urls.add(url);
  }
  return urls;
}

/** 已有接入点名（小写比较：名字是帧打标键，大小写不同会被当成两台）。 */
function configuredNames(): Set<string> {
  return new Set(state.upstreams.map(u => u.name.toLowerCase()));
}

/**
 * 由名字派生一个**稳定且合法**的接入点名。
 *
 * 合法性来自后端校验：非空、不含空白/冒号（帧打标键卫生）。所以这里把
 * 空白与冒号替换成 `_`；同名冲突时后缀 `-2`、`-3`……
 */
export function deriveName(preferred: string, taken: Set<string>): string {
  const base =
    (preferred || '')
      .trim()
      .replace(/[\s:]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'peer';
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** 一条待创建的派生接入点。 */
export interface DiscoveryCandidate {
  name: string;
  url: string;
  /** 来源 peer 名（用于日志/UI：从哪台机器听说的）。 */
  via: string;
}

/**
 * 从当前 `state.federationDirectories` 算出**待创建**的派生接入点。
 *
 * 纯函数（只读 state），便于单测：输入目录快照，输出该 POST 什么。
 * 去重走三道：地址并集、名字并集、候选之间互斥。
 */
export function discoveryCandidates(): DiscoveryCandidate[] {
  const urls = configuredUrls();
  const names = configuredNames();
  const out: DiscoveryCandidate[] = [];
  for (const [core, dir] of Object.entries(state.federationDirectories)) {
    for (const node of dir.nodes ?? []) {
      const url = candidateUrl(node);
      if (!url) continue; // 纯被连入的节点：没有可拨地址，发现不了
      if (urls.has(url)) continue; // 已经是接入点（人工或已派生）
      const name = deriveName(node.node_name || node.name, names);
      urls.add(url);
      names.add(name.toLowerCase());
      out.push({ name, url, via: core || '（单上游）' });
    }
  }
  return out;
}

/**
 * 执行一轮发现：把待创建条目 POST 给后端（后端用 Panel 身份密钥认证）。
 *
 * 返回真实创建成功的条数。失败**不抛**（发现是尽力而为）：
 * - 401 → 该节点没开放 Panel 身份（后端拒绝建条目时也一样）——记 warning
 *   一次即可，节流窗口内不重试；
 * - 其它错误 → 静默（下一次目录事件会再来）。
 */
export async function runDiscovery(source = 'all'): Promise<number> {
  const view = await panelIdentity();
  if (!view.discover) return 0;
  const now = Date.now();
  const last = lastAttempt.get(source) ?? 0;
  if (now - last < DISCOVER_RETRY_MS && last > 0) return 0;
  lastAttempt.set(source, now);

  const candidates = discoveryCandidates();
  let created = 0;
  for (const candidate of candidates) {
    try {
      const res = await panelFetch('/api/upstreams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name,
          url: candidate.url,
          // 凭据由后端按 Panel 身份密钥补齐（不在这里传 token：
          // 前端不该持有密钥，也不该出现在网络请求体里）。
          source: 'discovered',
        }),
      });
      if (res.ok) {
        created += 1;
      } else if (res.status === 400) {
        // 400 = 已存在人工条目 / 未配密钥 —— 都是"跳过"，不是故障。
        continue;
      }
    } catch {
      // Panel 后端不可达：整轮放弃（下一次目录事件再来）。
      break;
    }
  }
  return created;
}

/**
 * 目录收敛：清掉"不再出现在目录里"的派生接入点。
 *
 * **保守条件**（缺一不可，见模块文档第 3 条）：
 * - 后端说 `discover` 可用（否则什么也不做，人工条目也不受影响）；
 * - 本轮目录里**至少一台在线**（全网离线时目录可能是"没连上"而不是"没了"）。
 */
export async function pruneDiscovered(): Promise<string[]> {
  const view = await panelIdentity();
  if (!view.discover) return [];
  const directories = Object.values(state.federationDirectories);
  if (!directories.length) return [];
  const anyOnline = directories.some(dir => (dir.nodes ?? []).some(n => n.online));
  if (!anyOnline) return [];

  // keep = 当前仍被目录提到的（按名字与地址双重认定——派生条目的名字是本
  // 地派生的，邻居改别名后名字会变，但地址不会）。
  const keepNames = new Set<string>();
  const keepUrls = new Set<string>();
  for (const dir of directories) {
    for (const node of dir.nodes ?? []) {
      const url = candidateUrl(node);
      if (url) keepUrls.add(url);
      const name = (node.node_name || node.name || '').toLowerCase();
      if (name) keepNames.add(name);
    }
  }
  // 前端不做删除：Panel 后端持有 source 标记才能安全判定"哪些是派生的"。
  // 这里只把**仍存活**的地址告诉后端（后端按 source 过滤后比对）。
  try {
    const res = await panelFetch('/api/upstreams/prune', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        keep_urls: [...keepUrls],
        keep_names: [...keepNames],
      }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { removed?: string[] };
    return body.removed ?? [];
  } catch {
    return [];
  }
}
