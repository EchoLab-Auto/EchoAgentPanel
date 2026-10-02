//! 全局响应式单例 store。
//!
//! state.ts 的 reduce 在 ~30 个事件分支里原地深变异状态；Vue 3 的 proxy
//! 响应式原生支持这些变异（含 delete 与索引赋值），因此 reducer 逐字复用，
//! 无需 React 时代的浅拷贝 hack。

import { reactive } from 'vue';
import { initialState, reduce, type AppState } from './state';
import type { BackendEvent } from './protocol';
import { resolvePendingEvent } from './pending';
import type { SessionInfo } from './protocol';

export const state = reactive(initialState()) as AppState;

export function dispatch(event: BackendEvent, core: string | null = null): void {
  // 请求-响应跟踪：响应事件到达即销账（各视图加载态，见 pending.ts）。
  resolvePendingEvent(event);
  // 多上游聚合视图：会话事件注入来源 core（复合键第三维度，防止
  // A/B 两 Core 上同名会话（如各自的 local:tui）互相覆盖）。
  if (core && 'SessionUpdated' in (event as object)) {
    const e = (event as { SessionUpdated: { session: SessionInfo & { core?: string | null } } })
      .SessionUpdated;
    e.session.core = core;
  }
  reduce(state, event);
}
