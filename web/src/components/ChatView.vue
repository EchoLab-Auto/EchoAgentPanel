<script setup lang="ts">
//! 聊天主视图：消息列表 + 固定底部输入区（flex 布局，输入区占位不遮挡消息）。
//! 分工（2026-09-30；2026-10-13 元组件层继续收敛）：机制层来自 ui-frame——
//! `useChatScroll`（headless 吸底滚动）+ `ChatComposer`（IME 组合保护）；
//! **行模型与组合由面板自组**：连续工作条目合并（WorkRunGroup：工具调用 +
//! 思考统一为小圆角矩形 chip 的通用排布）、子代理（同列 chip）、消息行
//! （MessageItem，气泡壳为面板 CSS 配方）。滚动区（原 `ChatTray` 组装件）
//! 与跳转钮亦自组（2026-10-13：库侧该组装件因"视觉+行为+按钮+语义四事
//! 打包"被解散，组合权归产品）。
//! 多模态：支持图片粘贴 / 文件选择，data URL 随消息发送给 Core。

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { lazy } from '../lazy';
import NeumorphismBadge from '@echolab-auto/ui-frame/components/NeumorphismBadge';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismDrawer from '@echolab-auto/ui-frame/components/NeumorphismDrawer';
import NeumorphismSpinner from '@echolab-auto/ui-frame/components/NeumorphismSpinner';
import { useTouchDevice } from '@echolab-auto/ui-frame/composables/useTouchDevice';
import { useChatScroll } from '@echolab-auto/ui-frame/composables/useChatScroll';
import { ChatComposer, type ChatMessage } from '@echolab-auto/ui-frame/chat';
import PanelIcon from './PanelIcon.vue';
import { state } from '../store';
import { checklistsForSession, sessionMessagesFor } from '../state';
import { sendCommand } from '../connection';
import { formatTime, toChatMessage, type ChatMessageWithImages } from '../chat-adapter';
import AgentSwitcher from './AgentSwitcher.vue';
import { checklistKey, sessionKey } from '../keys';
import { isInstancePluginKind, teamPluginEnabled, teamToolAvailable } from '../capabilities';
import { loopModeOf } from '../protocol';
import MessageItem from './MessageItem.vue';
import ChecklistSidebar from './ChecklistSidebar.vue';
import WorkRunGroup, { type WorkRunItem } from './WorkRunGroup.vue';
import PanelSidebar from './PanelSidebar.vue';
import PanelPopover from './PanelPopover.vue';
import RailDragGhost from './RailDragGhost.vue';
import { railHasVisibleCards, railRegistered } from '../rail-cards';
import { mobileCardsDrawerOpen } from '../mobile-cards';
import { railDragEngaged } from '../rail-drag';
import { claimReasoningAnimation } from '../reasoning-anim';
import {
  rememberChatMessage,
  retainChatMessages,
  reuseChatMessage,
} from '../chat-message-cache';
// 弹层按需加载（2026-10 审计修复）：入口行弹层与配置/上下文覆盖层首次
// 打开时才加载对应 chunk（此前全部静态进首包——不打开也付加载成本）。
const AgentConfigModal = lazy(() => import('./AgentConfigModal.vue'), 'AgentConfigModal');
const ContextView = lazy(() => import('./ContextView.vue'), 'ContextView');
const AdapterPanel = lazy(() => import('./AdapterPanel.vue'), 'AdapterPanel');
const WorkspacePanel = lazy(() => import('./WorkspacePanel.vue'), 'WorkspacePanel');
const SessionSwitcher = lazy(() => import('./SessionSwitcher.vue'), 'SessionSwitcher');
const TasksPanel = lazy(() => import('./TasksPanel.vue'), 'TasksPanel');

const props = defineProps<{
  sessionId: string;
  activeTeamId?: string | null;
  activeBranchId?: string | null;
}>();
const emit = defineEmits<{
  send: [content: string, images: string[]];
  cancel: [];
  selectTeam: [id: string | null, core: string | null];
  selectSession: [id: string];
  selectBranch: [id: string];
  openShellDetail: [sessionId: string];
}>();

const input = ref('');
/** 待发送图片（data URL 形式） */
const attachments = ref<string[]>([]);

// ── 输入条毛玻璃性能策略（2026-09-18）──
// 跨行拖选文字每帧触发输入条（大面积 backdrop-filter）全量重栅格化，
// 是拖选卡顿的根治点。策略：聚焦或拖选期间临时关 blur（纯色底撑住视觉），
// 失去焦点/选择结束且输入为空时恢复毛玻璃——日常展示质感不变。
const composerBusy = ref(false);
let blurRestoreTimer: number | undefined;

function suspendComposerBlur() {
  if (blurRestoreTimer !== undefined) {
    window.clearTimeout(blurRestoreTimer);
    blurRestoreTimer = undefined;
  }
  composerBusy.value = true;
}

function restoreComposerBlurSoon() {
  // 拖选结束时 selection 可能先清空再重设：延迟一拍确认无选择再恢复。
  if (blurRestoreTimer !== undefined) window.clearTimeout(blurRestoreTimer);
  blurRestoreTimer = window.setTimeout(() => {
    blurRestoreTimer = undefined;
    const selection = window.getSelection();
    const hasSelection = !!selection && !selection.isCollapsed;
    if (!hasSelection) composerBusy.value = false;
  }, 120);
}

function onComposerFocus() {
  suspendComposerBlur();
}

function onComposerBlur() {
  restoreComposerBlurSoon();
}

onBeforeUnmount(() => {
  if (blurRestoreTimer !== undefined) window.clearTimeout(blurRestoreTimer);
});
const fileInput = ref<HTMLInputElement | null>(null);

const connected = computed(() => state.connected);
/** NeumorphismButton 组件根 DOM（模板 ref 拿到的是组件实例，取 $el）。 */
function btnElement(instance: unknown): HTMLElement | null {
  const el = (instance as { $el?: unknown } | null)?.$el;
  return el instanceof HTMLElement ? el : null;
}

const showAdapter = ref(false);
const adapterBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);

function toggleAdapter() {
  showAdapter.value = !showAdapter.value;
}
const showChecklist = ref(false);
const checklistBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);
const showContext = ref(false);

function toggleChecklist() {
  showChecklist.value = !showChecklist.value;
}
// 入口按钮固定与输入框间距 12px：观察输入框高度变化（auto-resize），
// bottom = composerHeight + 12(margin) + 12(gap)。
const composerFloatRef = ref<HTMLElement | null>(null);
const entryBottom = ref('170px');
let ctxObserver: ResizeObserver | null = null;

/**
 * 软键盘适配（移动端，2026-10）：iOS/Android 弹键盘时不改变 layout viewport，
 * 页面 overflow:hidden 的 SPA 里 fixed/absolute 输入区会被键盘盖住。
 * 监听 `visualViewport` 求「可视视口被压缩的高度」，注入输入区/入口行的
 * bottom（桌面恒 0，无影响）。阈值 80px：滤掉地址栏伸缩等 UI 抖动。
 */
const keyboardInset = ref(0);
const keyboardInsetPx = computed(() => `${keyboardInset.value}px`);
let visualViewport: VisualViewport | null = null;
function updateKeyboardInset() {
  if (!visualViewport) return;
  const inset = Math.round(
    window.innerHeight - visualViewport.height - visualViewport.offsetTop,
  );
  keyboardInset.value = inset > 80 ? inset : 0;
}

onMounted(() => {
  // 拖选监听：选区出现即临时关 blur（输入框未聚焦时也可能拖选已输入文本）。
  document.addEventListener('selectionchange', onSelectionChange);
  // 软键盘：仅在移动端挂监听（桌面视觉视口恒等于窗口，无收益）
  if (isMobile.value && window.visualViewport) {
    visualViewport = window.visualViewport;
    visualViewport.addEventListener('resize', updateKeyboardInset);
    visualViewport.addEventListener('scroll', updateKeyboardInset);
  }
  const target = composerFloatRef.value;
  if (!target) return;
  ctxObserver = new ResizeObserver(() => {
    const h = target.getBoundingClientRect().height;
    entryBottom.value = `${Math.round(h + 24)}px`;
  });
  ctxObserver.observe(target);
});
onBeforeUnmount(() => {
  ctxObserver?.disconnect();
  document.removeEventListener('selectionchange', onSelectionChange);
  if (visualViewport) {
    visualViewport.removeEventListener('resize', updateKeyboardInset);
    visualViewport.removeEventListener('scroll', updateKeyboardInset);
    visualViewport = null;
  }
});

function onSelectionChange() {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    suspendComposerBlur();
  } else if (composerBusy.value) {
    // 选择清空：延迟一拍恢复（区分拖选换向与真正结束）。
    restoreComposerBlurSoon();
  }
}

// 适配器按钮显隐：仅当当前 Agent（team）启用了 adapter 类插件时显示。
// 依据 TeamInfo 的 enabled_plugins 白名单判断（插件黑名单已移除），
// 与 Core apply_capabilities 的过滤语义一致。
const ADAPTER_PLUGIN_FALLBACK = ['echo-agent.instance.qq'];

const currentTeam = computed(() => {
  if (!props.activeTeamId) return null;
  return state.teams.find((t) => t.id === props.activeTeamId) ?? null;
});

/** 当前团队视角下的适配器插件 id 列表（无 plugins 数据时回退到内置 id） */
const adapterPluginIds = computed<string[]>(() => {
  const fromState = state.plugins.filter((p) => isInstancePluginKind(p.kind)).map((p) => p.id);
  return fromState.length ? fromState : ADAPTER_PLUGIN_FALLBACK;
});

/** 当前 Agent 是否启用了至少一个适配器插件（决定输入框上是否显示"适配器"按钮） */
const adapterAvailable = computed(() =>
  adapterPluginIds.value.some((id) => teamPluginEnabled(currentTeam.value, id)),
);

/** 上下文按钮显隐：management.panel 插件对当前 agent 启用才显示 */
const contextAvailable = computed(() =>
  teamPluginEnabled(currentTeam.value, 'echo-agent.management.panel'),
);

/** 清单按钮显隐：checklist 工具可用才显示（2026-09 起插件维度已移除，
 * 只受工具级白/黑名单与内置工具集包门控）。
 * 工具禁用后同步卸载对应 UI 入口与浮层，并清空本地清单状态。 */
const checklistAvailable = computed(() =>
  teamToolAvailable(currentTeam.value, 'checklist'),
);

// 插件/Team 更新回推后，若清单工具变为不可用，关闭残留弹层并清空徽标数据。
watch(checklistAvailable, (available) => {
  if (!available) {
    showChecklist.value = false;
    // 清单已不可用：丢弃当前会话的本地快照（其他会话/core 的不动）。
    // 两种键形态都清（新键带 team 维度、旧键退化形态）。
    delete state.checklists[checklistKey(state.activeRegion, state.activeTeamId, props.sessionId)];
    delete state.checklists[sessionKey(state.activeRegion, props.sessionId)];
  }
});

/** 当前会话的清单快照（复合键 (core, session_id)；global 视图聚合当前区域全部）。 */
const sessionChecklists = computed(() => {
  if (props.sessionId !== 'global') {
    // team 维度隔离（2026-10）。
    return checklistsForSession(state, props.sessionId);
  }
  // global 视图：汇总当前运行区域下各会话的清单（跨 core 不串）。
  const out = [];
  for (const [key, lists] of Object.entries(state.checklists)) {
    const core = key.includes('\u0000') ? key.slice(0, key.indexOf('\u0000')) : null;
    if (state.activeRegion == null || core === state.activeRegion) out.push(...lists);
  }
  return out;
});

/** 任务（Subagent/后台/并行/临时分支）按钮显隐：subagent 插件启用，
 * 或当前会话已有任务记录（即使插件后被禁用，历史任务仍可见）。 */
const sessionTasks = computed(() => {
  const core = state.activeRegion;
  const inCore = (t: { core?: string | null }) => core == null || (t.core ?? null) === core;
  return props.sessionId === 'global'
    ? state.tasks.filter(inCore)
    : state.tasks.filter((task) => task.sessionId === props.sessionId && inCore(task));
});

const sessionRunningTaskCount = computed(
  () =>
    sessionTasks.value.filter((task) => task.status === 'running').length,
);

const tasksAvailable = computed(
  () =>
    teamPluginEnabled(currentTeam.value, 'echo-agent.subagent') ||
    sessionTasks.value.length > 0,
);

const showTasks = ref(false);
const tasksBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);

function toggleTasks() {
  showTasks.value = !showTasks.value;
}

// 插件/Team 更新回推后，若任务入口变为不可用，关闭残留弹层。
watch(tasksAvailable, (available) => {
  if (!available) showTasks.value = false;
});

/** 当前智能体名下的会话（去重团队归属，供「会话」按钮显隐）。 */
const teamSessions = computed(() => {
  const active = props.activeTeamId ?? state.teams[0]?.id ?? null;
  return state.sessions.filter((s) => (s.team_id ?? null) === active);
});

/** 会话按钮显隐：可切换（>1 个会话）或并行多会话模式（含「全局」入口）时显示。 */
const sessionSwitcherAvailable = computed(() => {
  if (teamSessions.value.length > 1) return true;
  const team = state.teams.find((t) => t.id === (props.activeTeamId ?? state.teams[0]?.id));
  return loopModeOf(team) === 'parallel';
});

const showSessions = ref(false);
const sessionsBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);

function toggleSessions() {
  showSessions.value = !showSessions.value;
}

function pickSession(id: string) {
  showSessions.value = false;
  emit('selectSession', id);
}

/** 工作区按钮显隐：workspace 插件 + workspace 工具都可见才显示。 */
const workspaceAvailable = computed(() =>
  teamPluginEnabled(currentTeam.value, 'echo-agent.workspace') &&
  teamToolAvailable(currentTeam.value, 'workspace'),
);

const showWorkspace = ref(false);
const workspaceBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);

function toggleWorkspace() {
  showWorkspace.value = !showWorkspace.value;
}

// 插件/Team 更新回推后，若 workspace 插件变为不可用，关闭残留弹层。
watch(workspaceAvailable, (available) => {
  if (!available) showWorkspace.value = false;
});

// 切换 Agent 时若适配器/工作区/会话/任务面板打开则关闭，避免残留禁用 agent 的面板
watch(
  () => props.activeTeamId,
  () => {
    showAdapter.value = false;
    showWorkspace.value = false;
    showSessions.value = false;
    showTasks.value = false;
  },
);

// ── 双侧边栏（2026-09-24）：左右两列卡片容器，卡片可互相拖动 ──
// 卡片（连接状态 / 文件浏览器 / Shell / 临时分支）归属哪一列由
// `rail-layout.ts` 持有（可拖动、可持久化）；本组件只负责：
// 1. 两列的显隐——该列**登记**过卡片（`railLayout` 里有 id）或正在拖动时
//    渲染；登记列表为空（从未拖过 / 最后一张卡被拖走）才不占位；
// 2. 消息区留白——某列登记过卡片时给滚动区加同宽内边距，正文不被卡片压住
//    （此前只有右列：消息被限宽 640px 且左对齐，恰好躲开；加了左列后
//    正文会撞上卡片，故改为按列留白）。
// 「工作区」入口按钮仍只负责会话管理/git 弹层（与列无关）。
const RAIL_WIDTH = 324;

// 竖屏移动端（2026-10）：断点与库内 useTouchDevice 同源（innerWidth < 768），
// 移动端隐藏双侧边栏（卡片改经顶栏「卡片」抽屉访问）、消息区留白归零、
// 底部弹层改全宽形态。isMobile 变化是响应式的（库 composable 监听 resize）。
const { isMobile } = useTouchDevice();

/**
 * 某列是否有**可见**卡片（门控 × 用户排序）。
 *
 * 只给移动端「卡片」抽屉用：抽屉里没有「列占位」概念，门控不满足的列整块
 * 不渲染（空态由抽屉自己的「（当前无可见卡片）」文案承担）。
 * 桌面两列的存在性走 `railRegistered`（见下方 leftRailVisible），两者语义
 * 不同、不可合并。
 */
function railHasCards(side: 'left' | 'right'): boolean {
  return railHasVisibleCards(side, props.activeTeamId ?? null);
}

/**
 * 列的显隐：该列**登记**过卡片，或拖动进行中（拖动时需要两列都作为投放区）。
 * 移动端恒不渲染——卡片经顶栏「卡片」抽屉（PanelSidebar 复用）访问。
 *
 * 判据是「登记」而不是「当前可见」（2026-10 用户反馈「左侧栏莫名隐藏」）：
 * 卡片门控依赖**异步到达**的 Core 状态（workspace 激活态 / loopMode / teams
 * 列表 / 插件能力）——切 agent、工作区会话结束、断连重连的瞬时窗口都会让
 * 门控短暂失败。用「可见卡片数」当判据时整列跟着消失再重现（正文行宽也
 * 跟着抖）；左列若只放了条件性卡片（文件浏览器 / 临时分支），抖动最明显。
 * 登记列表只在用户**拖动落位**时变化，是稳定信号——列不再随业务状态闪烁，
 * 卡片进出改为列内部增删（空列在 RailStack 内显示占位提示）。
 * 用户把最后一张卡拖走时登记变空，列照常消失（显式意图，不算闪烁）。
 */
const leftRailVisible = computed(
  () => !isMobile.value && (railRegistered('left') || railDragEngaged.value),
);
const rightRailVisible = computed(
  () => !isMobile.value && (railRegistered('right') || railDragEngaged.value),
);

/**
 * 消息滚动区的左右留白（**登记**过卡片的列 = 列宽）。
 *
 * 与列显隐同判据，因此两处永不打架（否则会出现「列没了但留白还在」或
 * 「列在但正文压到卡片底下」）。相对旧实现（按「可见卡片」）的好处：
 * - 门控抖动时留白不跳——此前卡片瞬时门控失败会让正文行宽在 324px 与
 *   0 之间反复闪（用户观感：边栏莫名隐藏）；
 * - 拖动期间也不跳——被拖卡片只是从**所见列表**摘除，登记归属要到落位
 *   才变，正文行宽全程稳定，落位后一次性过渡（0.24s）。
 *
 * 注意返回**带单位的字符串**：`v-bind()` 注入 CSS 变量时数字无单位会被
 * 浏览器丢弃（padding-left: 324 非法）。
 */
const trayPadLeft = computed(() =>
  !isMobile.value && railRegistered('left') ? `${RAIL_WIDTH}px` : '0px',
);
const trayPadRight = computed(() =>
  !isMobile.value && railRegistered('right') ? `${RAIL_WIDTH}px` : '0px',
);

/**
 * 是否有会话区内的浮层/弹层打开（入口行弹出层、Agent 配置、上下文弹层…）。
 *
 * 用途：「回到底部」悬浮按钮在这些浮层打开时**隐藏**（2026-09-28）——该
 * 按钮浮在消息区下沿，而各弹出层恰好都从入口行向上展开（520px 宽、最高
 * 68vh），实测在窄视口下会盖住按钮（elementFromPoint 命中入口弹层）。
 * 与其用更高 z-index 把按钮压在浮层之上（视觉更糟），不如在浮层期间隐藏。
 */
const anyOverlayOpen = computed(() => {
  return (
    showChecklist.value ||
    showSessions.value ||
    showWorkspace.value ||
    showAdapter.value ||
    showTasks.value ||
    configOpen.value ||
    showContext.value
  );
});

// 当前会话是否在运行任务（用于显示"取消任务"按钮）
const busy = computed(() => {
  const a = state.activities[sessionKey(state.activeRegion, props.sessionId)];
  return !!a && ['thinking', 'tool', 'subagent'].includes(a.phase);
});

// ── Agent 配置悬浮弹层（会话区内） ──
const configOpen = ref(false);
const configTeam = computed(() => {
  const teams = state.teams;
  if (!teams.length) return null;
  const active = props.activeTeamId ? teams.find((t) => t.id === props.activeTeamId) : undefined;
  return active ?? teams[0];
});
// 弹层 bottom 偏移：入口行（含配置按钮，高约 30px）之上 12px
// entryBottom 为入口行距底部的 CSS 值（px 字符串），换算数值：
const configBottomOffset = computed(() => {
  const m = entryBottom.value.match(/(\d+)/);
  return (m ? parseInt(m[1], 10) : 170) + 30 + 12;
});
// 上下文弹层底部偏移与配置弹层一致：入口行（高约 30px）之上 12px
const ctxBottomOffsetCss = computed(() => `${configBottomOffset.value}px`);

// 活动指示浮条：思考/调用工具/子代理 的实时状态，让用户知道 agent 在干什么
const activityText = computed(() => {
  if (!busy.value) return '';
  const a = state.activities[sessionKey(state.activeRegion, props.sessionId)];
  switch (a?.phase) {
    case 'thinking':
      return a.detail ? `正在思考：${a.detail}…` : '正在思考…';
    case 'tool': {
      // 工具对当前 agent 不可见（已禁用）时模型不会调用——防御显示通用文案
      if (a.detail && teamToolAvailable(currentTeam.value, a.detail)) {
        return `正在调用工具 ${a.detail}…`;
      }
      return '正在处理…';
    }
    case 'subagent':
      return a?.detail ? `子代理工作中：${a.detail}…` : '子代理工作中…';
    default:
      return '';
  }
});

/** 推理消息所属会话当前是否仍在输出（thinking / tool / subagent）——打字机准入条件之一。 */
function reasoningSessionRunning(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  const phase = state.activities[sessionKey(state.activeRegion, sessionId)]?.phase;
  return phase === 'thinking' || phase === 'tool' || phase === 'subagent';
}

// 按会话过滤：全局视图显示全部；具体会话只显示归属该会话的消息。
//
// **渲染对象复用**（2026-10 性能修复，见 chat-message-cache.ts）：数据链
// （sessionMessagesFor 的浅拷贝 + toChatMessage）每次都产出全新对象，若直接
// 用它做 v-for 的 :message，任意一条变化都会让 1000+ 个 MessageItem 全部
// re-render。实测 1024 条消息下每次 delta 白花 143.8 ms（FPS 11.7 @4× CPU）。
// 现在按 key 缓存：渲染相关字段未变的条目沿用上次的对象引用，子组件 props
// 恒等 → Vue 跳过；只有真正变化的那一条重建。
const messages = computed<ChatMessage[]>(() => {
  const list =
    props.sessionId === 'global'
      ? state.trunk
      : sessionMessagesFor(state, props.sessionId, props.activeTeamId ?? null);
  const out: ChatMessage[] = new Array(list.length);
  const alive = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    alive.add(m.key);
    // 推理行走原路径：animate 由 claimReasoningAnimation 有状态地决定，
    // 缓存首次结果会改变它的语义（见 chat-message-cache.ts 模块注释）。
    if (m.role === 'reasoning') {
      const cm = toChatMessage(m);
      // 推理行打字机准入（2026-10）：实时到达 + 消息新鲜 + 会话仍在输出，
      // 且从未播放过——重新显示已完成卡片（切会话/重挂载）直接全量显示，
      // 只有正在输出的思考才用打字动画（见 reasoning-anim.ts）。
      cm.animate = claimReasoningAnimation({
        animate: m.animate,
        key: m.key,
        time: m.time,
        sessionRunning: reasoningSessionRunning(m.sessionId),
      });
      out[i] = cm;
      continue;
    }
    const cached = reuseChatMessage(m);
    if (cached) {
      out[i] = cached;
      continue;
    }
    const cm = toChatMessage(m);
    rememberChatMessage(m, cm);
    out[i] = cm;
  }
  // 丢弃已不在列表里的 key（会话切换 / FIFO 淘汰），防无界增长。
  retainChatMessages(alive);
  return out;
});

// 会话历史补拉（2026-10）：共享显示窗口 FIFO 淘汰后旧会话条目不可见——
// 激活会话时从事件日志派生（Core `RequestSessionHistory`）。
watch(
  [() => props.sessionId, () => props.activeTeamId, () => state.connected, () => state.activeRegion],
  () => {
    const sid = props.sessionId;
    if (!state.connected || !sid || sid === 'global') return;
    sendCommand({ RequestSessionHistory: { team_id: props.activeTeamId ?? null, session_id: sid, limit: 1000 } });
  },
  { immediate: true },
);

// ── 连续工作条目合并（2026-10 一般化；2026-09-19 起仅合并工具调用）──
// 工具调用与思考（推理）连续出现时合成一条 WorkRunGroup：折叠态 = 一排
// 小圆角矩形 chip（同一套通用排布——横向扩展、空间不足自动换行），点击
// chip 在下方浮现具体内容卡片；工具运行中默认折叠、全部完成且有失败时
// 自动展开首个失败项；思考播放中自动展开、播完自动收起（见 WorkRunGroup）。
type ChatRow =
  | { kind: 'single'; message: ChatMessage }
  | { kind: 'work-group'; key: string; items: WorkRunItem[] };

/**
 * spawn_subagent 的参数 → 单行任务摘要（工具行悬停/详情头部展示用）。
 *
 * 输入有**两种形态**：
 * - Core 时间线写入的摘要串 `{task=…… · timeout_secs=900}`（`timeline.rs`
 *   的 `summarize_timeline_value`，非合法 JSON）；
 * - 原始 JSON `{"task": "…"}`（其他来源/旧数据）。
 * 两者都尝试；`task` 值在摘要里已被 Core 截断到 48 字符，仅作标签展示。
 */
function subagentTaskLabel(input: string): string | undefined {
  let task: string | null = null;
  try {
    const parsed = JSON.parse(input) as { task?: unknown };
    if (typeof parsed.task === 'string') task = parsed.task;
  } catch {
    const match = input.match(/^\{task=([\s\S]*?)(?:\s·\s[a-z_]+=|\}$)|^\{task=([\s\S]*)$/);
    task = match ? (match[1] ?? match[2] ?? null) : null;
  }
  if (!task || !task.trim()) return undefined;
  const line = task.replace(/\s+/g, ' ').trim();
  return line.length > 80 ? `${line.slice(0, 80)}…` : line;
}
const workRowOf = (m: ChatMessageWithImages): WorkRunItem | null => {
  // 思考（推理）：面板扩展角色（库 ChatRole 无该角色，宽松比较后收窄）
  // ——与工具同列 chip，点击展开正文。
  if ((m.role as string) === 'reasoning') {
    return {
      kind: 'reasoning',
      key: String(m.id),
      text: m.content,
      // animate 已由 messages 内的打字机准入改写为布尔（命中才 true）。
      animate: m.animate === true,
      streaming: m.streaming === true,
      time: m.time ? formatTime(m.time) : undefined,
    };
  }
  // 子代理完成回报（`<subagent_event>` 合并钩子→结构化载荷）：与工具/思考
  // 同列 chip（同一套一般化排布），点击展开结论。载荷缺失时按内容降级。
  if ((m.role as string) === 'subagent') {
    const sub = m.subagent;
    return {
      kind: 'subagent',
      key: String(m.id),
      task: sub?.task ?? m.content,
      result: sub?.result ?? '',
      success: sub?.success ?? true,
      running: sub?.running === true,
      time: m.time ? formatTime(m.time) : undefined,
    };
  }
  const tool = m.tool;
  if (m.role !== 'tool' || !tool) return null;
  return {
    kind: 'tool',
    key: String(m.id),
    name: tool.name,
    input: tool.input,
    output: tool.output,
    status: tool.status,
    label: tool.name === 'spawn_subagent' ? subagentTaskLabel(tool.input ?? '') : undefined,
    time: m.time ? formatTime(m.time) : undefined,
    startedAtMs: tool.startedAtMs,
    elapsedMs: tool.elapsedMs,
  };
};

const messageRows = computed<ChatRow[]>(() => {
  const rows: ChatRow[] = [];
  for (const m of messages.value) {
    const item = workRowOf(m);
    if (!item) {
      rows.push({ kind: 'single', message: m });
      continue;
    }
    const last = rows[rows.length - 1];
    if (last && last.kind === 'work-group') {
      last.items.push(item);
    } else {
      rows.push({ kind: 'work-group', key: `work:${item.key}`, items: [item] });
    }
  }
  return rows;
});

function rowKey(row: ChatRow): string {
  return row.kind === 'work-group' ? row.key : String(row.message.id);
}
/** 吸底观察源：最后一条消息的尾部内容（滚动区内容同源）。 */
function trayWatchSource(): unknown {
  const last = messages.value[messages.value.length - 1];
  return [
    messages.value.length,
    last?.content,
    last?.reasoning?.length,
    last?.tool?.output,
    last?.branch?.entries.length,
  ];
}

// 吸底滚动（headless，2026-10-13 起直用 useChatScroll——原 ChatTray 组装件
// 已解散：滚动井视觉与跳转钮由本组件自组，见样式区与模板）。
const listRef = ref<HTMLElement | null>(null);
const { showJumpButton, handleScroll, scrollToBottom } = useChatScroll({
  container: listRef,
  watchSource: trayWatchSource,
});

// 初始挂载即定位到底部（瞬时，无平滑动画；同原 ChatTray 行为）。
onMounted(async () => {
  await nextTick();
  scrollToBottom('auto');
});

const emptyText = computed(() =>
  props.sessionId === 'global'
    ? '（暂无消息，从下方输入开始对话）'
    : `（会话 ${props.sessionId} 暂无消息，从下方输入开始对话）`,
);

/**
 * 首屏/重连加载态（2026-09-30）：消息列为空时的三态区分——
 *   1. 未连接     → 「正在连接 Core…」；
 *   2. 已连接但本次连接尚未收到过 TrunkTimeline → 「正在加载时间线…」；
 *   3. 收到过（哪怕空快照）→ 真正空态的「（暂无消息…）」（emptyText）。
 * 有磁盘缓存时时间线在挂载前已 hydrate（trunk 非空），直接进入正常渲染。
 */
const timelineLoading = computed(
  () => connected.value && !state.timelineArrivedOnce && state.trunk.length === 0,
);

// 空串占位 → 库回退到 locale 默认（输入消息，Enter 发送…）。
// 移动端（2026-10）：窄输入框里默认占位文本（303px）必然折行——即便库侧
// 已修「placeholder 撑高」，单行内也会被拦腰截断；且「Enter 发送 / Shift+
// Enter」在触屏键盘上本就不成立。移动端改用短占位。
const placeholder = computed(() => {
  if (!connected.value) {
    return isMobile.value ? '未连接到 Core…' : '未连接到 Core，暂时无法发送';
  }
  return isMobile.value ? '输入消息…' : '';
});

// ── 图片工具：压缩为 data URL（最长边 1600，优先 JPEG 0.85）──
// 多模态 API 按像素计 token，但请求体积由编码后大小决定：PNG 截图动辄数 MB，
// 直接塞进请求会让端点拒收整段请求。超过阈值就退化为 JPEG 并逐级缩小。
const MAX_ATTACHMENT_CHARS = 1_500_000;

function renderToDataUrl(img: HTMLImageElement, maxEdge: number, png: boolean): string {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解码失败'));
      img.onload = () => {
        try {
          // PNG 只在编码前体积不大时才保留无损（保透明），否则一律 JPEG。
          const keepPng = file.type === 'image/png' && file.size <= MAX_ATTACHMENT_CHARS * 0.75;
          let edge = 1600;
          let data = renderToDataUrl(img, edge, keepPng);
          for (let i = 0; i < 3 && data.length > MAX_ATTACHMENT_CHARS; i++) {
            edge = Math.max(320, Math.round(edge * 0.65));
            data = renderToDataUrl(img, edge, false);
          }
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function addFiles(files: FileList | File[]) {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  for (const file of list) {
    try {
      attachments.value.push(await fileToDataUrl(file));
    } catch {
      // 跳过无法解码的文件
    }
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1);
}

function onPaste(event: ClipboardEvent) {
  const files = event.clipboardData?.files;
  if (files && files.length > 0) {
    event.preventDefault();
    void addFiles(files);
  }
}

// 发送：文本 + 图片一起发出；发送后清空附件。
function onSend(content: string) {
  emit('send', content, attachments.value.slice());
  attachments.value = [];
}

// 消息是否带图（ChatMessage 类型无 images，扩展字段来自 chat-adapter）
// 消息图片：元素要么是可展示的 URL（Core 落盘图 `/media/<id>` 或遗留
// data URI），要么是空串（Core 侧"图片已省略"占位，保留数组长度以便计数）。
function imagesOf(message: ChatMessage): string[] {
  return (message as ChatMessageWithImages).images ?? [];
}

// 媒体引用地址：`/media/<id>` 附当前运行区域的 `?core=` 提示——Panel 后端
// 优先在该上游（SSH 隧道）拉取；本机媒体库命中路径不受影响（多一个查询
// 参数而已）。data URI 等其它形式原样返回。
function mediaSrc(img: string): string {
  if (!img.startsWith('/media/')) return img;
  const core = state.activeRegion;
  if (!core) return img;
  return `${img}${img.includes('?') ? '&' : '?'}core=${encodeURIComponent(core)}`;
}
</script>

<template>
  <div class="chat-view" :class="{ 'chat-view--overlay-open': anyOverlayOpen }" @paste="onPaste">
    <!-- 上下文入口：输入框上方左侧，磨砂玻璃按钮 -->
    <div class="entry-row">
      <div v-if="activityText" class="chat-activity">
        <span class="chat-activity__spinner" />
        <span class="chat-activity__text">{{ activityText }}</span>
      </div>
      <AgentSwitcher
        :active-team-id="props.activeTeamId ?? null"
        @select="(id, core) => emit('selectTeam', id, core)"
      />
      <!-- 配置当前 Agent：跳转到资源页并打开该 team 的配置编辑 -->
      <NeumorphismButton
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="配置当前 Agent（系统提示词 / 能力白名单 / 禁用工具等）"
        @click="configOpen = true"
      >
        <svg
          class="ctx-entry__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        配置
      </NeumorphismButton>
      <NeumorphismButton
        v-if="contextAvailable"
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="查看上下文占用"
        @click="showContext = true"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10" />
          <path d="M12 2v10h10" />
        </svg>
        上下文
      </NeumorphismButton>
      <NeumorphismBadge
        v-if="checklistAvailable"
        :value="sessionChecklists.length"
        :show-zero="false"
      >
        <NeumorphismButton
          ref="checklistBtnRef"
          class="ctx-entry"
          variant="glass"
          shape="pill"
          size="small"
          title="任务清单"
          @click="toggleChecklist"
        >
          <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          清单
        </NeumorphismButton>
      </NeumorphismBadge>
      <NeumorphismButton
        v-if="sessionSwitcherAvailable"
        ref="sessionsBtnRef"
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="切换会话（每个群/私聊独立上下文）"
        @click="toggleSessions"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        会话
      </NeumorphismButton>
      <NeumorphismButton
        v-if="workspaceAvailable"
        ref="workspaceBtnRef"
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="工作区会话（多会话 / 多目录 / git 状态；文件浏览器常驻右侧边栏）"
        @click="toggleWorkspace"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        工作区
      </NeumorphismButton>
      <NeumorphismButton
        v-if="adapterAvailable"
        ref="adapterBtnRef"
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="平台适配器"
        @click="toggleAdapter"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
        适配器
      </NeumorphismButton>
      <NeumorphismBadge
        v-if="tasksAvailable"
        :value="sessionRunningTaskCount"
        :show-zero="false"
      >
        <NeumorphismButton
          ref="tasksBtnRef"
          class="ctx-entry"
          variant="glass"
          shape="pill"
          size="small"
          title="任务（Subagent / 后台 / 分支，仅当前会话）"
          @click="toggleTasks"
        >
          <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M8 10h8" />
            <path d="M8 14h5" />
          </svg>
          任务
        </NeumorphismButton>
      </NeumorphismBadge>
    </div>

    <!-- 入口行面板统一由 PanelPopover 提供：定位、尺寸、外部点击和 Escape。 -->
    <PanelPopover v-model="showSessions" :anchor="btnElement(sessionsBtnRef)">
      <SessionSwitcher
        :active-team-id="props.activeTeamId ?? null"
        :active-session-id="props.sessionId"
        @select="pickSession"
      />
    </PanelPopover>
    <PanelPopover v-model="showWorkspace" :anchor="btnElement(workspaceBtnRef)">
      <WorkspacePanel :team-id="props.activeTeamId ?? null" />
    </PanelPopover>
    <PanelPopover v-model="showAdapter" :anchor="btnElement(adapterBtnRef)">
      <AdapterPanel :team-id="props.activeTeamId ?? null" :core="state.activeRegion ?? null" />
    </PanelPopover>
    <PanelPopover v-model="showTasks" :anchor="btnElement(tasksBtnRef)">
      <TasksPanel :session-id="props.sessionId" :core="state.activeRegion ?? null" />
    </PanelPopover>
    <PanelPopover v-model="showChecklist" :anchor="btnElement(checklistBtnRef)">
      <ChecklistSidebar
        :session-id="sessionId === 'global' ? undefined : sessionId"
        :lists="sessionId === 'global' ? sessionChecklists : undefined"
      />
    </PanelPopover>

    <!-- 上下文弹层：与 Agent 配置同几何（上/左/右 12px，底距入口行 12px）；
         点击弹层外背景关闭（@click.self），无独立返回按钮 -->
    <div v-if="showContext" class="ctx-overlay" @click.self="showContext = false">
      <div class="ctx-overlay__panel">
        <div class="ctx-overlay__head">
          <h3 class="ctx-overlay__title">上下文占用</h3>
          <span class="ctx-overlay__id">{{ props.activeTeamId ?? 'default' }}</span>
        </div>
        <div class="ctx-overlay__body">
          <ContextView
            :team-id="props.activeTeamId ?? null"
            :session-id="props.sessionId"
            :core="state.activeRegion ?? null"
          />
        </div>
      </div>
    </div>
    <!-- 消息列表：flex:1，滚动区独立（2026-10-13 起自组——原 ChatTray 组装件
         解散，吸底行为改直用 headless useChatScroll）。
         行模型由面板自组：连续工作条目（工具调用 + 思考 + 子代理完成）合并
         为一排小圆角矩形 chip（WorkRunGroup），其余消息逐条 MessageItem。 -->
    <div class="chat-view__tray">
      <div
        ref="listRef"
        class="chat-view__list"
        role="log"
        aria-live="polite"
        @scroll="handleScroll"
      >
      <div v-if="messageRows.length === 0" class="chat-view__empty">
        <template v-if="!connected">
          <NeumorphismSpinner size="large" />
          <span>正在连接 Core…</span>
        </template>
        <template v-else-if="timelineLoading">
          <NeumorphismSpinner size="large" />
          <span>正在加载时间线…</span>
        </template>
        <span v-else>{{ emptyText }}</span>
      </div>
      <template v-for="row in messageRows" :key="rowKey(row)">
        <WorkRunGroup
          v-if="row.kind === 'work-group'"
          :items="row.items"
          class="chat-view__item"
        />
        <template v-else-if="row.kind === 'single'">
          <div
            class="chat-view__item chat-view__item--msg"
            :class="{ 'chat-view__item--enter': (row.message as ChatMessageWithImages).animate }"
          >
            <div v-if="imagesOf(row.message).length" class="chat-view__images">
              <template v-for="(img, i) in imagesOf(row.message)" :key="i">
                <!-- 可展示项：Core 落盘图的 /media/<id> 引用（同源、懒加载、
                     强缓存）或遗留的 data URI。省略项（空串）计数占位。 -->
                <img
                  v-if="img"
                  :src="mediaSrc(img)"
                  class="chat-view__image"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span v-else class="chat-view__image-elided" title="图片数据过大，已省略">
                  图片已省略
                </span>
              </template>
            </div>
            <MessageItem :message="row.message" :format-time="formatTime" />
          </div>
        </template>
      </template>
      </div>
      <!-- 「回到底部」：离开底部时浮现（信号来自 useChatScroll；落位与
           隐藏规则见样式区——避开悬浮输入区与右侧栏卡片）。 -->
      <button
        v-if="showJumpButton"
        type="button"
        class="chat-view__jump"
        aria-label="跳转到最新消息"
        title="跳转到最新消息"
        @click="scrollToBottom()"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Agent 配置悬浮弹层：覆盖会话区（上/左/右 12px，底距配置按钮 12px） -->
    <AgentConfigModal
      v-if="configOpen && configTeam"
      :team="configTeam"
      :bottom-offset="configBottomOffset"
      @close="configOpen = false"
    />

    <!-- 双侧边栏（2026-09-24）：左右各一列卡片栈，卡片可在两列之间拖动
         （机制与动画见 ../rail-drag.ts；列显隐：该列**登记**过卡片或拖动中
         ——判据是登记而非「可见」，见上方 leftRailVisible 的注释）。
         列的进出走 Transition（opacity + 侧向轻移，仅 transform/opacity）：
         拖动中出现的投放区**不做入场过渡**（`.chat-rail--dropzone` 覆盖为
         `transition: none`）——落点命中读的是列矩形，动画位移会让命中飘。 -->
    <Transition name="chat-rail">
      <aside
        v-if="leftRailVisible"
        class="chat-rail chat-rail--left"
        :class="{ 'chat-rail--dropzone': railDragEngaged }"
      >
        <PanelSidebar
          side="left"
          :active-branch-id="props.activeBranchId ?? null"
          :team-id="props.activeTeamId ?? null"
          @select-branch="(id) => emit('selectBranch', id)"
          @manage-workspace="toggleWorkspace"
          @open-shell-detail="(id) => emit('openShellDetail', id)"
        />
      </aside>
    </Transition>
    <Transition name="chat-rail">
      <aside
        v-if="rightRailVisible"
        class="chat-rail chat-rail--right"
        :class="{ 'chat-rail--dropzone': railDragEngaged }"
      >
        <PanelSidebar
          side="right"
          :active-branch-id="props.activeBranchId ?? null"
          :team-id="props.activeTeamId ?? null"
          @select-branch="(id) => emit('selectBranch', id)"
          @manage-workspace="toggleWorkspace"
          @open-shell-detail="(id) => emit('openShellDetail', id)"
        />
      </aside>
    </Transition>

    <!-- 拖动拖影：跟随指针的卡片缩影（Teleport 到 body，fixed 定位） -->
    <RailDragGhost />

    <!-- 卡片抽屉（竖屏移动端，2026-10）：双侧边栏在窄屏隐藏（压死正文），
         卡片改经顶栏「卡片」按钮打开的底部 Drawer 访问——复用 PanelSidebar
         （门控/排序/工作区绑定全继承）。仅移动端渲染，桌面零影响。 -->
    <NeumorphismDrawer
      v-if="isMobile"
      v-model="mobileCardsDrawerOpen"
      position="bottom"
      title="信息卡片"
      width="78%"
    >
      <div class="mobile-cards">
        <PanelSidebar
          v-if="railHasCards('left')"
          side="left"
          :drag-enabled="false"
          :active-branch-id="props.activeBranchId ?? null"
          :team-id="props.activeTeamId ?? null"
          @select-branch="(id) => emit('selectBranch', id)"
          @manage-workspace="toggleWorkspace"
          @open-shell-detail="(id) => emit('openShellDetail', id)"
        />
        <PanelSidebar
          v-if="railHasCards('right')"
          side="right"
          :drag-enabled="false"
          :active-branch-id="props.activeBranchId ?? null"
          :team-id="props.activeTeamId ?? null"
          @select-branch="(id) => emit('selectBranch', id)"
          @manage-workspace="toggleWorkspace"
          @open-shell-detail="(id) => emit('openShellDetail', id)"
        />
        <p v-if="!railHasCards('left') && !railHasCards('right')" class="mobile-cards__empty">
          （当前无可见卡片）
        </p>
      </div>
    </NeumorphismDrawer>

    <!-- 输入区：作为 flex 子项固定占位（不遮挡消息），视觉上悬浮 -->
    <div
      ref="composerFloatRef"
      class="chat-composer-float"
      :class="{ 'chat-composer-float--busy': composerBusy }"
      @focusin="onComposerFocus"
      @focusout="onComposerBlur"
    >
      <!-- 待发送图片预览 -->
      <div v-if="attachments.length" class="chat-view__attachments">
        <div v-for="(img, i) in attachments" :key="i" class="chat-view__attach">
          <img :src="img" class="chat-view__attach-img" alt="" />
          <button
            class="chat-view__attach-remove"
            title="移除"
            aria-label="移除图片"
            @click="removeAttachment(i)"
          >
            <PanelIcon name="close" size="xs" />
          </button>
        </div>
      </div>
      <!-- 契约：ChatComposer 提供 #actions 插槽时*替换*渲染默认发送按钮，
           因此必须自己渲染 submit 按钮；删除该插槽会恢复库默认发送按钮。 -->
      <ChatComposer
        v-model="input"
        :disabled="!connected"
        :cancelable="false"
        :rows="1"
        :placeholder="placeholder"
        @send="onSend"
        @cancel="emit('cancel')"
      >
        <template #actions="{ submit, canSubmit }">
          <NeumorphismButton
            v-if="busy"
            class="chat-view__cancel"
            size="small"
            variant="glass"
            @click="emit('cancel')"
          >
            取消任务
          </NeumorphismButton>
          <NeumorphismButton
            class="chat-view__attach-btn"
            size="small"
            variant="glass"
            title="添加图片（或直接粘贴截图）"
            aria-label="添加图片"
            @click="fileInput?.click()"
          >
            <svg
              class="chat-view__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.5-4.5a2 2 0 0 0-2.83 0L5 19" />
            </svg>
          </NeumorphismButton>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="chat-view__file-input"
            @change="
              (e) => {
                const el = e.target as HTMLInputElement;
                if (el.files?.length) void addFiles(el.files);
                el.value = '';
              }
            "
          />
          <NeumorphismButton
            class="chat-view__send"
            size="small"
            variant="raised"
            :disabled="!canSubmit"
            @click="submit"
          >
            <svg
              class="chat-view__icon chat-view__icon--btn"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            <span>发送</span>
          </NeumorphismButton>
        </template>
      </ChatComposer>
    </div>
  </div>
</template>

<style scoped>
/*
 * 布局契约（有对应测试，改动需同步更新 src/components/ChatView.test.ts）：
 * 1. .chat-view 是纵向 flex 容器 + position:relative（定位上下文）；
 * 2. .chat-view__list（2026-10-13 起自身即滚动区——原 ChatTray 组装件解散）
 *    flex:1 + min-height:0 + overflow-y:auto，内容可滚动到输入框之下
 *    （输入框悬浮在上层，毛玻璃透出下层消息）；底部 padding-bottom 在
 *    滚动区内部预留输入框高度，保证最后一条消息仍可滚出可见；
 * 3. .chat-composer-float position:absolute 固定于底部（吸底悬浮），
 *    z-index 高于消息列表；半透明毛玻璃背景透出滚过的消息。
 */
.chat-view {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* 双侧边栏（2026-09-24）：会话视图左右两侧的常驻悬浮区（透明容器）；
   卡片本体是 RailStack 里的悬浮圆角矩形（毛玻璃）。
   空列仅在拖动中出现（作为投放区），因此平时只剩有卡片的列。 */
.chat-rail {
  position: absolute;
  top: 0;
  /* 下界统一让出入口行（底部功能条：活动/Agent 切换/配置/上下文/清单/会话）：
     入口行高 37px（实测，由按钮尺寸决定）+ 8px 间隙 = 45px。两列一致
     ——入口行按钮尺寸调整时同步此处。 */
  bottom: calc(v-bind(entryBottom) + 45px);
  z-index: 4;
  width: 324px;
  display: flex;
  flex-direction: column;
}
.chat-rail--left {
  left: 0;
}
.chat-rail--right {
  right: 0;
}
.chat-rail > :deep(.rail-stack) {
  flex: 1;
  min-height: 0;
}
/* 列开合过渡（Transition 注入的类）：只动 opacity/transform（可合成） */
.chat-rail-enter-active,
.chat-rail-leave-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.chat-rail-enter-from,
.chat-rail-leave-to {
  opacity: 0;
}
.chat-rail--left.chat-rail-enter-from,
.chat-rail--left.chat-rail-leave-to {
  transform: translateX(-12px);
}
.chat-rail--right.chat-rail-enter-from,
.chat-rail--right.chat-rail-leave-to {
  transform: translateX(12px);
}
/* 拖动中：列是投放区，必须即时出现/消失（不做位移，落点命中才准） */
.chat-rail--dropzone.chat-rail-enter-active,
.chat-rail--dropzone.chat-rail-leave-active {
  transition: none;
}
/* 减少动态效果：列进出直接切换 */
@media (prefers-reduced-motion: reduce) {
  .chat-rail-enter-active,
  .chat-rail-leave-active {
    transition: none;
  }
}

/* 拖动中：投放区提示（列内空态另有虚线框，见 RailStack） */
.chat-rail--dropzone > :deep(.rail-stack) {
  border-radius: 24px;
  background: color-mix(in srgb, var(--panel-accent) 5%, transparent);
  outline: 1px dashed color-mix(in srgb, var(--panel-accent) 28%, transparent);
  outline-offset: -4px;
}

/* 托盘包装（2026-10-13）：跳转钮的定位上下文（原 ChatTray 根元素的职责）。 */
.chat-view__tray {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 滚动区（2026-10-13 起本元素自身即滚动区——原 ChatTray 组装件解散，
   滚动井视觉 / 吸底行为（headless useChatScroll）/ 跳转钮全部自组）。
   预留空间加在滚动区*内部*——外层 padding 会压缩滚动高度，消息将永远
   无法滚到输入框后方；滚动区自身延伸到输入框后方，消息才能从毛玻璃
   底下划过。滚动井：凹陷背景（--nm-chat-tray-bg + inset 阴影）。 */
.chat-view__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: var(--nm-chat-tray-bg);
  box-shadow:
    inset 2px 2px 6px var(--nm-shadow-dark),
    inset -2px -2px 6px var(--nm-shadow-light);
  scrollbar-width: thin;
  scrollbar-color: var(--nm-neutral-300) transparent;

  /* 预留：
     - 底部：按输入框最大高度(5行,约156px) + 边距(12px) + 松量；
     - 左右：有卡片的边栏列宽（正文不被悬浮卡片压住）；拖动中归零，
       避免落位时行宽二次跳变。

     行距（2026-09-28 紧凑化）：库默认 12px 对"工作行"（推理块 / 工具行）
     过宽——一回合里推理与工具交替十几次，屏幕被空白吃掉。改为 6px：
     消息气泡用 .chat-view__item--msg 的 3px 边距补回呼吸（气泡间仍约 12px），
     工作行保持 6px 紧排；推理块/工具行自身不再带外边距。 */
  gap: 6px;
  padding: 18px var(--nm-spacing-md);
  padding-bottom: 190px;
  padding-left: v-bind(trayPadLeft);
  padding-right: v-bind(trayPadRight);
  transition: padding 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* 消息气泡（用户/Agent/系统/分支合并）：在 6px 容器间距上补 3px 边距，
   与旧版 12px 行距等效；工作行不受影响。 */
.chat-view__item--msg {
  margin: 3px 0;
  /* flex 列容器：让 MessageItem 内气泡的 `align-self`（库语义）生效——
     user 靠右 / agent 靠左 / system 居中，且短消息贴内容、长消息随列宽伸展
     （2026-09-30 修复：此前为 block，对齐失效导致全部左对齐固定宽）。 */
  display: flex;
  flex-direction: column;
}

/* 空态占位（行模型自组后由面板提供）；加载三态：转圈 + 文案垂直堆叠 */
.chat-view__empty {
  margin: auto;
  padding: 24px;
  color: var(--nm-text-placeholder);
  font-size: var(--nm-font-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* 吸底悬浮输入区：absolute 脱离文档流，盖在消息列表之上；
   半透明毛玻璃：更透的背景 + 高光 tint + 强 blur + 发光边框，
   在深色主题下也能明显看出玻璃质感 */
.chat-composer-float {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 5;
  padding: 12px;
  border-radius: 24px;
  /* 双层背景：低透明表面 + 顶部白色高光渐变（玻璃高光） */
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, #ffffff 10%, transparent) 0%,
      transparent 45%
    ),
    color-mix(in srgb, var(--nm-surface-raised) 42%, transparent);
  /* 性能（2026-09-18）：blur 20px→10px、去 saturate；聚焦/拖选期间由
     .chat-composer-float--busy 临时关闭 blur。大面积 backdrop-filter 每次
     重绘全量重栅格化，跨行拖选每帧触发，是拖选卡顿的根治点。 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--panel-glass-border);
  box-shadow:
    var(--panel-glass-shadow-md),
    0 0 0 0.5px var(--panel-glass-border),
    inset 0 1px 0 var(--panel-glass-highlight);
}

/* 聚焦/拖选期间：临时关毛玻璃（纯色底撑住视觉），拖选重绘不再触发
   大面积 blur 重栅格化。 */
.chat-composer-float--busy {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background: var(--nm-surface-raised);
}
/* 拖选卡顿根治之二（2026-09-18，2026-10 收敛）：库 NeumorphismTextarea 的
   hover/focused 1px translateY 抬升已在库侧移除（transform 层导致大段文本
   拖选慢路径，见 ui-frame CHANGELOG Unreleased）——此处的应用侧
   `transform: none !important` 覆盖已随之删除，不再需要。 */

/* 吸底跳转按钮（「回到底部」，2026-10-13 起自组——视觉吸收自原 ChatTray，
   落位沿用 2026-09-28 重排）：
   - 库默认贴右下角（right/bottom = 16px）——既被悬浮输入区压住，又被
     右侧栏卡片盖住（rail 列 z-index 4）；现落位：**右侧栏列左侧 16px**
     （无右栏时回到默认 16px 边距），纵向与边栏列底对齐（入口行上方 8px，
     同 `calc(entryBottom + 45px)`）。
   - 显式 z-index 5：高于 rail 列（4）、低于入口行（6）；纵向已错开，
     仅作防御。 */
.chat-view__jump {
  position: absolute;
  right: calc(v-bind(trayPadRight) + 16px);
  bottom: calc(v-bind(entryBottom) + 45px);
  z-index: 5;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--nm-border-radius-full);
  background-color: var(--nm-surface-color);
  color: var(--nm-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    4px 4px 10px var(--nm-shadow-dark),
    -3px -3px 8px var(--nm-shadow-light);
  transition:
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    color 0.2s ease;
}
@media (hover: hover) {
  .chat-view__jump:hover {
    transform: translateY(-2px);
    color: var(--nm-text-primary);
  }
}
.chat-view__jump:active {
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .chat-view__jump {
    transition: none;
  }
}
/* 会话区浮层打开期间隐藏（浮层从入口行向上展开，窄视口下会盖住按钮；
   见 anyOverlayOpen 注释——隐藏比叠层更好）。 */
.chat-view--overlay-open .chat-view__jump {
  display: none;
}

/* actions 行：图片按钮 + 发送按钮底对齐、间距统一 */
.chat-composer-float :deep(.nm-chat-composer__row) {
  align-items: flex-end;
  gap: 10px;
}
.chat-composer-float :deep(.nm-chat-composer__field) {
  flex: 1;
  min-width: 0;
}

/* 图标基准：取 --nm-icon-size-md（16px）——此前 17px/15px 两个自造档位，
  同一输入行内发送钮与附件钮图标大小不一致（UI Frame §8：尺寸须取
  12/14/16/18/20/24/32 枚举档）。 */
.chat-view__icon {
  width: var(--nm-icon-size-md);
  height: var(--nm-icon-size-md);
  flex: 0 0 auto;
}
.chat-view__cancel {
  flex: 0 0 auto;
  /* 与单行输入框内框等高，与发送/图片按钮保持同排同高 */
  height: calc(var(--nm-field-padding-y-md, 10px) * 2 + var(--nm-field-font-md, 14px) * 1.6);
  min-height: calc(var(--nm-field-padding-y-md, 10px) * 2 + var(--nm-field-font-md, 14px) * 1.6);
}

/* 图片附件按钮：方形圆角；高度与"初始 1 行时的输入框内框"等高
   （10px*2 padding + 14px*1.6 行高 = 42px），且固定不随 textarea 动态调整 */
.chat-view__attach-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--nm-field-padding-y-md, 10px) * 2 + var(--nm-field-font-md, 14px) * 1.6) !important; /* 正方形：宽 = 高 */
  height: calc(var(--nm-field-padding-y-md, 10px) * 2 + var(--nm-field-font-md, 14px) * 1.6) !important;
  border-radius: 12px !important; /* 与内框 textarea 圆角一致（12px） */
  padding: 0;
}


/* 发送按钮：图标 + 文字内联；高度与"初始 1 行时的输入框内框"等高（42px），
   固定在输入框外框右下角（bottom 等距），不随 textarea 多行变高而移动 */
.chat-view__send {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: calc(var(--nm-field-padding-y-md, 10px) * 2 + var(--nm-field-font-md, 14px) * 1.6);
  height: calc(var(--nm-field-padding-y-md, 10px) * 2 + var(--nm-field-font-md, 14px) * 1.6) !important;
  padding: 0 14px;
  /* 与内框一致的 12px 圆角；右下角圆心与外框右下角(24px)同心：
     24 - 12(padding) = 12 */
  border-radius: 12px !important;
}
.chat-view__icon--btn {
  /* 与 .chat-view__icon 同档（16px）：发送钮与附件钮并排，尺寸必须一致 */
  width: var(--nm-icon-size-md);
  height: var(--nm-icon-size-md);
}

/* 消息内图片 */
.chat-view__image-elided {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px dashed var(--nm-border-color, rgba(255, 255, 255, 0.2));
  font-size: 11px;
  color: var(--nm-text-placeholder, #888);
}
.chat-view__images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.chat-view__image {
  max-width: 260px;
  max-height: 200px;
  border-radius: 12px;
  border: 1px solid var(--nm-border-subtle);
  object-fit: contain;
  background: var(--nm-bg-color);
  box-shadow: 0 2px 10px var(--nm-shadow-dark, rgba(0, 0, 0, 0.28));
}

/* 待发送附件预览 */
.chat-view__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.chat-view__attach {
  position: relative;
}
.chat-view__attach-img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--nm-border-subtle);
  box-shadow: 0 2px 8px var(--nm-shadow-dark, rgba(0, 0, 0, 0.25));
  transition: transform 0.15s ease;
}
.chat-view__attach:hover .chat-view__attach-img {
  transform: translateY(-1px);
}
.chat-view__attach-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--nm-surface-color);
  color: var(--nm-text-secondary);
  cursor: pointer;
  box-shadow: 0 2px 6px var(--nm-shadow-dark, rgba(0, 0, 0, 0.35));
  transition: color 0.15s ease, background 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--nm-text-secondary);
}
.chat-view__attach-remove:hover {
  color: var(--nm-text-primary);
  background: var(--nm-surface-raised);
}
.chat-view__attach-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.85;
}
.chat-view__attach-btn:hover {
  opacity: 1;
}
.chat-view__file-input {
  display: none;
}
/* 输入框排布：内框零 padding（外框 12px 等宽）；meta 行紧凑；
   取消/图片/发送 同一 34px 高、底部对齐 */
.chat-composer-float :deep(.nm-chat-composer) {
  padding: 0;
}
.chat-composer-float :deep(.nm-chat-composer__meta) {
  position: absolute;
  top: 6px;
  right: 12px;
  min-height: 0;
  margin: 0;
  pointer-events: none;
}
.chat-composer-float :deep(.nm-chat-composer__meta .nm-chat-composer__cancel) {
  pointer-events: auto;
}
.chat-composer-float :deep(.nm-chat-composer__cancel) {
  width: 74px;
  height: 34px;
}
.chat-composer-float :deep(.nm-chat-composer__row) {
  align-items: flex-end;
}
/* 视觉闭环修复：textarea 组件底部 footer（字数统计占位）导致
   输入框可视底与 wrapper 底差 8px → 下间距(21px) > 左/上(13px)。
   隐藏 footer 并消除 wrapper 底部空隙，使下间距=13px 与左右等宽。 */
.chat-composer-float :deep(.nm-textarea__footer) {
  display: none !important;
}
.chat-composer-float :deep(.nm-textarea__wrapper) {
  padding-bottom: 0 !important;
}
.chat-composer-float :deep(.nm-textarea) {
  margin-bottom: 0 !important;
}
/* 默认 1 行，随内容自动扩展，最多 5 行：
   5 × 1.6em(行高) + 上下 padding(10px × 2)；超过后内部滚动。
   覆盖 auto-resize 的 overflow:hidden，使上限生效时可滚动。 */
.chat-composer-float :deep(.nm-textarea__field) {
  max-height: calc(8em + 20px);
  overflow-y: auto;
  /* 选择性能（2026-09-18）：把文本层提升为独立合成层，跨行拖选时
     选区重绘封装在本层内，不再每帧波及祖先毛玻璃层的整块重栅格化。 */
  will-change: transform;
  transform: translateZ(0);
}
/* 圆角同心：外框 24px、间距 12px → 内框（textarea）左侧圆角
   = 24 - 12 = 12px，圆角曲线与外框平行（同心）。右侧保持库默认。 */
.chat-composer-float :deep(.nm-textarea) {
  /* 内框圆角整体统一 12px（库默认右 16px 会与按钮 12px 不一致）：
     外框 24px - 12px padding = 12px，左右均与外框同心 */
  border-radius: 12px;
}


/* 入口行按钮：视觉（磨砂玻璃/胶囊/悬浮）由 ui-frame NeumorphismButton
   variant=glass shape=pill size=small 提供。
   更透：作用域内下调玻璃底色不透明度（45% vs 库默认 65%），
   并把模糊提到 24px 保持可读性。 */
.entry-row {
  --nm-glass-bg: color-mix(in srgb, var(--nm-surface-color) 45%, transparent);
  --nm-glass-blur: 24px;
}
.ctx-entry {
  flex: 0 0 auto;
}
.ctx-entry__icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

/* 上下文弹层：与 Agent 配置弹层同几何（覆盖层点击空白关闭） */
.ctx-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: var(--nm-mask-bg);
}
.ctx-overlay__panel {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  bottom: v-bind(ctxBottomOffsetCss);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid var(--panel-glass-border);
  background: color-mix(in srgb, var(--nm-surface-raised) 42%, transparent);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  box-shadow:
    var(--panel-glass-shadow-lg),
    0 0 0 0.5px var(--panel-glass-border),
    inset 0 1px 0 var(--panel-glass-highlight);
  overflow: hidden;
}
.ctx-overlay__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--nm-border-subtle);
  background: linear-gradient(color-mix(in srgb, #ffffff 6%, transparent), transparent);
}
.ctx-overlay__title {
  margin: 0;
  font-size: 15px;
  color: var(--nm-text-primary);
}
.ctx-overlay__id {
  font-size: 11px;
  color: var(--nm-text-secondary);
  font-family: var(--nm-font-mono, monospace);
}
.ctx-overlay__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 18px;
}


.entry-row {
  position: absolute;
  left: 20px;
  bottom: v-bind(entryBottom);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ctx-overlay__panel--narrow {
  max-width: 640px;
  align-self: center;
}



/* ── 实时消息入场动画（历史回放不播） ── */
.chat-view__item--enter {
  animation: msg-enter 0.28s ease-out both;
}
@keyframes msg-enter {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── 活动指示浮条：思考中 / 调用工具 / 子代理 ── */
.chat-activity {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--panel-glass-border);
  background: color-mix(in srgb, var(--nm-surface-raised) 48%, transparent);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  font-size: 12px;
  color: var(--nm-text-secondary);
  box-shadow: var(--panel-glass-shadow-md);
}
.chat-activity__spinner {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--panel-accent) 30%, transparent);
  border-top-color: var(--panel-accent);
  animation: activity-spin 0.8s linear infinite;
}
.chat-activity__text {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes activity-spin {
  to { transform: rotate(360deg); }
}

/* ═══════════════════════════════════════════════════════════════════════
   竖屏移动端（2026-10，断点 768px，与库 useTouchDevice.isMobile 同源）
   桌面样式即上方默认；本段只做窄屏收敛。参考 document/panel/panel-mobile.md。
   ═══════════════════════════════════════════════════════════════════════ */
@media (max-width: 767.98px) {
  /* 入口行：7 按钮 + AgentSwitcher 必然超宽——改横向滚动工具条，
     右界 8px 保证可滑到底（此前无右界、右侧按钮超出屏外不可达）。
     隐藏滚动条（触摸滑动本身有惯性反馈）。 */
  .entry-row {
    left: 8px;
    right: 8px;
    /* 键盘弹出时与输入区同步抬升（入口行锚在输入区上方 8px） */
    bottom: calc(v-bind(entryBottom) + v-bind(keyboardInsetPx));
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    /* 横向滚动容器：纵向滚动完全交给消息区 */
    touch-action: pan-x;
    padding-bottom: 2px;
  }
  .entry-row::-webkit-scrollbar {
    display: none;
  }
  .entry-row > * {
    flex: 0 0 auto;
  }
  /* 活动浮条不占满：截断更紧，给按钮留浏览空间 */
  .chat-activity__text {
    max-width: 42vw;
  }

  /* 输入区：左右收窄 + 底部安全区（Home 指示条）+ 软键盘偏移；圆角与桌面一致 */
  .chat-composer-float {
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px) + v-bind(keyboardInsetPx));
    padding: 10px;
    border-radius: 20px;
  }
  /* iOS 聚焦自动缩放对策：输入字号提至 16px（<16px 聚焦必缩放）。
     只放大打字面，不改工具栏按钮/占位字号观感。 */
  .chat-composer-float :deep(.nm-textarea__field) {
    font-size: 16px;
  }

  /* 消息气泡：窄屏减少两侧浪费 */
  .chat-view__list :deep(.msg-item__bubble) {
    max-width: 88%;
  }

  /* 会话区覆盖层（上下文 / Agent 配置）：桌面贴会话框 12px —— 窄屏收为
     8px 近全屏，最大化内容宽度；内部表格各自横向滚动（见各组件）。 */
  .ctx-overlay {
    inset: 6px;
    bottom: calc(v-bind(entryBottom) + 24px);
    border-radius: 18px;
  }
  .ctx-overlay__panel {
    border-radius: 16px;
  }
  .mobile-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
  /* 抽屉里的卡片栈 = 一条纵向列表：RailStack 的 `height: 100%` + 槽位
     `flex: 1 1 0` 是「桌面常驻列」语义——在抽屉里会让每列各占满一屏、
     要滚动两次才看全，且卡片被拉成整屏高。改为按内容排列，滚动交给抽屉
     本身（移动端传 drag-enabled=false，无跨列拖动，见 RailStack）。 */
  .mobile-cards :deep(.rail-stack) {
    height: auto;
    min-height: 0;
  }
  .mobile-cards :deep(.rail-stack__list) {
    display: block;
  }
  .mobile-cards :deep(.rail-stack__slot) {
    display: block;
  }
  .mobile-cards :deep(.rail-stack__slot + .rail-stack__slot) {
    margin-top: 12px;
  }
  .mobile-cards__empty {
    margin: 12px 0;
    text-align: center;
    color: var(--nm-text-secondary);
    font-size: 13px;
  }
}
</style>
