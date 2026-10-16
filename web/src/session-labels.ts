//! 会话平台标签（03b §1.3 / §4.3 S2）：SessionSwitcher 分组标题的文案来源。
//!
//! 数据来源：`state.adapters` 中 `platform` 匹配的条目——插件描述符的
//! `session_labels`（如 `{ dm: "QQ 私聊", group: "QQ 群" }`）经线协议
//! `AdapterStatus` 到达 Panel（载体由 01 决定，本模块屏蔽差异）。
//!
//! 回退链（03b §4.3）：
//!   1. 有条目且带 labels → 用 labels（逐键回退）；
//!   2. 有匹配条目但无 labels → `<display_name> 私聊 / 群聊`；
//!   3. 整个 platform 无匹配适配器 → 「私聊 / 群聊」。
//!
//! 多实例同平台：labels 是平台级文案，取**带 labels 的条目**优先（其次首个
//! 匹配条目）——任一实例提供即可用。

import { state } from './store';
import type { AdapterStatus } from './protocol';

export interface SessionLabels {
  dm: string;
  group: string;
}

function displayNameOf(a: AdapterStatus): string {
  return a.display_name || a.name;
}

/** 平台会话标签（`{ dm, group }`，带回退；SessionSwitcher 分组标题用）。 */
export function sessionLabelsFor(platform: string): SessionLabels {
  const matches = state.adapters.filter((a) => a.platform === platform);
  const ref = matches.find((a) => a.session_labels) ?? matches[0] ?? null;
  const name = ref ? displayNameOf(ref) : '';
  return {
    dm: ref?.session_labels?.dm || (name ? `${name} 私聊` : '私聊'),
    group: ref?.session_labels?.group || (name ? `${name} 群聊` : '群聊'),
  };
}
