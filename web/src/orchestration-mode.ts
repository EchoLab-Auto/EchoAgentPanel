//! 编排模式（orchestration mode）编辑器辅助：智能体编辑器的分段单选
//! 与 enabled_plugins 白名单之间的双向映射。core 侧权威推导是
//! `TeamMember::orchestration_mode`（集合语义，single 兜底），这里是其
//! 表单态镜像——保存时仍只写 enabled_plugins 白名单，core 归一化兜底。

import {
  LEGACY_MODE_PLUGIN_IDS,
  ORCHESTRATION_CHATBOT_PLUGIN_ID,
  ORCHESTRATION_SINGLE_PLUGIN_ID,
  type OrchestrationMode,
} from './protocol';

const CHATBOT_IDS = [ORCHESTRATION_CHATBOT_PLUGIN_ID, ...LEGACY_MODE_PLUGIN_IDS];

/** 表单态白名单的编排模式推导（空表 = 全部启用 → chatbot；single 兜底） */
export function deriveMode(enabledPlugins: string[]): OrchestrationMode {
  if (enabledPlugins.length === 0) return 'chatbot';
  return enabledPlugins.some((p) => CHATBOT_IDS.includes(p)) ? 'chatbot' : 'single';
}

function stripModeIds(list: string[]): string[] {
  return list.filter(
    (p) =>
      p !== ORCHESTRATION_CHATBOT_PLUGIN_ID &&
      p !== ORCHESTRATION_SINGLE_PLUGIN_ID &&
      !LEGACY_MODE_PLUGIN_IDS.includes(p),
  );
}

/**
 * 切换编排模式，返回新的 enabled_plugins。
 * - chatbot：空表 no-op（空表即全启用）；否则移除 single/旧 id、加入 chatbot id
 * - single：空表先物化全量（与 toggleAllowlist 首次取消的物化一致），
 *   再移除 chatbot/旧 id、加入 single id
 */
export function applyMode(
  enabledPlugins: string[],
  mode: OrchestrationMode,
  allPluginIds: string[],
): string[] {
  if (mode === 'chatbot') {
    if (enabledPlugins.length === 0) return enabledPlugins;
    return [...new Set([...stripModeIds(enabledPlugins), ORCHESTRATION_CHATBOT_PLUGIN_ID])];
  }
  const base = enabledPlugins.length ? enabledPlugins : [...allPluginIds];
  return [...new Set([...stripModeIds(base), ORCHESTRATION_SINGLE_PLUGIN_ID])];
}

/** 保存防御：剔除旧特性 id（core 也会迁移映射，这里避免本地陈旧状态回写） */
export function stripLegacyModeIds(list: string[]): string[] {
  return list.filter((p) => !LEGACY_MODE_PLUGIN_IDS.includes(p));
}
