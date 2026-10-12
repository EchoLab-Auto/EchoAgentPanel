<script setup lang="ts">
//! 消息行（user / agent / system）——面板自组（2026-09-30）。
//!
//! 背景：ui-frame 已移除 chat 组合组件（ChatMessageItem 等）——聊天组合属
//! 产品语义，由宿主自行组装。本组件用库保留的元组件（`ChatBubble`）+
//! 延迟加载的 Markdown 渲染（`MarkdownLazy`，2026-10 首屏加载优化：doc
//! 模块不再静态进入首屏关键路径）实现面板的消息行；工具行 / 推理块 /
//! 子代理行由 ChatView 分派给 ToolRunGroup / ReasoningBlock /
//! SubagentEventBlock。
//!
//! 语义与迁移前（库版 ChatMessageItem）一致：
//! - user 居右主色气泡、agent 居左中性气泡（正文走 Markdown）、system 居中平铺；
//! - 头部：agent 显示角色名，消息带来源（QQ/本地）时附「适配器 · 群 · 用户名」，
//!   其后是时间；`copyText` 提供悬停复制。

import { computed } from 'vue';
import { useLocale } from '@echolab-auto/ui-frame';
import { ChatBubble } from '@echolab-auto/ui-frame/chat';
import MarkdownLazy from './MarkdownLazy.vue';
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
  <ChatBubble
    v-if="message.role === 'system'"
    class="msg-item__bubble"
    align="center"
    tone="plain"
    role="note"
  >
    <span class="msg-item__system-text">{{ message.content }}</span>
    <span v-if="timeLabel" class="msg-item__system-time">{{ timeLabel }}</span>
  </ChatBubble>
  <ChatBubble
    v-else
    class="msg-item__bubble"
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
    <MarkdownLazy v-if="!isUser" :content="message.content" />
    <template v-else>{{ message.content }}</template>
  </ChatBubble>
</template>

<style scoped>
/* 气泡宽度动态化（2026-09-30）：解除库默认上限 `min(78%, 640px)`——
   短消息贴内容收紧，长消息/代码/表格随**消息列可用宽度**伸展
   （列宽本身随左右侧栏卡片显隐动态变化，见 ChatView 的托盘 padding）。
   双写类名提高特异性，压过库样式（同特异性时加载顺序不可靠）；
   对齐（user 靠右 / agent 靠左 / system 居中）由库的 `align-self` 语义
   提供，前提是父级 `.chat-view__item--msg` 为 flex 列容器（见 ChatView）。 */
.msg-item__bubble.msg-item__bubble {
  max-width: 100%;
}

/* Markdown 标题锚点（doc 模块的 `#` 链接）在聊天气泡里没有目录导航语义，
   且其绝对定位（标题右缘 -22px）会撑出气泡的横向 scrollWidth（实测 22px，
   气泡贴边时视觉上探出边缘）；气泡内直接隐藏。 */
.msg-item__bubble :deep(.heading-anchor) {
  display: none;
}

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
