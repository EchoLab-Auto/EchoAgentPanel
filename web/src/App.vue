<script setup lang="ts">
//! 应用壳：NeumorphismLayout（库 sider 槽位，覆盖样式去背景/边框）+ 主视图 + 弹窗 + toast 桥。

import { computed, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismLayout,
  NeumorphismStatusDot,
  NeumorphismToastProvider,
  ThemeProvider,
} from '@echolab-auto/ui-frame';
import { state } from './store';
import { cancelSessionWork } from './state';
import { sendCommand, startConnection } from './connection';
import { loopModeOf } from './protocol';
import { teamPluginEnabled } from './capabilities';
import {
  LOCAL_DEFAULT_SESSION,
  localSessionProjection,
  workspacePickIntent,
} from './workspace';
import ChatView from './components/ChatView.vue';
import PanelSidebar from './components/PanelSidebar.vue';
import TasksPanel from './components/TasksPanel.vue';
import SettingsView from './components/SettingsView.vue';
import ShellPanel from './components/ShellPanel.vue';
import BranchModal from './components/BranchModal.vue';
import SudoModal from './components/SudoModal.vue';
import ThemeToggleButton from './components/ThemeToggleButton.vue';

startConnection();

type View = 'chat' | 'tasks' | 'settings' | 'shell';

const view = ref<View>(loadView());

function loadView(): View {
  try {
    const saved = localStorage.getItem('echo-panel-view');
    // 旧视图名迁移：资源/日志视图已合并进设置视图
    if (saved === 'caps' || saved === 'logs') return 'settings';
    return (['chat', 'tasks', 'settings', 'shell'] as View[]).includes(saved as View) ? (saved as View) : 'chat';
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
    // 副本渲染：trunk 与缓存解除数组别名，实时推送不再污染缓存
    // （否则切换回来后增量同步会把缓存里已有的实时消息再投递一遍）。
    state.trunk = [...cached.msgs];
    state.trunkTeamId = teamKey;
    sendCommand({ RequestTrunkTimeline: { team_id: next, since_seq: cached.seq } });
  } else {
    state.trunk = [];
    state.trunkTeamId = teamKey;
    sendCommand({ RequestTrunkTimeline: { team_id: next } });
  }
  selectSession(localLanding(next));
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
const activeBranchId = ref<string | null>(null);
// 当前 Team 成员（空 = 默认/default）。切换后发送自动带上 team_id（会话隔离）。
// 初始值从 localStorage 恢复：刷新/重连后停留在上次使用的 Agent。
const activeTeamId = ref<string | null>(loadActiveTeam());
// ⚠️ 关键：刷新时同步 state.activeTeamId（reducer 与入口行会话切换都读它）。
// 若不同步，state.activeTeamId 保持 null → 会话列表按"主 agent"过滤，
// 会串显 alix 的会话（此前只在 onTeamSelect 里赋值，刷新即丢失）。
state.activeTeamId = activeTeamId.value;



function send(content: string, images: string[] = []) {
  const target =
    activeSessionId.value === 'global' ? 'local:tui::local_user' : activeSessionId.value;
  sendCommand({
    SendMessage: {
      session_id: target,
      content,
      images,
      // 去主智能体：team_id 必填（core 无"默认人格"兜底）。
      team_id: activeTeamId.value ?? undefined,
    },
  });
}

function cancelWork() {
  // 乐观中断：立即结束动画/任务/工具运行态（不等后端确认）
  cancelSessionWork(state, activeSessionId.value);
  // 取消必须路由到 turn 实际所在的 agent（去主智能体后 team_id 必填，
  // 缺省会被 core 明确拒绝）。
  sendCommand({
    CancelRequestedWork: {
      session_id: activeSessionId.value,
      all: false,
      team_id: activeTeamId.value ?? undefined,
    },
  });
}

// ── 顶栏状态 ──
const runningTaskCount = computed(
  () => state.tasks.filter((t) => t.status === 'running').length,
);

function selectSession(id: string) {
  activeSessionId.value = id;
  setView('chat');
}

// ── 工作区通道（激活 = 进入项目对话，2026-09-14）──
// 面板的「本地当前对话」是 workspace active 的**投影**：
//   active 空 → 默认本地会话；active = W → W 的通道会话。
// 由 Core 的 `WorkspaceSessions` 回推驱动（所有激活来源共一条广播路径），
// 面板侧只在本地视图上跟随。

/** 切换团队后的本地落点：已知该团队 active → 通道投影；否则默认本地会话。 */
function localLanding(teamId: string | null): string {
  const synced = state.workspaceTeamId === teamId;
  return synced ? localSessionProjection(state.workspaceActive) : LOCAL_DEFAULT_SESSION;
}

function sendWorkspaceActivate(id: string | null) {
  sendCommand({
    ActivateWorkspaceSession: { team_id: activeTeamId.value ?? undefined, id },
  });
}

/** 用户在「会话」切换器点选（用户意图；程序化切换走 selectSession）。 */
function onSessionPick(id: string) {
  const synced = state.workspaceTeamId === activeTeamId.value;
  const intent = workspacePickIntent(id, state.workspaceActive, synced);
  if (intent.kind === 'activate') sendWorkspaceActivate(intent.workspaceId);
  else if (intent.kind === 'deactivate') sendWorkspaceActivate(null);
  selectSession(id);
}

// active 回推（面板激活按钮 / 模型 use 工具 / 切换器）→ 本地视图跟随投影。
// 仅当停留在 Local 来源会话上：正在看 QQ/global 会话时不打扰（切回本地
// 时由 localLanding / 本 watcher 落到 active 对应通道）；不在会话视图时
// 只更新目标会话，不强制拉回聊天视图。
watch(
  [() => state.workspaceTeamId, () => state.workspaceActive],
  () => {
    if (state.workspaceTeamId !== activeTeamId.value) return;
    if (!activeSessionId.value.startsWith('local:')) return;
    const next = localSessionProjection(state.workspaceActive);
    if (activeSessionId.value !== next) activeSessionId.value = next;
  },
);

// 连接/切换 Team 后拉取工作区会话快照（投影与切换器双击绑定依赖它）。
// 仅对启用 workspace 插件的人格发（未挂载存储的人格会回明确错误提示）。
let workspaceFetchKey = '';
watch(
  [() => state.connected, () => state.teams, () => activeTeamId.value],
  () => {
    if (!state.connected) {
      workspaceFetchKey = '';
      return;
    }
    const team = state.teams.find((t) => t.id === activeTeamId.value);
    if (!team || !teamPluginEnabled(team, 'echo-agent.workspace')) return;
    if (workspaceFetchKey === team.id) return;
    workspaceFetchKey = team.id;
    sendCommand({ RequestWorkspaceSessions: { team_id: team.id } });
  },
  { immediate: true },
);

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

// ── 全局会话被禁用兜底：当前 agent 非并行多会话模式时若停留在 global 则回退 local ──
watch(
  [() => state.teams, () => activeTeamId.value],
  () => {
    const team = state.teams.find((t) => t.id === activeTeamId.value);
    if (activeSessionId.value === 'global' && team && loopModeOf(team) !== 'parallel') {
      selectSession(localLanding(activeTeamId.value));
    }
  },
);

// ── Team 兜底：无选中或选中项已删除时，选列表首个并持久化 ──
// 去主智能体（2026-09）：没有"默认/主 agent"；`activeTeamId` 始终指向一个
// 具体智能体（首次连接取列表首个，纯客户端初始选择）。
watch(
  () => state.teams,
  () => {
    // 列表尚未加载完成（空数组）时不校验，避免误清刚从 localStorage 恢复的 id。
    if (!state.teams.length) return;
    const id = activeTeamId.value;
    const stillExists = !!id && state.teams.some((t) => t.id === id);
    if (!stillExists) {
      const next = state.teams[0].id;
      activeTeamId.value = next;
      state.activeTeamId = next;
      saveActiveTeam(next);
      const cached = state.teamTimelines[next];
      if (cached) {
        state.trunk = cached.msgs;
        sendCommand({ RequestTrunkTimeline: { team_id: next, since_seq: cached.seq } });
      } else {
        state.trunk = [];
        sendCommand({ RequestTrunkTimeline: { team_id: next } });
      }
      selectSession(localLanding(next));
    }
  },
  { immediate: true },
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

      <!-- 顶部栏中：连接状态 -->
      <template #header-center>
        <div class="topbar-status">
          <NeumorphismStatusDot :status="state.connected ? 'online' : 'connecting'" size="small" />
          {{ state.connected ? '已连接' : '连接中…' }}
        </div>
      </template>

      <!-- 顶部栏右：导航 -->
      <template #header-right>
        <div class="topbar-actions">
          <NeumorphismButton
            size="small"
            variant="glass"
            :pressed="view === 'chat'"
            @click="setView('chat')"
          >
            聊天
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="glass"
            :pressed="view === 'tasks'"
            @click="setView('tasks')"
          >
            任务{{ runningTaskCount ? `(${runningTaskCount})` : '' }}
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="glass"
            :pressed="view === 'shell'"
            @click="setView('shell')"
          >
            Shell
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="glass"
            :pressed="view === 'settings'"
            @click="setView('settings')"
          >
            设置
          </NeumorphismButton>
          <ThemeToggleButton />
        </div>
      </template>

      <!-- 侧边栏：委托给 PanelSidebar（折叠卡片 + 清单） -->
      <template #sider>
        <PanelSidebar
          :active-branch-id="activeBranchId"
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
          @select-session="onSessionPick"
        />
        <SettingsView v-else-if="view === 'settings'" />
        <ShellPanel v-else-if="view === 'shell'" />
        <TasksPanel v-else />
      </div>
    </NeumorphismLayout>

    <BranchModal
      v-if="activeBranchId"
      :branch-id="activeBranchId"
      @close="activeBranchId = null"
    />
    <SudoModal v-if="state.sudoPrompt" :prompt="state.sudoPrompt" />


    <NeumorphismToastProvider ref="toastProvider" position="top-right" :max-count="8" />
  </ThemeProvider>
</template>
