<script setup lang="ts">
//! 子代理完成回报（`<subagent_event>` 合并钩子）：紧凑一行摘要，点击展开结论。
//!
//! 背景（2026-09-28）：该钩子是子代理完成后注入主对话的**新入站分支**，
//! 载荷为完整 JSON（task/result/…）。此前直接以 user 气泡渲染原始 JSON——
//! 一条动辄数千字符、占满半屏且不可读。现改为：
//! - 折叠态一行：状态点 + 「子代理完成/失败」+ 任务摘要（单行省略）+ 时间；
//! - 点击展开：完整结论（限高滚动），不再展示 JSON 外壳。

import { computed, ref } from 'vue';

export interface SubagentEventView {
  id: string;
  task: string;
  success: boolean;
  result: string;
  /** 运行中：显示呼吸点 + 「子代理运行中」，无展开体（结果未到）。 */
  running?: boolean;
}

const props = defineProps<{ event: SubagentEventView; time?: string }>();

const open = ref(false);

const running = computed(() => props.event.running === true);
const taskLine = computed(() => (props.event.task || '').replace(/\s+/g, ' ').trim());
const resultText = computed(() => props.event.result.trim() || '（无结果内容）');
</script>

<template>
  <div
    class="subagent-event"
    :class="{
      'subagent-event--failed': !event.success && !running,
      'subagent-event--running': running,
      'subagent-event--open': open,
    }"
  >
    <button
      type="button"
      class="subagent-event__head"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="subagent-event__dot" />
      <span class="subagent-event__label">
        {{ running ? '子代理运行中' : event.success ? '子代理完成' : '子代理失败' }}
      </span>
      <span v-if="taskLine" class="subagent-event__task" :title="taskLine">{{ taskLine }}</span>
      <span v-else class="subagent-event__task subagent-event__task--empty">（无任务描述）</span>
      <span v-if="time" class="subagent-event__time">{{ time }}</span>
      <svg
        v-if="!running"
        class="subagent-event__chevron"
        :class="{ 'subagent-event__chevron--open': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <pre v-show="open && !running" class="subagent-event__body">{{ resultText }}</pre>
  </div>
</template>

<style scoped>
.subagent-event {
  border-left: 2px solid color-mix(in srgb, #14b8a6 70%, transparent);
  border-radius: 3px 10px 10px 3px;
  background: color-mix(in srgb, #14b8a6 7%, transparent);
}
.subagent-event--failed {
  border-left-color: color-mix(in srgb, var(--panel-err) 70%, transparent);
  background: color-mix(in srgb, var(--panel-err) 6%, transparent);
}
.subagent-event__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 3px 10px;
  border: 0;
  background: none;
  color: #5eead4;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  user-select: none;
}
.subagent-event--failed .subagent-event__head {
  color: color-mix(in srgb, var(--panel-err) 75%, #fff 25%);
}
.subagent-event__head:focus-visible {
  outline: 2px solid color-mix(in srgb, #14b8a6 60%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}
.subagent-event__dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
/* 运行中：呼吸点 + 整行轻呼吸（与推理块/工具行的运行态语汇一致） */
.subagent-event--running {
  border-left-color: color-mix(in srgb, #14b8a6 55%, transparent);
}
.subagent-event--running .subagent-event__dot {
  animation: subagent-pulse 1.2s ease-in-out infinite;
}
@keyframes subagent-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}
.subagent-event__label {
  flex: 0 0 auto;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.subagent-event__task {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--nm-text-secondary);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}
.subagent-event__task--empty {
  opacity: 0.6;
}
.subagent-event__time {
  flex: 0 0 auto;
  color: var(--nm-text-secondary);
  font-weight: 400;
  opacity: 0.8;
}
.subagent-event__chevron {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  opacity: 0.75;
  transition: transform 0.15s ease;
}
.subagent-event__chevron--open {
  transform: rotate(180deg);
}
.subagent-event__body {
  margin: 0;
  padding: 2px 10px 7px;
  max-height: 260px;
  overflow: auto;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--nm-text-primary);
  opacity: 0.92;
}
</style>
