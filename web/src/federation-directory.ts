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
//! 4. **按节点身份去重，不按地址**（2026-10 修）：同一台机器会有多个地址
//!    ——NAT 端口映射前后（`223.109.239.30:17176` vs `:8800`）、多网卡 /
//!    VPN（`127.0.0.1:3132` vs `10.10.10.100:3132`）。只比地址会把**同一
//!    个 Core 连两遍**，并在聚合视图里把它的人话/会话/人格各显示两份。
//!    判据用 `node_id`：目录事件自带应答节点自己的 id，邻居条目也带对端 id。

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

/**
 * 归一化 node_id：空值、空白、`unknown` 都视为**未知**（返回空串）。
 *
 * 旧 Core（P2 之前）在邻居条目里填空串，不能拿它去比——否则所有未知 id
 * 会被当成"同一台"而全部跳过。
 */
function identityOf(value: unknown): string {
  if (typeof value !== 'string') return '';
  const id = value.trim();
  return id === 'unknown' ? '' : id;
}

/**
 * 某个接入点背后那台机器的 `node_id`（未知返回空串）。
 *
 * 两条来源，按可靠性排序：
 * 1. **它自己回的目录**（`FederationDirectory.node_id` 就是应答节点自己的
 *    身份）——只要它在线就一定有，不依赖有没有会话/人格；
 * 2. **运行区域表**（会话/人格载荷里学到的 `node_id`，早期唯一来源）。
 *    注意区域 id 在学不到时会回落到接入点名本身，那种值不是身份，要排除。
 */
export function upstreamNodeId(name: string): string {
  const own = identityOf(state.federationDirectories[name]?.node_id);
  if (own) return own;
  const region = state.regions[name];
  if (region && typeof region.id === 'string' && region.id !== name) {
    return identityOf(region.id);
  }
  return '';
}

/**
 * 已有接入点覆盖的节点身份：`node_id → 接入点名`（人工条目优先占位）。
 *
 * 有了它，"同一台机器的另一个地址"才可能被认出来——地址会变（NAT / 多网卡
 * / VPN），`node_id` 不会。
 */
export function coveredNodeIds(): Map<string, string> {
  const covered = new Map<string, string>();
  // 人工条目先登记（用户的意图优先占位）：同身份出现两次时保留人工那个名字。
  for (const u of state.upstreams) {
    if (u.source === 'discovered') continue;
    const id = upstreamNodeId(u.name);
    if (id && !covered.has(id)) covered.set(id, u.name);
  }
  // 派生条目**只在其在线时**占位：离线派生条目的身份是历史值（节点可能已经
  // 换地址），不应该挡住「新地址」被发现——否则换端口后旧条目永久挡住新条目，
  // 而自己又永远连不上（两个都废）。人工条目不受这条约束。
  for (const u of state.upstreams) {
    if (u.source !== 'discovered' || !u.online) continue;
    const id = upstreamNodeId(u.name);
    if (id && !covered.has(id)) covered.set(id, u.name);
  }
  return covered;
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
 * 去重走五道（**身份优先，地址兜底**）：
 * 1. 自我引用：应答节点把自己列成邻居 → 跳过；
 * 2. 节点身份：`node_id` 已被某个接入点占用 → 跳过（同机不同地址）；
 * 3. 死条目：身份未知且上报方自己也没连上 → 跳过（僵尸地址，拨不通）；
 * 4. 地址并集：完全相同的地址 → 跳过；
 * 5. 名字并集：本批候选之间互斥（派生名不撞车）。
 */
export function discoveryCandidates(): DiscoveryCandidate[] {
  const urls = configuredUrls();
  const names = configuredNames();
  const covered = coveredNodeIds();
  const out: DiscoveryCandidate[] = [];
  for (const [core, dir] of Object.entries(state.federationDirectories)) {
    const answering = identityOf(dir.node_id);
    for (const node of dir.nodes ?? []) {
      const url = candidateUrl(node);
      if (!url) continue; // 纯被连入的节点：没有可拨地址，发现不了
      const nodeId = identityOf(node.node_id);
      // ① 自我引用：这台把**自己**列成了邻居（配对占位残留等）——不是新节点。
      if (nodeId && answering && nodeId === answering) continue;
      // ② 身份去重：同一台机器的另一个地址（NAT 前后 / 多网卡 / VPN）。
      if (nodeId && covered.has(nodeId)) continue;
      // ③ 死条目：**身份未知 + 上报它的那台自己也连不上** → 不派生。
      //    典型来源是配对残留（`[federation.peers.X]` 指向一个早已不存在的
      //    地址）：对端从没连上过（`node_id` 空、`advertise` 空），我们能拿到的
      //    只有上报方视角的私有地址——拨过去必然超时，只会留下一条永远离线的
      //    僵尸条目（`A100-40g` 配置里的 `node-01m3yevt@:3133` 就是这形状）。
      if (!nodeId && node.online === false) continue;
      // ④ 地址去重：身份未知（旧 Core 不填 node_id）时的兜底。
      if (urls.has(url)) continue;
      const name = deriveName(node.node_name || node.name, names);
      urls.add(url);
      names.add(name.toLowerCase());
      if (nodeId) covered.set(nodeId, name);
      out.push({ name, url, via: core || '（单上游）' });
    }
  }
  return out;
}

/**
 * 派生接入点里的**重复条目**：它背后的那台机器，已经有人工接入点在连。
 *
 * 两种重复都实际发生过：
 * - `node-01m3yevt` @ `10.10.10.100:3132`：本机 VPN 地址，与人工
 *   `core` @ `127.0.0.1:3132` 是**同一个进程**（能连上，于是聚合视图里
 *   会话/人格各出现两份）；
 * - `A100-40g-2` @ `223.109.239.30:8800`：同一台 A100 的宣告端口，与人工
 *   `A100-40g` @ `:17176` 只差端口映射（连不上，纯垃圾条目）。
 *
 * 身份怎么认：
 * - 派生条目**在线** → 它自己回的目录带着自己的 `node_id`（最权威）；
 * - 派生条目**连不上** → 用它的地址回到目录里反查（那个地址正是它被派生
 *   出来的依据）。
 */
export function duplicateDiscoveredNames(): string[] {
  // 地址 → node_id（目录里的所有邻居，含离线条目——它们也带 node_id）。
  // 用于"连不上的派生条目"：它的地址正是它被派生出来的依据。
  const byUrl = new Map<string, string>();
  for (const dir of Object.values(state.federationDirectories)) {
    for (const node of dir.nodes ?? []) {
      const id = identityOf(node.node_id);
      const url = candidateUrl(node);
      if (id && url && !byUrl.has(url)) byUrl.set(url, id);
    }
  }
  const idOf = (u: { name: string; url: string }): string =>
    upstreamNodeId(u.name) || byUrl.get(normalizeUrl(u.url)) || '';

  // 第一遍：人工条目占位（用户意图优先，人工条目永不被删）。
  const owner = new Map<string, string>(); // node_id → 该身份的正主接入点名
  let sawManual = false;
  for (const u of state.upstreams) {
    if (u.source === 'discovered') continue;
    const id = idOf(u);
    if (!id) continue;
    sawManual = true;
    if (!owner.has(id)) owner.set(id, u.name);
  }
  if (!sawManual) return []; // 一个人工条目的身份都没认出来 —— 无从判定，不猜

  // 第二遍：在线的派生条目也能当正主（两个重复的派生条目里留活的那个）。
  for (const u of state.upstreams) {
    if (u.source !== 'discovered' || !u.online) continue;
    const id = idOf(u);
    if (id && !owner.has(id)) owner.set(id, u.name);
  }

  // 第三遍：派生条目若"身份另有正主"就是重复。
  const out: string[] = [];
  for (const u of state.upstreams) {
    if (u.source !== 'discovered') continue;
    const id = idOf(u);
    const ownerName = id ? owner.get(id) : undefined;
    if (ownerName && ownerName !== u.name) out.push(u.name);
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
  // 这里只把**仍存活**的地址与"确认重复"的名字告诉后端（后端按 source 过滤）。
  //
  // `drop_names` 是 2026-10 修的**身份去重**产物：派生条目背后的节点已经有人工
  // 接入点在连（同一台机器的另一个地址）。这类条目会被 `keep_urls` 保住
  // （目录里确实还提到那个地址），只看地址/名字永远清不掉。
  const dropNames = duplicateDiscoveredNames();
  try {
    const res = await panelFetch('/api/upstreams/prune', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        keep_urls: [...keepUrls],
        keep_names: [...keepNames],
        drop_names: dropNames,
      }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { removed?: string[] };
    return body.removed ?? [];
  } catch {
    return [];
  }
}
