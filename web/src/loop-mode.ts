//! 循环模式（loop mode）编辑器辅助：智能体编辑器的分段单选与
//! enabled_plugins 白名单之间的双向映射。core 侧权威推导是
//! `TeamMember::loop_mode`（集合语义，单会话为默认与兜底），这里是其
//! 表单态镜像——保存时仍只写 enabled_plugins 白名单，core 归一化兜底。

import { LOOP_PARALLEL_PLUGIN_ID, LOOP_SINGLE_PLUGIN_ID, type LoopMode } from './protocol';

/**
 * 表单态白名单的循环模式推导。
 * - 空表（=默认）→ single（单会话是默认；并行必须显式选择）
 * - 含 parallel → parallel
 * - 其余 → single
 */
export function deriveMode(enabledPlugins: string[]): LoopMode {
  return enabledPlugins.includes(LOOP_PARALLEL_PLUGIN_ID) ? 'parallel' : 'single';
}

function stripModeIds(list: string[]): string[] {
  return list.filter((p) => p !== LOOP_PARALLEL_PLUGIN_ID && p !== LOOP_SINGLE_PLUGIN_ID);
}

/**
 * 切换循环模式，返回新的 enabled_plugins（写入二选一的模式插件 id）。
 * - single（默认）：空表 no-op（空表即单会话）；非空则剔除模式 id 后写入 single
 * - parallel：空表先物化全量（与 toggleAllowlist 首次取消的物化一致），
 *   再剔除模式 id 并写入 parallel
 */
export function applyMode(
  enabledPlugins: string[],
  mode: LoopMode,
  allPluginIds: string[],
): string[] {
  if (mode === 'single') {
    if (enabledPlugins.length === 0) return enabledPlugins;
    return [...new Set([...stripModeIds(enabledPlugins), LOOP_SINGLE_PLUGIN_ID])];
  }
  const base = enabledPlugins.length ? enabledPlugins : [...allPluginIds];
  return [...new Set([...stripModeIds(base), LOOP_PARALLEL_PLUGIN_ID])];
}

