<script setup lang="ts">
//! 消息行（user / agent / system）——面板自组（2026-09-30）。
//!
//! 背景：ui-frame 已移除 chat 组合组件（ChatMessageItem 等）——聊天组合属
//! 产品语义，由宿主自行组装。本组件用库保留的元组件（`ChatBubble`）+ doc
//! 模块（`MarkdownRenderer`）实现面板的消息行；工具行 / 推理块 / 子代理行
//! 由 ChatView 分派给 ToolRunGroup / ReasoningBlock / SubagentEventBlock。
//!
//! 语义与迁移前（库版 ChatMessageItem）一致：
//! - user 居右主色气泡、agent 居左中性气泡（正文走 Markdown）、system 居中平铺；
//! - 头部：agent 显示角色名，消息带来源（QQ/本地）时附「适配器 · 群 · 用户名」，
//!   其后是时间；`copyText` 提供悬停复制。

import { computed } from 'vue';
import { useLocale } from '@echolab-auto/ui-frame';
import { ChatBubble } from '@echolab-auto/ui-frame/chat';
import { MarkdownRenderer } from '@echolab-auto/ui-frame/doc';
import type { ChatMessageWithImages } from '../chat-adapter';

const props = defineProps<{
  message: ChatMessageWithImages;
  /** 时间格式化（秒级 Unix 时间戳）；缺省由本组件兜底 */
  formatTime?: (time: number) => string;
}>();

const { t } = useLocale();

const isUser = computed(() => props.message.role === 'user');

/** 来源标签（多适配器场景）：适配器 · 群名 · 用户名。 */
const sourceLabel = computed(() => {
  const source = props.message.source;
  if (!source) return '';
  const parts: string[] = [];
  if (source.adapterName) parts.push(source.adapterName);
  if (source.channel?.startsWith('group')) {
    parts.push(t('chatSourceGroup', { name: source.groupName ?? source.channel }));
  }
  if (source.userName) parts.push(source.userName);
  return parts.join(' · ');
});

const timeLabel = computed(() => {
  const time = props.message.time;
  if (!time) return '';
  if (props.formatTime) return props.formatTime(time);
  return new Date(time * 1000).toLocaleTimeString(undefined, { hour12: false });
});
</script>

<template>
  <ChatBubble v-if="message.role === 'system'" align="center" tone="plain" role="note">
    <span class="msg-item__system-text">{{ message.content }}</span>
    <span v-if="timeLabel" class="msg-item__system-time">{{ timeLabel }}</span>
  </ChatBubble>
  <ChatBubble
    v-else
    :align="isUser ? 'end' : 'start'"
    :tone="isUser ? 'primary' : 'default'"
    :copy-text="message.content"
    role="article"
    :aria-label="isUser ? t('chatRoleUser') : t('chatRoleAgent')"
  >
    <template #head>
      <span v-if="!isUser" class="msg-item__role">{{ t('chatRoleAgent') }}</span>
      <span v-if="sourceLabel" class="msg-item__source">{{ sourceLabel }}</span>
      <span v-if="timeLabel" class="msg-item__time">{{ timeLabel }}</span>
    </template>
    <MarkdownRenderer v-if="!isUser" :content="message.content" :show-toc="false" />
    <template v-else>{{ message.content }}</template>
  </ChatBubble>
</template>

<style scoped>
.msg-item__role {
  font-size: 11px;
  font-weight: 600;
  color: var(--nm-text-secondary);
  letter-spacing: 0.02em;
}
.msg-item__source {
  font-size: 11px;
  color: var(--nm-text-placeholder);
}
.msg-item__time {
  font-size: 11px;
  color: var(--nm-text-disabled);
  font-variant-numeric: tabular-nums;
}
.msg-item__system-time {
  font-size: 11px;
  color: var(--nm-text-disabled);
}
</style>
