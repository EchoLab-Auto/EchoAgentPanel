<script setup lang="ts">
//! 右侧边栏卡片：临时分支（2026-09-19 起从左侧边栏迁入 chat-rail 容器）。
//! 会话切换/清单/工作区已分别迁至入口行与右侧边栏文件浏览器；
//! 仅并行多会话模式显示（单会话模式 Core 不发 ReplyBranch* 事件）。

import { computed, ref } from 'vue';
import { state } from '../store';
import { loopModeOf } from '../protocol';
import SidebarCard from './SidebarCard.vue';
import ShellPanel from './ShellPanel.vue';

defineProps<{
  activeBranchId: string | null;
}>();

const emit = defineEmits<{
  selectBranch: [id: string];
}>();

// 「临时分支」卡：仅并行多会话模式（单会话模式后端不发射 ReplyBranch*
// 事件，分支不可见，卡片没有内容可展示）。
const replyBranchesVisible = computed(() => {
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  return loopModeOf(team) === 'parallel';
});

const cardOpen = ref<Record<'branches' | 'shell', boolean>>({
  branches: true,
  shell: true,
});

function toggleCard(key: 'branches' | 'shell') {
  cardOpen.value[key] = !cardOpen.value[key];
}

function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}
</script>

<template>
  <div class="panel-rail-cards">
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

    <!-- 卡片：Shell 会话（2026-09-19 起从顶栏视图迁入右侧边栏容器） -->
    <SidebarCard
      title="Shell"
      :open="cardOpen.shell"
      :count="state.shellSessions.length"
      count-title="会话数"
      @toggle="toggleCard('shell')"
    >
      <ShellPanel />
    </SidebarCard>
  </div>
</template>
