<script setup lang="ts">
//! 侧边栏内容：两张折叠卡片（临时分支 / 会话）+ 悬浮清单。
//! 折叠状态在组件内部维护；会话选择与分支选择冒泡给 App。
//! Team（Agent）切换已迁至聊天输入框左侧的 AgentSwitcher 悬浮卡片。

import { computed, ref } from 'vue';
import { state } from '../store';
import SidebarCard from './SidebarCard.vue';
import SessionGroups from './SessionGroups.vue';

defineProps<{
  activeSessionId: string;
  activeBranchId: string | null;
}>();

// 临时分支卡仅对启用了回执分支能力的 Agent 显示。
// 当前 team = state.activeTeamId（null = 主/默认 agent）。
// 后端按 TeamInfo.reply_branches_enabled 推导（enabled_plugins 白名单）。
const replyBranchesVisible = computed(() => {
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (!team) return true; // 主/默认 agent：未配置限定时默认启用
  return team.reply_branches_enabled !== false;
});

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
    <!-- 卡片：临时分支（当前 Agent 未启用回执分支时整卡隐藏） -->
    <SidebarCard
      v-if="replyBranchesVisible"
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

