<script setup lang="ts">
//! 会话标签条（2026-11）：会话消息区顶部的一条标签。
//!
//! 只负责**呈现与交互**——切换目标由父组件（ChatView → App）执行，因为真正
//! 的切换必须同时钉住 `(core, team)` 并走 App 的唯一写入口（见
//! `chat-tabs.ts` 模块注释：身份是三元组，不是 session id）。
//!
//! 交互约定（与会话切换器、入口行一致）：
//! - 点击 → 切到该标签；
//! - `×` → 关闭（关当前标签时切到右邻/左邻，父组件负责执行）；
//! - 中键 → 同 `×`（浏览器标签页的肌肉记忆）；
//! - `+` → 打开「会话」覆盖面板挑一个（父组件已有的入口，不新增一套选择器）。

import { computed, nextTick, ref, watch } from 'vue';
import PanelIcon from './PanelIcon.vue';
import { state } from '../store';
import {
  activeChatTabId,
  chatTabCore,
  chatTabHint,
  chatTabLabel,
  chatTabTeam,
  chatTabs,
  closeChatTab,
  type ChatTab,
} from '../chat-tabs';

const emit = defineEmits<{
  /** 切到该标签（父组件负责 core/team/session 三步切换）。 */
  select: [tab: ChatTab];
  /** 打开「会话」覆盖面板（挑选新会话加入标签组）。 */
  create: [];
}>();

const stripRef = ref<HTMLElement | null>(null);

/** 当前激活的是哪个标签（用于滚到可见 + 高亮）。 */
const activeId = computed(() => activeChatTabId.value);

/**
 * 标签是否"活着"：该会话在 `state.sessions` 里还能找到。
 *
 * 找不到时标签保留（Core 可能只是暂时没推会话列表 / 断线），但标成离线态
 * ——直接删掉会让用户"刚关完标签页，重连后它又回来了"更困惑。
 */
function known(tab: ChatTab): boolean {
  return state.sessions.some(
    (item) =>
      item.id === tab.sessionId &&
      (item.team_id ?? null) === (tab.teamId ?? null) &&
      (tab.core == null || (item.core ?? null) === tab.core),
  );
}

function onSelect(tab: ChatTab): void {
  if (tab.id === activeId.value) return;
  emit('select', tab);
}

function onClose(event: MouseEvent, tab: ChatTab): void {
  event.stopPropagation();
  const next = closeChatTab(tab.id);
  // 关掉的不是当前标签 → 不需要切换；关掉后组空 → 保持当前会话不动。
  if (next) emit('select', next);
}

function onMiddle(event: MouseEvent, tab: ChatTab): void {
  if (event.button !== 1) return;
  event.preventDefault();
  onClose(event, tab);
}

/** 激活标签变化 → 滚到可见（长标签组里"切过去却看不见"最让人困惑）。 */
watch(
  activeId,
  async () => {
    await nextTick();
    const strip = stripRef.value;
    const el = strip?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },
  { immediate: true },
);
</script>

<template>
  <nav v-if="chatTabs.length" ref="stripRef" class="chat-tabs" aria-label="会话标签">
    <button
      v-for="tab in chatTabs"
      :key="tab.id"
      type="button"
      class="chat-tabs__tab"
      :class="{
        'chat-tabs__tab--active': tab.id === activeId,
        'chat-tabs__tab--stale': !known(tab),
      }"
      :data-active="tab.id === activeId ? 'true' : 'false'"
      :title="`${chatTabLabel(tab)}（${chatTabHint(tab)}）`"
      @click="onSelect(tab)"
      @auxclick="onMiddle($event, tab)"
    >
      <span class="chat-tabs__label">{{ chatTabLabel(tab) }}</span>
      <span class="chat-tabs__hint" :title="chatTabHint(tab)">
        {{ chatTabTeam(tab) }}<span
          v-if="chatTabCore(tab)"
          class="chat-tabs__core"
        > · {{ chatTabCore(tab) }}</span>
      </span>
      <span
        class="chat-tabs__close"
        role="button"
        tabindex="-1"
        aria-label="关闭标签"
        @click="onClose($event, tab)"
      >
        <PanelIcon name="close" size="xs" />
      </span>
    </button>
    <button
      type="button"
      class="chat-tabs__create"
      title="打开会话列表，把另一个会话加成标签"
      aria-label="新增会话标签"
      @click="emit('create')"
    >
      <PanelIcon name="plus" size="sm" />
    </button>
  </nav>
</template>

<style scoped>
/* 标签条高度固定：它上面的消息区用 flex:1，高度变化会让滚动位置跳。 */
.chat-tabs {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: stretch;
  gap: 4px;
  min-height: 34px;
  padding: 4px 6px 0;
  overflow-x: auto;
  overflow-y: hidden;
  flex: none;
  scrollbar-width: none;
}
.chat-tabs::-webkit-scrollbar {
  display: none;
}

.chat-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  max-width: 220px;
  padding: 4px 6px 4px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: color-mix(in srgb, var(--nm-surface-raised) 30%, transparent);
  color: var(--nm-text-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: background 0.12s ease-out, color 0.12s ease-out;
}
.chat-tabs__tab:hover {
  background: color-mix(in srgb, var(--nm-surface-raised) 52%, transparent);
  color: var(--nm-text-primary);
}
.chat-tabs__tab--active {
  border-color: var(--panel-glass-border);
  background: color-mix(in srgb, var(--nm-surface-raised) 68%, transparent);
  color: var(--nm-text-primary);
  font-weight: 600;
}
/* 会话在列表里找不到（Core 没推 / 已删除）：降对比度但不隐藏。 */
.chat-tabs__tab--stale .chat-tabs__label {
  color: var(--nm-text-disabled);
}

.chat-tabs__label {
  overflow: hidden;
  max-width: 132px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-tabs__hint {
  overflow: hidden;
  max-width: 96px;
  color: var(--nm-text-secondary);
  font-size: 11px;
  font-weight: 400;
  opacity: 0.75;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 窄屏：会话名 + 人格名，**隐藏节点名**——两个人格常共用同一个会话 id，
   全隐藏就变成一排「本地会话」互相认不出；节点名在没有多上游时是噪声。 */
@media (max-width: 767px) {
  .chat-tabs__core {
    display: none;
  }
  .chat-tabs__hint {
    max-width: 60px;
  }
  .chat-tabs__tab {
    max-width: 168px;
  }
}

.chat-tabs__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 6px;
  opacity: 0.55;
}
.chat-tabs__close:hover {
  background: var(--panel-hover);
  opacity: 1;
}

.chat-tabs__create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  flex: none;
  margin-bottom: 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--nm-text-secondary);
  cursor: pointer;
}
.chat-tabs__create:hover {
  background: var(--panel-hover);
  color: var(--panel-accent);
}

/* ── 触控目标（2026-11 移动端体检）────────────────────────────────────────
   实测（375×667，is_mobile + has_touch）：关闭标签 18×18、新建标签 28 宽
   —— 手机上要靠指尖精确命中，而误触标签本体 = 切会话（比"点不中"更糟）。

   只放大**命中区**：关闭按钮视觉 24（原 18）已经够点，再用 `::before` 撑到
   40×40；新建按钮直接放到 36 宽（图标居中，视觉不变）。不改标签条的 DOM
   顺序与横向滚动行为。

   ⚠️ 必须写在本文件**最后**：上面的基础规则（`.chat-tabs__close{width:18px}`
   等）与这里同特异性，靠源码顺序决定胜负——写在前面的移动段会被后面的
   基础规则覆盖（实测：规则在文件里、但按钮仍是 18px）。 */
@media (max-width: 767px) {
  .chat-tabs__close {
    position: relative;
    width: 24px;
    height: 24px;
  }
  .chat-tabs__close::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    transform: translate(-50%, -50%);
  }
  .chat-tabs__create {
    width: 36px;
  }

  /* 标签条高度（2026-11 观感）：库的 `pointer: coarse` 给所有 `:where(button)`
     挂 `min-height: 44px`，而标签与关闭键都是 button —— 于是整条从设计的
     34px 涨到 **57px**（tab 高 53），顶部白吃 23px 屏幕，标签看起来又厚又空。
     这里把两个按钮的 min-height 归零、改用显式高度：
       · tab 40（内含 24 的关闭键，上下各 8 的呼吸）→ 标签条 44
       · 新建键 40（图标 16 居中）
     命中高度仍是 40（iOS HIG 的 44 是理想值，横向 tab 条取 40 是通行做法：
     相邻 tab 共享边缘、误触代价只是切标签），关闭键另有 40×40 伪元素命中区。
     只降 min-height 不改视觉尺寸，图标/字号/圆角全不变。 */
  .chat-tabs__tab {
    min-height: 0;
    height: 40px;
  }
  .chat-tabs__create {
    min-height: 0;
    height: 40px;
  }
}
</style>
