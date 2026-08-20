<script setup lang="ts">
//! 悬浮清单：固定在左侧边栏底部，不随会话列表滚动。
//! 顶部显示清单名称与进度概览，点击展开查看条目明细。

import { ref } from 'vue';
import { state } from '../store';

const open = ref(false);
</script>

<template>
  <div class="checklist-float" :class="{ open }">
    <div class="checklist-float-head" @click="open = !open">
      <span class="checklist-float-title">清单</span>
      <span v-if="state.checklists.length > 0" class="checklist-float-count">
        {{ state.checklists.length }}
      </span>
      <span class="checklist-float-caret">{{ open ? '▾' : '▸' }}</span>
    </div>
    <div v-if="open" class="checklist-float-body">
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
    </div>
  </div>
</template>
