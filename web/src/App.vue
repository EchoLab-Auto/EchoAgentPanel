<script setup lang="ts">
//! 应用壳：NeumorphismLayout（`show-header` + `height="100%"`；**不使用库的 sider 槽位**——
//! 原左侧边栏已移除，卡片改由会话视图内的 chat-rail 双列承载）+ 主视图 + 弹窗 + toast 桥。

import { computed, ref, watch } from 'vue';
import { lazy } from './lazy';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismLayout from '@echolab-auto/ui-frame/components/NeumorphismLayout';
import NeumorphismToastProvider from '@echolab-auto/ui-frame/components/NeumorphismToast';
import ThemeProvider from '@echolab-auto/ui-frame/components/ThemeProvider';
import { useTouchDevice } from '@echolab-auto/ui-frame/composables/useTouchDevice';
import { state } from './store';
import { cancelSessionWork, coreForTeam, resetManagementState } from './state';
import { teamKey } from './keys';
import { replaySessionApiOverrides } from './session-api';
import { requestActiveRegionManagement, requestTimeline, sendCommand, startConnection } from './connection';
import { scheduleNode } from './scheduler';
import { currentTeam } from './capabilities';
import {
  beforeSessionPick,
  findMainView,
  panelMainViews,
  setupPanelExtensions,
  teamLanding,
  type PanelSlotContext,
} from './extensions/registry';
import 'virtual:panel-extensions';
import ChatView from './components/ChatView.vue';
import CompactionIndicator from './components/CompactionIndicator.vue';
// 首屏瘦身（2026-10 审计修复）：设置视图（3400+ 行，含 5 个子设置页）、
// Shell 详情改为按需加载——不进聊天首屏的代码不进首包，
// vite 自动按 import() 边界分包。
const SettingsView = lazy(() => import('./components/SettingsView.vue'), 'SettingsView');
const ShellPanel = lazy(() => import('./components/ShellPanel.vue'), 'ShellPanel');
import FullscreenToggleButton from './components/FullscreenToggleButton.vue';
import ThemeToggleButton from './components/ThemeToggleButton.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import {
  closeMobileSheet,
  initMobileSheetHistory,
  mobileCardsDrawerOpen,
  mobileSheet,
  mobileViewSheetOpen,
} from './mobile-sheets';
import MobileViewSheet from './components/MobileViewSheet.vue';
import PanelIcon from './components/PanelIcon.vue';
import { railSessionId } from './rail-cards';
import { readPref, readTabOnly, writePref, writeTabOnly } from './tab-prefs';


// 竖屏移动端（2026-10）：断点与库同源（innerWidth < 768）。移动端隐藏
// 全屏按钮（CSS），顶栏出现「卡片」入口（打开 ChatView 内的卡片抽屉）。
const { isMobile } = useTouchDevice();

// 移动端「返回」键：先关底部 Sheet，而不是直接退出应用（2026-11 移动端体检）。
// 幂等；桌面也挂着但从不触发（没有 Sheet 时 popstate 不拦截）。
initMobileSheetHistory();

/**
 * 移动端顶栏标题（2026-10 布局 v2）：品牌让位给「当前在哪」。
 *
 * 桌面顶栏的品牌 + 三个视图按钮在 375px 上放不下（品牌被迫压成省略号），
 * 且 Shell 视图没有入口。移动端改为「`☰` + 标题」：`☰` 打开视图 Sheet，
 * 标题随视图变化——聊天显示当前 Agent 名（人格即身份），其余显示视图名。
 */
const mobileTitle = computed<string>(() => {
  if (view.value === 'settings') return '设置';
  if (view.value === 'shell') return 'Shell';
  // 扩展视图：用它的 label（移动端顶栏只显示"我在哪"，不显示品牌）。
  const ext = extensionViews.value.find((item) => item.viewId === view.value);
  if (ext) return ext.view.label;
  return currentTeam(state)?.name?.trim() || '聊天';
});

// ── 持久化键（必须在首次读取之前声明：`view` 的初值就地调 loadView）──
// 记住上次使用的 Agent（Team）：刷新/重连后恢复，避免回到默认 agent。
// ⚠️ 全部经 `tab-prefs` 读写——本标签页权威 + 全局默认兜底，避免多窗口串台
// （详见 tab-prefs.ts 的说明）。
const ACTIVE_TEAM_KEY = 'echo-panel-active-team';
const ACTIVE_TEAM_CORE_KEY = 'echo-panel-active-team-core';
/** 视图 / 当前会话的键（均为 per-tab）。 */
const VIEW_KEY = 'echo-panel-view';
const SESSION_KEY = 'echo-panel-session';

/**
 * 主区视图。
 *
 * 内置三种 + **扩展视图**（`ext:<extensionId>:<viewId>`，见
 * `extensions/registry.ts` 的 `PanelMainView`）。扩展视图的 id 带命名空间，
 * 所以持久化在 `view` 偏好里的值可以直接回读——但回读时仍要**校验它现在还在**
 * （扩展可能被卸载），见 `resolvedView`。
 */
type BuiltinView = 'chat' | 'settings' | 'shell';
type View = BuiltinView | `ext:${string}`;

const view = ref<View>(loadView());
/** Shell 详情视图的目标会话（右侧边栏「详情」按钮设置；null = 无目标） */
const shellDetailId = ref<string | null>(null);
/**
 * 该详情会话的**所属 core**。`sh-{seq}` 在每个 core 上从 1 起重复，只带 id
 * 会让详情面板按 activeRegion 猜——切过区域就会显示/操作另一台机器的同号
 * shell（2026-10 多 Core 交互修复）。
 */
const shellDetailCore = ref<string | null>(null);

function openShellDetail(sessionId: string, core: string | null = null) {
  shellDetailId.value = sessionId;
  shellDetailCore.value = core;
  setView('shell');
}
/**
 * Shell 视图的「自动选会话」兜底（2026-10 移动端布局 v2）。
 *
 * Shell 视图原本只有**详情**一种形态（`v-if="shellDetailId"`），入口藏在侧栏
 * Shell 卡的「详情」按钮里。v2 把 Shell 提到移动端视图菜单后，从菜单直接进入
 * 会命中「view === 'shell' 但没有 shellDetailId」→ 主区一片空白。
 *
 * 兜底策略：切到 shell 且当前没有目标会话时，取当前 core 下的第一个 shell 会话；
 * 一个都没有（用户还没开过 Shell）则渲染空态提示，而不是静默空白。
 */
const shellFallback = computed<{ id: string; core: string | null } | null>(() => {
  const list = state.shellSessions;
  if (!list.length) return null;
  const region = state.activeRegion;
  const pick =
    region == null ? list[0] : list.find((s) => (s.core ?? null) === region) ?? list[0];
  return pick ? { id: pick.session_id, core: pick.core ?? null } : null;
});
const shellFallbackId = computed<string | null>(() => shellFallback.value?.id ?? null);

/** Shell 视图实际渲染的会话：显式详情优先，否则用兜底。 */
const shellViewId = computed(
  () => shellDetailId.value ?? (view.value === 'shell' ? shellFallbackId.value : null),
);
/** 实际渲染会话的归属 core（显式详情带着自己的 core；兜底取兜底那条的）。 */
const shellViewCore = computed<string | null>(() =>
  shellDetailId.value ? shellDetailCore.value : (shellFallback.value?.core ?? null),
);

watch(
  () => view.value,
  (next) => {
    // 进 shell 时若无详情但有会话，直接落到第一个（避免空白）；离开时保留旧值，
    // 下次进来仍是上次看的那条（除非它已经不在了）。
    if (next !== 'shell') return;
    if (shellDetailId.value) return;
    shellDetailId.value = shellFallback.value?.id ?? null;
    shellDetailCore.value = shellFallback.value?.core ?? null;
  },
);

function loadView(): View {
  try {
    // 本标签页优先（视图是窗口内状态）；新标签回退全局默认。
    const saved = readPref(VIEW_KEY);
    // 旧视图名迁移：资源/日志视图已合并进设置视图；任务视图已并入
    // 聊天入口行的「任务」弹层（按当前 agent 的当前会话过滤）。
    if (saved === 'caps' || saved === 'logs') return 'settings';
    if (saved === 'tasks') return 'chat';
    if (typeof saved === 'string' && saved.startsWith('ext:')) {
      // 这里只校验**形状**：扩展是否还注册着要等注册完成（`virtual:panel-extensions`
      // 的 import 在 setup 之前执行，但门控依赖 team/module 状态，那一刻还没拉到）。
      // 真正的兜底在 `resolvedView`。
      return saved as View;
    }
    return (['chat', 'settings', 'shell'] as View[]).includes(saved as View) ? (saved as View) : 'chat';
  } catch {
    return 'chat';
  }
}

function loadActiveTeam(): string | null {
  try {
    return readPref(ACTIVE_TEAM_KEY) || null;
  } catch {
    return null;
  }
}

function loadActiveTeamCore(): string | null {
  try {
    return readPref(ACTIVE_TEAM_CORE_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveTeam(id: string | null, core: string | null) {
  try {
    writePref(ACTIVE_TEAM_KEY, id);
    writePref(ACTIVE_TEAM_CORE_KEY, core);
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
    requestTimeline(next, cached.seq);
  } else {
    state.trunk = [];
    state.trunkTeamId = tk;
    requestTimeline(next, 0);
  }
  // 用户**主动**切 agent：落到该 agent 自己的 active 投影（per-persona 状态，
  // 不是"另一个窗口的选择"，故此处用 localLanding 是合理的）。
  selectSession(localLanding(next), 'team-select');
}

function setView(next: View) {
  view.value = next;
  // 移动端：切视图前先收掉底部 Sheet（2026-11 移动端体检）。
  //
  // 两个 Sheet 的开关住在 `mobile-sheets.ts`（模块级单值，跨组件通信），而
  // 抽屉本体在 ChatView 里、视图菜单本体在 App 里。切视图会卸载 ChatView，
  // 但**单值不会跟着重置**——于是 `mobileSheet` 仍停在 'cards'，回到聊天时
  // 抽屉会自己弹出来（"幽灵抽屉"）。这里在唯一入口上收口，任何切换来源
  // （顶栏、☰ 菜单、Shell 卡详情）都覆盖到。
  if (mobileSheet.value !== null) closeMobileSheet();
  try {
    writePref(VIEW_KEY, next);
  } catch {
    // ignore storage errors (private mode)
  }
}

// 当前对话目标会话。旧版聚合视图（global）已随并行模式移除，旧偏好统一回落默认会话。
const savedSession = readTabOnly(SESSION_KEY);
const activeSessionId = ref(savedSession && savedSession !== 'global' ? savedSession : 'local:tui::local_user');
/** 扩展卡片可通过 windowSessionId 绑定本窗口正在查看的会话。 */
railSessionId.value = activeSessionId.value;
// 当前 Team 成员（空 = 默认/default）。切换后发送自动带上 team_id（会话隔离）。
// 初始值从 localStorage 恢复：刷新/重连后停留在上次使用的 Agent。
const activeTeamId = ref<string | null>(loadActiveTeam());
const activeRegion = ref<string | null>(loadActiveTeamCore());
// ⚠️ 关键：刷新时同步 state.activeTeamId/Core（reducer 与入口行会话切换都
// 读它）。若不同步，state.activeTeamId 保持 null → 会话列表按"主 agent"
// 过滤，会串显别人的会话（此前只在 onTeamSelect 里赋值，刷新即丢失）。
state.activeTeamId = activeTeamId.value;
state.activeRegion = activeRegion.value;
// 本窗口正在看的会话：Core 的会话级操作回执（`Notice`）据此只在发起窗口展示
// （否则 A 窗口压缩会话 A 时，B 窗口也会弹「已压缩…」——2026-10 用户报告）。
state.windowSessionId = activeSessionId.value;

// 扩展只拿应用上下文与公开槽位；Panel 壳不加载任何业务模块 UI。
setupPanelExtensions({
  teamId: activeTeamId,
  sessionId: activeSessionId,
  core: activeRegion,
  selectSession,
  setSession: setActiveSession,
  syncTeamCore: applyActiveTeam,
});
startConnection();

/**
 * 扩展主区视图的槽位上下文（`when` 门控用）。
 *
 * 与 `setupPanelExtensions` 传的是同一组值，但那里是一次性快照，这里必须是
 * computed——门控依赖 `team.enabled_modules`，而团队能力是连接后异步到达的。
 */
const slotContext = computed<PanelSlotContext>(() => ({
  teamId: activeTeamId.value,
  sessionId: activeSessionId.value,
  core: activeRegion.value,
}));

/** 当前可见的扩展视图（按注册顺序）。 */
const extensionViews = computed(() => panelMainViews(slotContext.value));

/**
 * 实际渲染的视图。
 *
 * 持久化里可能是 `ext:xxx:yyy`，但那个扩展现在被禁用/卸载了——此时**回落聊天**
 * 而不是渲染空白：用户看到空白只会以为面板坏了，而"视图没了"这件事在界面上
 * 已经体现为顶栏少了一个按钮。
 */
const resolvedView = computed<View>(() => {
  const current = view.value;
  if (!current.startsWith('ext:')) return current;
  return extensionViews.value.some((item) => item.viewId === current) ? current : 'chat';
});

/** 当前渲染的扩展视图（无则 null）。 */
const activeExtensionView = computed(() =>
  resolvedView.value.startsWith('ext:')
    ? findMainView(slotContext.value, resolvedView.value)
    : null,
);

// 上面那个回落要**写回** `view`：否则顶栏没有任何按钮是选中态，而
// `setView` 之外的路径（刷新恢复）会一直停在失效值上。
watch(resolvedView, (next) => {
  if (next !== view.value) setView(next);
});

/** 切到某个扩展视图（顶栏按钮 / 移动端菜单共用）。 */
function selectExtensionView(viewId: string): void {
  setView(viewId as View);
}



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
        team_id: activeTeamId.value ?? null,
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
      team_id: activeTeamId.value ?? null,
    },
  });
}

function selectSession(id: string, reason = 'select') {
  setActiveSession(id, reason);
  setView('chat');
}

// ── 工作区通道（激活 = 进入项目对话，2026-09-14）──
// 面板的「本地当前对话」是 workspace active 的**投影**：
//   active 空 → 默认本地会话；active = W → W 的通道会话。
// 由 Core 的 `WorkspaceSessions` 回推驱动（所有激活来源共一条广播路径），
// 面板侧只在本地视图上跟随。
/** 切换团队后的本地落点：已知该团队 active → 通道投影；否则默认本地会话。 */
function localLanding(teamId: string | null): string {
  return teamLanding(teamId) ?? 'local:tui::local_user';
}


/** 用户在「会话」切换器点选（用户意图；程序化切换走 selectSession）。 */
/**
 * 会话标签切换（2026-11）：目标是 `(session, team, core)` 三元组。
 *
 * 为什么必须带上 team/core：同一个 `local:tui::local_user` 在每个 core 的
 * 每个人格下都存在，只按 session id 切会落到"另一个 core 的同名会话"
 * 上（2026-10 串台事故的形状）。这里先钉住归属再切会话。
 */
function onTabSelect(sessionId: string, teamId: string | null, core: string | null) {
  if (teamId && (teamId !== activeTeamId.value || core !== activeRegion.value)) {
    // 复用既有切换路径：它会重建 timeline 缓存视图并重置会话落点，
    // 紧接着下面的 selectSession 覆盖成标签自己的会话。
    onTeamSelect(teamId, core);
  } else if (!teamId && core && core !== activeRegion.value) {
    applyActiveTeam(activeTeamId.value, core);
  }
  beforeSessionPick(sessionId);
  selectSession(sessionId, 'tab-select');
}

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
  beforeSessionPick(id);
  selectSession(id);
}

/**
 * 排障用：记录 `activeSessionId` 的**每一次**变更（谁改的 + 调用栈）。
 *
 * 多窗口「串台」这类问题只有两条线索可用：① 变更是谁发起的 ② 改成了什么。
 * 现象层面无法区分「他端广播 / 残留意图 / teams 重排 / 通道失效回退」，而
 * 调用栈能一眼定案。故所有赋值点统一走 [`setActiveSession`]，并把最近 20 条
 * 记进 `window.__echoPanelSessionLog`（纯内存，无 IO，无 console 输出）。
 *
 * 用户复现后一条命令导出：
 * ```js
 * copy(JSON.stringify(window.__echoPanelSessionLog, null, 2))
 * ```
 */
function recordSessionChange(next: string, reason: string, stack: string): void {
  const w = window as unknown as { __echoPanelSessionLog?: unknown[] };
  const log = (w.__echoPanelSessionLog ??= []);
  // 只留前 6 帧：够看出是哪个函数/哪一行触发的，又不至于刷屏。
  const frames = stack
    .split('\n')
    .slice(2, 8)
    .map((line) => line.trim());
  log.push({
    t: new Date().toISOString(),
    from: currentSessionIdForLog,
    to: next,
    reason,
    frames,
  });
  currentSessionIdForLog = next;
  if (log.length > 20) log.shift();
}

/** recordSessionChange 用的「上一次值」（ref 已被改后拿不到旧值）。 */
let currentSessionIdForLog = '';

/**
 * `activeSessionId` 的唯一写入口（诊断 + 变更原因）。
 *
 * 直接 `activeSessionId.value = x` 会绕过诊断；新代码请一律用本函数并在
 * `reason` 里写明来源（`select` / `team-reset` / `global-fallback` /
 * `workspace-follow` / `workspace-reset`），便于事后从日志定位。
 */
function setActiveSession(next: string, reason: string): void {
  if (activeSessionId.value === next) return;
  recordSessionChange(next, reason, new Error().stack ?? '');
  activeSessionId.value = next;
  // 侧栏「文件浏览器」卡按本窗口会话解析所属工作区（见 rail-cards.ts）。
  railSessionId.value = next;
  // 会话级操作回执只在本窗口展示（见 state.ts 的 `Notice` 分支）。
  state.windowSessionId = next;
  // 严格 per-tab：只写 sessionStorage。若写进 localStorage，另一窗口重载后
  // 就会落到本窗口正在看的会话上（「跟着跳」的另一半）。
  writeTabOnly(SESSION_KEY, next);
}

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
    requestTimeline(next, cached.seq);
  } else {
    state.trunk = [];
    state.trunkTeamId = tk;
    requestTimeline(next, 0);
  }
  // 自动兜底（当前 agent 从列表消失 / 未选中）：**不能用 localLanding**——
  // 同 global 兜底的理由，它会把本窗口带到他人刚激活的工作区。回中立默认会话。
  selectSession('local:tui::local_user', 'team-reset');
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
          requestTimeline(picked.id, cached.seq);
        } else {
          requestTimeline(picked.id, 0);
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
    // 首次区域确定（prev 为 null = 首屏引导）：技能/工具目录（合计
    // ~36KB）此时没有任何消费方——设置页/Agent 配置弹窗打开时会自拉；
    // 不预取，慢网络下把 WS 带宽留给时间线等首屏数据。切换区域时保留
    // 全量重拉（设置页可能开着，需要立即显示新 core 的列表）。
    requestActiveRegionManagement({ includeCatalogs: prev !== null });
  },
);

// ── 会话级 API 覆盖的重放（2026-11 用户报"刷新后不保留"）────────────────
//
// Core 只给工作区对话持久化覆盖（`persist_session_api_profile` 对非
// `local:workspace:` 通道直接返回）；TUI / QQ / shell 的覆盖只是 Core 内存里的
// `session_providers` 条目，Panel 刷新后没有任何事件能读回来——徽标回落成
// persona 值，而 Core 仍在按覆盖路由（界面和实际路由打架）。
//
// 折中：Panel 自己记（localStorage）+ 连上时重放。三个依赖缺一不可：
// region（决定槽位）、team（命令必须显式带归属）、供应商池（判悬空引用）。
watch(
  () => [state.activeRegion, activeTeamId.value, state.api?.profiles?.length ?? 0] as const,
  ([region, team, profiles]) => {
    if (!region || !team || !profiles) return;
    replaySessionApiOverrides(state, region, team, sendCommand);
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
    <NeumorphismLayout show-header height="100%" class="panel-layout">
      <!-- 顶部栏左：库自带折叠按钮 + 品牌 -->
      <template #header-left>
        <!-- 移动端（<768px，2026-10 布局 v2）：视图切换收进 `☰` 打开的底部 Sheet，
             顶栏让出空间给「当前在哪」——品牌在 375px 屏上只能压成省略号，无信息量。 -->
        <button
          v-if="isMobile"
          type="button"
          class="mobile-view-btn"
          aria-label="切换视图"
          :aria-expanded="mobileViewSheetOpen"
          @click="mobileViewSheetOpen = !mobileViewSheetOpen"
        >
          <PanelIcon name="list" size="md" tone="inherit" />
        </button>
        <div class="brand" :class="{ 'brand--view': isMobile }">{{ isMobile ? mobileTitle : 'EchoAgent Panel' }}</div>
      </template>

      <!-- 顶部栏中：连接状态已迁入右侧边栏「连接状态」卡（2026-09-23）——
           面板级信息与业务导航分离；断连提示也放到了最显眼的卡片里。
           现放**压缩/归档进度指示器**（2026-10）：压缩要跑几分钟，而唯一的
           详细视图「上下文」是个覆盖层——关掉面板就再无反馈。顶栏是唯一
           在聊天/设置/Shell 三个视图下都常驻的位置。 -->
      <template #header-center>
        <CompactionIndicator />
      </template>

      <!-- 顶部栏右：导航 -->
      <template #header-right>
        <div class="topbar-actions">
          <!-- 桌面：视图按钮直接可见。移动端收进 `☰` 打开的 Sheet——
               375px 上「品牌 + 两个视图按钮 + 卡片 + 主题」必然溢出（v1 实测品牌被
               压成省略号），且 Shell 视图当时没有顶栏入口。 -->
          <template v-if="!isMobile">
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
            <!-- 扩展主区视图（2026-11）：与内置视图同级。**按注册顺序追加在
                 末尾**——不插到聊天/设置之间，否则装个扩展就把用户的肌肉记忆
                 打乱了。 -->
            <NeumorphismButton
              v-for="item in extensionViews"
              :key="item.viewId"
              size="small"
              variant="glass"
              :pressed="view === item.viewId"
              :title="item.view.hint ?? item.view.label"
              :data-extension-view="item.viewId"
              @click="selectExtensionView(item.viewId)"
            >
              {{ item.view.label }}
            </NeumorphismButton>
          </template>
          <!-- 全屏（移动端 2026-10 改为图标按钮，且在「卡片」左侧——用户要求）：
               放这里而不是「卡片」之后，DOM 顺序即视觉顺序；桌面端卡片按钮
               v-if 为假，故桌面仍是「聊天/设置 → 全屏 → 主题」原序。 -->
          <FullscreenToggleButton :compact="isMobile" />
          <!-- 卡片抽屉入口（仅移动端且会话视图；抽屉本体在 ChatView 内，
               state 经 mobile-sheets.ts 的互斥 sheet 开关通信） -->
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
            @send="send"
            @cancel="cancelWork"
            @select-team="onTeamSelect"
            @select-session="onSessionPick"
            @select-tab="onTabSelect"
            @open-shell-detail="openShellDetail"
          />
        </KeepAlive>
        <SettingsView
          v-if="view === 'settings'"
          :active-session-id="activeSessionId"
          :active-team-id="activeTeamId"
        />
        <ShellPanel
          v-if="view === 'shell' && shellViewId"
          :session-id="shellViewId"
          :core="shellViewCore"
          @back="setView('chat')"
        />
        <!-- 扩展主区视图（2026-11）：宿主只提供**容器**，padding / 滚动 /
             布局全归视图自己——画布类视图要的是"零 padding + 自己控滚动"，
             宿主定死 padding 会让它们要么浪费边框、要么被迫负 margin。 -->
        <div
          v-if="activeExtensionView"
          class="extension-view"
          :data-extension-view="activeExtensionView.viewId"
        >
          <component
            :is="activeExtensionView.view.component"
            :team-id="activeTeamId"
            :session-id="activeSessionId"
            :core="activeRegion"
          />
        </div>
        <!-- Shell 视图空态（v2）：用户还没开过任何 Shell 会话。此前这种情况是
             一片空白（Shell 视图只从侧栏卡的「详情」进入，永远有目标会话）；
             收进视图菜单后必须显式说明，否则像页面坏了。 -->
        <div v-else-if="view === 'shell'" class="shell-empty">
          <p class="shell-empty__title">还没有 Shell 会话</p>
          <!-- 入口描述必须分端（2026-11）：窄屏**没有右侧边栏**（卡片改从顶栏
               「卡片」按钮的底部抽屉进入），原本文案让人去一个屏幕外的地方找。 -->
          <p class="shell-empty__hint">
            <template v-if="isMobile">
              点顶栏的「卡片」，在「Shell」卡片里新建一个，或让模型调用
              <code>shell_start</code> 工具创建。
            </template>
            <template v-else>
              在会话视图右侧边栏的「Shell」卡片里新建一个，或让模型调用
              <code>shell_start</code> 工具创建。
            </template>
          </p>
          <NeumorphismButton size="small" variant="glass" @click="setView('chat')">
            回到聊天
          </NeumorphismButton>
        </div>
      </div>
    </NeumorphismLayout>

    <!-- 移动端 toast 位置：窄屏改 top-center（右上角贴近拇指操作区易误触遮挡），
         桌面维持 top-right。position 是库的响应式 prop，旋转/拉伸实时跟随。
         位置见 styles.css 的「toast 不盖顶栏」段：容器在窄屏下移到顶栏之下。
         条数上限没做分端——库的 `useToast` 在 setup 里对 `maxCount` **求值一次**
         （非响应式），而 `isMobile` 来自 `useTouchDevice`、真值要等它的
         onMounted；首屏那批"上游恢复在线"提示正好落在这个窗口里，传进去的
         仍是桌面值（实测库里生效的是默认 5，不是 8 也不是 3），改它不产生
         效果还留个假象。真正的问题是"盖住顶栏"，那一条已由 CSS 解决。 -->
    <NeumorphismToastProvider
      ref="toastProvider"
      :position="isMobile ? 'top-center' : 'top-right'"
      :max-count="8"
    />

    <!-- 全局确认对话框（2026-10 审计修复）：window.confirm 的统一替代 -->
    <!-- 移动端视图切换菜单（<768px）：`☰` 打开，含聊天/设置/Shell 三项。
         桌面不渲染（桌面顶栏已有常驻按钮）。 -->
    <MobileViewSheet v-if="isMobile"
      :view="resolvedView"
      :extensions="extensionViews.map((item) => ({ viewId: item.viewId, label: item.view.label, hint: item.view.hint }))"
      @select="setView"
    />

    <ConfirmDialog />
  </ThemeProvider>
</template>
