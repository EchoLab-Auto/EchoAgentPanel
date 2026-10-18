<script setup lang="ts">
//! 消息行（user / agent / system）——面板自组（2026-09-30；2026-10-13 吸收气泡壳）。
//!
//! 背景：ui-frame 已移除 chat 组合组件（ChatMessageItem 等）——聊天组合属
//! 产品语义，由宿主自行组装。本组件用**面板自有 CSS 配方**（2026-10-13 起
//! 吸收原库 `ChatBubble` 元组件的壳样式：对齐 / 色调 / 非对称圆角——
//! 该组装件因"角色→样式映射烘进壳"被解散）+ 延迟加载的 Markdown 渲染
//! （`MarkdownLazy`，2026-10 首屏加载优化：doc 模块不再静态进入首屏关键
//! 路径）实现面板的消息行；工作条目行（工具调用 + 思考 + 子代理）由
//! ChatView 分派给 WorkRunGroup（统一 chip 行）。
//!
//! 语义与迁移前一致：
//! - user 居右主色气泡、agent 居左中性气泡（正文走 Markdown）、system 居中
//!   平铺（细线夹文本）；
//! - 头部：agent 显示角色名，消息带来源（QQ/本地）时附「实例 · 群 · 用户名」，
//!   其后是时间；悬停浮现复制按钮（`ChatCopyButton`，保留的原子组件）。

import { computed } from 'vue';
import { useLocale } from '@echolab-auto/ui-frame/composables/useLocale';
import { ChatCopyButton } from '@echolab-auto/ui-frame/chat';
import MarkdownLazy from './MarkdownLazy.vue';
import type { ChatMessageWithImages } from '../chat-adapter';

const props = defineProps<{
  message: ChatMessageWithImages;
  /** 时间格式化（秒级 Unix 时间戳）；缺省由本组件兜底 */
  formatTime?: (time: number) => string;
}>();

const { t } = useLocale();

const isUser = computed(() => props.message.role === 'user');

/** 来源标签（多实例场景）：实例 · 群名 · 用户名。 */
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
  <div
    v-if="message.role === 'system'"
    class="msg-item__bubble msg-item__bubble--system"
    role="note"
  >
    <div class="msg-item__content">
      <span class="msg-item__system-text">{{ message.content }}</span>
      <span v-if="timeLabel" class="msg-item__system-time">{{ timeLabel }}</span>
    </div>
  </div>
  <div
    v-else
    class="msg-item__bubble"
    :class="isUser ? 'msg-item__bubble--user' : 'msg-item__bubble--agent'"
    role="article"
    :aria-label="isUser ? t('chatRoleUser') : t('chatRoleAgent')"
  >
    <div class="msg-item__head">
      <span v-if="!isUser" class="msg-item__role">{{ t('chatRoleAgent') }}</span>
      <span v-if="sourceLabel" class="msg-item__source">{{ sourceLabel }}</span>
      <span v-if="timeLabel" class="msg-item__time">{{ timeLabel }}</span>
      <span class="msg-item__spacer" />
      <ChatCopyButton class="msg-item__copy" :text="message.content" />
    </div>
    <div class="msg-item__content">
      <MarkdownLazy v-if="!isUser" :content="message.content" />
      <template v-else>{{ message.content }}</template>
    </div>
  </div>
</template>

<style scoped>
/* ── 气泡壳（2026-10-13 自 ChatBubble 吸收）：对齐 × 色调正交组合 ──────────
   宽度动态化（2026-09-30 语义保持）：解除库默认上限 min(78%, 640px)——
   短消息贴内容收紧，长消息/代码/表格随**消息列可用宽度**伸展（列宽本身
   随左右侧栏卡片显隐动态变化，见 ChatView 的托盘 padding）。 */
.msg-item__bubble {
  max-width: 100%;
  padding: var(--nm-spacing-sm) var(--nm-spacing-14);
  border-radius: var(--nm-border-radius-md);
}

.msg-item__bubble--user {
  /* 对齐仅对 flex 列容器（.chat-view__item--msg）生效，见 ChatView。 */
  align-self: flex-end;
  background-color: var(--nm-chat-user-bg);
  box-shadow:
    3px 3px 10px var(--nm-shadow-dark),
    -2px -2px 8px var(--nm-shadow-light);
  /* 非对称圆角暗示方向：居右压右下角 */
  border-radius: var(--nm-border-radius-md) var(--nm-border-radius-md) var(--nm-border-radius-xs)
    var(--nm-border-radius-md);
}

.msg-item__bubble--agent {
  align-self: flex-start;
  background-color: var(--nm-chat-agent-bg);
  box-shadow:
    3px 3px 10px var(--nm-shadow-dark),
    -2px -2px 8px var(--nm-shadow-light);
  /* 居左压左下角 */
  border-radius: var(--nm-border-radius-md) var(--nm-border-radius-md) var(--nm-border-radius-md)
    var(--nm-border-radius-xs);
}

/* system：居中平铺（细线夹文本），无气泡 */
.msg-item__bubble--system {
  align-self: center;
  max-width: 92%;
  padding: 0 var(--nm-spacing-sm);
  color: var(--nm-chat-system-color);
  font-size: var(--nm-font-sm);
  display: flex;
  align-items: center;
  gap: var(--nm-spacing-sm);
}
.msg-item__bubble--system::before,
.msg-item__bubble--system::after {
  content: '';
  height: 1px;
  width: 32px;
  background: var(--nm-shadow-dark);
}

/* 头部行：角色 / 来源 / 时间 + 悬停浮现的复制按钮 */
.msg-item__head {
  display: flex;
  align-items: center;
  gap: var(--nm-spacing-xs);
  margin-bottom: var(--nm-spacing-2xs);
}
.msg-item__spacer {
  flex: 1;
}
.msg-item__copy {
  opacity: 0;
  transition: opacity 0.2s ease;
}
@media (hover: hover) {
  .msg-item__bubble:hover .msg-item__copy {
    opacity: 1;
  }
}
@media (hover: none) {
  .msg-item__copy {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .msg-item__copy {
    transition: none;
  }
}

/* 正文排版 */
.msg-item__content {
  color: var(--nm-text-primary);
  font-size: var(--nm-font-md);
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
/* MarkdownRenderer 自带排版，关闭外层 pre-wrap 双重作用 */
.msg-item__content:has(.neumorphism-markdown) {
  white-space: normal;
}
.msg-item__bubble--system .msg-item__content {
  color: inherit;
  font-size: inherit;
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
