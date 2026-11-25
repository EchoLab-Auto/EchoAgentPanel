//! 上游 Core 连接状态（Panel 后端本地 API `/api/upstreams`）。
//!
//! 连接状态卡与「上游设置」页共用同一份 `state.upstreams`：单一轮询源，
//! 组件只读。后端健康表由中继链路/探活泵维护，`connectivity` 三态
//! （online/connecting/offline）+ `auth`（ok/failed/unknown）。

import { state } from './store';
import { panelFetch, sendCommand } from './connection';
import { dropCoreInstanceChannel } from './instanceOps';
import { evaluateFailover } from './failover';
import { pruneDiscovered, runDiscovery } from './federation-directory';
import type { UpstreamStatus } from './state';

/**
/** 上一帧上游快照：`name → connectivity`（diff 基准）。
 *
 * 离线/移除检测（02a §5.4-1）：条目从上游列表**消失** 或 `connectivity`
 * `online → offline` ⇒ `dropCoreInstanceChannel(name)` 清理该 core 的实例
 * 通道（UI 文档 + pending + 在途 Promise + onCoreDropped 通知）。
 * 清理延迟 ≤ 一个轮询窗（8s）；删除路径另有 removeSessionsOfCore 即时兜底。
 */
let lastUpstreams: Map<string, string> | null = null;

/**
 * 在途请求（去重）。
 *
 * 轮询有两处入口：`main.ts` 的全局 8s 泵（连接状态卡等共用）、以及设置页
 * 打开时的即时刷新。两处撞在一起就是两条并发的 `/api/upstreams`——同一个
 * 后端健康表被拉两次、`state.upstreams` 被赋值两次，界面白抖一轮。共享
 * 同一个 promise 即可，语义上仍是「最近一次快照」。
 */
let inflight: Promise<boolean> | null = null;

/**
 * 上一轮的**实质状态签名**（`name:connectivity:auth:last_error`）。
 *
 * 只包含"用户看得见的状态"，**不含 `last_checked`**——后端每次探活都会更新
 * 它，把它算进签名等于每轮都"有变化"，退避永远不会生效。`last_upstreams`
 * 仍保留（离线检测要按 name 对齐），这里另起一个专门用于退避的字符串。
 */
let lastSignature = '';

/**
 * 拉取一次上游状态并写入共享 state（失败保留上次结果，不弹错）。
 *
 * 返回**本轮是否有实质变化**（connectivity / auth / last_error 任一变化）：
 * 轮询据此退避——远程访问下 8s 一次的空往返是持续的带宽与耗电开销，而
 * 上游状态在绝大多数时间里不变。
 *
 * **内容没变就不写 state**（2026-10 修「Core 连接页闪烁」）：后端健康泵每
 * 次探活都会更新 `last_checked`，但绝大多数轮询里 connectivity/auth 是不变
 * 的；此前无条件 `state.upstreams = next` 会让整张列表每 3s 重渲染一次。
 * 结构没变的轮询不该产生任何 DOM 变更。
 */
export function refreshUpstreams(): Promise<boolean> {
  if (inflight) return inflight;
  inflight = doRefreshUpstreams().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * 上游快照的**实质状态签名**（`name:connectivity:auth:last_error`）。
 *
 * 刻意**排除 `last_checked`**：后端每次探活都会更新它，把它算进来等于每轮
 * 都"有变化"，自适应退避永远不会生效。排序是为了让列表顺序不影响签名。
 *
 * 导出仅为可测：轮询退避的整个正确性都压在这一个判断上。
 */
export function upstreamSignature(list: UpstreamStatus[]): string {
  return list
    .map((u) => `${u.name}:${u.connectivity}:${u.auth}:${u.last_error ?? ''}`)
    .sort()
    .join('|');
}

async function doRefreshUpstreams(): Promise<boolean> {
  try {
    const res = await panelFetch('/api/upstreams');
    if (!res.ok) return false;
    const list = (await res.json()) as UpstreamStatus[];
    const next = Array.isArray(list) ? list : [];
    const signature = upstreamSignature(next);
    const changed = signature !== lastSignature;
    lastSignature = signature;
    if (lastUpstreams) {
      for (const [name, connectivity] of lastUpstreams) {
        const now = next.find((u) => u.name === name)?.connectivity;
        if (now === undefined || (connectivity === 'online' && now === 'offline')) {
          dropCoreInstanceChannel(name);
        }
      }
      for (const upstream of next) {
        // 多 Core 中上游进程独立重连，Panel 主 WS 并不会断开。恢复 online
        // （含运行中新增上游）必须重定该 Core 的版本/能力基线，再定向补拉
        // bootstrap；否则新库较低 revision 会一直被旧水位拒绝。
        // 首次发现不重复补拉：connection.onopen 已广播 RequestState。
        if (upstream.connectivity === 'online' && lastUpstreams.get(upstream.name) !== 'online') {
          sendCommand('RequestState', upstream.name);
        }
      }
    }
    lastUpstreams = new Map(next.map((u) => [u.name, u.connectivity]));
    // 只在**有实质变化**时替换：结构没变就不碰 state（结构没变 → 不重渲染）。
    // `last_checked` 参与比较是有意的——它变了说明后端刚探活过，时间该跟着走。
    if (JSON.stringify(next) !== JSON.stringify(state.upstreams)) {
      state.upstreams = next;
    }
    // 已配置上游即"已知运行区域"：区域集合不依赖是否已收到事件，
    // 多区域判定（命令必须显式落到某个区域）从配置起就成立。
    for (const u of next) state.knownCores.add(u.name);
    evaluateFailover(next);
    await discoverFromFederation(next);
    return changed;
  } catch {
    // Panel 后端不可达：保留上次快照。
    return false;
  }
}

/** 目录请求节流：每个上游最短 30s 问一次（链路本身已有 30s 心跳）。 */
const DIRECTORY_REQUEST_MS = 30_000;
/** 发现/收敛节流：一轮之后 60s 内不再打 HTTP（见 federation-directory）。 */
const DISCOVERY_MS = 60_000;
let lastDirectoryRequestAt = 0;
let lastDiscoveryAt = 0;

/**
 * 联邦巡检（P2 自动发现，2026-11）——**每轮上游刷新后**做两件事：
 *
 * 1. 向**每个在线上游**请求节点目录（`RequestFederationDirectory`）：
 *    命令显式定向（多上游必须带 core，否则会被路由守卫拒发）；
 * 2. 节流后跑一轮「派生缺失的接入点 + 清理不在目录里的派生条目」。
 *
 * 为什么挂在轮询里而不是 `onopen`：新节点可能在上线后才被别的节点加入
 * 联邦（此时 Panel 早已连上），只在连接瞬间问一次就永远看不到它。
 * 也正因为要"持续跟随"，这里的节流必须存在——否则 8s 一轮会把 WS 与
 * 本地 HTTP 都刷满。
 */
async function discoverFromFederation(list: UpstreamStatus[]): Promise<void> {
  const now = Date.now();
  const online = list.filter(u => u.connectivity === 'online');
  if (!online.length) return;
  if (now - lastDirectoryRequestAt >= DIRECTORY_REQUEST_MS) {
    lastDirectoryRequestAt = now;
    for (const u of online) sendCommand('RequestFederationDirectory', u.name);
  }
  if (now - lastDiscoveryAt < DISCOVERY_MS) return;
  lastDiscoveryAt = now;
  const created = await runDiscovery();
  if (created > 0) {
    // 新接入点要立刻出现在 UI（下一轮 poll 也会看到，这里只是快一拍）。
    void refreshUpstreams();
    return;
  }
  await pruneDiscovered();
}

/** 轮询最短间隔（状态刚变过：跟紧，别让用户看到过期的在线状态）。 */
const POLL_MIN_MS = 8_000;
/** 轮询最长间隔（长时间无变化时的退避上限）。 */
const POLL_MAX_MS = 30_000;

/**
 * 启动周期轮询；返回停止函数。
 *
 * 后台标签页暂停轮询、回到前台立即补一次（2026-10 审计）：状态卡不在
 * 视野内，后台 8s 一次的 fetch 纯属浪费（移动端耗电/流量）；回前台补
 * 一次保证看到的是最新状态。
 *
 * ## 自适应退避（2026-11 远程访问优化）
 *
 * 原来是固定 `setInterval(8s)`：远程访问下这就是**每分钟 7 次完整的 HTTP
 * 往返**，而上游状态绝大多数时间是不变的——空转的请求既占带宽又让笔记本
 * 网卡无法进入低功耗。改为「有实质变化 → 保持 8s；连续无变化 → 8→16→24→
 * 30s」。状态一变立刻回到 8s，所以不会漏掉恢复/掉线。
 *
 * 用 `setTimeout` 递归而不是 `setInterval`：间隔是**每轮**重新决定的，固定
 * 周期无法退避。（顺带修掉了原来"后台暂停"仍每 8s 空转一次回调的问题。）
 */
export function startUpstreamsPolling(): () => void {
  let delay = POLL_MIN_MS;
  let timer: number | undefined;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(tick, delay);
  };

  const tick = () => {
    if (stopped) return;
    if (document.visibilityState !== 'visible') {
      // 后台：不请求，但保持"最短间隔"的节奏——回前台由 onVisible 立即补。
      delay = POLL_MIN_MS;
      schedule();
      return;
    }
    void refreshUpstreams().then((changed) => {
      delay = changed ? POLL_MIN_MS : Math.min(delay * 2, POLL_MAX_MS);
      schedule();
    });
  };

  void refreshUpstreams();
  schedule();

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    // 回前台：立即补一次并复位退避（用户正看着，状态必须是最新的）。
    delay = POLL_MIN_MS;
    void refreshUpstreams();
    schedule();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
