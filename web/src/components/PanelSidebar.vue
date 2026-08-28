<script setup lang="ts">
//! 侧边栏内容：两张折叠卡片（临时分支 / 会话）+ 悬浮清单。
//! 折叠状态在组件内部维护；会话选择与分支选择冒泡给 App。
//! Team（Agent）切换已迁至聊天输入框左侧的 AgentSwitcher 悬浮卡片。

import { ref } from 'vue';
import { state } from '../store';
import SidebarCard from './SidebarCard.vue';
import SessionGroups from './SessionGroups.vue';

defineProps<{
  activeSessionId: string;
  activeBranchId: string | null;
}>();

const emit = defineEmits<{
  selectSession: [id: string];
  selectBranch: [id: string];
}>();

const cardOpen = ref<Record<'branches' | 'sessions', boolean>>({
  branches: true,
  sessions: true,
});

function toggleCard(key: 'branches' | 'sessions') {
  cardOpen.value[key] = !cardOpen.value[key];
}


function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}
</script>

<template>
  <div class="panel-sider">
    <!-- 卡片：临时分支 -->
    <SidebarCard
      title="临时分支"
      :open="cardOpen.branches"
      :count="Object.keys(state.branchTabs).length"
      count-title="运行中的分支数"
      @toggle="toggleCard('branches')"
    >
      <div v-if="Object.keys(state.branchTabs).length === 0" class="muted">（无运行中的分支）</div>
      <div
        v-for="branchId in Object.keys(state.branchTabs)"
        :key="branchId"
        class="branch-tab"
        :class="{ active: activeBranchId === branchId }"
        title="点击查看分支执行过程"
        @click="emit('selectBranch', branchId)"
      >
        <span class="branch-tab-spinner" />
        <span class="branch-tab-task">
          {{ truncateTask(state.branchTabs[branchId].task) }}
        </span>
      </div>
    </SidebarCard>

    <!-- 卡片：会话 -->
    <SidebarCard title="会话" :open="cardOpen.sessions" @toggle="toggleCard('sessions')">
      <SessionGroups :active-session-id="activeSessionId" @select="emit('selectSession', $event)" />
    </SidebarCard>

  </div>
</template>

<style scoped>
</style>

