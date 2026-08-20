//! DisplayMessage → ChatMessage 适配层：panel 的消息模型与
//! @echolab-auto/ui-frame/chat 的数据契约之间的唯一翻译点。

import type { ChatBranchEntry, ChatMessage } from '@echolab-auto/ui-frame/chat';
import type { BranchMsg, DisplayMessage } from './state';

/** 与库默认一致，但显式锁定 zh-CN（库默认用浏览器 locale）。 */
export const formatTime = (seconds: number): string =>
  new Date(seconds * 1000).toLocaleTimeString('zh-CN', { hour12: false });

/** 合并连续 reasoning 段（对齐 React 版 useBranchEntries；库的分支合并块不合并）。 */
function mergeReasoning(msgs: BranchMsg[]): ChatBranchEntry[] {
  const out: ChatBranchEntry[] = [];
  for (const m of msgs) {
    const last = out[out.length - 1];
    if (m.kind === 'reasoning' && last && last.kind === 'reasoning') {
      last.text += '\n\n' + m.text;
    } else {
      // BranchMsg 与 ChatBranchEntry 字段同构，直接展开。
      out.push({ ...m });
    }
  }
  return out;
}

export function toChatMessage(m: DisplayMessage): ChatMessage {
  return {
    id: m.key, // 'm{N}' → id
    role: m.role === 'backend' ? 'agent' : m.role, // 唯一的角色改名
    content: m.content,
    time: m.time, // 双方都是秒级 Unix 时间戳，无需换算
    reasoning: m.reasoning,
    tool: m.tool && {
      name: m.tool.name,
      input: m.tool.input,
      output: m.tool.output,
      status: m.tool.status,
    },
    branch: m.branch && {
      branchId: m.branch.branchId,
      summary: m.branch.summary,
      entries: mergeReasoning(m.branch.msgs),
    },
    source: m.source && {
      adapterName: m.source.adapter_name,
      platform: m.source.platform,
      userId: m.source.user_id,
      userName: m.source.user_name,
      channel: m.source.channel,
      groupName: m.source.group_name,
    },
  };
}
