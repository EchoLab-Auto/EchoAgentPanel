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
import { lazy, preloadLazy } from '../lazy';
import { ensureWorkspaceSessions } from '../workspace-prefetch';
import NeumorphismBadge from '@echolab-auto/ui-frame/components/NeumorphismBadge';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
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
import { checklistKey, sessionKey, teamKey } from '../keys';
import { isInstancePluginKind, teamPluginEnabled, teamToolAvailable } from '../capabilities';
import { loopModeOf } from '../protocol';
import MessageItem from './MessageItem.vue';
import { composerCornerSpan, composerOutline, toClipPath } from '../utils/squircle';
import ChecklistSidebar from './ChecklistSidebar.vue';
import WorkRunGroup, { type WorkRunItem } from './WorkRunGroup.vue';
import PanelSidebar from './PanelSidebar.vue';
import SessionOverlay, { type OverlayInset } from './SessionOverlay.vue';
import RailDragGhost from './RailDragGhost.vue';
import { railHasVisibleCards, railRegistered } from '../rail-cards';
import { mobileCardsDrawerOpen } from '../mobile-cards';
import { entryOverlay, type EntryOverlayId } from '../overlays';
import { railDragEngaged } from '../rail-drag';
import { claimReasoningAnimation } from '../reasoning-anim';
import {
  rememberChatMessage,
  retainChatMessages,
  reuseChatMessage,
} from '../chat-message-cache';
// 弹层按需加载（2026-10 审计修复）：入口行弹层与配置/上下文覆盖层首次
// 打开时才加载对应 chunk（此前全部静态进首包——不打开也付加载成本）。
//
// 2026-10 补预热（**为什么不满足于"按需"**）：按需下载意味着点开那一刻才开始
// 拉 chunk，而覆盖层是 `v-if="open"` —— 下载期间是一片**空玻璃壳**（连标题栏
// 都在 chunk 里）。实测点开工作区：4G 258ms / 3G 871ms / 弱网(800ms RTT)
// 2104ms 的纯空白，观感与"卡死/按钮不见了"完全一致。
// 现在两条预热时机（见 `warmOverlayChunks`）：入口行首次交互（hover/focus/
// touch）立刻预热，以及首屏空闲时预热全部——按需加载的成本优势保留（不点就
// 不下载），但把等待挪到了用户真正需要之前。
const loaders = {
  agentConfig: () => import('./AgentConfigModal.vue'),
  context: () => import('./ContextView.vue'),
  instance: () => import('./InstancePanel.vue'),
  workspace: () => import('./WorkspacePanel.vue'),
  sessions: () => import('./SessionSwitcher.vue'),
  tasks: () => import('./TasksPanel.vue'),
} as const;

const AgentConfigModal = lazy(loaders.agentConfig, 'AgentConfigModal');
const ContextView = lazy(loaders.context, 'ContextView');
const InstancePanel = lazy(loaders.instance, 'InstancePanel');
const WorkspacePanel = lazy(loaders.workspace, 'WorkspacePanel');
const SessionSwitcher = lazy(loaders.sessions, 'SessionSwitcher');
const TasksPanel = lazy(loaders.tasks, 'TasksPanel');

/** 入口行按钮 → 对应的 chunk 键（按 `toggleOverlay` 的 id 一一对应）。 */
const WARM_BY_OVERLAY: Record<EntryOverlayId, keyof typeof loaders> = {
  config: 'agentConfig',
  context: 'context',
  checklist: 'context', // 清单与上下文同属 ContextView 侧栏，共用一份 chunk
  sessions: 'sessions',
  workspace: 'workspace',
  instance: 'instance',
  tasks: 'tasks',
};

/**
 * 入口行上的「用户意图」事件 → 预热对应 chunk。
 *
 * 挂在容器上而不是每个按钮：入口行最多 8 个控件、还会随插件能力增减，逐个绑
 * 监听每加一个按钮都要改；容器上取一次 `closest` 即可，且 `pointerover` 会
 * 冒泡到容器（`pointerenter` 不冒泡，不能用）。
 *
 * 只处理**认识**的按钮（`data-overlay` 标记），其余（Agent 切换是锚定浮层、
 * 已在首包）忽略。
 */
function warmFromEvent(event: Event): void {
  const target = event.target as HTMLElement | null;
  const host = target?.closest('[data-overlay]') as HTMLElement | null;
  const id = host?.dataset.overlay as EntryOverlayId | undefined;
  if (!id) return;
  const scope = WARM_BY_OVERLAY[id];
  if (scope) warmOverlayChunks(scope);
  // 数据也一起提前（chunk 与数据并行）：指针停在按钮上的那几百毫秒足够
  // 把一个 WS 往返跑完，真正点下去时卡片已经能直接画出来。
  prefetchOverlayData(id);
}

/**
 * 预热覆盖面板 chunk。
 *
 * `scope`：
 * - `'all'`：首屏空闲时调一次（`requestIdleCallback`，退回 setTimeout）——
 *   页面加载完、浏览器不忙时把 6 个 chunk 拉下来，点开即开；
 * - `'workspace'` 等：入口行 hover/focus 该按钮时**只**预热它那一份（用户
 *   意图已经很明确，立刻给最高优先级）。
 *
 * 幂等且静默失败：见 `lazy.ts::preloadLazy`。
 */
function warmOverlayChunks(scope: keyof typeof loaders | 'all'): void {
  if (scope === 'all') {
    for (const loader of Object.values(loaders)) preloadLazy(loader);
    return;
  }
  preloadLazy(loaders[scope]);
}

/** 首屏空闲预热（只跑一次；页面隐藏时推迟到可见）。 */
let warmed = false;
function scheduleIdleWarmup(): void {
  if (warmed) return;
  const run = () => {
    if (warmed) return;
    if (document.visibilityState === 'hidden') return; // 后台标签页别抢带宽
    warmed = true;
    warmOverlayChunks('all');
  };
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (ric) ric(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
}

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
  openShellDetail: [sessionId: string, core: string | null];
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
// ── 入口行覆盖面板：单一状态（2026-10 统一） ──
//
// 用户要求：「入口行除 Agent 切换以外的弹层统一成一种样式（大小 = 会话消息
// 区），并且唤起一个就关掉另一个」。互斥不靠「打开前逐个关」——那样每加一个
// 弹层就要改 N 处；这里只留**一个** id，任何时刻最多一个为真，互斥是结构性的。
//
// 状态本体住在 `overlays.ts`（2026-10 提出去）：顶栏的压缩进度指示器也要能
// 打开「上下文」面板，而它与本组件是兄弟——写不了这里的内部 ref。

/**
 * 覆盖面板**打开前**要立刻发出的数据请求（与 chunk 下载并行）。
 *
 * 背景：面板的数据请求原本都在 `onMounted` 里发 —— 那是 chunk 下载**之后**。
 * 两个网络往返互不依赖却串行，弱网（800ms RTT / 200kbps）下点开工作区要
 * 5552ms 才看到卡片里的按钮（其中 chunk 只占 1102ms）。
 *
 * 目前只有工作区需要（其余面板的数据要么随 `RequestState` 快照已到，要么在
 * 面板里按实例/会话按需拉）。要加新的一项时：这里加一行 + 面板侧的补拉也走
 * 同一个 `ensure*` 函数（它自带"已有数据/已在飞就不发"的去重）。
 */
function prefetchOverlayData(id: EntryOverlayId): void {
  if (id === 'workspace') {
    ensureWorkspaceSessions(props.activeTeamId ?? null, state.activeRegion ?? null);
  }
}

/** 打开某个覆盖面板（自动关闭其它的），或再次点击同一按钮时关闭。 */
function toggleOverlay(id: EntryOverlayId) {
  entryOverlay.value = entryOverlay.value === id ? null : id;
}

/** 无条件关闭（点面板外 / Esc / 选择后）。 */
function closeOverlay() {
  entryOverlay.value = null;
}

// 数据预热改挂在状态变化上（而不是 `toggleOverlay` 里）：`entryOverlay` 现在
// 是模块级状态，顶栏的进度指示器也能打开「上下文」面板——预热若仍写在本组件
// 的点击回调里，那条路径就会漏掉（面板打开后才开始拉数据）。
watch(
  entryOverlay,
  (id) => {
    if (id) prefetchOverlayData(id);
  },
  { flush: 'sync' },
);
// 入口按钮固定与输入框间距 12px：观察输入框高度变化（auto-resize），
// bottom = composerHeight + 12(margin) + 12(gap)。
const composerFloatRef = ref<HTMLElement | null>(null);
const entryBottom = ref('170px');
let ctxObserver: ResizeObserver | null = null;

/**
 * 输入区轮廓（clip-path）—— 移动端贴合设备屏幕角用。
 *
 * 为什么不用 border-radius：它只能画圆弧，而 iPhone 屏角是超椭圆；圆弧贴
 * 超椭圆无论取什么半径都会在 45° 附近错位（实测最优仍有 2.3px 波动）。
 * 这里直接算真实轮廓的折线交给 `clip-path: path()`（Safari 支持）。
 *
 * 两条 CSS 变量：
 * - `--composer-clip`：外轮廓（卡片裁剪）
 * - `--composer-corner-r`：贴角区半径，供内层控件算同心圆角
 *
 * 桌面 / 直角屏（`--composer-inset` 未定义或屏角为 0）不启用，退回
 * border-radius 口径 —— clip-path 变量留 `none`。
 */
const composerClip = ref('none');
const composerCornerR = ref('');

/**
 * 静止态（单行、无附件）的卡片半径 = 卡片静止高 / 2 —— 上下角尺寸的上限。
 *
 * 为什么需要它：四个角等大要求「上角 + 下角 = 卡片高」，而卡片静止高只有
 * 93px（输入行 65.6 + 状态行 17 + 间隙），一半是 46.5px；贴角跨度 R−d 在
 * iPhone 上是 41~56px，超了就得让两角各吃一半。
 *
 * 为什么不能用「当前高 / 2」：多行输入会把卡片从 93 撑到 170，那样每打一行
 * 两角就长大一次，用户读作抖动。这里把「输入框长出来的高度」从当前高里刨掉，
 * 得到**与内容无关**的静止高：
 *   `restH = 卡片高 − (输入框当前高 − 单行内框高)`
 * 其中「单行内框高」的锚点不能用 `--chat-control-h`（calc 表达式，computed
 * 不求值），改用发送/附件按钮 —— 它们被钉在 `--chat-control-h` 且**不随多行
 * 变高**。任何一步测不到就返回 undefined（调用方退回「按当前半高封顶」）。
 */
function restHalfHeight(): number | undefined {
  const el = composerFloatRef.value;
  const card = el?.querySelector<HTMLElement>('.chat-composer-float__card');
  const field = el?.querySelector<HTMLElement>('.nm-textarea');
  const anchor = el?.querySelector<HTMLElement>('.chat-view__send, .chat-view__attach-btn');
  if (!card || !field || !anchor) return undefined;
  const cardH = card.getBoundingClientRect().height;
  const grew = field.getBoundingClientRect().height - anchor.getBoundingClientRect().height;
  const restH = cardH - Math.max(0, grew);
  // 小于 8px 说明模型对不上（字号被系统放大等），交给默认行为
  return restH > 8 ? restH / 2 : undefined;
}

/** 上一次测到的输入行高度（= --chat-control-h 的 used value）。 */
let lastControlH = 0;

function updateComposerClip() {
  const el = composerFloatRef.value;
  if (!el) return;
  // 输入行高度变了（跨屏角档位：`--chat-control-h` 吃 `--panel-display-radius`），
  // 但库的 auto-resize 高度是**内联 px**，只在自己收到 input 时重算 —— 变矮时
  // 它会卡在旧值上（实测 402 → 393 跨档：按钮 58 → 45.6，文本域仍是 58，
  // 卡片因此停在 105 而不会收到 93）。补一次 input 让库按新 min-height 重算。
  const anchor = el.querySelector<HTMLElement>('.chat-view__send, .chat-view__attach-btn');
  const controlH = anchor?.getBoundingClientRect().height ?? 0;
  if (lastControlH && controlH && Math.abs(controlH - lastControlH) > 0.5) {
    const field = el.querySelector<HTMLTextAreaElement>('.nm-textarea__field');
    if (field?.style.height) field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (controlH) lastControlH = controlH;

  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const screenRadius = Number.parseFloat(style.getPropertyValue('--panel-display-radius')) || 0;
  // 留白取**实测位置**，不解析 CSS 变量值：变量现在是 clamp()/calc() 表达式
  // （2026-10 起随屏角联动），自定义属性的 computed value 并不求值，
  // parseFloat('clamp(14px, …)') = NaN —— 之前会静默清零、整块 clip 失效。
  // rect.left 就是「输入区左边缘到屏幕左边」的真实距离，与 rect.width 同源；
  // 它含 env(safe-area-inset-left)（横屏刘海时 > 变量值），此时按真实位置
  // 画轮廓才是对的。变量是否**存在**仍作为「是否启用贴合模式」的开关。
  const insetDeclared = style.getPropertyValue('--composer-inset').trim();
  const inset = insetDeclared ? rect.left : 0;
  if (rect.width < 2 || rect.height < 2 || inset <= 0) {
    composerClip.value = 'none';
    composerCornerR.value = '';
    return;
  }
  const geometry = {
    width: rect.width,
    height: rect.height,
    inset,
    screenRadius,
    // 超椭圆指数 2.5：2026-10 用 Apple 官方 bezel PNG 直接量屏幕角得到
    // n = 2.42~2.54（16/17 两代 8 个机型，拟合残差 ≤0.4px），不再是
    // 「45° 落在 0.26~0.29R、对应 n≈2.3~3.0」的区间推测。取 2.5 时
    // 45° 处内缩 = (1−2^(−1/2.5))R = 0.242R；模型若真落在 2.42~2.54，
    // 间隙波动 < 0.5px（n 偏 0.1 约换 0.4px 的角部误差）。
    exponent: 2.5,
    steps: 24,
    // 上下角尺寸锁在「静止态半高」：不锁的话多行输入把卡片从 93 撑到 170 时
    // 两角会跟着长大（旧口径实测上角 9.75 → 34.75 → 58.25），每打一行形状就
    // 变一次 —— 不是用户的操作对象，读起来像抖动。锁住后长出来的高度变成
    // 竖直直边（本来就是更想要的形状）。
    cornerMax: restHalfHeight(),
  } as const;
  composerClip.value = toClipPath(composerOutline(geometry));
  // 内层圆角：真实生效的贴角跨度扣掉 padding+border，与外轮廓同心。
  // 不能再用 `screenRadius − inset` —— 四角等大之后跨度被静止半高封顶，
  // 那个值比实际跨度大一圈，内层控件会显得"比外框还圆"。
  composerCornerR.value = `${Math.max(0, composerCornerSpan(geometry))}px`;
}

const composerStyle = computed(() => ({
  '--composer-clip': composerClip.value,
  ...(composerCornerR.value ? { '--composer-corner-r': composerCornerR.value } : {}),
}));

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
    updateComposerClip();
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

// 实例按钮显隐：仅当当前 Agent（team）启用了 instance 类插件时显示。
// 依据 TeamInfo 的 enabled_plugins 白名单判断（插件黑名单已移除），
// 与 Core apply_capabilities 的过滤语义一致。
const ADAPTER_PLUGIN_FALLBACK = ['echo-agent.instance.qq'];

const currentTeam = computed(() => {
  if (!props.activeTeamId) return null;
  return state.teams.find((t) => t.id === props.activeTeamId) ?? null;
});

/** 当前团队视角下的实例插件 id 列表（无 plugins 数据时回退到内置 id） */
const instancePluginIds = computed<string[]>(() => {
  const fromState = state.plugins.filter((p) => isInstancePluginKind(p.kind)).map((p) => p.id);
  return fromState.length ? fromState : ADAPTER_PLUGIN_FALLBACK;
});

/** 当前 Agent 是否启用了至少一个实例插件（决定输入框上是否显示"实例"按钮） */
const instanceAvailable = computed(() =>
  instancePluginIds.value.some((id) => teamPluginEnabled(currentTeam.value, id)),
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
    if (entryOverlay.value === 'checklist') closeOverlay();
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

// 插件/Team 更新回推后，若任务入口变为不可用，关闭残留弹层。
watch(tasksAvailable, (available) => {
  if (!available && entryOverlay.value === 'tasks') closeOverlay();
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

/**
 * 入口行横向滚动的「还有更多」提示（2026-10 移动端布局 v2）。
 *
 * 背景：入口行最多可挂 8 个控件（AgentSwitcher + 配置/上下文/清单/会话/工作区/
 * 任务/实例），375px 屏上必然溢出。v1 只是 `overflow-x: auto` + 隐藏滚动条——
 * 用户在窄屏上看不出右边还有按钮（实测首屏只露出前 3-4 个）。
 *
 * v2：可滚且未滚到底时，右端叠一个渐隐 + `›` 提示；滚到底即消失。不改布局、
 * 不动按钮顺序（保留肌肉记忆），只补「还有内容」这一条视觉信号。
 * 桌面：入口行不溢出 → `entryScrollable` 恒 false → 提示不渲染，零回归。
 */
const entryRowRef = ref<HTMLElement | null>(null);
const entryScrollable = ref(false);
const entryAtEnd = ref(true);

function syncEntryScroll(): void {
  const el = entryRowRef.value;
  if (!el) return;
  const max = el.scrollWidth - el.clientWidth;
  entryScrollable.value = max > 2;
  entryAtEnd.value = el.scrollLeft >= max - 2;
}

function pickSession(id: string) {
  closeOverlay();
  emit('selectSession', id);
}

/** 工作区按钮显隐：workspace 插件 + workspace 工具都可见才显示。 */
const workspaceAvailable = computed(() =>
  teamPluginEnabled(currentTeam.value, 'echo-agent.workspace') &&
  teamToolAvailable(currentTeam.value, 'workspace'),
);
// 入口行按钮随工具可用性增减（会话/工作区/任务/实例各有 v-if），任一变化都要重算。
watch(
  [sessionSwitcherAvailable, workspaceAvailable, tasksAvailable, instanceAvailable],
  () => void nextTick(syncEntryScroll),
);
onMounted(() => {
  scheduleIdleWarmup();
  syncEntryScroll();
  window.addEventListener('resize', syncEntryScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener('resize', syncEntryScroll));

/**
 * 打开工作区会话管理（入口按钮与文件浏览器卡的「工作区会话管理 →」共用）。
 * 走单一状态：从侧栏按钮打开时同样会关掉其它覆盖面板。
 */
function toggleWorkspace() {
  toggleOverlay('workspace');
}

// 插件/Team 更新回推后，若 workspace 插件变为不可用，关闭残留弹层。
watch(workspaceAvailable, (available) => {
  if (!available && entryOverlay.value === 'workspace') closeOverlay();
});

// 切换 Agent 时若实例/工作区/会话/任务面板打开则关闭，避免残留禁用 agent 的面板
watch(
  () => props.activeTeamId,
  () => closeOverlay(),
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
 * 是否有覆盖面板打开（入口行七项：会话 / 工作区 / 实例 / 任务 / 清单 /
 * 上下文 / 配置）。
 *
 * 用途：「回到底部」悬浮按钮在面板打开时**隐藏**（2026-09-28；2026-10 面板
 * 统一后仍然成立）——按钮浮在消息区下沿，而面板现在**就是**整个消息区，
 * 叠在一起只会互相干扰。与其用更高 z-index 把按钮压在面板之上，不如隐藏。
 */
const anyOverlayOpen = computed(() => entryOverlay.value !== null);

// 当前会话是否在运行任务（用于显示"取消任务"按钮）
const busy = computed(() => {
  const a = state.activities[sessionKey(state.activeRegion, props.sessionId)];
  return !!a && ['thinking', 'tool', 'subagent'].includes(a.phase);
});

// ── 覆盖面板的几何：上下边界对齐侧栏（2026-10 统一） ──
//
// 口径演变（两次纠正，写下来免得再猜）：
// 1. 先是「会话消息区」（`.chat-view__tray`）—— 但 tray 是 `flex: 1`，它的
//    下界就是视图底，面板照样铺到底，结果**内容被输入区与入口行挡住**；
// 2. 改成「铺满整个会话视图」（`top/bottom: 0`）—— 盖住了输入区，面板底边
//    落到会话框底，看起来像被截了一段；
// 3. 用户要求「上到会话框顶、下到入口行上边缘」；
// 4. 最终口径（用户）：**上下边界对齐左右侧栏**——`top: 0`、`bottom` 取
//    `.chat-rail` 的同一个表达式 `entryBottom + 45`（入口行高 37 + 8px 间隙）。
//    于是面板上沿与侧栏上沿齐、下沿与侧栏下沿齐，三块（左栏 / 面板 / 右栏）
//    在同一条水平线上收口，输入区与入口行完整露在下方。
//
// 横向扣掉边栏留白（`trayPadLeft/Right`）——侧栏是常驻信息（连接状态 /
// 文件浏览器 / Git / Shell），面板不该把它压掉；扣除后面板的左右边界正好是
// 侧栏的内侧边缘。
const viewRootRef = ref<HTMLElement | null>(null);
const overlayInset = ref<OverlayInset | null>(null);

/**
 * 侧栏下界与入口行的净距（入口行高 37 + 8px 间隙）。
 *
 * **与 `.chat-rail` 的 `bottom` 同一事实源**：覆盖面板的上下边界要对齐侧栏
 * （用户 2026-10 要求），所以两处都读这一个值——CSS 侧经 `v-bind(railEntryGap)`
 * 取用，JS 侧用它算 `overlayInset.bottom`。改动时只改这里。
 */
const RAIL_ENTRY_GAP = 45;
const railEntryGap = `${RAIL_ENTRY_GAP}px`;

function syncOverlayInset() {
  const root = viewRootRef.value;
  if (!root) return;
  const r = root.getBoundingClientRect();
  if (r.width <= 0) return;
  const tray = root.querySelector<HTMLElement>('.chat-view__tray');
  const t = tray?.getBoundingClientRect() ?? r;
  const padLeft = Number.parseFloat(trayPadLeft.value) || 0;
  const padRight = Number.parseFloat(trayPadRight.value) || 0;
  // 下界 = 侧栏下界（= 入口行上方 8px 净距）：`entryBottom + RAIL_ENTRY_GAP`，
  // 与 `.chat-rail` 的 bottom 完全一致，所以面板与左右栏上下齐平。窄屏还要
  // 叠加软键盘内缩（入口行在窄屏按 `entryBottom + keyboardInset` 抬升）。
  const bottomBase = Number.parseFloat(entryBottom.value) || 170;
  const bottom = Math.max(0, Math.round(bottomBase + RAIL_ENTRY_GAP + keyboardInset.value));
  overlayInset.value = {
    top: 0,
    bottom,
    left: Math.max(0, Math.round(t.left - r.left + padLeft)),
    right: Math.max(0, Math.round(r.right - t.right + padRight)),
  };
}

let overlayObserver: ResizeObserver | null = null;
onMounted(() => {
  syncOverlayInset();
  if (typeof ResizeObserver === 'undefined') return;
  overlayObserver = new ResizeObserver(syncOverlayInset);
  if (viewRootRef.value) overlayObserver.observe(viewRootRef.value);
  const tray = viewRootRef.value?.querySelector<HTMLElement>('.chat-view__tray');
  if (tray) overlayObserver.observe(tray);
});
onBeforeUnmount(() => {
  overlayObserver?.disconnect();
  overlayObserver = null;
});
// 输入区高度 / 边栏留白 / 移动端切换 / 软键盘都会改面板边界的分量；
// 打开面板时也重算一次——关闭期间视口可能变过，而 ResizeObserver 只对
// 「被观察元素自身尺寸变化」触发，未必覆盖得到。
watch(
  [entryBottom, trayPadLeft, trayPadRight, isMobile, keyboardInset, entryOverlay],
  () => void nextTick(syncOverlayInset),
);

const configTeam = computed(() => {
  const teams = state.teams;
  if (!teams.length) return null;
  const active = props.activeTeamId ? teams.find((t) => t.id === props.activeTeamId) : undefined;
  return active ?? teams[0];
});

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

/**
 * **当前会话真正生效的** API profile：`{ name, scope }`。
 *
 * 解析顺序与 Core 完全一致（会话级覆盖 → persona 引用 → 全局激活 → 顶层默认）：
 *
 *   ① 会话级覆盖 `state.sessionApiOverrides[sessionId]`
 *      （工作区对话自己的 `api_profile`，Core 侧 `set_session_provider`）
 *   ② 当前 agent 的 `[agent.teams.*].api_profile`
 *      （Core `apply_named_profile`：把该 profile 的 provider/model **合入**
 *      这个 persona 自己的顶层字段，只影响该 agent 的会话）
 *   ③ 全局 `active_api`（`[agent].active_api`，`apply_active_profile`）
 *   ④ 都没有 → 顶层默认配置（`[agent].provider` / `[agent].model`）
 *
 * 为什么第 ② 层必须在这里（2026-10 修 bug）：徽标此前只解析 ①③④，于是切到
 * `api_profile` 与全局 `active_api` 不同的 agent 时——本机「EchoCode」
 * （`deepseek-self-1` / `deepseek-flash`）对全局 `kimi`——**入口行卡片写着
 * `deepseek-flash`、徽标却仍显示 `kimi / k3.1-pro`**：同一个界面对"这条回答
 * 用哪个 API"给出两个互相矛盾的答案，用户无从判断哪个是真的。
 * 现在 ② 与 `AgentSwitcher.resolveModel` 同源，卡片与徽标不可能再打架。
 */
const apiEffective = computed<{ name: string; scope: string }>(() => {
  const override = state.sessionApiOverrides[props.sessionId] ?? '';
  if (override) return { name: override, scope: '本会话覆盖' };
  const team = currentTeam.value ?? state.teams[0] ?? null;
  const persona = team?.api_profile ?? '';
  if (persona) return { name: persona, scope: `agent「${team?.name || team?.id || ''}」` };
  const global = state.api?.active_api ?? '';
  if (global) return { name: global, scope: '全局激活' };
  return { name: '', scope: '顶层默认配置' };
});

/** 徽标文案：`provider / model`（profile 取不到时回落顶层，与 Core 同语义）。 */
const apiLabel = computed(() => {
  const api = state.api;
  if (!api) return '';
  const { name } = apiEffective.value;
  const profile = name ? api.profiles?.find((x) => x.name === name) : undefined;
  const provider = profile?.provider || api.provider || '';
  const model = profile?.model || api.model || '';
  if (!provider && !model) return '';
  if (!provider) return model;
  if (!model) return provider;
  return `${provider} / ${model}`;
});

/** apiLabel 的悬停说明：profile 名 + 生效层级（徽标上看不到这两层）。 */
const apiTitle = computed(() => {
  const { name, scope } = apiEffective.value;
  // 引用悬空（profile 被删/改名）：Core 的 apply_named_profile 会保留顶层值，
  // 徽标也回落到顶层——但得说明白，否则用户会以为徽标在骗人。
  const missing = !!name && !!state.api && !state.api.profiles?.some((p) => p.name === name);
  const note = missing ? '（供应商池中无此 profile，实际回落顶层默认）' : '';
  return name
    ? `API：${apiLabel.value || '未知'}\n来源：${scope} · profile「${name}」${note}`
    : `API：${apiLabel.value || '未知'}\n来源：${scope}`;
});

/** 推理消息所属会话当前是否仍在输出（thinking / tool / subagent）——打字机准入条件之一。 */
function reasoningSessionRunning(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  const phase = state.activities[sessionKey(state.activeRegion, sessionId)]?.phase;
  return phase === 'thinking' || phase === 'tool' || phase === 'subagent';
}

// ── 渲染窗口（2026-10 P0 性能止血）────────────────────────────────────
//
// 消息列表此前**全量**适配 + 全量 `v-for`（无虚拟滚动 / 无窗口）：会话多长
// DOM 就有多大、"越用越卡"。实测（本机 CDP，1600×1000，1× CPU）：
//
// | 显示行数 | 单次 delta 全链路 | 一次回答（120 delta）掉帧 | DOM 节点 |
// | --- | --- | --- | --- |
// | 300   | 3.9 ms  | 1 / 119（60fps）  | 3.7 K |
// | 1000  | 12.6 ms | 23 / 119          | 11.5 K |
// | 2000  | 23.1 ms | **117 / 119（30fps）** | 22.8 K |
// | 2000（4× CPU） | — | 118 / 119（7.5fps） | 22.8 K |
//
// 只适配 + 渲染尾部 `WINDOW_INITIAL` 条，更早的按需扩窗（`WINDOW_STEP`）。
// **切片必须在适配之前**：`toChatMessage` / 缓存快照判等是 O(条数) 的，
// 放在切片后（而不是在 messageRows 里切）才能让每次 delta 的成本只与
// **窗口大小**相关，与历史长度无关。
//
// 为什么不做虚拟滚动：变量高度（Markdown / 图片 / 代码块 / 可展开工具卡）
// 的虚拟滚动要重做吸底、锚点跳转、Ctrl+F、入场动画；实测收益等价而风险
// 高得多。
const WINDOW_INITIAL = 200;
const WINDOW_STEP = 200;
const renderWindow = ref(WINDOW_INITIAL);

// 切会话 / 切 agent：回到"最新一屏"（旧窗口大小不透传，避免无谓的长列表）。
watch(
  [() => props.sessionId, () => props.activeTeamId],
  () => {
    renderWindow.value = WINDOW_INITIAL;
  },
);

// 按会话过滤：全局视图显示全部；具体会话只显示归属该会话的消息。
//
// 单独一层：它是**合并历史快照 ⊕ 窗口增量**的唯一入口（见
// state.ts::sessionMessagesFor），一次变更只求值一次，供窗口切片与
// 「加载更早」的计数共用。
const sourceMessages = computed(() =>
  props.sessionId === 'global'
    ? state.trunk
    : sessionMessagesFor(state, props.sessionId, props.activeTeamId ?? null),
);

/** 未渲染的历史条数（>0 时显示「加载更早」入口）。 */
const hiddenMessageCount = computed(() =>
  Math.max(0, sourceMessages.value.length - Math.min(sourceMessages.value.length, renderWindow.value)),
);

/**
 * Core 那边还有更早的条目（`SessionHistory.total > 已加载`）。
 *
 * 渐进式拉取（2026-10）后，"本地已加载的都渲染完"不再等于"没有更早的了"
 * ——首拉只拿 300 条，而事件日志里的会话可能有一千多条。此时按钮必须
 * **仍然显示**（否则用户再也够不到更早的历史），点击改为向 Core 多拉一档。
 */
const olderInCore = computed(() => {
  const sid = props.sessionId;
  if (!sid || sid === 'global') return false;
  const hist = state.sessionHistory[checklistKey(state.activeRegion, props.activeTeamId ?? null, sid)];
  return hist ? hist.total > hist.messages.length : false;
});

/**
 * Core 的时间线缓冲区里还有更早的条目（`TrunkTimeline.has_more`；2026-10 分页）。
 *
 * 首屏只收最新 `TIMELINE_INITIAL_WINDOW` 条（Core 侧 1024 条上限、压缩后约
 * 0.6 MB），更早的内容由「加载更早」按 `RequestTimelineEarlier` 向上翻页。
 *
 * 只对**当前查看的 team**生效：`timelineHasMore` 按 `teamKey(core, team)` 存，
 * 与 `teamTimelines` 同键。
 */
const olderInTimeline = computed(() => {
  if (!state.connected) return false;
  const key = teamKey(state.activeRegion, props.activeTeamId ?? null);
  return state.timelineHasMore[key] === true;
});

/** 「加载更早」入口是否显示（本地未渲染 ∪ 会话历史未拉完 ∪ 时间线未翻完）。 */
const showEarlier = computed(
  () => hiddenMessageCount.value > 0 || olderInCore.value || olderInTimeline.value,
);

/** 入口文案：本地还有就报数，只有远端有就只说"更早"。 */
const earlierLabel = computed(() =>
  hiddenMessageCount.value > 0
    ? `加载更早的消息（还有 ${hiddenMessageCount.value} 条）`
    : '加载更早的消息',
);

// **渲染对象复用**（2026-10 性能修复，见 chat-message-cache.ts）：数据链
// （sessionMessagesFor 的浅拷贝 + toChatMessage）每次都产出全新对象，若直接
// 用它做 v-for 的 :message，任意一条变化都会让 1000+ 个 MessageItem 全部
// re-render。实测 1024 条消息下每次 delta 白花 143.8 ms（FPS 11.7 @4× CPU）。
// 现在按 key 缓存：渲染相关字段未变的条目沿用上次的对象引用，子组件 props
// 恒等 → Vue 跳过；只有真正变化的那一条重建。
//
// 窗口化之后只适配尾部窗口（见上）：缓存里也就只有窗口内的 key 存活。
const messages = computed<ChatMessage[]>(() => {
  const list = sourceMessages.value;
  const start = Math.max(0, list.length - renderWindow.value);
  const out: ChatMessage[] = new Array(list.length - start);
  const alive = new Set<string>();
  for (let i = start; i < list.length; i++) {
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
      out[i - start] = cm;
      continue;
    }
    const cached = reuseChatMessage(m);
    if (cached) {
      out[i - start] = cached;
      continue;
    }
    const cm = toChatMessage(m);
    rememberChatMessage(m, cm);
    out[i - start] = cm;
  }
  // 丢弃已不在列表里的 key（会话切换 / FIFO 淘汰），防无界增长。
  retainChatMessages(alive);
  return out;
});

// 会话历史补拉（2026-10）：共享显示窗口 FIFO 淘汰后旧会话条目不可见——
// 激活会话时从事件日志派生（Core `RequestSessionHistory`）。
//
// **渐进式拉取**（2026-10 内存/切会话治理）：此前固定 `limit: 1000`，而渲染
// 窗口只有 200 条——切一次会话就白拉 5 倍的量（Core 派生 + 传输 +
// `toDisplayMessages` 全量转换 + 写 store，实测切会话 33 ms）。现在按需：
// 初始 `HISTORY_STEP` 条；用户点「加载更早」把窗口扩到已加载量之外时再
// 加拉一档（见 `loadEarlier`）。
const HISTORY_STEP = 300;
const historyLimit = ref(HISTORY_STEP);

watch(
  [
    () => props.sessionId,
    () => props.activeTeamId,
    () => state.connected,
    () => state.activeRegion,
    historyLimit,
  ],
  () => {
    const sid = props.sessionId;
    if (!state.connected || !sid || sid === 'global') return;
    sendCommand({
      RequestSessionHistory: { team_id: props.activeTeamId ?? null, session_id: sid, limit: historyLimit.value },
    });
  },
  { immediate: true },
);

// 切会话 / 切 agent：拉取档位复位（新会话从最新一屏开始）。
watch([() => props.sessionId, () => props.activeTeamId], () => {
  historyLimit.value = HISTORY_STEP;
});

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
/**
 * 工作行对象缓存（2026-10 P0 性能止血）：`messageRows` 是**数组级** computed
 * ——任意一条消息变化（流式 delta 每几十毫秒一次）都会让它整体重算，于是
 * 每次都要对**全部**消息重跑 `workRowOf`（每条工作行还要 `formatTime` +
 * `JSON.parse` 子代理参数）。实测 2000 行时这一块占单次 delta 的 19%
 * （另 44% 是 Intl，见 `chat-adapter.ts::formatTime` 的 memo）。
 *
 * 未变消息的渲染对象已被 `chat-message-cache` 复用（**引用恒等**），因此可以
 * 直接用它做 WeakMap 键：只有真正变化的那一条会重建 WorkRunItem。
 * 用 WeakMap 而非 Map：消息被 FIFO 淘汰后条目随对象一起回收，无需手工清理。
 * 推理行走原路径（`messages` 刻意不缓存其渲染对象，见 chat-message-cache
 * 模块注释）→ 每次都是新对象 → 不命中，行为与之前一致。
 */
const workRowCache = new WeakMap<ChatMessageWithImages, WorkRunItem | null>();

const workRowOf = (m: ChatMessageWithImages): WorkRunItem | null => {
  const cached = workRowCache.get(m);
  if (cached !== undefined) return cached;
  const built = buildWorkRow(m);
  workRowCache.set(m, built);
  return built;
};

const buildWorkRow = (m: ChatMessageWithImages): WorkRunItem | null => {
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

/**
 * 行对象缓存（2026-10 性能修复，P0 第二步）：**让没变化的行保持引用恒等**。
 *
 * 上一步（`workRowOf` 的 WeakMap）只稳住了**条目**（`WorkRunItem`），但
 * `messageRows` 每次都新建 `rows` 数组与每个组的 `items` 数组——于是任意一条
 * 消息变化（流式 delta 每几十毫秒一次）都会让窗口里**每个** `WorkRunGroup`
 * 拿到"新"的 `items` prop（数组引用变了），全部重渲染。
 *
 * 实测（vitest，100 组 × 5 chip，窗口 200 条 → 渲染 34 组）：
 *   修复前：10 次 delta → 子组件 update **340 次**（= 34 组 × 10 次，全部）
 *   修复后：10 次 delta → 只更新真正变化的那一组
 *
 * 做法：条目对象本身已是复用的（渲染对象缓存 + WeakMap），所以"成员引用全等"
 * 等价于"内容没变"。行外壳因此可以复用——连同它的 `items` 数组一起。配合模板
 * 上的 `v-memo="[row]"`，未变化的行连 vnode 都不再创建。
 */
const rowCache = new Map<string, ChatRow>();

/** 两个条目数组是否引用全等（长度 + 逐项 ===）。 */
function sameItemRefs(a: WorkRunItem[], b: WorkRunItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

const messageRows = computed<ChatRow[]>(() => {
  // 两趟：先切段（相邻工作条目合并），再按段复用行外壳。
  // 为什么要分两趟：一个组的成员要扫完才知道，边扫边建就没有"上一次的成员表"
  // 可比。
  type Segment =
    | { kind: 'single'; message: ChatMessageWithImages }
    | { kind: 'work'; items: WorkRunItem[] };
  const segments: Segment[] = [];
  for (const m of messages.value) {
    const item = workRowOf(m);
    if (!item) {
      segments.push({ kind: 'single', message: m });
      continue;
    }
    const last = segments[segments.length - 1];
    if (last && last.kind === 'work') last.items.push(item);
    else segments.push({ kind: 'work', items: [item] });
  }

  const rows: ChatRow[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    if (seg.kind === 'single') {
      const key = String(seg.message.id);
      seen.add(key);
      const prev = rowCache.get(key);
      if (prev && prev.kind === 'single' && prev.message === seg.message) {
        rows.push(prev);
      } else {
        const row: ChatRow = { kind: 'single', message: seg.message };
        rowCache.set(key, row);
        rows.push(row);
      }
      continue;
    }
    const key = `work:${seg.items[0]!.key}`;
    seen.add(key);
    const prev = rowCache.get(key);
    if (prev && prev.kind === 'work-group' && sameItemRefs(prev.items, seg.items)) {
      rows.push(prev);
    } else {
      const row: ChatRow = { kind: 'work-group', key, items: seg.items };
      rowCache.set(key, row);
      rows.push(row);
    }
  }
  // 清理已消失的行（FIFO 窗口淘汰 / 切会话 / 组被拆开）：缓存规模始终 = 当前行数。
  if (rowCache.size > seen.size) {
    for (const key of rowCache.keys()) if (!seen.has(key)) rowCache.delete(key);
  }
  return rows;
});

function rowKey(row: ChatRow): string {
  return row.kind === 'work-group' ? row.key : String(row.message.id);
}

/**
 * 「加载更早」：扩窗 + 保持视觉位置。
 *
 * 补偿基准用**距底部距离**（前插场景下等价于"当前视野不动"，且对浏览器
 * 自带 scroll anchoring 幂等——它若已补偿，这里再设一次结果不变）。
 *
 * **多次补偿**（2026-10 实测）：前插的 200 行里含延迟加载的 Markdown
 * chunk 与图片，其高度在插入后还会变化（一次补偿会残留 ~100 px 偏移）。
 * 因此在 nextTick / 下一帧 / 300 ms 后各补偿一次——每次都按**最新**
 * scrollHeight 重算，收敛且互不叠加（只改 scrollTop，不改高度）。
 */
async function loadEarlier(): Promise<void> {
  const list = listRef.value;
  const fromBottom = list ? list.scrollHeight - list.scrollTop : 0;
  // 本地已加载的都渲染完，但更早的内容还在 Core：
  // 1) 会话历史未拉完（`SessionHistory.total > 已加载`）→ 多拉一档；
  // 2) 否则（全局视图 / 历史已到顶）→ 按最老条目的 seq 向上翻时间线页。
  // 两条路径都**先不扩窗**：新条目到达后 `hiddenMessageCount` 自然 > 0，
  // 入口仍在，用户可继续点（手感一致）。
  if (renderWindow.value >= sourceMessages.value.length) {
    if (olderInCore.value) {
      historyLimit.value += HISTORY_STEP;
      return;
    }
    if (olderInTimeline.value) {
      // 锚点 = 已加载的**最老条目的 ord**（不是 seq、也不是条数）：
      // seq 会因就地更新而乱序，条数会被分页期间的新增打乱——只有 ord
      // 严格递增且永不变更，翻页才不漏条目。
      const anchorOrd = sourceMessages.value[0]?.ord ?? 0;
      if (anchorOrd > 0) {
        sendCommand({
          RequestTimelineEarlier: {
            team_id: props.activeTeamId ?? null,
            before_ord: anchorOrd,
            limit: WINDOW_STEP * 2,
          },
        });
      }
      return;
    }
  }
  renderWindow.value += WINDOW_STEP;
  const restore = () => {
    if (list) list.scrollTop = list.scrollHeight - fromBottom;
  };
  await nextTick();
  restore();
  requestAnimationFrame(() => {
    restore();
    window.setTimeout(restore, 300);
  });
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
  <div ref="viewRootRef" class="chat-view" :class="{ 'chat-view--overlay-open': anyOverlayOpen }" @paste="onPaste">
    <!-- 上下文入口：输入框上方左侧，磨砂玻璃按钮 -->
    <div
      ref="entryRowRef"
      class="entry-row"
      @scroll.passive="syncEntryScroll"
      @pointerover="warmFromEvent"
      @focusin="warmFromEvent"
      @touchstart.passive="warmFromEvent"
    >
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
        data-overlay="config"
        @click="toggleOverlay('config')"
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
        data-overlay="context"
        @click="toggleOverlay('context')"
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
          class="ctx-entry"
          variant="glass"
          shape="pill"
          size="small"
          title="任务清单"
          data-overlay="checklist"
          @click="toggleOverlay('checklist')"
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
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="切换会话（每个群/私聊独立上下文）"
        data-overlay="sessions"
        @click="toggleOverlay('sessions')"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        会话
      </NeumorphismButton>
      <NeumorphismButton
        v-if="workspaceAvailable"
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="工作区会话（多会话 / 多目录 / git 状态；文件浏览器常驻右侧边栏）"
        data-overlay="workspace"
        @click="toggleWorkspace"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        工作区
      </NeumorphismButton>
      <NeumorphismButton
        v-if="instanceAvailable"
        class="ctx-entry"
        variant="glass"
        shape="pill"
        size="small"
        title="平台实例"
        data-overlay="instance"
        @click="toggleOverlay('instance')"
      >
        <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
        实例
      </NeumorphismButton>
      <NeumorphismBadge
        v-if="tasksAvailable"
        :value="sessionRunningTaskCount"
        :show-zero="false"
      >
        <NeumorphismButton
          class="ctx-entry"
          variant="glass"
          shape="pill"
          size="small"
          title="任务（Subagent / 后台 / 分支，仅当前会话）"
          data-overlay="tasks"
          @click="toggleOverlay('tasks')"
        >
          <svg class="ctx-entry__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M8 10h8" />
            <path d="M8 14h5" />
          </svg>
          任务
        </NeumorphismButton>
      </NeumorphismBadge>
      <!-- 「还有更多」提示（2026-10 v2）：仅在入口行可横滚且未滚到底时出现。
           叠在容器右端（sticky 右贴边，不随内容滚动），滚到底即消失。 -->
      <span
        v-if="entryScrollable && !entryAtEnd"
        class="entry-row__more"
        aria-hidden="true"
      >›</span>
    </div>

    <!-- 入口行覆盖面板（2026-10 统一）：除 Agent 切换外的七项共用
         `SessionOverlay` —— 几何 = 会话消息区的矩形、同一套玻璃外壳、点外面 /
         Esc 关闭；开关由单一 `entryOverlay` 驱动，因此**同一时刻只可能开一个**
         （唤起另一个自动关掉当前）。Agent 切换仍用锚定浮层（PanelPopover）。 -->
    <SessionOverlay
      :open="entryOverlay === 'sessions'"
      :inset="overlayInset"
      :ignore="entryRowRef"
      label="会话"
      @close="closeOverlay()"
    >
      <SessionSwitcher
        :active-team-id="props.activeTeamId ?? null"
        :active-session-id="props.sessionId"
        @select="pickSession"
      />
    </SessionOverlay>
    <SessionOverlay
      :open="entryOverlay === 'workspace'"
      :inset="overlayInset"
      :ignore="entryRowRef"
      label="工作区会话"
      @close="closeOverlay()"
    >
      <WorkspacePanel :team-id="props.activeTeamId ?? null" />
    </SessionOverlay>
    <SessionOverlay
      :open="entryOverlay === 'instance'"
      :inset="overlayInset"
      :ignore="entryRowRef"
      label="实例管理"
      @close="closeOverlay()"
    >
      <InstancePanel :team-id="props.activeTeamId ?? null" :core="state.activeRegion ?? null" />
    </SessionOverlay>
    <SessionOverlay
      :open="entryOverlay === 'tasks'"
      :inset="overlayInset"
      :ignore="entryRowRef"
      label="任务与分支"
      @close="closeOverlay()"
    >
      <TasksPanel :session-id="props.sessionId" :core="state.activeRegion ?? null" />
    </SessionOverlay>
    <SessionOverlay
      :open="entryOverlay === 'checklist'"
      :inset="overlayInset"
      :ignore="entryRowRef"
      label="清单"
      @close="closeOverlay()"
    >
      <!-- 清单是「卡片」形态的内容：铺满整块消息区会把进度条拉成一米长，
           限宽后仍靠左上（列表与卡片栈的既有视觉）。 -->
      <div class="overlay-narrow">
        <ChecklistSidebar
          :session-id="sessionId === 'global' ? undefined : sessionId"
          :lists="sessionId === 'global' ? sessionChecklists : undefined"
        />
      </div>
    </SessionOverlay>

    <!-- 上下文占用：同一外壳（内容自带标题与分块列表，故外壳不加内边距）。 -->
    <SessionOverlay
      :open="entryOverlay === 'context'"
      :inset="overlayInset"
      :ignore="entryRowRef"
      :padded="false"
      label="上下文占用"
      @close="closeOverlay()"
    >
      <div class="ctx-pane">
        <div class="ctx-pane__head">
          <h3 class="ctx-pane__title">上下文占用</h3>
          <span class="ctx-pane__id">{{ props.activeTeamId ?? 'default' }}</span>
        </div>
        <div class="ctx-pane__body">
          <ContextView
            :team-id="props.activeTeamId ?? null"
            :session-id="props.sessionId"
            :core="state.activeRegion ?? null"
          />
        </div>
      </div>
    </SessionOverlay>
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
      <!-- 渲染窗口入口（2026-10 P0）：消息只渲染尾部 200 行，更早的按需
           扩窗——全量 v-for 是"越用越卡"的主因（见 setup 里的实测表）。 -->
      <div v-if="showEarlier" class="chat-view__earlier">
        <button
          type="button"
          class="chat-view__earlier-btn"
          data-testid="chat-load-earlier"
          @click="loadEarlier"
        >
          {{ earlierLabel }}
        </button>
      </div>
      <template v-for="row in messageRows" :key="rowKey(row)">
        <!-- v-memo：行对象引用不变（= 该行内容未变，见 setup 里的 rowCache）时
             连 vnode 都不再创建——流式 delta 只 patch 真正变化的那一行。 -->
        <WorkRunGroup
          v-if="row.kind === 'work-group'"
          v-memo="[row]"
          :items="row.items"
          class="chat-view__item"
        />
        <template v-else-if="row.kind === 'single'">
          <div
            v-memo="[row]"
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

    <!-- Agent 配置：外壳由组件内部的 `SessionOverlay` 提供（与其它七项同一套
         几何 / 玻璃 / 关闭语义），内容自带头部与表单 padding。 -->
    <AgentConfigModal
      v-if="entryOverlay === 'config' && configTeam"
      :team="configTeam"
      :inset="overlayInset"
      @close="closeOverlay()"
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
          @open-shell-detail="(id, core) => emit('openShellDetail', id, core)"
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
          @open-shell-detail="(id, core) => emit('openShellDetail', id, core)"
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
          @open-shell-detail="(id, core) => emit('openShellDetail', id, core)"
        />
        <PanelSidebar
          v-if="railHasCards('right')"
          side="right"
          :drag-enabled="false"
          :active-branch-id="props.activeBranchId ?? null"
          :team-id="props.activeTeamId ?? null"
          @select-branch="(id) => emit('selectBranch', id)"
          @manage-workspace="toggleWorkspace"
          @open-shell-detail="(id, core) => emit('openShellDetail', id, core)"
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
      :class="{
        'chat-composer-float--busy': composerBusy,
        'chat-composer-float--clipped': composerClip !== 'none',
      }"
      :style="composerStyle"
      @focusin="onComposerFocus"
      @focusout="onComposerBlur"
    >
      <!-- 投影补层（只在移动端 clip 生效时显示）：见下方 __halo 的样式注释 ——
           `clip-path` 会把卡片**自身**的外阴影一起裁掉，手机上的悬浮观感只能
           由这一层（未裁剪的兄弟节点 + blur）补出来。桌面没有 clip，卡片自带
           的 float 环境投影已经够，这层 display:none 避免双重阴影。 -->
      <div class="chat-composer-float__halo" aria-hidden="true"></div>
      <!-- 卡片本体：ui-frame NeumorphismCard **glass="float"**（悬浮档）——
           材质（半透明 + backdrop blur）+ 向外环境投影（`0 4px 16px` +
           `0 2px 4px`）都由库提供，视觉上是一块浮在消息之上的磨砂托盘。
           内层 __body 只做 padding 与内容排布。 -->
      <!-- 轮廓交给库卡片（2026-10）：
           · 移动端 → `clip-path`：设备屏角的**偏移曲线**（下角贴屏角、上角吃剩余
             高度），由 composerOutline 算好后原样传入；
            · 桌面/直角屏 → `squircle="2.5"`：卡片按自己生效的 border-radius 生成
             等半径超椭圆（圆弧贴超椭圆会在 45° 附近错位）。
           两者都由 ui-frame 落地，面板不再自己写 clip-path。 -->
      <NeumorphismCard
        class="chat-composer-float__card"
        glass="float"
        :squircle="composerClip === 'none' ? 2.5 : false"
        :clip-path="composerClip === 'none' ? undefined : composerClip"
        no-padding
      >
        <div class="chat-composer-float__body">
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
          <!-- focus-effect="glow"：聚焦时主色光从输入槽**内部**亮起
               （`inset 0 0 18px` 光晕 + 1px 内描边，抑制默认外环）——这是
               ui-frame 自带的内辉光实现，不在面板侧手写 box-shadow。
               卡片本身用 glass="pressed"（另一处库实现）：常态就是内凹的
               内辉光/内阴影质感，聚焦时再叠一层主色内光。 -->
          <ChatComposer
            v-model="input"
            :disabled="!connected"
            :cancelable="false"
            :rows="1"
            :placeholder="placeholder"
            focus-effect="glow"
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
          <!-- 状态行（2026-10）：取代入口行的浮条。贴在文本域/操作行**下方**、
               玻璃层内——它描述的是「这次输入会得到什么响应」，属于输入区自己
               的状态，而不是入口行（导航/配置）的一部分。
               行本身常驻（API 徽标总在）；相位文案变化时读屏器会播报，
               但不会打断用户正在输入的内容（live region 只包相位文案）。 -->
          <div v-if="apiLabel || activityText" class="chat-status">
            <!-- 左：当前会话生效的 provider / model。**常显**（不随忙碌消失）——
                 用户要"随时能看出这条回答是哪个 API 产出的"。三层来源（会话
                 覆盖 / agent 的 api_profile / 全局 active_api）取最靠前的一层
                 ——即本会话实际生效者，见 setup 里的 `apiEffective`。 -->
            <span v-if="apiLabel" class="chat-status__api" :title="apiTitle">{{ apiLabel }}</span>
            <!-- 右：相位文案，仅忙碌时存在。live region 只包这一段——API 名是
                 静态信息，重复播报只会吵。 -->
            <span v-if="activityText" class="chat-status__live" role="status" aria-live="polite">
              <span class="chat-status__spinner" aria-hidden="true" />
              <span class="chat-status__text">{{ activityText }}</span>
            </span>
          </div>
        </div>
      </NeumorphismCard>
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
  /* 下界统一让出入口行（底部功能条）：入口行高 37px（实测，由按钮尺寸决定）
     + 8px 间隙 = `RAIL_ENTRY_GAP`。**与覆盖面板的 `overlayInset.bottom` 同源**
     ——会话区覆盖面板的上下边界要对齐侧栏，所以两处都读这一个常量。 */
  bottom: calc(v-bind(entryBottom) + v-bind(railEntryGap));
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

/* 渲染窗口入口（2026-10 P0）：只渲染尾部 200 行，更早的按需扩窗。
   轻量文字按钮——它不是主操作，不该抢视觉（与吸底/跳转钮的分量区分）。 */
.chat-view__earlier {
  display: flex;
  justify-content: center;
  padding: var(--nm-spacing-sm) 0;
}
.chat-view__earlier-btn {
  border: none;
  background: transparent;
  color: var(--nm-text-secondary);
  font-size: var(--nm-font-sm);
  cursor: pointer;
  padding: var(--nm-spacing-2xs) var(--nm-spacing-sm);
  border-radius: var(--nm-border-radius-xs);
}
.chat-view__earlier-btn:hover {
  color: var(--nm-text-primary);
  background-color: var(--nm-surface-raised);
}

/* 吸底悬浮输入区：absolute 脱离文档流，盖在消息列表之上。
   结构（2026-10）：
     __halo  投影补层（仅移动端 clip 生效时启用）
     __card  NeumorphismCard glass="float" —— 材质/圆角/向外环境投影全归它
             （悬浮观感）
     __body  内层：只做 padding 与内容排布
   桌面走卡片自己的 border-radius；移动端走 JS 算的 clip-path 超椭圆轮廓。

   投影为什么需要一个额外的兄弟层：clip-path 会把元素**自身向外的**
   box-shadow 整块裁掉，而移动端卡片必须挂超椭圆 clip —— 手机上的悬浮投影
   只能由 __halo（未裁剪 + blur）补，桌面则关掉它避免双重阴影。 */
.chat-composer-float {
  /* 输入行几何单一事实来源（圆角/高度都从这里派生）：
     - --chat-field-font：输入框实际字号（桌面 14px；移动端/iOS 16px，
       见窄屏段与 iOS 段）。取消/附件/发送三颗控件高度必须与「初始 1 行
       输入框内框」等高 —— 字号一变，高度跟着算，不再各自抄死 42px。
     - 圆角同心：外框 24px、padding 12px → 内框/按钮 12px（桌面口径）。 */
  --chat-field-font: var(--nm-field-font-md, 14px);
  --chat-control-h: calc(
    var(--nm-field-padding-y-md, 10px) * 2 + var(--chat-field-font) * 1.6
  );
  /* 圆角同心的单一事实来源（2026-10 二次修正）：
     外框圆角 R、内边距 P、边框 B → 内层圆角必须取 R − P − B。
     此前只减 P（漏了 1px 边框），内外角心相差 1px，角上间隙比边上宽 1px
     —— 这就是"输入框圆角跟外框不平行"的直接原因。三者都提成变量后，
     公式只写一次，改任何一个数内层自动跟随。 */
  --composer-radius: 24px;
  --composer-padding: 12px;
  /* 卡片自带 1px 内高光边（`--nm-glass-border-opacity`），不再有独立的描边层
     —— 设 0 让「内层圆角 = 外框 − padding − border」与「静止条高」两条派生
     公式仍成立（卡片高度 = 内容 + 2×padding）。 */
  --composer-border: 0px;
  /* 状态行高度：常驻行与忙碌行同高，同时是 API 徽标的 line-height
     （盒子铺满行高 → 徽标下边缘 = 行下边缘，三处等距的 ③ 才成立）。 */
  --chat-status-h: 17px;
  /* 贴角区半径：移动端由 JS 写成「R屏角 − 留白」（超椭圆口径）；
     桌面/直角屏没有贴角区，等于外框半径，公式退化成原来的 R−P−B。 */
  --composer-corner-r: var(--composer-radius);
  --composer-inner-radius: max(
    0px,
    calc(var(--composer-corner-r) - var(--composer-padding) - var(--composer-border))
  );
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 5;
  /* 外层只剩"定位 + 尺寸"，自己没有形状（背景/描边/裁剪都在子层）。
     必须让命中穿透，否则它那圈**矩形**会在角部拦住点击（消息列表、
     跳过按钮等），而视觉上那里是空的。可交互性由子层按各自形状恢复。 */
  pointer-events: none;
}

/* 投影补层（2026-10 用户要求输入区「悬浮」）——
   为什么非要独立的兄弟层：卡片用 `glass="float"`，它的悬浮感来自**向外的**
   box-shadow；而移动端为了贴 iPhone 超椭圆屏角给卡片挂了 `clip-path`，
   clip 裁的是元素**整个渲染结果**，连同自己的外阴影一起裁掉（实测：注入
   6px 外投影红环，clip 生效时只剩 955 个红像素、关掉 clip 是 47939 —— 差 50 倍）。
   所以手机上的投影必须画在**未被裁剪**的兄弟节点上：本层只做 `filter: blur`
   负责柔化，形状交给两个伪元素的 clip-path（与卡片同一轮廓）。
   本层绝不能挂 backdrop-filter：`filter` 会创建新的 backdrop root，卡片的
   毛玻璃会失效。
   桌面（无 clip）不启用 —— 卡片自带的 float 投影已经够，叠一层就是双重阴影。

   ## 为什么是**两层**（2026-10 用户报「边框有点下宽上窄」）

   单层 + `translateY(12px)` 是「光从上方来」的写法，但它有两个副作用，实测
   把卡片的上/下观感拉开到 3.6 倍（中线灰度、相对无投影对照的暗化积分）：

     ① 底部只有 12px 可用（间距 = 屏宽 3%），而位移 12 + 模糊 16 = 28px，
        影子**被视口硬切**——底边挂一条又浓又硬的暗带（峰值 Δ29）；
     ② 卡片背景是 65% 半透明 + backdrop-filter，影子不只是外阴影，还透过
        玻璃把**卡片内部**的下半区压暗（内部 Δ13 vs 顶部 Δ8）。

   于是顶边是「一条细亮线 + 几乎没有影子」，底边是「亮线 + 浓暗带」，读起来
   就是「下宽上窄」——而 clip-path 折线的镜像偏差其实是 0.00px（几何无辜）。

   改成两层后（本文件下方 `::before` 环境层 + `::after` 落地层）：
     顶峰值 Δ18 / 底峰值 Δ21（1.2×，原 2.2×）、暗化积分 117 : 163（1.4×，原 3.6×）、
     卡片内部上/下 Δ 基本相等。既有四周均匀的「环境光」定义边缘，又保留一点
     向下的方向感，且位移降到 4px 后不再被视口截断。 */
.chat-composer-float__halo {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: none;
  /* 模糊只写在这里：两层的柔化一起做。10px 与层内 4px 位移配平后
     底部余量（12px）刚好够，不会被视口截断 */
  filter: blur(10px);
}
.chat-composer-float--clipped .chat-composer-float__halo {
  display: block;
}
/* 两层共用形状：与卡片轮廓完全一致 */
.chat-composer-float__halo::before,
.chat-composer-float__halo::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--composer-radius);
  clip-path: var(--composer-clip, none);
}
/* 环境层：四周均匀，负责给**上边**也补一条边缘定义（这正是原来缺的） */
.chat-composer-float__halo::before {
  background: var(--composer-halo-ambient, rgba(15, 23, 42, 0.08));
}
/* 落地层：轻微下移，保留「光从上方来」的方向感 */
.chat-composer-float__halo::after {
  background: var(--composer-halo, rgba(15, 23, 42, 0.12));
  transform: translateY(4px);
}

/* 卡片本体：ui-frame NeumorphismCard（**glass="float"**，悬浮档）。
   向外环境投影（`0 4px 16px` ambient + `0 2px 4px` 加深）+ 半透明底 +
   backdrop blur 全部由库提供 —— 面板侧不写 box-shadow。

   本层只覆盖输入区特有的两件事：圆角取 --composer-radius、挂超椭圆 clip。
   选择器带 `.chat-composer-float` 前缀：卡片自己的 `--nm-border-radius-*`
   档位类与本文特异性相同（都是单类 + scoped 属性），靠层叠顺序不可靠。 */
.chat-composer-float .chat-composer-float__card {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  /* 圆角档位：桌面由卡片自己读它生成超椭圆（squircle prop），移动端被
     clip-path 覆盖并由库把 border-radius 归零。 */
  border-radius: var(--composer-radius);
  /* 性能（2026-09-18 起、2026-10 随卡片迁移沿用）：库默认 20px + saturate，
     输入区降到 10px 且不加 saturate —— 大面积 backdrop-filter 每次重绘全量
     重栅格化，跨行拖选每帧触发。用变量覆盖保持与卡片同一实现路径。 */
  --nm-glass-blur: 10px;
}

/* 内层：只负责 padding 与内容排布（卡片已 no-padding）。 */
.chat-composer-float__body {
  position: relative;
  padding: var(--composer-padding);
}

/* 聚焦/拖选期间：临时关毛玻璃（纯色底撑住视觉），拖选重绘不再触发
   大面积 blur 重栅格化。 */
.chat-composer-float--busy .chat-composer-float__card {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  --nm-glass-bg: var(--nm-surface-raised);
}
/* clip 生效时必须清掉 border-radius —— 两者是**取交集**关系：留着 24px 圆角
   会把超椭圆轮廓又裁回圆角矩形（实测角部间隙 14→16.6px，等于白改）。
   用 class 而非媒体查询做门控：JS 没算出轮廓时（首帧/异常）仍保留圆角兜底。 */
.chat-composer-float--clipped .chat-composer-float__halo::before {
  border-radius: 0;
}

/* 深色主题：投影要更重（浅底靠光、深底靠影），取值与 --panel-glass-shadow-md 同源。
   两层都调：环境层略轻（避免四周发闷），落地层保持原来的浓度。 */
:root[data-theme='dark'] .chat-composer-float {
  --composer-halo-ambient: rgba(0, 0, 0, 0.28);
  --composer-halo: rgba(0, 0, 0, 0.40);
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
  bottom: calc(v-bind(entryBottom) + v-bind(railEntryGap));
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
  /* 与单行输入框内框等高，与发送/图片按钮保持同排同高
     （--chat-control-h 随输入字号重算：移动端/iOS 16px → 45.6px） */
  height: var(--chat-control-h);
  min-height: var(--chat-control-h);
}

/* 图片附件按钮：方形圆角；高度与"初始 1 行时的输入框内框"等高
   （10px*2 padding + 14px*1.6 行高 = 42px），且固定不随 textarea 动态调整 */
.chat-view__attach-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--chat-control-h) !important; /* 正方形：宽 = 高 */
  height: var(--chat-control-h) !important;
  border-radius: var(--composer-inner-radius) !important; /* 与内框 textarea 圆角一致 */
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
  min-height: var(--chat-control-h);
  height: var(--chat-control-h) !important;
  padding: 0 14px;
  /* 与外框右下角同心：圆心重合 ⟺ 内半径 = 外半径 − padding − border */
  border-radius: var(--composer-inner-radius) !important;
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
/* 圆角同心：内框圆角 = 外框 − padding − border（见 --composer-inner-radius）。
   border-radius 是**边框盒**上的半径，而内层从 padding 盒开始，两者之间还隔着
   1px 边框——漏减边框就是「角上比边上松 1px」，肉眼读作"不同心"。 */
.chat-composer-float :deep(.nm-textarea.nm-textarea) {
  /* 内框圆角整体统一（库默认右 16px 会与按钮不一致）：
     外框 24px - 12px padding = 12px，左右均与外框同心 */
  border-radius: var(--composer-inner-radius);
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

/* 上下文占用的内容排布：外壳（玻璃/几何/滚动）由 `SessionOverlay` 统一提供
   （2026-10），这里只管「头部 + 可滚动分块列表」的内部结构。 */
.overlay-narrow {
  max-width: 640px;
}

.ctx-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.ctx-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--nm-border-subtle);
  background: linear-gradient(color-mix(in srgb, #ffffff 6%, transparent), transparent);
}
.ctx-pane__title {
  margin: 0;
  font-size: 15px;
  color: var(--nm-text-primary);
}
.ctx-pane__id {
  font-size: 11px;
  color: var(--nm-text-secondary);
  font-family: var(--nm-font-mono, monospace);
}
.ctx-pane__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 18px;
}

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

.entry-row {
  position: absolute;
  left: 20px;
  bottom: v-bind(entryBottom);
  /* 7：高于会话区覆盖面板（6）——面板铺满整个聊天区（连输入区一起盖住），
     入口行作为底部工具条留在最上层，所以面板打开时仍可点另一个按钮直接
     切换。 */
  z-index: 7;
  display: flex;
  align-items: center;
  gap: 8px;
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
/* 状态行（2026-10）：输入区内部的一行，取代原先入口行左侧的玻璃胶囊浮条。
   为什么不再用胶囊：浮条是「入口行的一个子项」，它的出现/消失会推着 Agent
   切换器到「模型」整排按钮左右移动；文案一长（子代理任务名 72 字符上限）按钮
   还会随 detail 抖动。搬进输入区内、独占一行后，入口行的排布完全稳定。

   ## 三处等距（2026-10 用户要求，有 layout 断言守着）

     ┌─ 外壳（卡片）────────────────────────┐
     │            ↑ P                        │  ← ① 输入框上边框 → 外壳上边框
     │  ┌─ 输入框 ──────────────┐            │
     │  └───────────────────────┘            │
     │            ↕ P                        │  ← ② 输入框下边框 → API 徽标
     │  deepseek / deepseek-flash            │
     │            ↕ P                        │  ← ③ API 徽标 → 外壳下边框
     └───────────────────────────────────────┘

   P = `--composer-padding`（桌面 12 / 窄屏 10）。三处分属三个不同的盒子：
     ① 由 __body 的 padding-top 决定；
     ② 由本行的 margin-top 决定 → 显式写成 var(--composer-padding)；
     ③ 由 __body 的 padding-bottom 决定，但**只有徽标盒高 = 行高**时才等于 P
        （否则行内还会剩一点居中留白）。所以：
          · 行高由 --chat-status-h 单一来源给出（min-height）；
          · 徽标 line-height 取同一个变量，盒子正好铺满行高，上下各 0 余量。
   三者用同源变量后，「改 padding 就三处一起变」是结构性的，不靠人肉对齐。 */
.chat-status {
  display: flex;
  align-items: center;
  gap: 8px;
  /* ② 输入框下边框 → 本行 */
  margin-top: var(--composer-padding);
  padding-left: 2px;
  font-size: 12px;
  line-height: 16px;
  color: var(--nm-text-secondary);
  min-width: 0;
  /* 行高单一来源：常驻行（只有 API 徽标）与忙碌行同高，避免"开始回答时
     输入区突然长高"；徽标 line-height 也取它，见 .chat-status__api。 */
  min-height: var(--chat-status-h);
}
/* API 徽标（provider / model）：**纯文字**（2026-10 用户要求去掉外框）——
   静态信息不需要第二层容器，胶囊反而和输入区卡片抢层次。
   与右侧相位文案靠「色阶」区分：标签用 --nm-text-primary 偏实、
   相位文案保持 --nm-text-secondary 偏淡。 */
.chat-status__api {
  /* 不参与收缩：API 名短且稳定，被相位文案挤掉只会让人看不全。
     上限 55%（超长 provider 名仍在内部省略），余下的宽度全给右侧文案。
     55 而非 45：`deepseek / deepseek-flash` 在 320 宽下正好需要 ~148px，
     45% 会吃掉最后一两个字符。 */
  flex: 0 0 auto;
  min-width: 0;
  max-width: 55%;
  font-size: 11px;
  /* 盒子高度 = 行高（不是 15px 的紧凑行盒）：这样徽标的下边缘就是本行的
     下边缘，③「徽标 → 外壳下边框」才精确等于 __body 的 padding-bottom。
     line-height 已让单行文本在盒内垂直居中，故无需 flex 居中。 */
  line-height: var(--chat-status-h);
  /* **必须是块容器，不能用 inline-flex**（2026-10 实测修正）：`text-overflow:
     ellipsis` 只对块容器生效——写成 inline-flex 时文本成了匿名 flex item，
     超长 provider 名会被**硬切在半个字形上**，一个「…」都不画（与下面那行
     注释的承诺相反）。像素对照（headless Chrome，90px 宽、11px 字号）：
       display: block      → 末尾停在 x≈88 并画出「…」三点
       display: inline-flex → 字形一直画到裁剪边 x≈100，无省略号
     块级盒子在父 flex 行里靠 align-items:center 垂直居中（父已有），
     高度仍等于 line-height → ③ 的等距契约不变。 */
  display: block;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--nm-text-primary);
  opacity: 0.75;
}
.chat-status__live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  /* 相位文案是可收缩的一侧：先截它，保住 API 名 */
  flex: 0 1 auto;
  min-width: 0;
}
.chat-status__spinner {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--panel-accent) 30%, transparent);
  border-top-color: var(--panel-accent);
  animation: activity-spin 0.8s linear infinite;
}
.chat-status__text {
  min-width: 0;
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
    left: max(8px, env(safe-area-inset-left, 0px));
    right: max(8px, env(safe-area-inset-right, 0px));
    /* 键盘弹出时与输入区同步抬升（入口行锚在输入区上方）。
       `entryBottom = 输入区高 + 24`（24 = 桌面口径的 12 底距 + 12 间隙）。
       移动端输入区底距已改为 --composer-inset(14px)，故这里不再叠加 safe-area
       —— 输入区贴底后安全区不再参与布局；叠上去会多顶 34px。
       实测：entryBottom(92) − 输入区顶(14+68=82) = 10px 间隙 ✓ */
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
  /* 状态行（输入区内部）：窄屏给按钮区让位——文案截断，单行不换行，
     避免它把输入区撑高到吃掉消息区可视高度。 */
  .chat-status__text {
    max-width: 62vw;
  }

  /* 「还有更多」提示（v2）：sticky 右贴边叠在滚动容器末端——不随内容滚走，
     也不需要额外包裹层（entry-row 自身就是 overflow-x 容器）。
     左缘渐隐用 mask 实现（不引入新色值，深浅主题都成立）；提示只占右侧 36px，
     遮住的是最后半个按钮的边缘，正好传达「这里还接得住」。 */
  .entry-row__more {
    position: sticky;
    right: 0;
    flex: 0 0 auto;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 36px;
    margin-left: -36px;
    padding-right: 2px;
    font-size: 20px;
    line-height: 1;
    color: var(--nm-text-secondary);
    pointer-events: none;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 45%);
    mask-image: linear-gradient(to right, transparent, #000 45%);
  }

  /* 输入区与屏幕圆角「等间隙」（2026-10 四次修正：改用 clip-path 精确轮廓）
     ─────────────────────────────────────────────────────────────────────
     判据只有一个：**沿输入区轮廓逐点量到屏幕轮廓的距离，波动越小越平行**。
     在 iPhone 15（393×852，屏角 R=55，DPR 3）实测：
       旧：左右 8 / 底部 42 / 圆弧 r34 → 间隙 8→42px，波动 34.0px
       三次修正：左右 14 / 底部 14 / 圆弧 r20 → 12.6→15.0px，波动 2.3px
       本次：左右 14 / 底部 14 / 超椭圆精确轮廓 → 波动 < 0.3px（仅离散化误差）

     ① 底部留白必须等于左右留白：间隙恒定要求输入区到两条屏边的距离相等。
        底部若还垫着 safe-area(34px)，任何形状都无法让间隙恒定（实测最优
        也只能压到 9.9px）。所以面板贴到屏幕底边 14px，内容不再抬到安全区之上。
     ② 为什么必须用 clip-path：border-radius 只能画圆弧，而屏角是超椭圆。
        圆弧贴超椭圆的误差不可通过调半径消除 —— 圆心重合(r=41)时 45° 处多
        切进 10.4px，最优 r≈20 也仍有 2.3px 波动。轮廓计算见
        utils/squircle.ts（对屏角超椭圆做法线内缩）。
     ③ 四角必须等大（2026-10 用户报「上两个圆角和下两个圆角不相等」）：
        旧口径上角"纵向吃剩余高度"，iPhone 上纵向只有 10~25px，下角却是
        R−14 = 41~56px —— 一眼看出上下不等。现在上角取下角关于水平中轴的
        镜像，并把跨度封顶在「静止态卡片半高」（JS 用 `cornerMax` 传入），
        于是四角同形同大。代价只有「建模屏角比真机略紧」：R=65.5/74.5 时
        下角间隙由恒定 14/18.7px 变成 12.3~14 / 15.6~18.6（±1.7~3px），
        仍读作平行；两全解只有把留白提到 R−半高 ≈ 33~42px，输入区会被
        推得又窄又高，不可取。
     ④ Home 指示条：可视范围距底 8~13px。留白取屏宽 3%（iPhone 上 11.3~13.2px），
        与小屏段的指示条上缘基本齐平 —— 指示条由系统绘制在内容之上，不遮挡。
     ⑤ 键盘弹出时（keyboardInset > 0）面板浮在键盘上方，等间隙已无意义，
        但仍沿用同一轮廓（形状不跳变）。 */
  .chat-composer-float {
    /* 输入字号 16px（iOS 聚焦防缩放） */
    --chat-field-font: 16px;

    /* ── 四角等大 + 下角贴屏角：三个量互相约束，公式必须闭环 ──────────

       ① 留白 d = **屏宽的 3%**（用户 2026-10 定的比例）：375→11.25、393→11.79、
          402→12.06、440→13.2。只跟视口宽度有关，与屏角无关。
          **不能依赖输入行高度** —— 四角等大要求输入行高度反过来依赖跨度
          （见 ③），两边互相引用就是 CSS 变量循环，浏览器会把两边都判成无效
          （`--composer-inset` 变空 → JS 侧 rect.left 还算得出，但
          `--chat-control-h` 会整条失效、输入行高度退化为 0）。
       ② 跨度 = R − d：上下两角共用（上角是下角的镜像）。留白变小 → 跨度变大
          （R=74.5：22 → 12.06 使跨度从 52.5 涨到 62.4）。
       ③ 卡片高度必须让「上下两角放得下」：
            卡片静止高 H = 3P + controlH + statusH（P=body 上下 padding、状态行
            自身 margin-top 也是 P）
            要求 H ≥ 2 × span
          留白变小 → 跨度变大 → 卡片得更高（R=74.5：spans 52.5 → 62.4，卡片
          105 → 125）。**多出来的高度给 padding，不给输入行**：卡片是胶囊形，
          里面填一块 78px 高的输入条 + 78px 的圆形按钮不符合触控规范
          （按钮基准 45.6 ≈ iOS 44）。所以
                P = max(10px, (2span − controlH − statusH) / 3)
          R=74.5 时 P = 20.8、输入行仍是 45.6、卡片 125；R=57 时 P 取基准 10、
          卡片 93 —— 小角机型零变化。

       注意变量都是 calc/clamp 表达式、computed 不求值：JS 侧一律用实测
       rect.left 当留白、用实测卡片高反推静止半高（见 updateComposerClip）。 */
    --composer-inset: calc(0.03 * 100vw);
    --composer-span: calc(var(--panel-display-radius) - var(--composer-inset));
    --composer-padding: max(
      10px,
      calc(
        (2 * var(--composer-span) - var(--chat-control-h) - var(--chat-status-h)) / 3
      )
    );

    left: max(var(--composer-inset), env(safe-area-inset-left, 0px));
    right: max(var(--composer-inset), env(safe-area-inset-right, 0px));
    bottom: calc(var(--composer-inset) + v-bind(keyboardInsetPx));
  }
  /* iOS 聚焦自动缩放对策：输入字号提至 16px（<16px 聚焦必缩放）。
     只放大打字面，不改工具栏按钮/占位字号观感。 */
  .chat-composer-float :deep(.nm-textarea__field) {
    font-size: 16px;
    /* 纵向 padding 取「让 1 行文字恰好填满 --chat-control-h」的对称值：
         padding-y = (controlH − 1.6em) / 2
       - controlH = 45.6（R=55 等小角机型）→ 10px，与库的默认值一致（零回归）；
       - controlH = 58（R=74.5，输入条为「让两角放得下」而抬高）→ 16.2px，
         文本域因此与发送/附件按钮同高，单行文字仍垂直居中。
       多行时 1.6em 只是首行，多出的行照常把文本域撑高。 */
    min-height: var(--chat-control-h);
    padding-block: calc((var(--chat-control-h) - 1.6em) / 2);
  }
  /* 圆角同心（移动口径）：内层一律取 --composer-inner-radius
     （= 跨度 − padding − border；跨度由 JS 写入 --composer-corner-r）。
     R=74.5 机型：跨度 52.5 → 内层 42.5；超过输入框半高（58/2 = 29）时
     浏览器按规范等比削减，视觉上内框自动成为胶囊 —— 与外框的椭圆端头方向
     一致（外框角同样是「一整个半圆」，两者同形）。 */
  .chat-composer-float :deep(.nm-textarea.nm-textarea) {
    border-radius: var(--composer-inner-radius);
    /* 与发送/附件按钮同高（两者都钉在 --chat-control-h）。**必须给容器**
       而不是只给 field：ChatComposer 的输入行是 `align-items: flex-end` 的
       横向 flex，容器矮一截时会底对齐、上方空出一条 —— 实测 402 宽机型
       曾是「按钮 58 / 输入槽 38」，槽比按钮矮 20px。 */
    min-height: var(--chat-control-h);
    align-items: center;
  }
  .chat-composer-float :deep(.chat-view__attach-btn),
  .chat-composer-float :deep(.chat-view__send) {
    border-radius: var(--composer-inner-radius) !important;
  }

  /* 消息气泡：窄屏减少两侧浪费 */
  .chat-view__list :deep(.msg-item__bubble) {
    max-width: 88%;
  }

  /* 消息区底部留白：输入区贴底后占位从 110px 降到 82px（14 底距 + 68 高），
     桌面口径的 190px 在这里会空出一大块，收到 130px（= 82 + 48 余量）；
     键盘弹出时按 keyboardInset 同步加高，否则最新消息被键盘压住。 */
  .chat-view__list {
    padding-bottom: calc(150px + v-bind(keyboardInsetPx));
  }

  /* 会话区覆盖面板的几何已统一由 `SessionOverlay` 按消息区矩形计算
     （窄屏即近全屏）；内部表格各自横向滚动，无需在此覆写。 */
  /* 「回到底部」按钮：右界让开横屏刘海；纵向用桌面口径 entryBottom + 45
     （输入区贴底后不再叠加 safe-area）。 */
  .chat-view__jump {
    right: calc(v-bind(trayPadRight) + 16px + env(safe-area-inset-right, 0px));
    bottom: calc(v-bind(entryBottom) + 45px);
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

/* iOS 真机（含 iPad 宽屏，不受 768px 断点约束）：ui-frame 在 iOS + 粗指针
   环境把原生输入控件字号钉到 16px（聚焦防缩放）。输入行控件高度必须同步，
   否则 iPad 上发送/附件按钮会比输入框矮 3.6px（底对齐后顶部露一截）。 */
@supports (-webkit-touch-callout: none) {
  @media (pointer: coarse) {
    .chat-composer-float {
      --chat-field-font: 16px;
    }
  }
}
</style>
