<script setup lang="ts">
//! 会话中心主面板：左侧二级菜单（上下文 / 系统提示词 / 日志），右侧内嵌视图。
//! 取代原弹窗入口：点顶部「会话」标签后占据主区核心位置。

import { ref } from 'vue';
import { NeumorphismMenu, type HeadlessMenuItem } from '@echolab-auto/ui-frame';
import ContextView from './ContextView.vue';
import SystemPromptView from './SystemPromptView.vue';
import LogView from './LogView.vue';

type SubView = 'context' | 'prompt' | 'logs';

const sub = ref<SubView>('context');

const items: HeadlessMenuItem[] = [
  { key: 'context', label: '上下文' },
  { key: 'prompt', label: '系统提示词' },
  { key: 'logs', label: '日志' },
];

const viewOf: Record<string, SubView> = {
  context: 'context',
  prompt: 'prompt',
  logs: 'logs',
};

function onSelect(item: HeadlessMenuItem) {
  const v = viewOf[item.key];
  if (v) sub.value = v;
}
</script>

<template>
  <div class="session-panel">
    <div class="session-side">
      <NeumorphismMenu
        :items="items"
        mode="vertical"
        size="small"
        :default-active="sub"
        @select="onSelect"
      />
    </div>
    <div class="session-main">
      <ContextView v-if="sub === 'context'" />
      <SystemPromptView v-else-if="sub === 'prompt'" />
      <LogView v-else />
    </div>
  </div>
</template>

<style scoped>
.session-panel {
  display: flex;
  height: 100%;
  min-height: 0;
}
.session-side {
  /* 菜单项实际宽 192px + 内边距；放不下会溢出侵入主区，取 240 与资源面板对齐 */
  width: 240px;
  flex-shrink: 0;
  padding: 12px 8px;
  overflow-y: auto;
  overflow-x: hidden;
}
.session-side :deep(.nm-menu) {
  width: 100%;
}
.session-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px;
}
</style>
