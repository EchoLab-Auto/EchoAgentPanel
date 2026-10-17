//! DisplayMessage → ChatMessage 适配层：panel 的消息模型与
//! @echolab-auto/ui-frame/chat 的数据契约之间的唯一翻译点。

import type { ChatBranchEntry, ChatMessage, ChatToolCall } from '@echolab-auto/ui-frame/chat';
import type { BranchMsg, DisplayMessage } from './state';
import type { SubagentEventInfo } from './state_domains/timeline';

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
      // BranchMsg 与 ChatBranchEntry 字段同构，直接展开（status 走本地
      // 加宽后的转换——分支条目同样可能出现 unknown）。
      const entry = { ...m } as ChatBranchEntry;
      if (m.status) entry.status = asVendorToolStatus(m.status);
      out.push(entry);
    }
  }
  return out;
}

/** ui-frame `ChatToolCall` 的 panel 侧扩展：core 上报的工具计时。
 *  仅加宽本地类型，不改 vendor 契约（字段全部可选，兼容上游）。 */
export type ChatToolCallWithTiming = ChatToolCall & {
  /** 执行开始时间（epoch ms；运行中实时计时用） */
  startedAtMs?: number;
  /** 执行总耗时（ms；完成后展示） */
  elapsedMs?: number;
};

/** vendor 契约为三态（running / succeeded / failed）；panel 本地多一个
 *  `unknown`：**回合已结束但没收到该次调用的结果事件**（ToolResult 丢帧）。
 *  与 failed 区分——工具不一定失败，只是前端没拿到回执（2026-10）。
 *
 *  ui-frame 的 chat 组件不按 status 分支渲染（工具行由 panel 的
 *  WorkRunGroup 渲染），所以本地加宽不会影响上游渲染；此处用一个收窄
 *  断言把值交给 vendor 类型，断言只出现在这一处。 */
export type LocalToolStatus = NonNullable<ChatToolCall['status']> | 'unknown';

const asVendorToolStatus = (status: LocalToolStatus): NonNullable<ChatToolCall['status']> =>
  status as NonNullable<ChatToolCall['status']>;

export interface ChatMessageWithImages extends ChatMessage {
  images?: string[];
  /** 实时消息标记（渲染层据此播放场动画/打字机；历史回放不播放） */
  animate?: boolean;
  /** 真流式（2026-10）：内容随增量增长中（推理块自动展开并钉底，不播打字机）。 */
  streaming?: boolean;
  /** 子代理完成回报（role='subagent'）的结构化载荷。 */
  subagent?: SubagentEventInfo;
  /** 覆盖基类 ChatToolCall：追加计时字段（结构兼容）。 */
  tool?: ChatToolCallWithTiming;
}

/**
 * 展示层压缩：正文里的内嵌 base64 图片换成占位符。
 *
 * 入站消息的原文是 hook JSON（带完整 data URI），与 Core 侧
 * `compact_embedded_media` 同一套占位符：附图走缩略图渲染，正文只留
 * `[图片#n]`，否则一条 1MB 截图会变成满屏 base64 文本。
 */
export function compactForDisplay(content: string, images?: string[]): string {
  let text = content;
  (images ?? []).forEach((image, index) => {
    if (image.startsWith('data:') && text.includes(image)) {
      text = text.split(image).join(`[图片#${index + 1}]`);
    }
  });
  return text.replace(/data:[^;,"'\s]+;base64,[A-Za-z0-9+/=]{256,}/g, '[图片数据已省略]');
}

export function toChatMessage(m: DisplayMessage): ChatMessageWithImages {
  return {
    id: m.key, // 'm{N}' → id
    // backend → agent（库的角色命名）；reasoning 为面板扩展角色，由
    // ChatView 的自渲染行循环拦截渲染（2026-09-19 起列表自渲染；
    // 库 ChatRole 无该角色）。
    role: (m.role === 'backend' ? 'agent' : m.role) as ChatMessage['role'],
    content: compactForDisplay(m.content, m.images),
    time: m.time, // 双方都是秒级 Unix 时间戳，无需换算
    animate: m.animate,
    streaming: m.streamState === 'streaming',
    images: m.images,
    reasoning: m.reasoning,
    tool: m.tool && {
      name: m.tool.name,
      input: m.tool.input,
      output: m.tool.output,
      status: asVendorToolStatus(m.tool.status),
      startedAtMs: m.tool.startedAtMs,
      elapsedMs: m.tool.elapsedMs,
    },
    branch: m.branch && {
      branchId: m.branch.branchId,
      summary: m.branch.summary,
      entries: mergeReasoning(m.branch.msgs),
    },
    subagent: m.subagent,
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
