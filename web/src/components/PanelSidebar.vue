<script setup lang="ts">
//! 右侧边栏卡片栈（chat-rail 内容）：文件浏览器 / Shell / 临时分支
//! 上下排列（RailStack：折叠为横条、分隔条拖动调整上下空间，持久化）。
//!
//! 卡片门控：
//! - 文件浏览器：workspace 插件可用且有激活会话（内容跟随激活会话）
//! - Shell：常驻（与 LLM 工具共用同一会话体系）
//! - 临时分支：仅并行多会话模式（单会话模式 Core 不发 ReplyBranch*）

import { computed } from 'vue';
import { state } from '../store';
import { loopModeOf } from '../protocol';
import { teamPluginEnabled, teamToolAvailable } from '../capabilities';
import RailStack, { type RailCardDef } from './RailStack.vue';
import WorkspaceFileBrowser from './WorkspaceFileBrowser.vue';
import ShellList from './ShellList.vue';

const props = defineProps<{
  activeBranchId: string | null;
  teamId: string | null;
}>();

const emit = defineEmits<{
  selectBranch: [id: string];
  manageWorkspace: [];
  openShellDetail: [sessionId: string];
}>();

const currentTeam = computed(() => {
  const id = props.teamId ?? state.teams[0]?.id ?? null;
  return state.teams.find((t) => t.id === id) ?? null;
});

/** 文件浏览器卡：workspace 插件 + 工具可用且存在激活会话。 */
const workspaceCard = computed(() => {
  const ok =
    teamPluginEnabled(currentTeam.value, 'echo-agent.workspace') &&
    teamToolAvailable(currentTeam.value, 'workspace');
  const synced = state.workspaceTeamId === (props.teamId ?? state.teams[0]?.id ?? null);
  if (!ok || !synced || !state.workspaceActive) return null;
  return (
    state.workspaceSessions.find((s) => s.id === state.workspaceActive) ?? null
  );
});

const branchCardVisible = computed(
  () => loopModeOf(currentTeam.value) === 'parallel',
);

const cards = computed<RailCardDef[]>(() => {
  const list: RailCardDef[] = [];
  if (workspaceCard.value) {
    list.push({
      id: 'files',
      title: `文件浏览器 · ${workspaceCard.value.name}`,
    });
  }
  list.push({
    id: 'shell',
    title: 'Shell',
    count: state.shellSessions.filter(
      (s) =>
        s.team_id === undefined ||
        s.team_id === null ||
        s.team_id === (props.teamId ?? state.teams[0]?.id ?? null),
    ).length,
    countTitle: '当前 agent 的会话数',
  });
  if (branchCardVisible.value) {
    list.push({
      id: 'branches',
      title: '临时分支',
      count: Object.keys(state.branchTabs).length,
      countTitle: '运行中的分支数',
    });
  }
  return list;
});

function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}
</script>

<template>
  <RailStack :cards="cards">
    <template #files>
      <div class="rail-files">
        <button
          type="button"
          class="rail-files__manage"
          title="工作区会话管理与 git 状态"
          @click="emit('manageWorkspace')"
        >
          会话管理与 git 状态 →
        </button>
        <WorkspaceFileBrowser :team-id="teamId" :session="workspaceCard" />
      </div>
    </template>
    <template #shell>
      <ShellList :team-id="teamId" @open-detail="(id) => emit('openShellDetail', id)" />
    </template>
    <template #branches>
      <div v-if="Object.keys(state.branchTabs).length === 0" class="muted">
        （无运行中的分支）
      </div>
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
    </template>
  </RailStack>
</template>

<style scoped>
.rail-files {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
}
.rail-files__manage {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--panel-accent);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 0;
}
.rail-files__manage:hover {
  text-decoration: underline;
}
</style>
