<script setup lang="ts">
//! 应用壳：topbar + 侧栏 + 主视图 + 弹窗 + toast 桥。

import { computed, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismStatusDot,
  NeumorphismTag,
  NeumorphismToastProvider,
  ThemeProvider,
} from '@echolab-auto/ui-frame';
import { state } from './store';
import { sendCommand, startConnection } from './connection';
import ChatView from './components/ChatView.vue';
import SessionGroups from './components/SessionGroups.vue';
import ChecklistSidebar from './components/ChecklistSidebar.vue';
import QqPanel from './components/QqPanel.vue';
import TasksPanel from './components/TasksPanel.vue';
import SettingsModal from './components/SettingsModal.vue';
import HelpModal from './components/HelpModal.vue';
import ContextModal from './components/ContextModal.vue';
import LogModal from './components/LogModal.vue';
import SystemPromptModal from './components/SystemPromptModal.vue';
import BranchModal from './components/BranchModal.vue';
import SudoModal from './components/SudoModal.vue';
import ThemeToggleButton from './components/ThemeToggleButton.vue';

startConnection();

type View = 'chat' | 'qq' | 'tasks';

const view = ref<View>(loadView());

function loadView(): View {
  try {
    const saved = localStorage.getItem('echo-panel-view');
    return (['chat', 'qq', 'tasks'] as View[]).includes(saved as View) ? (saved as View) : 'chat';
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
const showHelp = ref(false);
const showContext = ref(false);
const showLogs = ref(false);
const showSystemPrompt = ref(false);
const activeBranchId = ref<string | null>(null);

function send(content: string) {
  const target =
    activeSessionId.value === 'global' ? 'local:tui::local_user' : activeSessionId.value;
  sendCommand({ SendMessage: { session_id: target, content } });
}

function cancelWork() {
  sendCommand({ CancelRequestedWork: { session_id: activeSessionId.value, all: false } });
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

const branchTabIds = computed(() => Object.keys(state.branchTabs));

function truncateTask(task: string): string {
  const oneLine = task.replace(/\s+/g, ' ').trim();
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine;
}

function selectSession(id: string) {
  activeSessionId.value = id;
  setView('chat');
}

function openSystemPrompt() {
  sendCommand('RequestSystemPrompt');
  showSystemPrompt.value = true;
}

function saveSystemPrompt(text: string) {
  sendCommand({ SetSystemPrompt: { prompt: text } });
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
    <div class="app">
      <header class="topbar">
        <div class="brand">EchoAgent Panel</div>
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
          <NeumorphismButton size="small" variant="flat" @click="showContext = true">
            上下文
          </NeumorphismButton>
          <NeumorphismButton size="small" variant="flat" @click="openSystemPrompt">
            系统提示词
          </NeumorphismButton>
          <NeumorphismButton size="small" variant="flat" @click="showLogs = true">
            日志
          </NeumorphismButton>
          <NeumorphismButton size="small" variant="flat" @click="showSettings = true">
            设置
          </NeumorphismButton>
          <ThemeToggleButton />
          <NeumorphismButton size="small" variant="flat" @click="showHelp = true">
            帮助
          </NeumorphismButton>
        </div>
      </header>

      <div class="layout">
        <aside class="sidebar">
          <div class="sidebar-section-title">适配器</div>
          <div class="adapter-list">
            <div v-if="state.adapters.length === 0" class="muted">（无适配器信息）</div>
            <div v-for="adapter in state.adapters" :key="adapter.name" class="adapter-item">
              <NeumorphismStatusDot
                :status="adapter.running ? 'online' : 'offline'"
                size="small"
              />
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
          </div>

          <div class="sidebar-section-title">
            临时分支
            <span v-if="branchTabIds.length > 0" class="branch-tab-count">
              {{ branchTabIds.length }}
            </span>
          </div>
          <div class="branch-tab-list">
            <div v-if="branchTabIds.length === 0" class="muted">（无运行中的分支）</div>
            <div
              v-for="branchId in branchTabIds"
              :key="branchId"
              class="branch-tab"
              :class="{ active: activeBranchId === branchId }"
              title="点击查看分支执行过程"
              @click="activeBranchId = branchId"
            >
              <span class="branch-tab-spinner" />
              <span class="branch-tab-task">
                {{ truncateTask(state.branchTabs[branchId].task) }}
              </span>
            </div>
          </div>

          <div class="sidebar-section-title">会话</div>
          <SessionGroups :active-session-id="activeSessionId" @select="selectSession" />
          <ChecklistSidebar />
        </aside>

        <main class="main">
          <ChatView
            v-if="view === 'chat'"
            :session-id="activeSessionId"
            @send="send"
            @cancel="cancelWork"
          />
          <QqPanel v-else-if="view === 'qq'" />
          <TasksPanel v-else />
        </main>
      </div>

      <SettingsModal v-model="showSettings" />
      <HelpModal v-model="showHelp" />
      <ContextModal v-model="showContext" />
      <LogModal v-model="showLogs" />
      <SystemPromptModal v-model="showSystemPrompt" @save="saveSystemPrompt" />
      <BranchModal
        v-if="activeBranchId"
        :branch-id="activeBranchId"
        @close="activeBranchId = null"
      />
      <SudoModal v-if="state.sudoPrompt" :prompt="state.sudoPrompt" />
    </div>
    <NeumorphismToastProvider ref="toastProvider" position="top-right" :max-count="8" />
  </ThemeProvider>
</template>
