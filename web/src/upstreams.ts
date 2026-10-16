//! 上游 Core 连接状态（Panel 后端本地 API `/api/upstreams`）。
//!
//! 连接状态卡与「上游设置」页共用同一份 `state.upstreams`：单一轮询源，
//! 组件只读。后端健康表由中继链路/探活泵维护，`connectivity` 三态
//! （online/connecting/offline）+ `auth`（ok/failed/unknown）。

import { state } from './store';
import { panelFetch } from './connection';
import { dropCoreAdapterChannel } from './adapterOps';
import type { UpstreamStatus } from './state';

/**
 * 上一帧上游快照：`name → connectivity`（diff 基准）。
 *
 * 离线/移除检测（02a §5.4-1）：条目从上游列表**消失** 或 `connectivity`
 * `online → offline` ⇒ `dropCoreAdapterChannel(name)` 清理该 core 的适配器
 * 通道（UI 文档 + pending + 在途 Promise + onCoreDropped 通知）。
 * 清理延迟 ≤ 一个轮询窗（8s）；删除路径另有 removeSessionsOfCore 即时兜底。
 */
let lastUpstreams: Map<string, string> | null = null;

/** 拉取一次上游状态并写入共享 state（失败保留上次结果，不弹错）。 */
export async function refreshUpstreams(): Promise<void> {
  try {
    const res = await panelFetch('/api/upstreams');
    if (!res.ok) return;
    const list = (await res.json()) as UpstreamStatus[];
    const next = Array.isArray(list) ? list : [];
    if (lastUpstreams) {
      for (const [name, connectivity] of lastUpstreams) {
        const now = next.find(u => u.name === name)?.connectivity;
        if (now === undefined || (connectivity === 'online' && now === 'offline')) {
          dropCoreAdapterChannel(name);
        }
      }
    }
    lastUpstreams = new Map(next.map(u => [u.name, u.connectivity]));
    state.upstreams = next;
    // 已配置上游即"已知运行区域"：区域集合不依赖是否已收到事件，
    // 多区域判定（命令必须显式落到某个区域）从配置起就成立。
    for (const u of next) state.knownCores.add(u.name);
  } catch {
    // Panel 后端不可达：保留上次快照。
  }
}

const POLL_MS = 8_000;

/**
 * 启动周期轮询；返回停止函数。
 *
 * 后台标签页暂停轮询、回到前台立即补一次（2026-10 审计）：状态卡不在
 * 视野内，后台 8s 一次的 fetch 纯属浪费（移动端耗电/流量）；回前台补
 * 一次保证看到的是最新状态。
 */
export function startUpstreamsPolling(): () => void {
  void refreshUpstreams();
  const timer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return; // 后台暂停
    void refreshUpstreams();
  }, POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void refreshUpstreams();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
