<script setup lang="ts">
//! 全屏切换按钮（XR 巨幕模式：头显浏览器里一键把 Panel 铺满视野）。
//!
//! - 调 Fullscreen API 切换 documentElement 全屏；`fullscreenchange` 同步状态，
//!   Esc / 系统退出全屏后按钮文案自动还原；
//! - 失败（不被支持 / 非用户手势 / iframe 限制）时 toast 告知，不静默失败。

import { onMounted, onUnmounted, ref } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { pushToast } from '../state';

const isFullscreen = ref(false);

function sync() {
  isFullscreen.value = !!document.fullscreenElement;
}

async function toggle() {
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
  <!-- fullscreen-toggle 类：移动端（<768px）由 styles.css 隐藏（iOS Safari
       不支持元素全屏、触摸端意义低）——类必须落在根按钮上，否则隐藏选择器
       匹配不到（2026-10 修复：此前该类缺失，全屏按钮在手机上溢出屏外）。 -->
  <NeumorphismButton
    size="small"
    variant="glass"
    class="fullscreen-toggle"
    :pressed="isFullscreen"
    @click="toggle"
  >
    {{ isFullscreen ? '退出全屏' : '全屏' }}
  </NeumorphismButton>
</template>
