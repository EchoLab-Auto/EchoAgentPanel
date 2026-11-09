<script setup lang="ts">
//! 消息行（user / agent / system）——面板自组（2026-09-30；2026-10-13 吸收气泡壳；
//! 2026-10-29 外壳改由 ui-frame `NeumorphismCard` 承担，材质零覆盖）。
//!
//! 背景：ui-frame 已移除 chat 组合组件（ChatMessageItem 等）——聊天组合属
//! 产品语义，由宿主自行组装。本组件把「壳」整个交给库的卡片组件
//! （`NeumorphismCard`，**材质零覆盖**：不动阴影档位、底色、圆角），面板侧
//! 只保留**版面**（宽度 / padding）与**对齐**（`align-self`）——
//! 角色区分靠左右对齐一重。正文由延迟加载的
//! `MarkdownLazy` 渲染（2026-10 首屏优化：doc 模块不再静态进入首屏关键路径）；
//! 工作条目行（工具调用 + 思考 + 子代理）由 ChatView 分派给 WorkRunGroup
//! （统一 chip 行）。
//!
//! 语义与迁移前一致：
//! - user 居右、agent 居左（两者同一套卡片材质；正文走 Markdown）、system
//!   居中平铺（细线夹文本，不套卡片）；
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
  /**
   * 该行指向的归档**是否还在**（2026-11）。
   *
   * `undefined` = 还不知道（清单未拉）——照常可点，失败由 Core 报原因；
   * `false` = 清单里没有它（归档每份 ~20MB，只保留最近 20 份，旧压缩的
   * 那几份会被轮转掉）。此时按钮标灰并说明，而不是让人点开再吃一个错误。
   */
  archiveAvailable?: boolean;
}>();

/**
 * 请求查看「压缩前的历史」（2026-11）。
 *
 * 只有 `system` 行、且该行带 `archive`（Core 在压缩时把归档名写进提示行）
 * 时才发出。事件冒泡到 ChatView——那里有 team/core 上下文可以发命令，
 * 本组件只负责"点哪儿"。
 */
const emit = defineEmits<{
  (event: 'open-archive', archive: string): void;
}>();

/** 该行指向的压缩前归档（无 → 不渲染入口）。 */
const archiveName = computed(() => props.message.archive ?? '');

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
      <!-- 压缩前历史入口（2026-11）：压缩把事件日志前缀换成摘要、原件写进
           archives/，那段内容在时间线里永久消失——这一行是唯一线索，
           所以入口就挂在它上面（而不是藏在设置里）。 -->
      <button
        v-if="archiveName"
        type="button"
        class="msg-item__archive-btn"
        :class="{ 'msg-item__archive-btn--gone': props.archiveAvailable === false }"
        :disabled="props.archiveAvailable === false"
        :title="
          props.archiveAvailable === false
            ? '该归档已被清理（archives 只保留最近 20 份）'
            : `查看压缩前的历史（归档 ${archiveName}）`
        "
        @click="emit('open-archive', archiveName)"
      >
        {{ props.archiveAvailable === false ? '归档已清理' : '查看压缩前的历史' }}
      </button>
    </div>
  </div>
  <!-- 外壳 = ui-frame NeumorphismCard，**材质全部走组件默认**（2026-10-29 用户
       要求「不要另外加阴影，用组件原生的」）：不传 elevation / radius，不覆盖
       背景与阴影——阴影 = 组件默认档（elevation 2：ambient + 8px/20px 暗侧 +
       4px/12px 亮侧），底色 = `--nm-surface-color`，圆角 = 默认 24px。
       面板只做**版面**两件事：`no-padding`（库 body 留白 24px 对气泡过大）+
       根节点 padding。`role` / `aria-label` 经 attrs 透传到卡片根节点，
       无障碍语义不变。 -->
  <!-- 消息行 = 「元信息行 + 气泡」两段（2026-11 版面修复）──────────────
       元信息（角色 / 来源 / 时间 / 复制）原本住在气泡**内部顶端**，于是：
       · 气泡上沿到正文 34px、下沿只剩 8px——每条都"上重下轻"，一屏看上去
         像气泡之间隔了一道空带；气泡越高，头部那 20px 越是白占正文空间；
       · 复制键的 44px 触控高度直接把头部行撑成 44（移动端），压掉的气泡
         内部空间比按钮本身大得多。
       移到气泡外层后，气泡只剩正文，内外边距回到对称；元信息成为消息行的
       第一段（与气泡同宽、同侧对齐），语义也更准：它描述的是**这条消息**，
       不是气泡这个容器。 -->
  <div
    v-else
    class="msg-item"
    :class="isUser ? 'msg-item--user' : 'msg-item--agent'"
  >
    <div class="msg-item__head">
      <span v-if="!isUser" class="msg-item__role">{{ t('chatRoleAgent') }}</span>
      <span v-if="sourceLabel" class="msg-item__source">{{ sourceLabel }}</span>
      <span v-if="timeLabel" class="msg-item__time">{{ timeLabel }}</span>
      <span class="msg-item__spacer" />
      <ChatCopyButton class="msg-item__copy" :text="message.content" />
    </div>
    <NeumorphismCard
      no-padding
      class="msg-item__bubble"
      :class="isUser ? 'msg-item__bubble--user' : 'msg-item__bubble--agent'"
      role="article"
      :aria-label="isUser ? t('chatRoleUser') : t('chatRoleAgent')"
    >
      <div class="msg-item__content">
      <!-- 流式中走纯文本（2026-10 P0）：Markdown 渲染器对每条 delta 全量
           重解析（O(deltas × 长度)），终值时一次成型（O(长度)）。 -->
        <span v-if="streamingPlain" class="msg-item__stream">{{ message.content }}</span>
        <MarkdownLazy v-else-if="!isUser" :content="message.content" />
        <template v-else>{{ message.content }}</template>
      </div>
    </NeumorphismCard>
  </div>
</template>

<style scoped>
/* ── 气泡壳 = ui-frame `NeumorphismCard` **原生材质**（2026-10-29）─────────
   本样式块**不出现任何材质声明**：没有 box-shadow、没有 background-color、
   没有 border-radius。阴影档位、底色（`--nm-surface-color`）、圆角（默认
   24px，四角等值）、`overflow: hidden` 裁剪全部由卡片组件自己决定——
   面板想调外观就该去改 ui-frame，而不是在宿主里叠一层。
   面板在此只负责**版面**：宽度、内边距、对齐。 */
/* ── 消息行：元信息行 + 气泡（2026-11）───────────────────────────────────
   为什么要有这层：见 template 上方的说明。这里只说版面契约——
   · 宽度由**内容**决定（flex item 非 stretch），上下限交给外层（ChatView
     的 `max-width: 88%` 挂在 `.msg-item` 上，占的是消息列宽的比例）；
   · `align-items: stretch` 让气泡铺满消息行宽度，于是元信息行与气泡同宽、
     左缘严格对齐；短消息时气泡会跟随元信息行（"Agent 12:34 + 复制"约
     120px）略宽一点——这正是微信 / Telegram 的做法，比让时间戳溢出气泡
     左侧好看得多。 */
.msg-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
}

/* 对齐仅对 flex 列容器（.chat-view__item--msg）生效，见 ChatView。
   角色区分只剩「左右对齐」这一重——色调与圆角都交回组件的统一材质。 */
.msg-item--user {
  align-self: flex-end;
}

.msg-item--agent {
  align-self: flex-start;
}

.msg-item__bubble {
  /* 宽度动态化（2026-09-30 语义保持）：解除库默认上限 min(78%, 640px)——
     短消息贴内容收紧，长消息/代码/表格随**消息列可用宽度**伸展（列宽本身
     随左右侧栏卡片显隐动态变化，见 ChatView 的托盘 padding）。 */
  max-width: 100%;
  /* padding 属版面（卡片带 no-padding，body 留白为 0）。
     上下对称（2026-11）：元信息行搬出去后，气泡里只剩正文，8px 与 14px 的
     不对称已经没有必要。 */
  padding: 10px var(--nm-spacing-14);
}

/* 类名仍然留在气泡上（外部样式与测试按它取元素），但布局职责已交给
   `.msg-item--user/--agent`：气泡在消息行里是 stretch 子项，不需要 align-self。 */
.msg-item__bubble--user,
.msg-item__bubble--agent {
  align-self: stretch;
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
  /* 与气泡的间距由 `.msg-item` 的 gap(2px) 给出（2026-11） */
  min-width: 0;
}
/* 元信息文本可省略，复制键不让位（2026-11）：head 的 max-content 参与消息行
   宽度计算，所以短气泡本来就跟 head 同宽；但超长来源（`实例 · 群 · 用户名`
   三段拼起来）在窄屏会顶到 `max-width: 88%` 上限，那时必须牺牲标签而不是
   按钮——复制键是这里唯一的操作。 */
.msg-item__role,
.msg-item__source,
.msg-item__time {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg-item__copy {
  flex: none;
}
.msg-item__spacer {
  flex: 1;
}
.msg-item__copy {
  opacity: 0;
  transition: opacity 0.2s ease;
}
@media (hover: hover) {
  /* 悬停目标变成整条消息行（2026-11）：复制键已不在气泡内部 */
  .msg-item:hover .msg-item__copy {
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

/* ── 移动端（<768px）：气泡正文字号降一档（2026-10-29 用户反馈「手机上字太大」）
   桌面正文 13px（`--nm-font-md`）。注意 agent 消息走 Markdown 渲染器，其
   `.neumorphism-markdown-content` **自带** 15px（`--nm-font-lg`），不继承外层
   `.msg-item__content` —— 只压外层的话手机上 agent 气泡仍是 15px，故必须
   `:deep` 单独压一档。移动端口径：纯文本 12px、Markdown 13px，与桌面同档差。 */
@media (max-width: 767.98px) {
  .msg-item__content {
    font-size: var(--nm-font-sm);
  }
  .msg-item__content :deep(.neumorphism-markdown-content) {
    font-size: var(--nm-font-md);
  }
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

/* 「查看压缩前的历史」：系统提示行里的次级动作。
   小、可点、不与正文抢视觉（正文是灰细字），但必须在触屏上点得到——
   min-height 交给粗指针规则兜（`.msg-item__archive-btn` 是原生 button，
   ui-frame 的 coarse 规则已覆盖 min-height: 44px）。 */
.msg-item__archive-btn {
  flex: none;
  padding: 1px 8px;
  border: 1px solid var(--nm-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--nm-text-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.msg-item__archive-btn:hover {
  color: var(--nm-text-primary);
  border-color: var(--nm-text-secondary);
}
/* 归档已被轮转清理：保留入口（让用户知道"这里曾经有历史"）但不可点。 */
.msg-item__archive-btn--gone {
  opacity: 0.55;
  cursor: default;
  text-decoration: line-through;
}
</style>
