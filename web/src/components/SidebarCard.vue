<script setup lang="ts">
//! 侧边栏通用折叠卡片：标题 + 折叠箭头 + 可选数量徽标 + 内容插槽。
//! 卡片壳用 ui-frame 的 NeumorphismCard（凸起、悬浮于页面背景）。

import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';

defineProps<{
  title: string;
  open: boolean;
  count?: number;
  countTitle?: string;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <NeumorphismCard :elevation="2" :radius="24" hoverable no-padding class="sidebar-card">
    <template #header>
      <div class="sidebar-card-head" @click="emit('toggle')">
        <span class="sidebar-card-title">
          {{ title }}
          <span v-if="count && count > 0" class="branch-tab-count" :title="countTitle">
            {{ count }}
          </span>
        </span>
        <span class="sidebar-card-caret">{{ open ? '▾' : '▸' }}</span>
      </div>
    </template>
    <div v-show="open" class="sidebar-card-body">
      <slot />
    </div>
  </NeumorphismCard>
</template>
