<script setup lang="ts">
//! 应用壳：NeumorphismLayout（库 sider 槽位，覆盖样式去背景/边框）+ 主视图 + 弹窗 + toast 桥。

import { computed, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismDropdown,
  NeumorphismLayout,
  NeumorphismMenu,
  NeumorphismStatusDot,
  NeumorphismTag,
  NeumorphismToastProvider,
  ThemeProvider,
  type HeadlessMenuItem,
} from '@echolab-auto/ui-frame';
import { state } from './store';
import { sendCommand, startConnection } from './connection';
import ChatView from './components/ChatView.vue';
import PanelSidebar from './components/PanelSidebar.vue';
import TasksPanel from './components/TasksPanel.vue';
import CapabilitiesPanel from './components/CapabilitiesPanel.vue';
import LogView from './components/LogView.vue';import SettingsModal from './components/SettingsModal.vue';
import BranchModal from './components/BranchModal.vue';
import SudoModal from './components/SudoModal.vue';
import ThemeToggleButton from './components/ThemeToggleButton.vue';

startConnection();

type View = 'chat' | 'tasks' | 'caps' | 'logs';

const view = ref<View>(loadView());

function loadView(): View {
  try {
    const saved = localStorage.getItem('echo-panel-view');
    return (['chat', 'tasks', 'caps', 'logs'] as View[]).includes(saved as View) ? (saved as View) : 'chat';
  } catch {
    return 'chat';
  }
}

// ── 记住上次使用的 Agent（Team）：刷新/重连后恢复，避免回到默认 agent ──
const ACTIVE_TEAM_KEY = 'echo-panel-active-team';

function loadActiveTeam(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TEAM_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveTeam(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_TEAM_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_TEAM_KEY);
    }
  } catch {
    // ignore storage errors (private mode)
  }
}

function onTeamSelect(next: string | null) {
  activeTeamId.value = next;
  state.activeTeamId = next;
  saveActiveTeam(next);
  // 分支 tab 属于上一个 agent 的运行期状态：切换后清空，避免在
  // 未启用回执分支的 agent（侧边栏无分支卡）下残留/串显。
  state.branchTabs = {};
  // 切换 Team = 切换记忆（会话隔离）。
  // 1) 有缓存：立刻用缓存渲染（消除白屏/网络等待），再后台增量拉取；
  // 2) 无缓存：全量拉取（先清空避免串显上一 agent 内容）。
  const teamKey = String(next ?? '');
  const cached = state.teamTimelines[teamKey];
  if (cached) {
    state.trunk = cached.msgs;
    state.trunkTeamId = teamKey;
    sendCommand({ RequestTrunkTimeline: { team_id: next, since_seq: cached.seq } });
  } else {
    state.trunk = [];
    state.trunkTeamId = teamKey;
    sendCommand({ RequestTrunkTimeline: { team_id: next } });
  }
  // 会话列表也按 Team 过滤（SessionGroups 依据 activeTeamId）。
  selectSession('local:tui::local_user');
}

function setView(next: View) {
  view.value = next;
  try {
    localStorage.setItem('echo-panel-view', next);
  } catch {
    // ignore storage errors (private mode)
  }
}

// 当前对话目标会话；'global' = 全局上下文（显示全部消息）。默认 local user 会话。
const activeSessionId = ref('local:tui::local_user');
const showSettings = ref(false);
const activeBranchId = ref<string | null>(null);
// 当前 Team 成员（空 = 默认/default）。切换后发送自动带上 team_id（会话隔离）。
// 初始值从 localStorage 恢复：刷新/重连后停留在上次使用的 Agent。
const activeTeamId = ref<string | null>(loadActiveTeam());



function send(content: string, images: string[] = []) {
  const target =
    activeSessionId.value === 'global' ? 'local:tui::local_user' : activeSessionId.value;
  sendCommand({
    SendMessage: {
      session_id: target,
      content,
      images,
      team_id: activeTeamId.value || undefined,
    },
  });
}

function cancelWork() {
  sendCommand({ CancelRequestedWork: { session_id: activeSessionId.value, all: false } });
}

// ── 顶部设置菜单 ──
const settingsMenuItems: HeadlessMenuItem[] = [
  { key: 'showSettings', label: 'API 设置' },
];

function onSettingsMenuSelect(item: HeadlessMenuItem) {
  if (item.key === 'showSettings') showSettings.value = true;
}

const busyCount = computed(
  () =>
    Object.values(state.activities).filter((a) =>
      ['thinking', 'tool', 'subagent'].includes(a.phase),
    ).length,
);

const runningTaskCount = computed(
  () => state.tasks.filter((t) => t.status === 'running').length,
);

function selectSession(id: string) {
  activeSessionId.value = id;
  setView('chat');
}

// ── 侧边栏折叠：由 NeumorphismLayout 管理，状态持久化 ──
const sidebarCollapsed = ref<boolean>(
  (() => {
    try {
      return localStorage.getItem('echo-panel-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  })(),
);

function onLayoutCollapse(collapsed: boolean) {
  sidebarCollapsed.value = collapsed;
  try {
    localStorage.setItem('echo-panel-sidebar-collapsed', collapsed ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

// ── 全局会话被禁用兜底：当前 agent 无全局视图时若停留在 global 则回退 local ──
watch(
  [() => state.teams, () => activeTeamId.value],
  () => {
    const team = state.teams.find((t) => t.id === activeTeamId.value);
    if (activeSessionId.value === 'global' && team && team.global_session_enabled === false) {
      selectSession('local:tui::local_user');
    }
  },
);

// ── Team 被删除后兜底：激活的 team 不存在时重置为默认并重载时间线 ──
watch(
  () => state.teams,
  () => {
    // 列表尚未加载完成（空数组）时不校验，避免误清刚从 localStorage 恢复的 id。
    if (!state.teams.length) return;
    const id = activeTeamId.value;
    if (id && !state.teams.some((t) => t.id === id)) {
      activeTeamId.value = null;
      state.activeTeamId = null;
      saveActiveTeam(null);
      const cached = state.teamTimelines[''];
      if (cached) {
        state.trunk = cached.msgs;
        sendCommand({ RequestTrunkTimeline: { team_id: null, since_seq: cached.seq } });
      } else {
        state.trunk = [];
        sendCommand({ RequestTrunkTimeline: { team_id: null } });
      }
      selectSession('local:tui::local_user');
    }
  },
);

// ── Toast 桥：state.toasts 只是转发队列，立刻泵进库 ToastProvider 并排空 ──
const toastProvider = ref<InstanceType<typeof NeumorphismToastProvider> | null>(null);
watch(
  () => state.toasts.length,
  () => {
    if (!state.toasts.length) return;
    for (const t of state.toasts) {
      toastProvider.value?.addToast({ message: t.text, type: t.kind, duration: 6000 });
    }
    state.toasts.length = 0; // 排空；重触发 watcher 后因 length 0 直接返回
  },
  { flush: 'post' },
);
</script>

<template>
  <ThemeProvider default-theme="auto" storage-key="echo-panel-theme">
    <NeumorphismLayout
      show-header
      show-sider
      collapsible
      :default-collapsed="sidebarCollapsed"
      :sider-width="264"
      :collapsed-width="0"
      height="100%"
      class="panel-layout"
      @collapse="onLayoutCollapse"
    >
      <!-- 顶部栏左：库自带折叠按钮 + 品牌 -->
      <template #header-left>
        <div class="brand">EchoAgent Panel</div>
      </template>

      <!-- 顶部栏中：连接状态 + 模型 -->
      <template #header-center>
        <div class="topbar-status">
          <NeumorphismStatusDot :status="state.connected ? 'online' : 'connecting'" size="small" />
          {{ state.connected ? '已连接' : '连接中…' }}
        </div>
        <div class="topbar-model">
          {{ state.model || '—' }}
          <NeumorphismTag v-if="busyCount > 0" variant="warning" size="small">
            忙碌 ×{{ busyCount }}
          </NeumorphismTag>
        </div>
      </template>

      <!-- 顶部栏右：导航 -->
      <template #header-right>
        <div class="topbar-actions">
          <NeumorphismButton
            size="small"
            variant="flat"
            :pressed="view === 'chat'"
            @click="setView('chat')"
          >
            聊天
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            :pressed="view === 'tasks'"
            @click="setView('tasks')"
          >
            任务{{ runningTaskCount ? `(${runningTaskCount})` : '' }}
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            :pressed="view === 'caps'"
            @click="setView('caps')"
          >
            资源
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            :pressed="view === 'logs'"
            @click="setView('logs')"
          >
            日志
          </NeumorphismButton>
          <NeumorphismDropdown trigger="click" position="bottom">
            <NeumorphismButton size="small" variant="flat">设置 ▾</NeumorphismButton>
            <template #items>
              <NeumorphismMenu
                :items="settingsMenuItems"
                mode="vertical"
                size="small"
                @select="onSettingsMenuSelect"
              />
            </template>
          </NeumorphismDropdown>
          <ThemeToggleButton />
        </div>
      </template>

      <!-- 侧边栏：委托给 PanelSidebar（折叠卡片 + 清单） -->
      <template #sider>
        <PanelSidebar
          :active-session-id="activeSessionId"
          :active-branch-id="activeBranchId"
          @select-session="selectSession"
          @select-branch="(id) => (activeBranchId = id)"
        />
      </template>

      <!-- 主区 -->
      <div class="main">
        <ChatView
          v-if="view === 'chat'"
          :session-id="activeSessionId"
          :active-team-id="activeTeamId"
          @send="send"
          @cancel="cancelWork"
          @select-team="onTeamSelect"
        />
        <CapabilitiesPanel v-else-if="view === 'caps'" />
        <LogView v-else-if="view === 'logs'" />
        <TasksPanel v-else />
      </div>
    </NeumorphismLayout>

    <SettingsModal v-model="showSettings" />
    <BranchModal
      v-if="activeBranchId"
      :branch-id="activeBranchId"
      @close="activeBranchId = null"
    />
    <SudoModal v-if="state.sudoPrompt" :prompt="state.sudoPrompt" />

    <NeumorphismToastProvider ref="toastProvider" position="top-right" :max-count="8" />
  </ThemeProvider>
</template>
