<script setup lang="ts">
//! 消息行（user / agent / system）——面板自组（2026-09-30；2026-10-13 吸收气泡壳；
//! 2026-10-29 外壳改由 ui-frame `NeumorphismCard` 的**凸起档**承担）。
//!
//! 背景：ui-frame 已移除 chat 组合组件（ChatMessageItem 等）——聊天组合属
//! 产品语义，由宿主自行组装。本组件把「壳」交给库的卡片组件（`elevation=1`
//! 的凸起台阶：ambient 落影 + 双向双阴影 + 库统一圆角/裁剪），面板侧只保留
//! **角色语义**：对齐（`align-self`）、色调（用户主色染色 / Agent 抬升一档）、
//! 非对称圆角开向（靠内一侧收成 4px，形状线索不依赖颜色）。正文由延迟加载的
//! `MarkdownLazy` 渲染（2026-10 首屏优化：doc 模块不再静态进入首屏关键路径）；
//! 工作条目行（工具调用 + 思考 + 子代理）由 ChatView 分派给 WorkRunGroup
//! （统一 chip 行）。
//!
//! 语义与迁移前一致：
//! - user 居右主色气泡、agent 居左中性气泡（正文走 Markdown）、system 居中
//!   平铺（细线夹文本）；
//! - 头部：agent 显示角色名，消息带来源（QQ/本地）时附「实例 · 群 · 用户名」，
//!   其后是时间；悬停浮现复制按钮（`ChatCopyButton`，保留的原子组件）。

import { computed } from 'vue';
import { useLocale } from '@echolab-auto/ui-frame/composables/useLocale';
import { ChatCopyButton } from '@echolab-auto/ui-frame/chat';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import MarkdownLazy from './MarkdownLazy.vue';
import type { ChatMessageWithImages } from '../chat-adapter';

const props = defineProps<{
  message: ChatMessageWithImages;
  /** 时间格式化（秒级 Unix 时间戳）；缺省由本组件兜底 */
  formatTime?: (time: number) => string;
}>();

const { t } = useLocale();

const isUser = computed(() => props.message.role === 'user');

/**
 * 流式期间走纯文本（2026-10 P0 性能止血）。
 *
 * `MarkdownLazy` 底层的 `MarkdownRenderer` 对 `content` 是 `watch → doRender`
 * 全量重跑：`marked.parse` + DOMPurify + `v-html` 整段替换（`useMarkdownToc`
 * 还会再 `marked.lexer` 一次）。成本随正文长度线性增长，而流式每条 delta
 * 都会触发一次 —— 一次回答的总成本是 **O(deltas × 长度)**。实测单次 delta
 * 的 flush 成本：900 字 1.3 ms / 4.2 K 2.7 ms / 16.6 K 7.8 ms / 41.5 K
 * 16.9 ms / 83 K **33.3 ms**（4 万字回答 ≈ 累计 1.5–2 s 主线程）。
 *
 * 改为"流式中纯文本、终值一次 Markdown"，总成本降到 O(长度)；副产品是
 * 文本立即可见（不必等 Markdown 成型），观感更快。
 */
const streamingPlain = computed(() => !isUser.value && props.message.streaming === true);

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
  <!-- 外壳 = ui-frame NeumorphismCard **凸起档**（elevation=1）：ambient 落影 +
       双向双阴影 + 圆角/裁剪全归库，面板不再自己写 box-shadow。
       `no-padding` + 根节点 padding：padding 属版面（面板控），库的 body 留白
       属组件默认（24px，对气泡过大）。`role` / `aria-label` 经 attrs 透传到
       卡片根节点，无障碍语义不变。 -->
  <NeumorphismCard
    v-else
    no-padding
    class="msg-item__bubble"
    :class="isUser ? 'msg-item__bubble--user' : 'msg-item__bubble--agent'"
    :elevation="1"
    :radius="16"
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
      <!-- 流式中走纯文本（2026-10 P0）：Markdown 渲染器对每条 delta 全量
           重解析（O(deltas × 长度)），终值时一次成型（O(长度)）。 -->
      <span v-if="streamingPlain" class="msg-item__stream">{{ message.content }}</span>
      <MarkdownLazy v-else-if="!isUser" :content="message.content" />
      <template v-else>{{ message.content }}</template>
    </div>
  </NeumorphismCard>
</template>

<style scoped>
/* ── 气泡壳（2026-10-29 改由 ui-frame NeumorphismCard 凸起档承担）──────────
   **材质（阴影/圆角/裁剪）不再由面板写**：`.nm-card--elevation-1` 提供
   ambient `0 1px 2px` + 暗侧 `4px 4px 10px` + 亮侧 `-2px -2px 6px`，
   `overflow: hidden` 顺带把 Markdown 超宽内容裁在气泡内。
   面板在此只负责**角色语义**三件事：宽度、对齐、色调 + 非对称圆角开向。 */
.msg-item__bubble {
  /* 宽度动态化（2026-09-30 语义保持）：解除库默认上限 min(78%, 640px)——
     短消息贴内容收紧，长消息/代码/表格随**消息列可用宽度**伸展（列宽本身
     随左右侧栏卡片显隐动态变化，见 ChatView 的托盘 padding）。 */
  max-width: 100%;
  /* padding 属版面（卡片带 no-padding，body 留白为 0）：8px 14px */
  padding: var(--nm-spacing-sm) var(--nm-spacing-14);
  /* 兜底圆角；角色规则再用非对称 shorthand 覆盖（特异性：本类 + 作用域属性
     > 库的 `.nm-card`，层叠顺序无关）。卡片 `radius=16` 写进
     `--nm-card-radius`，两处取值同源，将来开 squircle 时量测一致。 */
  border-radius: var(--nm-border-radius-md);
}

/* 色调：用户 = 主色染色；Agent = 抬升一档表面（覆盖卡片的 --nm-surface-color，
   与背后托盘 --nm-chat-tray-bg 拉开亮度，凸起才读得出来）。 */
.msg-item__bubble--user {
  /* 对齐仅对 flex 列容器（.chat-view__item--msg）生效，见 ChatView。 */
  align-self: flex-end;
  background-color: var(--nm-chat-user-bg);
  /* 非对称圆角暗示方向：居右压右下角 */
  border-radius: var(--nm-border-radius-md) var(--nm-border-radius-md) var(--nm-border-radius-xs)
    var(--nm-border-radius-md);
}

.msg-item__bubble--agent {
  align-self: flex-start;
  background-color: var(--nm-chat-agent-bg);
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
