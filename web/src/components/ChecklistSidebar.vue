<script setup lang="ts">
//! 悬浮清单：复用 SidebarCard 折叠卡片，固定在侧边栏底部。

import { computed, ref } from 'vue';
import { state } from '../store';
import { sessionKey } from '../keys';
import SidebarCard from './SidebarCard.vue';

//! 清单快照按 (core, session_id) 复合键存储（state.checklists，2026-10 多上游
//! 修复）——本组件只显示**当前会话**的清单；global 会话由父组件（ChatView）
//! 聚合后传入 lists 覆盖。

const props = defineProps<{
  /** 当前会话 id（缺省 = 本地默认会话；'global' 时由 lists 提供聚合结果）。 */
  sessionId?: string;
  /** 直接提供清单列表（global 聚合视图）；缺省按 sessionId 查表。 */
  lists?: import('../state').ChecklistEntry[];
}>();

const open = ref(true);

const lists = computed(() => {
  if (props.lists) return props.lists;
  const id = props.sessionId ?? 'local:tui::local_user';
  return state.checklists[sessionKey(state.activeRegion, id)] ?? [];
});
</script>

<template>
  <div class="checklist-float">
    <SidebarCard
      title="清单"
      :open="open"
      :count="lists.length"
      count-title="清单数量"
      @toggle="open = !open"
    >
      <div v-if="lists.length === 0" class="muted checklist-float-empty">（暂无清单）</div>
      <div v-for="list in lists" :key="list.name" class="checklist-card">
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
