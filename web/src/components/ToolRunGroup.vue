<script setup lang="ts">
//! 连续工具调用条：折叠态为一排圆角矩形图标（按工具分派 SVG），横向排布、
//! 空间不足自动换行；点击某行图标，该行下方浮现具体调用内容卡片。
//! 运行过程中默认折叠；全部完成且均成功时自动折叠，存在失败时保持展开提示。

import { computed, onUnmounted, ref, watch } from 'vue';
import ToolIcon from './ToolIcon.vue';

export interface ToolRunItem {
  /** 稳定 key（toolCallId 或消息 key） */
  key: string;
  name: string;
  input?: string;
  output?: string | null;
  status?: string;
  /**
   * 展示标签（缺省用 name）：`spawn_subagent` 传任务摘要，
   * 悬停提示与展开详情头部据此显示"这次派了什么活"。
   */
  label?: string;
  time?: string;
  /** 执行开始时间（epoch ms；core 提供，运行中实时计时用） */
  startedAtMs?: number;
  /** 执行总耗时（ms；core 上报，完成后展示为「耗时 X」） */
  elapsedMs?: number;
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

// ── 耗时显示：运行中实时刷新（100ms 步进），完成后为总耗时 ──────────────
/** 计时基准 now：仅当组内有运行中条目时开定时器，避免常驻开销。 */
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | null = null;
watch(
  hasRunning,
  (running) => {
    if (running && ticker == null) {
      ticker = setInterval(() => {
        now.value = Date.now();
      }, 100);
    } else if (!running && ticker != null) {
      clearInterval(ticker);
      ticker = null;
    }
  },
  { immediate: true },
);
onUnmounted(() => {
  if (ticker != null) clearInterval(ticker);
});

/** 已运行/总耗时（毫秒）：优先 core 上报的 elapsedMs；运行中按开始时间实时回算。 */
function elapsedOf(item: ToolRunItem): number | null {
  if (typeof item.elapsedMs === 'number') return item.elapsedMs;
  if (item.status === 'running' && typeof item.startedAtMs === 'number') {
    return Math.max(0, now.value - item.startedAtMs);
  }
  return null;
}

/** 毫秒 → 时长文案（<60s 保留一位小数；否则 Xm YYs）。 */
function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
}

/** 详情头/悬停：运行中=「运行中 X」实时刷新；已完成=「耗时 X」。 */
function durationLabel(item: ToolRunItem | null | undefined): string | null {
  if (!item) return null;
  const ms = elapsedOf(item);
  if (ms == null) return null;
  return item.status === 'running' ? `运行中 ${fmtDuration(ms)}` : `耗时 ${fmtDuration(ms)}`;
}

/** 图标角标：仅运行中显示，紧凑格式（<10s 一位小数）。 */
function badgeLabel(item: ToolRunItem): string | null {
  if (item.status !== 'running') return null;
  const ms = elapsedOf(item);
  if (ms == null) return null;
  return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : fmtDuration(ms);
}

/** 图标 title：名称 · 状态 · 时长。 */
function titleOf(item: ToolRunItem): string {
  const parts = [item.label ?? item.name];
  if (item.status) parts.push(STATUS_LABEL[item.status] ?? item.status);
  const duration = durationLabel(item);
  if (duration) parts.push(duration);
  return parts.join(' · ');
}
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
        :title="titleOf(item)"
        :aria-label="item.label ?? item.name"
        @click="toggle(item.key)"
      >
        <ToolIcon :name="item.name" :loading="item.status === 'running'" />
        <span v-if="item.status === 'failed'" class="tool-run-group__dot tool-run-group__dot--failed" />
        <span v-if="badgeLabel(item)" class="tool-run-group__timer">{{ badgeLabel(item) }}</span>
      </button>
    </div>

    <div v-if="openItem" class="tool-run-group__detail">
      <div class="tool-run-group__detail-head">
        <ToolIcon :name="openItem.name" class="tool-run-group__detail-icon" />
        <span class="tool-run-group__detail-name">{{ openItem.label ?? openItem.name }}</span>
        <span v-if="openItem.time" class="tool-run-group__detail-time">{{ openItem.time }}</span>
        <span v-if="durationLabel(openItem)" class="tool-run-group__detail-duration">{{ durationLabel(openItem) }}</span>
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
  gap: 5px;
  /* 外边距交给滚动容器 gap 统一控制（紧凑化：工作行 6px 紧排）。 */
  margin: 0;
}

/* 折叠态：图标行，横向扩展、空间不足自动下移一行 */
.tool-run-group__row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tool-run-group__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  border-radius: 8px;
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
  padding: 8px 10px;
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

/* 运行中角标：图标右下角的实时耗时（仅运行中显示，100ms 刷新） */
.tool-run-group__timer {
  position: absolute;
  right: 1px;
  bottom: 1px;
  padding: 0 3px;
  border-radius: 6px;
  font-size: 9px;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
  color: var(--panel-accent);
  background: color-mix(in srgb, var(--nm-bg-color) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-accent) 35%, transparent);
  pointer-events: none;
  white-space: nowrap;
}

/* 详情头部时长：运行中实时刷新，完成后固定为总耗时 */
.tool-run-group__detail-duration {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--panel-accent);
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel-accent) 14%, transparent);
}
</style>
