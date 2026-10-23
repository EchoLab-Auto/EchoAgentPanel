<script setup lang="ts">
//! 运行中耗时的**叶子**组件（2026-10 性能拆分）：把 50ms 读秒从
//! `WorkRunGroup` 里搬出来，让 tick 只重渲染一个文本节点。
//!
//! 背景（实测）：读秒此前是组内部的 `now` ref + `setInterval(50ms)`，而
//! `elapsedOf/badgeOf/durationLabel/titleOf` 都在组内被读取——于是**每次
//! tick 都会重渲染整个 chip 行**（一个回合里工作行可达数十条、chip 上百个，
//! 叠加 chip 的材质合成就是"工作行一多就卡"的定时器来源）。20 Hz × 整行
//! 的 vnode diff 完全是白烧：真正变化的只有一个小数字。
//!
//! 现在定时器只存在于本组件：只有 running 且 Core 未上报 `elapsedMs` 时开表，
//! 完成即停；父组件的 render 与 tick 完全解耦（父不再读 `now`）。

import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  /** 执行开始时间（epoch ms；running 时据此实时回算） */
  startedAtMs?: number;
  /** Core 上报的总耗时（ms）；一旦存在即静态，不再读秒 */
  elapsedMs?: number;
  /** 是否仍在运行（决定开表与文案） */
  running?: boolean;
  /** chip 角标：紧凑格式，省掉「运行中」前缀 */
  compact?: boolean;
}>();

/** 计时基准：仅在需要读秒时才有意义。 */
const now = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | null = null;

/** 需要读秒 = running + 无终值耗时 + 有起点。 */
const ticking = computed(
  () =>
    props.running === true &&
    typeof props.elapsedMs !== 'number' &&
    typeof props.startedAtMs === 'number',
);

watch(
  ticking,
  (on) => {
    if (on && ticker == null) {
      now.value = Date.now();
      ticker = setInterval(() => {
        now.value = Date.now();
      }, 50);
    } else if (!on && ticker != null) {
      clearInterval(ticker);
      ticker = null;
    }
  },
  { immediate: true },
);
onUnmounted(() => {
  if (ticker != null) clearInterval(ticker);
});

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

/** 角标：紧凑格式（保留毫秒级读数；长时段降位，避免超出图标宽度）。 */
function fmtCompact(ms: number): string {
  const value = Math.floor(ms);
  if (value < 1_000) return `${value}ms`;
  if (value < 10_000) return `${(value / 1000).toFixed(2)}s`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  const total = Math.floor(value / 1000);
  return `${Math.floor(total / 60)}m${String(total % 60).padStart(2, '0')}s`;
}

/** 当前应显示的毫秒数（终值优先，其次实时回算）。 */
const ms = computed<number | null>(() => {
  if (typeof props.elapsedMs === 'number') return props.elapsedMs;
  if (ticking.value) return Math.max(0, now.value - (props.startedAtMs as number));
  return null;
});

/** 文案：compact = 角标；否则「运行中 X」/「耗时 X」。 */
const label = computed<string | null>(() => {
  if (ms.value == null) return null;
  if (props.compact) return fmtCompact(ms.value);
  return props.running ? `运行中 ${fmtDuration(ms.value)}` : `耗时 ${fmtDuration(ms.value)}`;
});
</script>

<template>
  <span v-if="label">{{ label }}</span>
</template>
