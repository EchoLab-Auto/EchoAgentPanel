<script setup lang="ts">
//! 侧边栏内容：三张折叠卡片（适配器 / 临时分支 / 会话）+ 悬浮清单。
//! 折叠状态在组件内部维护；会话选择与分支选择冒泡给 App。

import { ref } from 'vue';
import { NeumorphismButton, NeumorphismStatusDot } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import SidebarCard from './SidebarCard.vue';
import SessionGroups from './SessionGroups.vue';
import ChecklistSidebar from './ChecklistSidebar.vue';

defineProps<{
  activeSessionId: string;
  activeBranchId: string | null;
  activeAgentId: string | null;
}>();

const emit = defineEmits<{
  selectSession: [id: string];
  selectBranch: [id: string];
  selectAgent: [id: string | null];
}>();

const cardOpen = ref<Record<'agents' | 'adapters' | 'branches' | 'sessions', boolean>>({
  agents: true,
  adapters: true,
  branches: true,
  sessions: true,
});

function toggleCard(key: 'agents' | 'adapters' | 'branches' | 'sessions') {
  cardOpen.value[key] = !cardOpen.value[key];
}

function selectAgent(id: string) {
  emit('selectAgent', id === 'default' ? null : id);
}

function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}
</script>

<template>
  <div class="panel-sider">
    <!-- 卡片：人格（切换对话对象，位于适配器上方） -->
    <SidebarCard title="人格" :open="cardOpen.agents" @toggle="toggleCard('agents')">
      <div v-if="state.agents.length === 0" class="muted">（未配置人格）</div>
      <div
        v-for="agent in state.agents"
        :key="agent.id"
        class="agent-item"
        :class="{ 'agent-item--active': (activeAgentId || 'default') === agent.id }"
        @click="selectAgent(agent.id)"
      >
        <NeumorphismStatusDot
          :status="agent.enabled ? 'online' : 'offline'"
          size="small"
        />
        <span class="agent-name">{{ agent.name }}</span>
        <span v-if="!agent.enabled" class="muted agent-disabled">已禁用</span>
      </div>
    </SidebarCard>

    <!-- 卡片：适配器 -->
    <SidebarCard title="适配器" :open="cardOpen.adapters" @toggle="toggleCard('adapters')">
      <div v-if="state.adapters.length === 0" class="muted">（无适配器信息）</div>
      <div v-for="adapter in state.adapters" :key="adapter.name" class="adapter-item">
        <NeumorphismStatusDot :status="adapter.running ? 'online' : 'offline'" size="small" />
        <span class="adapter-name">{{ adapter.display_name || adapter.name }}</span>
        <span v-if="adapter.self_id" class="adapter-id">{{ adapter.self_id }}</span>
        <span class="adapter-actions">
          <NeumorphismButton
            v-if="adapter.running"
            size="small"
            variant="flat"
            :disabled="!state.connected"
            @click="sendCommand({ StopAdapter: { name: adapter.name } })"
          >
            停
          </NeumorphismButton>
          <NeumorphismButton
            v-else
            size="small"
            variant="flat"
            :disabled="!state.connected"
            @click="sendCommand({ StartAdapter: { name: adapter.name } })"
          >
            启
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            :disabled="!state.connected"
            @click="sendCommand({ RestartAdapter: { name: adapter.name } })"
          >
            重启
          </NeumorphismButton>
        </span>
      </div>
    </SidebarCard>

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

    <!-- 悬浮清单 -->
    <ChecklistSidebar />
  </div>
</template>

<style scoped>
.agent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.agent-item:hover {
  background: var(--panel-hover, rgba(255, 255, 255, 0.06));
}
.agent-item--active {
  background: color-mix(in srgb, var(--nm-primary-color, #5b8def) 18%, transparent);
  outline: 1px solid color-mix(in srgb, var(--nm-primary-color, #5b8def) 40%, transparent);
}
.agent-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-disabled {
  font-size: 11px;
}
</style>
