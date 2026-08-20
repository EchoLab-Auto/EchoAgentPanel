<script setup lang="ts">
//! 主题切换按钮：两态（亮/暗）循环。
//! 注意：不使用 NeumorphismThemeToggle——其 modelValue 默认 'auto' 且带
//! immediate watcher，未正确绑定挂载时会把 'auto' 覆写进 localStorage。

import { NeumorphismButton, useTheme } from '@echolab-auto/ui-frame';

const { isDark, toggleTheme } = useTheme();
</script>

<template>
  <NeumorphismButton
    variant="flat"
    size="small"
    :title="isDark ? '切换到亮色主题' : '切换到暗色主题'"
    @click="toggleTheme()"
  >
    {{ isDark ? '☀️' : '🌙' }}
  </NeumorphismButton>
</template>
