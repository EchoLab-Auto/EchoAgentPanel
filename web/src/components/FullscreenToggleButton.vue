<script setup lang="ts">
//! 全屏切换按钮（XR 巨幕模式 + 移动端 immersive 浏览）。
//!
//! - 调 Fullscreen API 切换 documentElement 全屏；`fullscreenchange` 同步状态，
//!   Esc / 系统退出全屏后按钮文案自动还原；
//! - 失败（不被支持 / 非用户手势 / iframe 限制）时 toast 告知，不静默失败。
//!
//! **移动端（2026-10 用户要求）**：不再全局隐藏。此前 `<768px` 被 CSS 隐藏的理由是
//! 「iOS Safari 不支持元素全屏」——但直接把入口拿掉是把 iOS 的限制当成所有移动端的
//! 限制：Android Chrome / 微信 / 各家 WebView 都支持 `requestFullscreen`，且手机上有
//! 真实价值（隐藏地址栏、给会话区多出 ~50px）。改为：**按钮照常显示，能力不可用时
//! 点按给出明确说明**（见 `unsupported` 分支），iOS 上不假装能全屏。
//!
//! `compact`：窄屏顶栏只有 375px 宽，三个文本按钮必然挤掉标题，因此窄屏只留图标
//! （44×44 触控区在 styles.css 的 `pointer: coarse` 段），文案转 `aria-label`/`title`。

import { computed, onMounted, onUnmounted, ref } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { state } from '../store';
import { pushToast } from '../state';

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const isFullscreen = ref(false);

function sync() {
  isFullscreen.value = !!document.fullscreenElement;
}

/**
 * 浏览器是否真的提供元素级全屏。iOS Safari 上 `requestFullscreen` 不存在
 * （iPhone 只允许 `<video>` 全屏），提前判定才能给「为什么点不动」的解释，
 * 而不是让它走进 catch 里报一句通用的"不支持"。
 */
const fullscreenAvailable = computed(
  () => typeof document !== 'undefined'
    && typeof document.documentElement.requestFullscreen === 'function',
);

const label = computed(() => (isFullscreen.value ? '退出全屏' : '全屏'));

/** 悬停提示：说清"能做什么 / 为什么不能"。 */
const hint = computed(() => {
  if (!fullscreenAvailable.value) return '当前浏览器不支持网页全屏（iOS Safari 限制；可「添加到主屏幕」后全屏运行）';
  return isFullscreen.value ? '退出全屏（Esc）' : '进入全屏';
});

/** 图标态的可见文案（`aria-label`）：只放状态，不重复 hint，否则读屏会念两遍。 */
const ariaLabel = computed(() => {
  if (!fullscreenAvailable.value) return '全屏（当前浏览器不支持）';
  return isFullscreen.value ? '退出全屏' : '全屏';
});

async function toggle() {
  if (!fullscreenAvailable.value) {
    pushToast(state, '当前浏览器不支持网页全屏；iOS 可「添加到主屏幕」后全屏运行', 'error');
    return;
  }
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (err) {
    pushToast(state, '当前浏览器不支持全屏模式', 'error');
    console.warn('[panel] fullscreen toggle failed:', err);
  } finally {
    sync();
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', sync);
  sync();
});
onUnmounted(() => document.removeEventListener('fullscreenchange', sync));
</script>

<template>
  <!-- fullscreen-toggle 类：类必须落在根按钮上，样式规则才匹配得到
       （2026-10 修复：此前该类缺失，全屏按钮在手机上溢出屏外）。 -->
  <NeumorphismButton
    size="small"
    variant="glass"
    class="fullscreen-toggle"
    :class="{ 'fullscreen-toggle--compact': props.compact }"
    :pressed="isFullscreen"
    :aria-label="props.compact ? ariaLabel : undefined"
    :title="hint"
    @click="toggle"
  >
    <svg
      v-if="props.compact"
      class="fullscreen-toggle__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="isFullscreen">
        <path d="M3 8h3a2 2 0 0 0 2-2V3" />
        <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
        <path d="M3 16h3a2 2 0 0 1 2 2v3" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      </template>
      <template v-else>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      </template>
    </svg>
    <span v-else>{{ label }}</span>
  </NeumorphismButton>
</template>

<style scoped>
.fullscreen-toggle__icon {
  width: 16px;
  height: 16px;
  display: block;
}
</style>
