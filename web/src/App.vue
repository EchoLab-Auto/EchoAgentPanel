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
import QqPanel from './components/QqPanel.vue';
import TasksPanel from './components/TasksPanel.vue';
import CapabilitiesPanel from './components/CapabilitiesPanel.vue';
import SessionPanel from './components/SessionPanel.vue';
import SettingsModal from './components/SettingsModal.vue';
import BranchModal from './components/BranchModal.vue';
import SudoModal from './components/SudoModal.vue';
import ThemeToggleButton from './components/ThemeToggleButton.vue';

startConnection();

type View = 'chat' | 'qq' | 'tasks' | 'caps' | 'session';

const view = ref<View>(loadView());

function loadView(): View {
  try {
    const saved = localStorage.getItem('echo-panel-view');
    return (['chat', 'qq', 'tasks', 'caps', 'session'] as View[]).includes(saved as View) ? (saved as View) : 'chat';
  } catch {
    return 'chat';
  }
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

function send(content: string, images: string[] = []) {
  const target =
    activeSessionId.value === 'global' ? 'local:tui::local_user' : activeSessionId.value;
  sendCommand({ SendMessage: { session_id: target, content, images } });
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
  <ThemeProvider default-theme="dark" storage-key="echo-panel-theme">
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
            :pressed="view === 'qq'"
            @click="setView('qq')"
          >
            QQ
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
            :pressed="view === 'session'"
            @click="setView('session')"
          >
            会话
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
          @send="send"
          @cancel="cancelWork"
        />
        <QqPanel v-else-if="view === 'qq'" />
        <CapabilitiesPanel v-else-if="view === 'caps'" />
        <SessionPanel v-else-if="view === 'session'" />
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
