<script setup lang="ts">
//! 连续工具调用条：折叠态为一排圆角矩形图标（按工具分派 SVG），横向排布、
//! 空间不足自动换行；点击某行图标，该行下方浮现具体调用内容卡片。
//! 运行过程中默认折叠；全部完成且均成功时自动折叠，存在失败时保持展开提示。

import { computed, ref, watch } from 'vue';
import ToolIcon from './ToolIcon.vue';

export interface ToolRunItem {
  /** 稳定 key（toolCallId 或消息 key） */
  key: string;
  name: string;
  input?: string;
  output?: string | null;
  status?: string;
  time?: string;
}

const props = defineProps<{ items: ToolRunItem[] }>();

const openKey = ref<string | null>(null);

/** 运行中：图标行转圈；默认折叠。 */
const hasRunning = computed(() => props.items.some((i) => i.status === 'running'));
/** 有失败：完成态下保持展开（首个失败项），便于直接看到错误。 */
const firstFailedKey = computed(
  () => props.items.find((i) => i.status === 'failed')?.key ?? null,
);

const openItem = computed(
  () => props.items.find((i) => i.key === openKey.value) ?? null,
);

watch(
  () => [hasRunning.value, firstFailedKey.value, props.items.length],
  () => {
    // 自动展开策略：运行中默认折叠；全部结束且有失败 → 自动展开失败项。
    if (hasRunning.value) {
      openKey.value = null;
    } else if (openKey.value === null && firstFailedKey.value !== null) {
      openKey.value = firstFailedKey.value;
    }
    // 打开的项被移除（如会话清空）时收起
    if (openKey.value !== null && !props.items.some((i) => i.key === openKey.value)) {
      openKey.value = null;
    }
  },
  { immediate: true },
);

function toggle(key: string) {
  openKey.value = openKey.value === key ? null : key;
}

const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
};
</script>

<template>
  <div class="tool-run-group" :class="{ 'tool-run-group--running': hasRunning }">
    <div class="tool-run-group__row">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="tool-run-group__icon"
        :class="{
          'tool-run-group__icon--open': openKey === item.key,
          'tool-run-group__icon--failed': item.status === 'failed',
        }"
        :title="`${item.name}${item.status ? ' · ' + (STATUS_LABEL[item.status] ?? item.status) : ''}`"
        :aria-label="item.name"
        @click="toggle(item.key)"
      >
        <ToolIcon :name="item.name" :spin="item.status === 'running'" />
        <span v-if="item.status === 'failed'" class="tool-run-group__dot tool-run-group__dot--failed" />
      </button>
    </div>

    <div v-if="openItem" class="tool-run-group__detail">
      <div class="tool-run-group__detail-head">
        <ToolIcon :name="openItem.name" class="tool-run-group__detail-icon" />
        <span class="tool-run-group__detail-name">{{ openItem.name }}</span>
        <span v-if="openItem.time" class="tool-run-group__detail-time">{{ openItem.time }}</span>
        <span
          v-if="openItem.status"
          class="tool-run-group__detail-status"
          :class="`tool-run-group__detail-status--${openItem.status}`"
        >
          {{ STATUS_LABEL[openItem.status] ?? openItem.status }}
        </span>
      </div>
      <pre v-if="openItem.input" class="tool-run-group__pre tool-run-group__pre--input">{{ openItem.input }}</pre>
      <pre v-if="openItem.output" class="tool-run-group__pre tool-run-group__pre--output">{{ openItem.output }}</pre>
    </div>
  </div>
</template>

<style scoped>
.tool-run-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0;
}

/* 折叠态：图标行，横向扩展、空间不足自动下移一行 */
.tool-run-group__row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-run-group__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #ffffff 14%, transparent);
  background: color-mix(in srgb, var(--nm-surface-raised) 40%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  color: var(--nm-text-secondary);
  cursor: pointer;
  padding: 0;
  box-shadow: 0 3px 8px var(--nm-shadow-dark, rgba(0, 0, 0, 0.25));
  transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.tool-run-group__icon:hover {
  color: var(--nm-text-primary);
  transform: translateY(-1px);
}
.tool-run-group__icon--open {
  color: var(--panel-accent);
  border-color: color-mix(in srgb, var(--panel-accent) 55%, transparent);
}
.tool-run-group__icon--failed {
  color: var(--panel-err);
}
.tool-run-group__icon svg {
  width: 15px;
  height: 15px;
}

/* 运行中：整行轻微呼吸 + 状态点转圈 */
.tool-run-group--running .tool-run-group__icon {
  animation: tool-run-pulse 1.6s ease-in-out infinite;
}
@keyframes tool-run-pulse {
  50% {
    box-shadow: 0 3px 12px color-mix(in srgb, var(--panel-accent) 24%, transparent);
  }
}

.tool-run-group__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--panel-accent) 30%, transparent);
  border-top-color: var(--panel-accent);
  animation: tool-run-spin 0.8s linear infinite;
  background: var(--nm-bg-color);
}
.tool-run-group__dot--failed {
  border: none;
  background: var(--panel-err);
  animation: none;
}
@keyframes tool-run-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 展开态：下方浮现的具体内容卡片 */
.tool-run-group__detail {
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, #ffffff 14%, transparent);
  background: color-mix(in srgb, var(--nm-surface-raised) 46%, transparent);
  backdrop-filter: blur(16px) saturate(1.5);
  -webkit-backdrop-filter: blur(16px) saturate(1.5);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  padding: 10px 12px;
  animation: tool-run-enter 0.18s ease-out both;
}
@keyframes tool-run-enter {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tool-run-group__detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.tool-run-group__detail-icon {
  width: 14px;
  height: 14px;
  color: var(--panel-accent);
  flex: 0 0 auto;
}
.tool-run-group__detail-name {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12.5px;
  color: var(--nm-text-primary);
}
.tool-run-group__detail-time {
  font-size: 11px;
  color: var(--nm-text-secondary);
}
.tool-run-group__detail-status {
  margin-left: auto;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-surface-color) 60%, transparent);
  color: var(--nm-text-secondary);
}
.tool-run-group__detail-status--running {
  color: var(--panel-accent);
}
.tool-run-group__detail-status--succeeded {
  color: var(--panel-ok);
}
.tool-run-group__detail-status--failed {
  color: var(--panel-err);
}

.tool-run-group__pre {
  margin: 6px 0 0;
  max-height: 220px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--nm-text-secondary);
}
.tool-run-group__pre--output {
  color: var(--nm-text-primary);
}
</style>
