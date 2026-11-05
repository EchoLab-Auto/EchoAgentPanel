//! 入口行覆盖面板的**单一**打开状态。
//! 内置与扩展覆盖层共用此状态；扩展 id 使用 `extension:<plugin>:<slot>`
//! 命名空间，Panel 不需要知道任何插件业务语义。

import { ref } from 'vue';

/** Panel 壳内置的覆盖层 id。 */
export type BuiltinOverlayId =
  | 'config'
  | 'context'
  | 'checklist'
  | 'sessions'
  | 'instance'
  | 'tasks';

/** 当前打开的覆盖面板（null = 全关）。 */
export const entryOverlay = ref<string | null>(null);

/** 打开指定面板（自动关掉其它），或传 `null` 全关。 */
export function setEntryOverlay(id: string | null): void {
  entryOverlay.value = id;
}

/** 切换指定面板（已开则关）。 */
export function toggleEntryOverlay(id: string): void {
  entryOverlay.value = entryOverlay.value === id ? null : id;
}
