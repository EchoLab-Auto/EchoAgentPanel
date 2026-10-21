<script setup lang="ts">
//! 边栏卡片栈（chat-rail 内容；左右两列共用同一组件，`side` 区分）：
//! 连接状态 / 文件浏览器 / Shell / 临时分支，上下排列
//! （RailStack：折叠为横条、分隔条拖动调整上下空间、卡片可拖到另一列，均持久化）。
//!
//! 卡片门控（与所在列无关）：
//! - 连接状态：常驻（Core 管理通道 + 各 QQ 实例；紧凑卡，固定高度）
//! - 文件浏览器：workspace 插件可用且有激活会话（内容跟随激活会话）
//! - Shell：常驻（与 LLM 工具共用同一会话体系）
//! - 临时分支：仅并行多会话模式（单会话模式 Core 不发 ReplyBranch*）
//!
//! 布局（哪张卡在哪一列、列内顺序）由 `rail-layout.ts` 持有并持久化——
//! 门控只决定「是否渲染」，不决定「放哪里」（用户拖动过的位置不因门控
//! 抖动而漂移）。

import { computed } from 'vue';
import { lazy } from '../lazy';
import { state } from '../store';
import { railCardsFor, workspaceCardFor } from '../rail-cards';
import type { RailSide } from '../rail-layout';
import RailStack, { type RailCardDef } from './RailStack.vue';
// 右栏卡片按需加载（2026-10 审计）：连接状态卡 / 文件浏览器 / Shell 列表
// 合计约 1100 行 + 依赖，不在首帧关键路径上（右栏在挂载后渲染）——转为
// 异步 chunk，首屏 JS 不再被它们拖累。
const ConnectionStatusCard = lazy(() => import('./ConnectionStatusCard.vue'), 'ConnectionStatusCard');
const WorkspaceFileBrowser = lazy(() => import('./WorkspaceFileBrowser.vue'), 'WorkspaceFileBrowser');
const ShellList = lazy(() => import('./ShellList.vue'), 'ShellList');

const props = withDefaults(
  defineProps<{
    activeBranchId: string | null;
    teamId: string | null;
    /** 本列所在侧（决定渲染哪些卡片、以及「移到另一侧」的方向）。 */
    side: RailSide;
    /**
     * 是否允许拖动（换列 / 调序）。默认 true。
     * 移动端卡片抽屉把两列合并为一条纵向列表（无「另一侧」），由 ChatView 传
     * false——见 RailStack 的同名 prop（Boolean 缺省会被 Vue 铸成 false，
     * 故此处显式声明 default）。
     */
    dragEnabled?: boolean;
  }>(),
  { dragEnabled: true },
);

const emit = defineEmits<{
  selectBranch: [id: string];
  manageWorkspace: [];
  openShellDetail: [sessionId: string, core: string | null];
  /** 卡片换列（拖动或头部按钮）——由视图层做提示/持久化外的后续动作。 */
  relocate: [id: string, side: RailSide];
}>();

/** 本列渲染的卡片：门控 × 用户排序（共享注册表 `rail-cards.ts`）。 */
const cards = computed<RailCardDef[]>(() => railCardsFor(props.side, props.teamId));

/** 文件浏览器卡当前绑定的工作区会话（模板里传给 WorkspaceFileBrowser）。 */
const workspaceCard = computed(() => workspaceCardFor(props.teamId));

function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}
</script>

<template>
  <RailStack
    :cards="cards"
    :side="side"
    :drag-enabled="dragEnabled"
    @relocate="(id, target) => emit('relocate', id, target)"
  >
    <template #status>
      <ConnectionStatusCard />
    </template>
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
      <ShellList :team-id="teamId" @open-detail="(id, core) => emit('openShellDetail', id, core)" />
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
