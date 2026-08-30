<script setup lang="ts">
//! 推理块：主时间线中的"思考"可视化。
//! 实时到达（animate=true）时以打字机效果逐字显示，体现"正在思考"；
//! 历史回放（animate=false）一次性完整显示，不播动画。

import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  text: string;
  /** 是否播放打字机动画（实时消息 true；历史回放 false） */
  animate?: boolean;
}>();

const shown = ref(0);
const isTyping = ref(false);
let timer: number | undefined;

onMounted(() => {
  const len = props.text.length;
  if (!props.animate || len === 0) {
    shown.value = len;
    return;
  }
  // 打字节奏自适应：总时长约 6 秒封顶，短文本逐字、长文本成块。
  isTyping.value = true;
  const interval = 24;
  const step = Math.max(2, Math.ceil(len / Math.max(1, 6000 / interval)));
  timer = window.setInterval(() => {
    shown.value = Math.min(len, shown.value + step);
    if (shown.value >= len) {
      shown.value = len;
      isTyping.value = false;
      window.clearInterval(timer);
    }
  }, interval);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
});
</script>

<template>
  <div class="reasoning-block" :class="{ 'reasoning-block--typing': isTyping }">
    <div class="reasoning-block__head">
      <span class="reasoning-block__dot" />
      <span class="reasoning-block__label">思考</span>
      <span v-if="isTyping" class="reasoning-block__hint">正在推演…</span>
    </div>
    <div class="reasoning-block__body">
      <span class="reasoning-block__text">{{ text.slice(0, shown) }}</span>
      <span v-if="shown < text.length" class="reasoning-block__caret" />
    </div>
  </div>
</template>

<style scoped>
.reasoning-block {
  margin: 8px 0;
  padding: 10px 14px;
  border-left: 3px solid color-mix(in srgb, #8b5cf6 70%, transparent);
  border-radius: 4px 12px 12px 4px;
  background: color-mix(in srgb, #8b5cf6 8%, transparent);
  color: var(--nm-text-secondary);
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.reasoning-block__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.reasoning-block__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a78bfa;
}
.reasoning-block--typing .reasoning-block__dot {
  animation: reasoning-pulse 1.2s ease-in-out infinite;
}
.reasoning-block__hint {
  color: var(--nm-text-secondary);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}
.reasoning-block__text {
  opacity: 0.92;
}
.reasoning-block__caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  background: #a78bfa;
  animation: reasoning-caret 0.8s steps(1) infinite;
}
@keyframes reasoning-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes reasoning-caret {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
</style>
