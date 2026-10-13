<script setup lang="ts">
//! 思考正文（2026-10 从 ReasoningBlock 拆出的正文层）：限高滚动窗口内
//! 展示推理文本，两种播放模式——
//! - `animate`（打字机）：逐字显示，体现"正在思考"；完成后 emit('done')；
//! - `streaming`（真流式）：内容随增量增长（不播打字机），全量跟随并钉底。
//! 折叠/展开、自动开合等外层交互由 WorkRunGroup 承担（本组件只做正文）。

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  text: string;
  /** 打字机（由调用方按准入规则判定：见 reasoning-anim.ts；历史回放为 false） */
  animate?: boolean;
  /** 真流式：内容随增量增长，播放期间自动钉底跟随最后一行 */
  streaming?: boolean;
}>();

/** 打字机播放完成（供外层对自动展开的详情做同口径自动收起）。 */
const emit = defineEmits<{ done: [] }>();

const shown = ref(0);
const isTyping = ref(false);
/** 滚动容器（推演中钉底跟随最后一行） */
const bodyRef = ref<HTMLElement | null>(null);
let timer: number | undefined;

/** 推演跟随：把滚动窗口钉到最底（最后一行可见） */
function pinToBottom() {
  const el = bodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

onMounted(() => {
  const len = props.text.length;
  // 真流式：全量跟随（内容自身在增长），播放期间钉底。
  if (props.streaming) {
    shown.value = len;
    nextTick(() => pinToBottom());
    return;
  }
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
      emit('done');
    }
  }, interval);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
});

// 真流式：文本随增量增长——shown 全量跟随 + 钉底（保持"看最新一行"）。
watch(
  () => props.text,
  () => {
    if (!props.streaming) return;
    shown.value = props.text.length;
    nextTick(() => pinToBottom());
  },
  { flush: 'post' },
);

// 流式起止：开始 → 全量显示并钉底（如挂载时尚未开始，随后被切换为流式）。
watch(
  () => props.streaming,
  (streaming) => {
    if (!streaming) return;
    shown.value = props.text.length;
    nextTick(() => pinToBottom());
  },
);

// 打字机每次推进后（DOM 更新完成）滚动跟随最后一行。
watch(
  shown,
  () => {
    if (isTyping.value) pinToBottom();
  },
  { flush: 'post' },
);
</script>

<template>
  <div ref="bodyRef" class="reasoning-text" :class="{ 'reasoning-text--typing': isTyping }">
    <span class="reasoning-text__content">{{ text.slice(0, shown) }}</span>
    <span v-if="streaming || shown < text.length" class="reasoning-text__caret" />
  </div>
</template>

<style scoped>
/* 正文：限高滚动窗口——推演中钉底跟随最后一行，不撑爆时间线。 */
.reasoning-text {
  max-height: 180px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  padding-right: 2px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--nm-text-secondary);
  font-size: 12.5px;
  line-height: 1.7;
}
.reasoning-text__content {
  opacity: 0.92;
}
.reasoning-text__caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  background: #a78bfa;
  animation: reasoning-caret 0.8s steps(1) infinite;
}
@keyframes reasoning-caret {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}
</style>
