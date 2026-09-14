<script setup lang="ts">
//! 侧边栏内容：两张折叠卡片（临时分支 / 会话）+ 悬浮清单。
//! 折叠状态在组件内部维护；会话选择与分支选择冒泡给 App。
//! Team（Agent）切换已迁至聊天输入框左侧的 AgentSwitcher 悬浮卡片。

import { computed, ref } from 'vue';
import { state } from '../store';
import { loopModeOf } from '../protocol';
import SidebarCard from './SidebarCard.vue';
import SessionGroups from './SessionGroups.vue';

defineProps<{
  activeSessionId: string;
  activeBranchId: string | null;
}>();

// 当前激活 team 的会话（含 team 归属归一化）。
function teamSessions() {
  const active = state.activeTeamId ?? state.teams[0]?.id ?? null;
  return state.sessions.filter((s) => s.id !== 'global' && (s.team_id ?? null) === active);
}

// 「会话」卡可见性：并行多会话模式恒显示；单会话模式默认隐藏（本地单源
// 对话不需要会话管理）——但**该智能体一旦存在非 local 来源的会话**
// （QQ 私聊/群等），会话卡必须可见，否则这些会话在面板中完全不可达
// （读不到也切不了：聊天区按会话过滤，默认只停在 local 会话）。
const sessionsCardVisible = computed(() => {
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (loopModeOf(team) === 'parallel') return true;
  return teamSessions().some((s) => !s.id.startsWith('local:'));
});

// 「临时分支」卡：仅并行多会话模式（单会话模式后端不发射 ReplyBranch*
// 事件，分支不可见，卡片没有内容可展示）。
const replyBranchesVisible = computed(() => {
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  return loopModeOf(team) === 'parallel';
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

    <!-- 卡片：会话（单会话模式且无其他来源时整卡隐藏；见 sessionsCardVisible） -->
    <SidebarCard
      v-if="sessionsCardVisible"
      title="会话"
      :open="cardOpen.sessions"
      @toggle="toggleCard('sessions')"
    >
      <SessionGroups :active-session-id="activeSessionId" @select="emit('selectSession', $event)" />
    </SidebarCard>

  </div>
</template>

<style scoped>
</style>

