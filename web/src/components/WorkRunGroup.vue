<script setup lang="ts">
//! 连续工作条目条（2026-10 一般化；前身 ToolRunGroup 仅处理工具调用）：
//! **工具调用与思考（推理）统一为一排小圆角矩形 chip**——同一套通用排布，
//! 横向扩展、空间不足自动换行；点击 chip 在其下方浮现具体内容卡片：
//! - 工具：名称 / 状态 / 耗时 + 入参出参（原 ToolRunGroup 行为不变）；
//! - 思考：正文由 `ReasoningText` 播放（打字机 / 真流式钉底 + 字数）。
//!
//! 自动开合策略（原两组件的语义在此合流，单一"打开项"）：
//! - 工具运行中不自动展开（行保持紧凑）；全部结束且有失败 → 自动展开首个失败项；
//! - 思考播放中（打字机进行 / 真流式未结束）自动展开，播完自动收起；
//! - 用户手动点击过的条目进入"手动优先"：其自动开合不再被覆盖（含失败项）。
//! 同一时刻至多一个详情卡（对比旧实现：工具卡与思考块可同时各自展开）。

import { computed, onUnmounted, ref, watch } from 'vue';
import ToolIcon from './ToolIcon.vue';
import ReasoningText from './ReasoningText.vue';

/** 工具调用条目（原 ToolRunItem，字段不变）。 */
export interface ToolWorkItem {
  kind: 'tool';
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

/** 思考（推理）条目。 */
export interface ReasoningWorkItem {
  kind: 'reasoning';
  key: string;
  text: string;
  /** 打字机准入（由调用方按 reasoning-anim.ts 判定；历史回放为 false） */
  animate?: boolean;
  /** 真流式：内容随增量增长（不播打字机） */
  streaming?: boolean;
  time?: string;
}

export type WorkRunItem = ToolWorkItem | ReasoningWorkItem;

const props = defineProps<{ items: WorkRunItem[] }>();

// ── 打开项状态：openKey = 当前详情卡；openBy 标注权威来源 ──────────────
const openKey = ref<string | null>(null);
/** 'user' = 用户手动选中（自动逻辑不覆盖）；'auto' = 自动开合。 */
const openBy = ref<'user' | 'auto' | null>(null);
/** 用户手动点击过的条目（手动优先，自动开合不再覆盖）。 */
const userToggled = ref(new Set<string>());
/** 已播完打字机的思考条目（重开详情不重播）。 */
const playedTyping = ref(new Set<string>());

const openItem = computed<WorkRunItem | null>(
  () => props.items.find((i) => i.key === openKey.value) ?? null,
);
const openToolItem = computed<ToolWorkItem | null>(() =>
  openItem.value?.kind === 'tool' ? openItem.value : null,
);
const openReasoningItem = computed<ReasoningWorkItem | null>(() =>
  openItem.value?.kind === 'reasoning' ? openItem.value : null,
);

// ── 工具：运行/失败信号（原 ToolRunGroup 逻辑）─────────────────────────
/** 运行中：图标行转圈；默认折叠。 */
const hasRunning = computed(() =>
  props.items.some((i) => i.kind === 'tool' && i.status === 'running'),
);
/** 有失败：完成态下保持展开（首个失败项），便于直接看到错误。 */
const firstFailedKey = computed(
  () => props.items.find((i) => i.kind === 'tool' && i.status === 'failed')?.key ?? null,
);

// ── 思考：播放中判定（打字机进行 / 真流式未结束）───────────────────────
function reasoningActive(item: ReasoningWorkItem): boolean {
  if (item.text.length === 0) return false;
  if (item.streaming === true) return true;
  return item.animate === true && !playedTyping.value.has(item.key);
}

/** 打字机播放完成 → 记账 + 重估（自动展开的详情同口径收起）。 */
function onReasoningDone(key: string) {
  playedTyping.value.add(key);
  reconcile();
}

// ── 打开项重估（自动开合的唯一决策点）────────────────────────────────
// 优先级：用户选中保持 > 播放中的思考 > 静止后的失败项 > 收起。
function reconcile() {
  if (openBy.value === 'user') {
    if (openKey.value !== null && props.items.some((i) => i.key === openKey.value)) return;
    // 用户选中的项被移除（如会话清空）→ 退回自动逻辑
    openKey.value = null;
    openBy.value = null;
  }
  const active = [...props.items]
    .reverse()
    .find(
      (i): i is ReasoningWorkItem =>
        i.kind === 'reasoning' && reasoningActive(i) && !userToggled.value.has(i.key),
    );
  if (active) {
    openKey.value = active.key;
    openBy.value = 'auto';
    return;
  }
  if (
    !hasRunning.value &&
    firstFailedKey.value !== null &&
    !userToggled.value.has(firstFailedKey.value)
  ) {
    openKey.value = firstFailedKey.value;
    openBy.value = 'auto';
    return;
  }
  openKey.value = null;
  openBy.value = null;
}

// 状态信号：条目增删 / 工具状态 / 思考流式起止——任一变化触发重估。
watch(
  () =>
    props.items
      .map((i) =>
        i.kind === 'tool'
          ? `t:${i.key}:${i.status ?? ''}`
          : `r:${i.key}:${i.streaming ? 1 : 0}:${i.animate ? 1 : 0}`,
      )
      .join('|'),
  () => reconcile(),
  { immediate: true },
);

function toggle(key: string) {
  userToggled.value.add(key);
  if (openKey.value === key) {
    openKey.value = null;
    openBy.value = null;
  } else {
    openKey.value = key;
    openBy.value = 'user';
  }
}

// ── 悬停 / 角标 / 详情文案 ──────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
};

/** 字数（完整）：如 "1.2k 字"。 */
function fmtCharCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k 字` : `${n} 字`;
}
/** 字数（角标紧凑）：如 "1.2k"。 */
function fmtCharCompact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

/** 思考详情状态：播放中提示 / 静止字数。 */
function reasoningStatusText(item: ReasoningWorkItem): string {
  if (item.streaming) return '实时输出…';
  if (reasoningActive(item)) return '正在推演…';
  return fmtCharCount(item.text.length);
}

// ── 耗时显示：毫秒级精度；运行中实时刷新（50ms 步进）──────────────────
/** 计时基准 now：仅当组内有运行中条目时开定时器，避免常驻开销。 */
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | null = null;
watch(
  hasRunning,
  (running) => {
    if (running && ticker == null) {
      ticker = setInterval(() => {
        now.value = Date.now();
      }, 50);
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
function elapsedOf(item: ToolWorkItem): number | null {
  if (typeof item.elapsedMs === 'number') return item.elapsedMs;
  if (item.status === 'running' && typeof item.startedAtMs === 'number') {
    return Math.max(0, now.value - item.startedAtMs);
  }
  return null;
}

/** 毫秒 → 完整时长文案（毫秒级精度）：
 *  <1s → `39ms`；<60s → `12.345s`（3 位小数 = 毫秒）；更长 → `2m 03.456s`。 */
function fmtDuration(ms: number): string {
  const value = Math.floor(ms);
  if (value < 1_000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(3)}s`;
  const minutes = Math.floor(value / 60_000);
  const seconds = (value - minutes * 60_000) / 1000;
  const secs = seconds < 10 ? `0${seconds.toFixed(3)}` : seconds.toFixed(3);
  return `${minutes}m ${secs}s`;
}

/** 图标角标：紧凑格式（保留毫秒级读数；长时段降位，避免超出图标宽度）。 */
function fmtCompact(ms: number): string {
  const value = Math.floor(ms);
  if (value < 1_000) return `${value}ms`;
  if (value < 10_000) return `${(value / 1000).toFixed(2)}s`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  const total = Math.floor(value / 1000);
  return `${Math.floor(total / 60)}m${String(total % 60).padStart(2, '0')}s`;
}

/** 详情头/悬停：运行中=「运行中 X」实时刷新；已完成=「耗时 X」。 */
function durationLabel(item: ToolWorkItem | null | undefined): string | null {
  if (!item) return null;
  const ms = elapsedOf(item);
  if (ms == null) return null;
  return item.status === 'running' ? `运行中 ${fmtDuration(ms)}` : `耗时 ${fmtDuration(ms)}`;
}

/** chip 角标：工具=运行中耗时 / 思考=播放中字数（仅活动期显示）。 */
function badgeOf(item: WorkRunItem): string | null {
  if (item.kind === 'tool') {
    if (item.status !== 'running') return null;
    const ms = elapsedOf(item);
    return ms == null ? null : fmtCompact(ms);
  }
  return reasoningActive(item) ? fmtCharCompact(item.text.length) : null;
}

/** chip 悬停提示。 */
function titleOf(item: WorkRunItem): string {
  if (item.kind === 'tool') {
    const parts = [item.label ?? item.name];
    if (item.status) parts.push(STATUS_LABEL[item.status] ?? item.status);
    const duration = durationLabel(item);
    if (duration) parts.push(duration);
    return parts.join(' · ');
  }
  return `思考 · ${reasoningStatusText(item)}`;
}

/** chip 无障碍标签。 */
function ariaOf(item: WorkRunItem): string {
  return item.kind === 'tool' ? (item.label ?? item.name) : '思考';
}
</script>

<template>
  <div class="work-run-group" :class="{ 'work-run-group--running': hasRunning }">
    <div class="work-run-group__row">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="work-run-group__chip"
        :class="[
          `work-run-group__chip--${item.kind}`,
          {
            'work-run-group__chip--open': openKey === item.key,
            'work-run-group__chip--failed': item.kind === 'tool' && item.status === 'failed',
            'work-run-group__chip--active': item.kind === 'reasoning' && reasoningActive(item),
          },
        ]"
        :title="titleOf(item)"
        :aria-label="ariaOf(item)"
        @click="toggle(item.key)"
      >
        <ToolIcon
          v-if="item.kind === 'tool'"
          :name="item.name"
          :loading="item.status === 'running'"
        />
        <!-- 思考：双闪星（与工具图标的 stroke 风格一致） -->
        <svg
          v-else
          class="work-run-group__think"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M10.5 5 12.1 9.9 17 11.5 12.1 13.1 10.5 18 8.9 13.1 4 11.5 8.9 9.9 Z" />
          <path d="M17.5 4 18.3 6.2 20.5 7 18.3 7.8 17.5 10 16.7 7.8 14.5 7 16.7 6.2 Z" />
        </svg>
        <span
          v-if="item.kind === 'tool' && item.status === 'failed'"
          class="work-run-group__dot work-run-group__dot--failed"
        />
        <span
          v-if="badgeOf(item)"
          class="work-run-group__badge"
          :class="{ 'work-run-group__badge--reasoning': item.kind === 'reasoning' }"
        >
          {{ badgeOf(item) }}
        </span>
      </button>
    </div>

    <div v-if="openItem" class="work-run-group__detail">
      <!-- 工具：名称 / 时间 / 耗时 / 状态 + 入参出参 -->
      <template v-if="openToolItem">
        <div class="work-run-group__detail-head">
          <ToolIcon :name="openToolItem.name" class="work-run-group__detail-icon" />
          <span class="work-run-group__detail-name">{{ openToolItem.label ?? openToolItem.name }}</span>
          <span v-if="openToolItem.time" class="work-run-group__detail-time">{{ openToolItem.time }}</span>
          <span v-if="durationLabel(openToolItem)" class="work-run-group__detail-duration">
            {{ durationLabel(openToolItem) }}
          </span>
          <span
            v-if="openToolItem.status"
            class="work-run-group__detail-status"
            :class="`work-run-group__detail-status--${openToolItem.status}`"
          >
            {{ STATUS_LABEL[openToolItem.status] ?? openToolItem.status }}
          </span>
        </div>
        <pre v-if="openToolItem.input" class="work-run-group__pre work-run-group__pre--input">{{ openToolItem.input }}</pre>
        <pre v-if="openToolItem.output" class="work-run-group__pre work-run-group__pre--output">{{ openToolItem.output }}</pre>
      </template>

      <!-- 思考：标题 / 时间 / 播放状态 + 正文（ReasoningText） -->
      <template v-else-if="openReasoningItem">
        <div class="work-run-group__detail-head">
          <svg
            class="work-run-group__detail-icon work-run-group__detail-icon--reasoning"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M10.5 5 12.1 9.9 17 11.5 12.1 13.1 10.5 18 8.9 13.1 4 11.5 8.9 9.9 Z" />
            <path d="M17.5 4 18.3 6.2 20.5 7 18.3 7.8 17.5 10 16.7 7.8 14.5 7 16.7 6.2 Z" />
          </svg>
          <span class="work-run-group__detail-name work-run-group__detail-name--reasoning">思考</span>
          <span v-if="openReasoningItem.time" class="work-run-group__detail-time">{{ openReasoningItem.time }}</span>
          <span
            class="work-run-group__detail-status work-run-group__detail-status--reasoning"
            :class="{ 'work-run-group__detail-status--live': reasoningActive(openReasoningItem) }"
          >
            {{ reasoningStatusText(openReasoningItem) }}
          </span>
        </div>
        <div class="work-run-group__body">
          <ReasoningText
            :text="openReasoningItem.text"
            :animate="openReasoningItem.animate === true && !playedTyping.has(openReasoningItem.key)"
            :streaming="openReasoningItem.streaming === true"
            @done="onReasoningDone(openReasoningItem.key)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.work-run-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  /* 外边距交给滚动容器 gap 统一控制（紧凑化：工作行 6px 紧排）。 */
  margin: 0;
}

/* 折叠态：chip 行，横向扩展、空间不足自动下移一行 */
.work-run-group__row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.work-run-group__chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--panel-glass-border);
  background: color-mix(in srgb, var(--nm-surface-raised) 40%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  color: var(--nm-text-secondary);
  cursor: pointer;
  padding: 0;
  box-shadow: 0 3px 8px var(--nm-shadow-dark, rgba(0, 0, 0, 0.25));
  transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.work-run-group__chip:hover {
  color: var(--nm-text-primary);
  transform: translateY(-1px);
}
.work-run-group__chip--open {
  color: var(--panel-accent);
  border-color: color-mix(in srgb, var(--panel-accent) 55%, transparent);
}
.work-run-group__chip--failed {
  color: var(--panel-err);
}
.work-run-group__chip svg {
  width: 15px;
  height: 15px;
}

/* 思考 chip：静态为柔和紫（与工具的灰系同族但可辨识），悬停/展开/播放转亮紫 */
.work-run-group__chip--reasoning {
  color: color-mix(in srgb, #a78bfa 78%, var(--nm-text-secondary));
}
.work-run-group__chip--reasoning:hover {
  color: #c4b5fd;
}
.work-run-group__chip--reasoning.work-run-group__chip--open {
  color: #a78bfa;
  border-color: color-mix(in srgb, #8b5cf6 55%, transparent);
}

/* 运行中的工具：整行轻微呼吸（原 ToolRunGroup 行为） */
.work-run-group--running .work-run-group__chip--tool {
  animation: work-run-pulse 1.6s ease-in-out infinite;
}
@keyframes work-run-pulse {
  50% {
    box-shadow: 0 3px 12px color-mix(in srgb, var(--panel-accent) 24%, transparent);
  }
}

/* 播放中的思考：紫色呼吸 + 图标闪烁（"正在思考"） */
.work-run-group__chip--reasoning.work-run-group__chip--active {
  animation: work-run-pulse-reasoning 1.6s ease-in-out infinite;
}
@keyframes work-run-pulse-reasoning {
  50% {
    box-shadow: 0 3px 12px color-mix(in srgb, #8b5cf6 32%, transparent);
  }
}
.work-run-group__chip--active .work-run-group__think {
  animation: work-think-pulse 1.2s ease-in-out infinite;
}
@keyframes work-think-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.work-run-group__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--panel-accent) 30%, transparent);
  border-top-color: var(--panel-accent);
  animation: work-run-spin 0.8s linear infinite;
  background: var(--nm-bg-color);
}
.work-run-group__dot--failed {
  border: none;
  background: var(--panel-err);
  animation: none;
}
@keyframes work-run-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 展开态：下方浮现的具体内容卡片 */
.work-run-group__detail {
  border-radius: 14px;
  border: 1px solid var(--panel-glass-border);
  background: color-mix(in srgb, var(--nm-surface-raised) 46%, transparent);
  backdrop-filter: blur(16px) saturate(1.5);
  -webkit-backdrop-filter: blur(16px) saturate(1.5);
  box-shadow: var(--panel-glass-shadow-md);
  padding: 8px 10px;
  animation: work-run-enter 0.18s ease-out both;
}
@keyframes work-run-enter {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.work-run-group__detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.work-run-group__detail-icon {
  width: 14px;
  height: 14px;
  color: var(--panel-accent);
  flex: 0 0 auto;
}
.work-run-group__detail-icon--reasoning {
  color: #a78bfa;
}
.work-run-group__detail-name {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12.5px;
  color: var(--nm-text-primary);
}
.work-run-group__detail-name--reasoning {
  font-family: inherit;
}
.work-run-group__detail-time {
  font-size: 11px;
  color: var(--nm-text-secondary);
}
.work-run-group__detail-status {
  margin-left: auto;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-surface-color) 60%, transparent);
  color: var(--nm-text-secondary);
}
.work-run-group__detail-status--running {
  color: var(--panel-accent);
}
.work-run-group__detail-status--succeeded {
  color: var(--panel-ok);
}
.work-run-group__detail-status--failed {
  color: var(--panel-err);
}
.work-run-group__detail-status--reasoning.work-run-group__detail-status--live {
  color: #a78bfa;
  background: color-mix(in srgb, #8b5cf6 14%, transparent);
}

.work-run-group__pre {
  margin: 6px 0 0;
  max-height: 220px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--nm-text-secondary);
}
.work-run-group__pre--output {
  color: var(--nm-text-primary);
}

/* 思考正文容器：与详情头留出间距（正文自身滚动窗口见 ReasoningText） */
.work-run-group__body {
  margin-top: 4px;
}

/* chip 角标：工具=运行中实时耗时 / 思考=播放中字数（50ms 刷新） */
.work-run-group__badge {
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
.work-run-group__badge--reasoning {
  color: #a78bfa;
  border-color: color-mix(in srgb, #8b5cf6 38%, transparent);
}

/* 详情头部时长：运行中实时刷新，完成后固定为总耗时 */
.work-run-group__detail-duration {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--panel-accent);
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel-accent) 14%, transparent);
}
</style>
