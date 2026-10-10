<script setup lang="ts">
//! 推理块：主时间线中的"思考"可视化。
//! `animate=true` 时以打字机效果逐字显示，体现"正在思考"；
//! `animate=false`（历史回放 / 已完成的重新显示）一次性完整显示，不播动画。
//! 注：`animate` 的判定在调用方（ChatView 的推理准入：实时到达 + 新鲜 +
//! 会话仍在输出 + 仅播一次，见 reasoning-anim.ts）——组件本身不做状态判断。
//!
//! 折叠语义（2026-09）：
//! - 默认折叠：静止态（历史回放 / 推演结束）折叠为一行头部；
//! - 推演中自动展开：打字机进行时自动展开并**滚动跟随最后一行**
//!   （思考框内有限高滚动窗口，不撑爆时间线）；
//! - 手动优先：用户点击头部折叠/展开后，不再被自动展开/收起覆盖。

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  text: string;
  /** 是否播放打字机动画（由调用方按准入规则判定：见 reasoning-anim.ts） */
  animate?: boolean;
  /** 真流式（2026-10）：内容随增量增长（不播打字机）——流式期间自动展开并
   *  钉底跟随；流结束（streaming → false）回到与打字完成一致的默认折叠态。 */
  streaming?: boolean;
}>();

const shown = ref(0);
const isTyping = ref(false);
/** 折叠态（true = 收起，仅头部）——默认折叠 */
const collapsed = ref(true);
/** 用户是否手动切换过（手动后自动开合不再覆盖用户选择） */
const userToggled = ref(false);
/** 思考框体滚动容器（推演中钉底跟随最后一行） */
const bodyRef = ref<HTMLElement | null>(null);
let timer: number | undefined;

/** 折叠态字数提示（如 "1.2k 字"） */
const charCount = () => {
  const n = props.text.length;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k 字` : `${n} 字`;
};

function toggle() {
  userToggled.value = true;
  collapsed.value = !collapsed.value;
}

/** 推演跟随：把滚动窗口钉到最底（最后一行可见） */
function pinToBottom() {
  const el = bodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

onMounted(() => {
  const len = props.text.length;
  // 真流式：全量跟随（内容自身在增长），流式期间自动展开。
  if (props.streaming) {
    shown.value = len;
    if (!userToggled.value) collapsed.value = false;
    return;
  }
  if (!props.animate || len === 0) {
    shown.value = len;
    return;
  }
  // 打字节奏自适应：总时长约 6 秒封顶，短文本逐字、长文本成块。
  isTyping.value = true;
  // 推演中自动展开（用户手动操作过则尊重用户选择）。
  if (!userToggled.value) collapsed.value = false;
  const interval = 24;
  const step = Math.max(2, Math.ceil(len / Math.max(1, 6000 / interval)));
  timer = window.setInterval(() => {
    shown.value = Math.min(len, shown.value + step);
    if (shown.value >= len) {
      shown.value = len;
      isTyping.value = false;
      window.clearInterval(timer);
      // 推演结束回到默认折叠态（用户手动操作过则保持其选择）。
      if (!userToggled.value) collapsed.value = true;
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

// 真流式起止：开始 → 展开钉底；结束 → 与打字完成同口径回到默认折叠态
//（用户手动操作过则尊重其选择）。
watch(
  () => props.streaming,
  (streaming) => {
    if (streaming) {
      shown.value = props.text.length;
      if (!userToggled.value) collapsed.value = false;
      nextTick(() => pinToBottom());
    } else if (!userToggled.value) {
      collapsed.value = true;
    }
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

// 展开时复位滚动位置：推演中钉底（看最新一行）；推演结束后回到顶部（从头阅读）。
watch(
  collapsed,
  (isCollapsed) => {
    if (isCollapsed) return;
    nextTick(() => {
      if (isTyping.value) {
        pinToBottom();
      } else {
        const el = bodyRef.value;
        if (el) el.scrollTop = 0;
      }
    });
  },
  { flush: 'post' },
);
</script>

<template>
  <div class="reasoning-block" :class="{ 'reasoning-block--typing': isTyping, 'reasoning-block--collapsed': collapsed }">
    <button
      type="button"
      class="reasoning-block__head"
      :aria-expanded="!collapsed"
      :title="collapsed ? '展开思考过程' : '折叠思考过程'"
      @click="toggle"
    >
      <span class="reasoning-block__dot" />
      <span class="reasoning-block__label">思考</span>
      <span v-if="isTyping || streaming" class="reasoning-block__hint">
        {{ isTyping ? '正在推演…' : '实时输出…' }}
      </span>
      <span v-else-if="collapsed" class="reasoning-block__meta">{{ charCount() }}</span>
      <svg
        class="reasoning-block__chevron"
        :class="{ 'reasoning-block__chevron--open': !collapsed }"
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
    <div v-show="!collapsed" ref="bodyRef" class="reasoning-block__body">
      <span class="reasoning-block__text">{{ text.slice(0, shown) }}</span>
      <span v-if="streaming || shown < text.length" class="reasoning-block__caret" />
    </div>
  </div>
</template>

<style scoped>
.reasoning-block {
  /* 外边距交给滚动容器 gap（紧凑化：工作行 6px 紧排，不再叠加 8px）。 */
  margin: 0;
  padding: 8px 12px;
  border-left: 2px solid color-mix(in srgb, #8b5cf6 70%, transparent);
  border-radius: 3px 10px 10px 3px;
  background: color-mix(in srgb, #8b5cf6 8%, transparent);
  color: var(--nm-text-secondary);
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
/* 折叠态：头部一行，紧凑内边距（行高与工具行图标对齐） */
.reasoning-block--collapsed {
  padding-top: 2px;
  padding-bottom: 2px;
  padding-left: 10px;
  padding-right: 10px;
}
.reasoning-block__head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: #a78bfa;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  cursor: pointer;
  user-select: none;
}
.reasoning-block__head:focus-visible {
  outline: 2px solid color-mix(in srgb, #8b5cf6 60%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}
.reasoning-block__dot {
  flex: 0 0 auto;
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
.reasoning-block__meta {
  color: var(--nm-text-secondary);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.8;
}
.reasoning-block__chevron {
  width: 12px;
  height: 12px;
  margin-left: auto;
  flex: 0 0 auto;
  opacity: 0.75;
  transition: transform 0.15s ease;
}
.reasoning-block__chevron--open {
  transform: rotate(180deg);
}
/* 思考框体：限高滚动窗口——推演中钉底跟随最后一行，不撑爆时间线 */
.reasoning-block__body {
  margin-top: 4px;
  max-height: 180px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  padding-right: 2px;
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
