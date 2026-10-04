//! 上游 Core 连接状态（Panel 后端本地 API `/api/upstreams`）。
//!
//! 连接状态卡与「上游设置」页共用同一份 `state.upstreams`：单一轮询源，
//! 组件只读。后端健康表由中继链路/探活泵维护，`connectivity` 三态
//! （online/connecting/offline）+ `auth`（ok/failed/unknown）。

import { state } from './store';
import { panelFetch } from './connection';
import type { UpstreamStatus } from './state';

/** 拉取一次上游状态并写入共享 state（失败保留上次结果，不弹错）。 */
export async function refreshUpstreams(): Promise<void> {
  try {
    const res = await panelFetch('/api/upstreams');
    if (!res.ok) return;
    const list = (await res.json()) as UpstreamStatus[];
    state.upstreams = Array.isArray(list) ? list : [];
    // 已配置上游即"已知运行区域"：区域集合不依赖是否已收到事件，
    // 多区域判定（命令必须显式落到某个区域）从配置起就成立。
    for (const u of state.upstreams) state.knownCores.add(u.name);
  } catch {
    // Panel 后端不可达：保留上次快照。
  }
}

const POLL_MS = 8_000;

/** 启动周期轮询；返回停止函数。 */
export function startUpstreamsPolling(): () => void {
  void refreshUpstreams();
  const timer = window.setInterval(() => {
    void refreshUpstreams();
  }, POLL_MS);
  return () => window.clearInterval(timer);
}
