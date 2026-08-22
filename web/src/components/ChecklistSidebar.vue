<script setup lang="ts">
//! 悬浮清单：复用 SidebarCard 折叠卡片，固定在侧边栏底部。

import { ref } from 'vue';
import { state } from '../store';
import SidebarCard from './SidebarCard.vue';

const open = ref(true);
</script>

<template>
  <div class="checklist-float">
    <SidebarCard
      title="清单"
      :open="open"
      :count="state.checklists.length"
      count-title="清单数量"
      @toggle="open = !open"
    >
      <div v-if="state.checklists.length === 0" class="muted checklist-float-empty">（暂无清单）</div>
      <div v-for="list in state.checklists" :key="list.name" class="checklist-card">
        <div class="checklist-head">
          <span class="checklist-name">{{ list.name }}</span>
          <span class="checklist-progress">{{ list.done }}/{{ list.total }}</span>
        </div>
        <div class="checklist-bar">
          <div
            class="checklist-bar-fill"
            :style="{ width: `${list.total ? (list.done / list.total) * 100 : 0}%` }"
          />
        </div>
        <div
          v-for="(item, index) in list.items"
          :key="index"
          class="checklist-item"
          :class="{ done: item.done }"
        >
          {{ item.done ? '☑' : '☐' }} {{ item.text }}
        </div>
      </div>
    </SidebarCard>
  </div>
</template>
