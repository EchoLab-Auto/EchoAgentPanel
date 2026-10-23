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

import { computed, ref, watch } from 'vue';
import ToolIcon from './ToolIcon.vue';
import ReasoningText from './ReasoningText.vue';
import ElapsedText from './ElapsedText.vue';

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

/** 子代理完成（`<subagent_event>` 合并钩子）条目。 */
export interface SubagentWorkItem {
  kind: 'subagent';
  key: string;
  /** 委派任务摘要（自含背景；悬停/详情头部展示） */
  task?: string;
  /** 子代理结论正文（运行中时结果未到） */
  result?: string;
  /** 完成是否成功（运行中时未定） */
  success?: boolean;
  /** 运行中：chip 呼吸 + 转圈点；详情提示「结果未到」 */
  running?: boolean;
  time?: string;
}

export type WorkRunItem = ToolWorkItem | ReasoningWorkItem | SubagentWorkItem;

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
const openSubagentItem = computed<SubagentWorkItem | null>(() =>
  openItem.value?.kind === 'subagent' ? openItem.value : null,
);

// ── 工具：运行/失败信号（原 ToolRunGroup 逻辑）─────────────────────────
/** 运行中：图标行转圈；默认折叠。 */
const hasRunning = computed(() =>
  props.items.some((i) => i.kind === 'tool' && i.status === 'running'),
);
/** 有失败：完成态下保持展开（首个失败项）——工具失败与子代理失败同策略。 */
const firstFailedKey = computed(
  () =>
    props.items.find(
      (i) =>
        (i.kind === 'tool' && i.status === 'failed') ||
        (i.kind === 'subagent' && i.running !== true && i.success === false),
    )?.key ?? null,
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

// 状态信号：条目增删 / 工具状态 / 思考流式起止 / 子代理运行态——任一变化触发重估。
watch(
  () =>
    props.items
      .map((i) => {
        if (i.kind === 'tool') return `t:${i.key}:${i.status ?? ''}`;
        if (i.kind === 'subagent') {
          return `s:${i.key}:${i.running ? 1 : 0}:${i.success === false ? 'f' : ''}`;
        }
        return `r:${i.key}:${i.streaming ? 1 : 0}:${i.animate ? 1 : 0}`;
      })
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
  // 回合已结束但前端没收到该次调用的结果事件（ToolResult 丢失）：
  // 不代表执行失败，只表示没回执——不读秒、不染红（2026-10）。
  unknown: '未收到回执',
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
// ── 耗时显示：读秒已迁到叶子组件 `ElapsedText`（2026-10 性能拆分）────────
//
// 此前这里是「组内 `now` ref + 50ms setInterval」，而 `elapsedOf/badgeOf/
// durationLabel/titleOf` 都在组内读它 —— **每次 tick 都把整行 chip 连同详情卡
// 一起重渲染**。工作行一多（一回合数十行、上百个 chip），20 Hz × 整行 diff
// 就是纯粹的定时器开销，也是「工作行多了就卡」的常驻来源（实测见
// `ElapsedText.vue` 头注）。现在定时器只活在叶子组件里，父组件 render 与
// tick 彻底解耦。

/**
 * chip 角标是否出现（工具运行中才显示耗时；思考的字数角标另有判据）。
 *
 * 与旧 `badgeOf(item)` 返回 null 的条件等价：running 但没有起点也没有终值
 * 耗时时不显示（否则会渲染出一个空角标）。
 */
function toolBadgeVisible(item: WorkRunItem): boolean {
  if (item.kind !== 'tool' || item.status !== 'running') return false;
  return typeof item.elapsedMs === 'number' || typeof item.startedAtMs === 'number';
}

/** 详情头耗时胶囊是否出现（同上：无从计算时整块不渲染）。 */
function durationVisible(item: ToolWorkItem | null): boolean {
  if (!item) return false;
  return typeof item.elapsedMs === 'number' || typeof item.startedAtMs === 'number';
}
// ── 子代理：文案与状态 ───────────────────────────────────────────────
/** 运行/成功/失败 状态文案。 */
function subagentLabel(item: SubagentWorkItem): string {
  if (item.running) return '子代理运行中';
  return item.success === false ? '子代理失败' : '子代理完成';
}
/** 详情头状态胶囊（与工具状态同款三态色）。 */
function subagentStatus(item: SubagentWorkItem): { label: string; cls: string } {
  if (item.running) return { label: '运行中', cls: 'running' };
  return item.success === false
    ? { label: '失败', cls: 'failed' }
    : { label: '成功', cls: 'succeeded' };
}
/** 任务摘要单行化（悬停/详情头部）。 */
function subagentTaskLine(item: SubagentWorkItem): string {
  return (item.task ?? '').replace(/\s+/g, ' ').trim();
}
/** 结论正文（空结果占位；运行中提示结果未到）。 */
function subagentResultText(item: SubagentWorkItem): string {
  if (item.running) return '（结果未到）';
  return item.result?.trim() || '（无结果内容）';
}

/** chip 失败态（工具失败 / 子代理失败，自动展开策略共用）。 */
function chipFailed(item: WorkRunItem): boolean {
  if (item.kind === 'tool') return item.status === 'failed';
  return item.kind === 'subagent' && item.running !== true && item.success === false;
}

/** chip 活动态（思考播放中 / 子代理运行中，呼吸提示）。 */
function chipActive(item: WorkRunItem): boolean {
  if (item.kind === 'reasoning') return reasoningActive(item);
  return item.kind === 'subagent' && item.running === true;
}

/** chip 悬停提示。 */
function titleOf(item: WorkRunItem): string {
  if (item.kind === 'tool') {
    const parts = [item.label ?? item.name];
    if (item.status) parts.push(STATUS_LABEL[item.status] ?? item.status);
    // 悬停文案只写**终值**耗时：运行中的读秒在 chip 角标与详情头（`ElapsedText`），
    // 若这里也读秒，title 属性会随 50ms tick 反复改写（父组件已不 tick）。
    if (typeof item.elapsedMs === 'number') parts.push(`耗时 ${item.elapsedMs}ms`);
    return parts.join(' · ');
  }
  if (item.kind === 'subagent') {
    const parts = [subagentLabel(item)];
    const task = subagentTaskLine(item);
    if (task) parts.push(task);
    if (item.time) parts.push(item.time);
    return parts.join(' · ');
  }
  return `思考 · ${reasoningStatusText(item)}`;
}

/** chip 无障碍标签。 */
function ariaOf(item: WorkRunItem): string {
  if (item.kind === 'tool') return item.label ?? item.name;
  if (item.kind === 'subagent') return subagentLabel(item);
  return '思考';
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
            'work-run-group__chip--failed': chipFailed(item),
            'work-run-group__chip--active': chipActive(item),
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
          v-else-if="item.kind === 'reasoning'"
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
        <!-- 子代理：分叉流程（一任务派出一子代理） -->
        <svg
          v-else
          class="work-run-group__agent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M8.5 6h5.5a4 4 0 0 1 4 4v5.5" />
        </svg>
        <span v-if="chipFailed(item)" class="work-run-group__dot work-run-group__dot--failed" />
        <span
          v-if="item.kind === 'subagent' && item.running"
          class="work-run-group__dot work-run-group__dot--live"
        />
        <!-- 工具角标：运行中耗时（读秒在叶子组件里，不再带着整行一起重渲染） -->
        <span v-if="toolBadgeVisible(item)" class="work-run-group__badge">
          <ElapsedText
            :started-at-ms="(item as ToolWorkItem).startedAtMs"
            :elapsed-ms="(item as ToolWorkItem).elapsedMs"
            :running="true"
            compact
          />
        </span>
        <!-- 思考角标：播放中的字数（内容一变本来就要重渲染，留在组内） -->
        <span
          v-else-if="item.kind === 'reasoning' && reasoningActive(item)"
          class="work-run-group__badge work-run-group__badge--reasoning"
        >
          {{ fmtCharCompact(item.text.length) }}
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
          <span v-if="durationVisible(openToolItem)" class="work-run-group__detail-duration">
            <ElapsedText
              :started-at-ms="openToolItem.startedAtMs"
              :elapsed-ms="openToolItem.elapsedMs"
              :running="openToolItem.status === 'running'"
            />
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

      <!-- 子代理：任务 / 时间 / 状态 + 结论正文 -->
      <template v-else-if="openSubagentItem">
        <div class="work-run-group__detail-head">
          <svg
            class="work-run-group__detail-icon work-run-group__detail-icon--subagent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="18" cy="18" r="2.5" />
            <path d="M8.5 6h5.5a4 4 0 0 1 4 4v5.5" />
          </svg>
          <span class="work-run-group__detail-name work-run-group__detail-name--agent">
            {{ subagentTaskLine(openSubagentItem) || subagentLabel(openSubagentItem) }}
          </span>
          <span v-if="openSubagentItem.time" class="work-run-group__detail-time">{{ openSubagentItem.time }}</span>
          <span
            class="work-run-group__detail-status"
            :class="`work-run-group__detail-status--${subagentStatus(openSubagentItem).cls}`"
          >
            {{ subagentStatus(openSubagentItem).label }}
          </span>
        </div>
        <pre class="work-run-group__pre work-run-group__pre--output">{{ subagentResultText(openSubagentItem) }}</pre>
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
  /* 材质（2026-10 性能修复）：**不再用 `backdrop-filter`**。
     chip 坐在消息托盘（`--nm-chat-tray-bg`，实色）上，模糊一块纯色背景在
     数学上等于原色——所以 blur(12px) 在这里是纯开销：它给每个 chip 建一个
     合成层，滚动/重绘时都要回读身后的内容。实测 1200 个 chip（=200 工作行）：
       带 backdrop-filter：滚动帧均值 23.1 ms、p95 39.9 ms、掉帧 15/89
       换成等价实色：      滚动帧均值 16.67 ms、p95 16.8 ms、掉帧 0/89
     （本机无头 Chrome，1600×1000；iOS 上这类图层还会在滚动中出现滞后——
     观感即"工作行错位"。）
     等价合成色 = 托盘色 + 40% surface-raised，与原来的半透明叠加结果相同：
     像素对比 A/B 仅 0.47% 差异、chip 区域平均色 210.1 → 210.0。 */
  background: color-mix(in srgb, var(--nm-surface-raised) 40%, var(--nm-chat-tray-bg));
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
  color: color-mix(in srgb, var(--panel-reasoning) 85%, var(--nm-text-secondary));
}
.work-run-group__chip--reasoning:hover {
  color: var(--panel-reasoning);
}
.work-run-group__chip--reasoning.work-run-group__chip--open {
  color: var(--panel-reasoning);
  border-color: color-mix(in srgb, var(--panel-reasoning) 55%, transparent);
}

/* 子代理 chip：青色系（与既有"子代理完成"行同色），与工具/思考同规格 */
.work-run-group__chip--subagent {
  color: color-mix(in srgb, var(--panel-subagent) 85%, var(--nm-text-secondary));
}
.work-run-group__chip--subagent:hover {
  color: var(--panel-subagent);
}
.work-run-group__chip--subagent.work-run-group__chip--open {
  color: var(--panel-subagent);
  border-color: color-mix(in srgb, var(--panel-subagent) 55%, transparent);
}
.work-run-group__chip--subagent.work-run-group__chip--failed {
  color: var(--panel-err);
}

/* ── 呼吸动画：光晕走伪元素的 opacity，而不是关键帧里改 box-shadow ────────
   为什么（2026-10 性能）：`box-shadow` 参与关键帧 = 每帧重绘该元素；一个
   运行中的工作行里可能有几十个 chip 同时呼吸，20~60 fps 的重绘直接压在
   合成线程之外的主线程上。改成「静态光晕 + 只动 opacity」后动画可交给
   合成器，主线程零成本（视觉等价：光晕由 24%→32% 的强弱变化，仍可见）。 */
.work-run-group__chip::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
/* 运行中的工具：整行轻微呼吸（原 ToolRunGroup 行为） */
.work-run-group--running .work-run-group__chip--tool::after {
  box-shadow: 0 3px 12px color-mix(in srgb, var(--panel-accent) 24%, transparent);
  animation: work-run-pulse 1.6s ease-in-out infinite;
}
@keyframes work-run-pulse {
  50% {
    opacity: 1;
  }
}

/* 播放中的思考：紫色呼吸 + 图标闪烁（"正在思考"） */
.work-run-group__chip--reasoning.work-run-group__chip--active::after {
  box-shadow: 0 3px 12px color-mix(in srgb, var(--panel-reasoning) 32%, transparent);
  animation: work-run-pulse 1.6s ease-in-out infinite;
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

/* 运行中的子代理：青色呼吸 + 图标闪烁（与思考同语汇、换色区分） */
.work-run-group__chip--subagent.work-run-group__chip--active::after {
  box-shadow: 0 3px 12px color-mix(in srgb, var(--panel-subagent) 32%, transparent);
  animation: work-run-pulse 1.6s ease-in-out infinite;
}
.work-run-group__chip--active .work-run-group__agent {
  animation: work-think-pulse 1.2s ease-in-out infinite;
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
/* 子代理运行中的转圈点：青色（与 chip 同色系） */
.work-run-group__dot--live {
  border-color: color-mix(in srgb, var(--panel-subagent) 30%, transparent);
  border-top-color: var(--panel-subagent);
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
  /* 主题令牌（styles.css）：亮色档 #7c3aed / 暗色档 #a78bfa——两档对背景
     均 ≥4:1（WCAG 1.4.11 非文本图形 ≥3:1）。此前硬编码 #a78bfa 在亮色
     背景上仅 2.06:1，图标发虚难以辨识。 */
  color: var(--panel-reasoning);
}
.work-run-group__detail-icon--subagent {
  /* 同上：亮色档 #0f766e（4.15:1）/ 暗色档 #14b8a6（6.85:1）。 */
  color: var(--panel-subagent);
}
.work-run-group__detail-name {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12.5px;
  color: var(--nm-text-primary);
}
.work-run-group__detail-name--reasoning {
  font-family: inherit;
}
.work-run-group__detail-name--agent {
  font-family: inherit;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  color: var(--panel-reasoning);
  background: color-mix(in srgb, var(--panel-reasoning) 14%, transparent);
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
  color: var(--panel-reasoning);
  border-color: color-mix(in srgb, var(--panel-reasoning) 38%, transparent);
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
