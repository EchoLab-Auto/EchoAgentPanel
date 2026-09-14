<script setup lang="ts">
//! 侧边栏内容：临时分支折叠卡片。
//! 会话切换已迁至入口行「会话」按钮（SessionSwitcher，2026-09）；
//! 折叠状态在组件内部维护；分支选择冒泡给 App。
//! Team（Agent）切换在聊天输入框左侧的 AgentSwitcher 悬浮卡片。

import { computed, ref } from 'vue';
import { state } from '../store';
import { loopModeOf } from '../protocol';
import SidebarCard from './SidebarCard.vue';

defineProps<{
  activeBranchId: string | null;
}>();

// 「临时分支」卡：仅并行多会话模式（单会话模式后端不发射 ReplyBranch*
// 事件，分支不可见，卡片没有内容可展示）。
const replyBranchesVisible = computed(() => {
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  return loopModeOf(team) === 'parallel';
});

const emit = defineEmits<{
  selectBranch: [id: string];
}>();

const cardOpen = ref<Record<'branches', boolean>>({ branches: true });

function toggleCard(key: 'branches') {
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

  </div>
</template>

<style scoped>
</style>

