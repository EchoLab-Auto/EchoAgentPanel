<script setup lang="ts">
//! 应用壳：NeumorphismLayout（库 sider 槽位，覆盖样式去背景/边框）+ 主视图 + 弹窗 + toast 桥。

import { defineAsyncComponent, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismLayout,
  NeumorphismToastProvider,
  ThemeProvider,
  useTouchDevice,
} from '@echolab-auto/ui-frame';
import { state } from './store';
import { cancelSessionWork, coreForTeam, resetManagementState } from './state';
import { teamKey } from './keys';
import { requestActiveRegionManagement, sendCommand, startConnection } from './connection';
import { scheduleNode } from './scheduler';
import { loopModeOf } from './protocol';
import { currentTeam, teamPluginEnabled } from './capabilities';
import {
  LOCAL_DEFAULT_SESSION,
  localSessionProjection,
  workspacePickIntent,
} from './workspace';
import ChatView from './components/ChatView.vue';
// 首屏瘦身（2026-10 审计修复）：设置视图（3400+ 行，含 5 个子设置页）、
// Shell 详情与分支弹窗改为按需加载——不进聊天首屏的代码不进首包，
// vite 自动按 import() 边界分包。
const SettingsView = defineAsyncComponent(() => import('./components/SettingsView.vue'));
const ShellPanel = defineAsyncComponent(() => import('./components/ShellPanel.vue'));
const BranchModal = defineAsyncComponent(() => import('./components/BranchModal.vue'));
import FullscreenToggleButton from './components/FullscreenToggleButton.vue';
import ThemeToggleButton from './components/ThemeToggleButton.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { mobileCardsDrawerOpen } from './mobile-cards';

startConnection();

// 竖屏移动端（2026-10）：断点与库同源（innerWidth < 768）。移动端隐藏
// 全屏按钮（CSS），顶栏出现「卡片」入口（打开 ChatView 内的卡片抽屉）。
const { isMobile } = useTouchDevice();

type View = 'chat' | 'settings' | 'shell';

const view = ref<View>(loadView());
/** Shell 详情视图的目标会话（右侧边栏「详情」按钮设置；null = 无目标） */
const shellDetailId = ref<string | null>(null);

function openShellDetail(sessionId: string) {
  shellDetailId.value = sessionId;
  setView('shell');
}

function loadView(): View {
  try {
    const saved = localStorage.getItem('echo-panel-view');
    // 旧视图名迁移：资源/日志视图已合并进设置视图；任务视图已并入
    // 聊天入口行的「任务」弹层（按当前 agent 的当前会话过滤）。
    if (saved === 'caps' || saved === 'logs') return 'settings';
    if (saved === 'tasks') return 'chat';
    return (['chat', 'settings', 'shell'] as View[]).includes(saved as View) ? (saved as View) : 'chat';
  } catch {
    return 'chat';
  }
}

// ── 记住上次使用的 Agent（Team）：刷新/重连后恢复，避免回到默认 agent ──
const ACTIVE_TEAM_KEY = 'echo-panel-active-team';
const ACTIVE_TEAM_CORE_KEY = 'echo-panel-active-team-core';

function loadActiveTeam(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TEAM_KEY) || null;
  } catch {
    return null;
  }
}

function loadActiveTeamCore(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TEAM_CORE_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveTeam(id: string | null, core: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_TEAM_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_TEAM_KEY);
    }
    if (core) {
      localStorage.setItem(ACTIVE_TEAM_CORE_KEY, core);
    } else {
      localStorage.removeItem(ACTIVE_TEAM_CORE_KEY);
    }
  } catch {
    // ignore storage errors (private mode)
  }
}

/** 统一更新「当前 agent」选中态（人格身份 = id + 归属 core）+ 持久化。 */
function applyActiveTeam(id: string | null, core: string | null) {
  activeTeamId.value = id;
  activeRegion.value = core;
  state.activeTeamId = id;
  state.activeRegion = core;
  saveActiveTeam(id, core);
}

function onTeamSelect(next: string | null, core?: string | null) {
  // 同名 team 可能存在于多个 core：优先用切换器传来的 core，其次保留当前
  // core，再取首个带 core 标注的条目，最后回落单上游（null）。core 锁定后
  // 命令不再发错节点。
  const resolved = next
    ? core ?? coreForTeam(state, next, state.activeRegion) ?? null
    : null;
  applyActiveTeam(next, resolved);
  // 分支 tab 属于上一个 agent 的运行期状态：切换后清空，避免在
  // 未启用回执分支的 agent（侧边栏无分支卡）下残留/串显。
  state.branchTabs = {};
  // 切换 Team = 切换记忆（会话隔离）。
  // 1) 有缓存：立刻用缓存渲染（消除白屏/网络等待），再后台增量拉取；
  // 2) 无缓存：全量拉取（先清空避免串显上一 agent 内容）。
  const tk = teamKey(resolved, next);
  const cached = state.teamTimelines[tk];
  if (cached) {
    // 副本渲染：trunk 与缓存解除数组别名，实时推送不再污染缓存
    // （否则切换回来后增量同步会把缓存里已有的实时消息再投递一遍）。
    state.trunk = [...cached.msgs];
    state.trunkTeamId = tk;
    sendCommand({ RequestTrunkTimeline: { team_id: next, since_seq: cached.seq } });
  } else {
    state.trunk = [];
    state.trunkTeamId = tk;
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
const activeRegion = ref<string | null>(loadActiveTeamCore());
// ⚠️ 关键：刷新时同步 state.activeTeamId/Core（reducer 与入口行会话切换都
// 读它）。若不同步，state.activeTeamId 保持 null → 会话列表按"主 agent"
// 过滤，会串显别人的会话（此前只在 onTeamSelect 里赋值，刷新即丢失）。
state.activeTeamId = activeTeamId.value;
state.activeRegion = activeRegion.value;



function send(content: string, images: string[] = []) {
  const target =
    activeSessionId.value === 'global' ? 'local:tui::local_user' : activeSessionId.value;
  // 深度融合 P2 调度：目标会话无 core 归属（新会话/默认本地会话）时，
  // 由调度器按策略（least_busy 默认）选节点；已有归属的会话经
  // coreForCommand 自动路由（P1），调度不参与。
  // 同名会话跨 core：优先当前 activeRegion 那一份，避免把"已有归属"误判为
  // 新会话而再去调度。
  const targetMatches = state.sessions.filter(s => s.id === target) as Array<{
    core?: string | null;
  }>;
  const targetSession =
    targetMatches.find(s => s.core && s.core === state.activeRegion) ??
    targetMatches.find(s => s.core) ??
    targetMatches[0];
  const scheduled = targetSession?.core ? null : scheduleNode();
  sendCommand(
    {
      SendMessage: {
        session_id: target,
        content,
        images,
        // 去主智能体：team_id 必填（core 无"默认人格"兜底）。
        team_id: activeTeamId.value ?? undefined,
      },
    },
    scheduled ?? undefined,
  );
}

function cancelWork() {
  // 乐观中断：立即结束动画/任务/工具运行态（不等后端确认）
  // 活动态键是 (core, session_id)：用当前选中会话的归属 core 精准取消。
  cancelSessionWork(state, activeSessionId.value, activeRegion.value);
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
  // 会话归属 core 即当前 agent 的归属 core：同名 team 跨 core 时，选中
  // 另一 core 的会话必须同步钉住 core，否则事件过滤会漏掉该会话的推送。
  if (id !== 'global') {
    const candidates = state.sessions.filter((s) => s.id === id) as Array<{
      core?: string | null;
    }>;
    const picked =
      candidates.find((s) => s.core && s.core === state.activeRegion) ??
      candidates.find((s) => s.core) ??
      candidates[0];
    if (picked?.core && picked.core !== activeRegion.value) {
      applyActiveTeam(activeTeamId.value, picked.core);
    }
  }
  const synced = state.workspaceTeamId === activeTeamId.value;
  const intent = workspacePickIntent(
    id,
    state.workspaceActive,
    synced,
    state.workspaceSessions.map((s) => s.id),
  );
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
    const team = currentTeam(state);
    if (!team || !teamPluginEnabled(team, 'echo-agent.workspace')) return;
    const teamKey = `${team.core ?? ''}:${team.id}`;
    if (workspaceFetchKey === teamKey) return;
    workspaceFetchKey = teamKey;
    sendCommand({ RequestWorkspaceSessions: { team_id: team.id } });
  },
  { immediate: true },
);

// ── 全局会话被禁用兜底：当前 agent 非并行多会话模式时若停留在 global 则回退 local ──
watch(
  [() => state.teams, () => activeTeamId.value],
  () => {
    const team = currentTeam(state);
    if (activeSessionId.value === 'global' && team && loopModeOf(team) !== 'parallel') {
      selectSession(localLanding(activeTeamId.value));
    }
  },
);

// ── Team 兜底：无选中或选中项已删除时，选列表首个并持久化 ──
// 去主智能体（2026-09）：没有"默认/主 agent"；`activeTeamId` 始终指向一个
// 具体智能体（首次连接取列表首个，纯客户端初始选择）。
// 每个 (core, team) 只做一次引导 timeline 请求（避免 TeamsList 重复推送时
// 反复全量拉取）。初始值取 localStorage 还原的 (id, core)：若引导期已按同一
// 组合定向请求过，这里不重复；core 由 TeamsList 校正后 key 变化 → 补拉一次。
let resolvedTimelineKey = activeTeamId.value
  ? teamKey(activeRegion.value, activeTeamId.value)
  : '';

let teamResetTimer: number | undefined;

/** 选第一条 agent 并加载它的 timeline（保存的 agent 确认消失后调用）。 */
function resetToFirstTeam() {
  const first = state.teams[0];
  if (!first) return;
  const next = first.id;
  applyActiveTeam(next, first.core ?? null);
  const tk = teamKey(first.core, next);
  resolvedTimelineKey = tk;
  const cached = state.teamTimelines[tk];
  if (cached) {
    // 副本渲染 + 归属标注：与 onTeamSelect 同一约定（trunk 与缓存解
    // 数组别名，实时推送不污染缓存；缺少 trunkTeamId 时增量投递不会
    // 落到实时视图）。
    state.trunk = [...cached.msgs];
    state.trunkTeamId = tk;
    sendCommand({ RequestTrunkTimeline: { team_id: next, since_seq: cached.seq } });
  } else {
    state.trunk = [];
    state.trunkTeamId = tk;
    sendCommand({ RequestTrunkTimeline: { team_id: next } });
  }
  selectSession(localLanding(next));
}

watch(
  () => state.teams,
  () => {
    // 列表尚未加载完成（空数组）时不校验，避免误清刚从 localStorage 恢复的 id。
    if (!state.teams.length) return;
    const id = activeTeamId.value;
    if (!id) {
      resetToFirstTeam();
      return;
    }
    const matches = state.teams.filter((t) => t.id === id);
    if (matches.length) {
      if (teamResetTimer !== undefined) {
        window.clearTimeout(teamResetTimer);
        teamResetTimer = undefined;
      }
      // 选中项存在：把 core 钉到合并列表里对应的那一条——首次从
      // localStorage 恢复时 core 为空，这里补全；同名跨 core 时保留已钉住的
      // core（缺失则取首个带明确 core 的条目）。
      const cur = activeRegion.value;
      const picked =
        (cur != null && matches.find((t) => (t.core ?? null) === cur)) ||
        matches.find((t) => t.core != null) ||
        matches[0];
      if (activeRegion.value !== (picked.core ?? null)) {
        activeRegion.value = picked.core ?? null;
        state.activeRegion = picked.core ?? null;
        saveActiveTeam(picked.id, picked.core ?? null);
      }
      // core 解析完成后定向拉取 timeline（引导期不再裸广播）。
      const key = teamKey(picked.core, picked.id);
      if (resolvedTimelineKey !== key) {
        resolvedTimelineKey = key;
        const cached = state.teamTimelines[key];
        if (cached) {
          sendCommand({ RequestTrunkTimeline: { team_id: picked.id, since_seq: cached.seq } });
        } else {
          sendCommand({ RequestTrunkTimeline: { team_id: picked.id } });
        }
      }
      return;
    }
    // 未找到：多上游下其他 core 的 TeamsList 可能还没到（广播响应有先后）。
    // 延迟一小段再确认，避免把 localStorage 保存的 agent 误切走。
    if (teamResetTimer !== undefined) return;
    teamResetTimer = window.setTimeout(() => {
      teamResetTimer = undefined;
      if (!state.teams.some((t) => t.id === activeTeamId.value)) resetToFirstTeam();
    }, 1200);
  },
  { immediate: true },
);

// ── 运行区域切换（= 所选 agent 的归属区域）：清空单值管理面缓存 + 定向重拉 ──
// activeRegion 是派生量（agent 选择 / 会话归属 / TeamsList 校正）。区域一变，
// 立即把设置/QQ/联邦等管理面重拉到该区域，保证"看到的=改的"。
watch(
  () => state.activeRegion,
  (next, prev) => {
    if (next === prev) return;
    resetManagementState(state);
    requestActiveRegionManagement();
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
    <NeumorphismLayout show-header height="100%" class="panel-layout">
      <!-- 顶部栏左：库自带折叠按钮 + 品牌 -->
      <template #header-left>
        <div class="brand">EchoAgent Panel</div>
      </template>

      <!-- 顶部栏中：连接状态已迁入右侧边栏「连接状态」卡（2026-09-23）——
           面板级信息与业务导航分离；断连提示也放到了最显眼的卡片里。
           顶栏此段保留为空（布局三段结构不破坏）。 -->

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
            :pressed="view === 'settings'"
            @click="setView('settings')"
          >
            设置
          </NeumorphismButton>
          <!-- 卡片抽屉入口（仅移动端且会话视图；抽屉本体在 ChatView 内，
               state 经 mobile-cards.ts 模块级 ref 通信） -->
          <NeumorphismButton
            v-if="isMobile && view === 'chat'"
            size="small"
            variant="glass"
            class="mobile-cards-btn"
            aria-label="打开信息卡片"
            @click="mobileCardsDrawerOpen = !mobileCardsDrawerOpen"
          >
            卡片
          </NeumorphismButton>
          <FullscreenToggleButton />
          <ThemeToggleButton />
        </div>
      </template>

      <!-- 主区（左侧边栏已移除：会话切换/清单/工作区/临时分支分别
           在入口行与会话视图右侧边栏，2026-09-19） -->
      <div class="main">
        <!-- KeepAlive（2026-10 审计修复）：切到设置/Shell 再回来时保留
             输入草稿、附件、滚动位置与工具组展开态（此前 v-if 直接销毁）。
             KeepAlive 常驻（不能带 v-if，否则自身卸载时缓存一并销毁），
             缓存内部用 v-if 控制显隐；兄弟视图改用显式 v-if——原 v-else-if
             链被 KeepAlive 打断，且显式条件与链式语义完全等价。 -->
        <KeepAlive>
          <ChatView
            v-if="view === 'chat'"
            :session-id="activeSessionId"
            :active-team-id="activeTeamId"
            :active-branch-id="activeBranchId"
            @send="send"
            @cancel="cancelWork"
            @select-team="onTeamSelect"
            @select-session="onSessionPick"
            @select-branch="(id) => (activeBranchId = id)"
            @open-shell-detail="openShellDetail"
          />
        </KeepAlive>
        <SettingsView
          v-if="view === 'settings'"
          :active-session-id="activeSessionId"
          :active-team-id="activeTeamId"
        />
        <ShellPanel
          v-if="view === 'shell' && shellDetailId"
          :session-id="shellDetailId"
          @back="setView('chat')"
        />
      </div>
    </NeumorphismLayout>

    <BranchModal
      v-if="activeBranchId"
      :branch-id="activeBranchId"
      @close="activeBranchId = null"
    />
    <!-- 移动端 toast 位置：窄屏改 top-center（右上角贴近拇指操作区易误触遮挡），
         桌面维持 top-right。position 是库的响应式 prop，旋转/拉伸实时跟随。 -->
    <NeumorphismToastProvider
      ref="toastProvider"
      :position="isMobile ? 'top-center' : 'top-right'"
      :max-count="8"
    />

    <!-- 全局确认对话框（2026-10 审计修复）：window.confirm 的统一替代 -->
    <ConfirmDialog />
  </ThemeProvider>
</template>
