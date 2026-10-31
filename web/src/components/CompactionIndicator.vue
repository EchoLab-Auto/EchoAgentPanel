<script setup lang="ts">
//! 顶栏压缩/归档进度指示器（2026-10）。
//!
//! ## 为什么需要它
//!
//! 压缩是**会话级**操作（2026-10 作用域普查修正：此前是全人格），Core 调 LLM
//! 生成摘要，实测要跑几分钟。此前
//! 唯一反馈是「上下文」面板里的进度块 —— 而那个面板是个覆盖层：用户点完
//! 「压缩」关掉面板回去聊天，就再也没有任何迹象显示"还在跑"。表现与
//! "点了没反应"、"是不是卡死了"完全一样。
//!
//! 本组件常驻顶栏（`header-mid` 那段此前的留空），跨视图可见：不管当前在
//! 聊天、设置还是 Shell，只要有人在压缩就看得见进度。
//!
//! ## 展示口径
//!
//! 判定住在 `compaction.ts`（与面板共用同一份），这里只做聚合：
//! - 1 个：`压缩 · alix 43%` + 细进度条；
//! - 多个：`压缩 ×2` + 第一个的阶段（`title` 里列全）；
//! - 0 个：整个组件不渲染（顶栏不留空壳）。
//!
//! 点击 → 打开「上下文」覆盖面板（再点一次关闭）：进度条的唯一详细视图在
//! 那里，指示器的职责是"让你知道有事在跑，并且一键能看到全貌"。

import { computed, onMounted, onUnmounted, ref } from 'vue';
import NeumorphismProgress from '@echolab-auto/ui-frame/components/NeumorphismProgress';
import { state } from '../store';
import { activeCompactions, compactionPhaseLabel } from '../compaction';
import { coreDisplay } from '../state';
import { entryOverlay, setEntryOverlay } from '../overlays';

/** 每秒重算一次：超时判定（`COMPACTION_STALE_MS`）需要"现在"，精确到秒足够。 */
const nowTick = ref(Date.now());
let timer: number | undefined;
onMounted(() => {
  timer = window.setInterval(() => (nowTick.value = Date.now()), 1_000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});

const active = computed(() => activeCompactions(state, nowTick.value));

/** 一个都没有 → 不渲染（顶栏不该常驻一个空壳）。 */
const visible = computed(() => active.value.length > 0);

/** 人格显示名：`state.teams` 里取 name，取不到退回 id（不显示空白）。 */
function teamLabel(teamId: string): string {
  if (!teamId) return '全局';
  const hit = state.teams.find((t) => t.id === teamId);
  return hit?.name || teamId;
}

/** 徽标文案：单个给「阶段 + 人格」，多个给「×N」。 */
const label = computed(() => {
  const list = active.value;
  if (list.length === 0) return '';
  if (list.length > 1) return `${compactionPhaseLabel(list[0].view.run.phase)} ×${list.length}`;
  const one = list[0];
  return `${compactionPhaseLabel(one.view.run.phase)} · ${teamLabel(one.teamId)}`;
});

/** 百分比：单个时显示真实值；多个时退化成"进行中"（聚合百分比是假数据）。 */
const pctText = computed(() => {
  const list = active.value;
  if (list.length !== 1) return '';
  const one = list[0];
  // 长度不确定的阶段（`total === 0`）不写百分比 —— 写「0%」看起来像没动。
  if (one.view.run.total === 0) return '';
  return `${one.view.pct}%`;
});

/** 进度条数值（多个时画不确定条：聚合没有单一百分比）。 */
const progressValue = computed(() => {
  const list = active.value;
  if (list.length !== 1) return 0;
  return list[0].view.pct;
});
const indeterminate = computed(() => {
  const list = active.value;
  if (list.length !== 1) return true;
  return list[0].view.run.total === 0;
});

/**
 * 悬停全文：多任务时列出每一个（`人格 · 阶段 · 3/7 组 · 43%`），并标明
 * 各自所在的上游（多 Core 部署下同名人格可能同时在两台机器上跑）。
 */
const title = computed(() => {
  const list = active.value;
  if (list.length === 0) return '';
  const lines = list.map((item) => {
    const run = item.view.run;
    const core = coreDisplay(state, item.core);
    const count = run.total > 0 ? ` ${run.done}/${run.total} 组` : '';
    const pct = run.total > 0 ? ` ${item.view.pct}%` : '';
    return `${teamLabel(item.teamId)} @ ${core.name} · ${compactionPhaseLabel(run.phase)}${count}${pct}`;
  });
  return ['压缩/归档进行中（点击查看详细进度）', ...lines].join('\n');
});

/** 点击：切到（或关掉）「上下文」覆盖面板 —— 进度的详细视图在那里。 */
function onClick() {
  setEntryOverlay(entryOverlay.value === 'context' ? null : 'context');
}
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="compaction-chip"
    :title="title"
    :aria-label="`压缩进行中：${label}${pctText ? ' ' + pctText : ''}（点击查看详细进度）`"
    @click="onClick"
  >
    <span class="compaction-chip__label">{{ label }}</span>
    <span v-if="pctText" class="compaction-chip__pct">{{ pctText }}</span>
    <NeumorphismProgress
      class="compaction-chip__bar"
      :model-value="progressValue"
      :indeterminate="indeterminate"
      variant="primary"
      size="small"
    />
  </button>
</template>

<style scoped>
/* 顶栏里的小胶囊：与「聊天 / 设置」同高，不抢视觉但一眼能看见进度在动。
   宽度上限 200px —— 人格名再长也不该把顶栏导航挤走。 */
.compaction-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  padding: 3px 9px;
  border: 1px solid var(--nm-border-color);
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-surface-raised) 70%, transparent);
  color: var(--nm-text-primary);
  font-size: 12px;
  cursor: pointer;
  /* 移动端顶栏寸土寸金：375px 上导航按钮 + 主题 + 全屏已经接近溢出， */
  /* 进度胶囊在窄屏只留进度条本身（文字由 title/aria 提供）。 */
  transition: background 120ms ease;
}
.compaction-chip:hover {
  background: color-mix(in srgb, var(--nm-surface-raised) 95%, transparent);
}
.compaction-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compaction-chip__pct {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  flex: none;
}
/* 进度条固定 44px：它在胶囊里是"还在动"的动感提示，不是精确读数——
   百分比由 `__pct` 负责，条形图给太宽会把文字挤没。 */
.compaction-chip__bar {
  width: 44px;
  flex: none;
}

@media (max-width: 767px) {
  /* 窄屏：只留进度条（文字省略号反而更难看），并缩小内边距。 */
  .compaction-chip__label,
  .compaction-chip__pct {
    display: none;
  }
  .compaction-chip {
    max-width: none;
    padding: 3px 6px;
  }
  .compaction-chip__bar {
    width: 40px;
  }
}
</style>
