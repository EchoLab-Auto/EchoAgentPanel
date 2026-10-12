<script setup lang="ts">
//! 主题切换：ui-frame 三态开关（浅色 / 自动跟随系统 / 深色）。
//! 组件内部 useTheme() 注入 ThemeProvider 提供的共享主题状态
//!（storageKey=echo-panel-theme），切换即持久化。

import NeumorphismThemeToggle from '@echolab-auto/ui-frame/components/NeumorphismThemeToggle';
import { useTheme } from '@echolab-auto/ui-frame/composables/useTheme';

const { theme } = useTheme();
</script>

<template>
  <NeumorphismThemeToggle v-model="theme" size="small" />
</template>
