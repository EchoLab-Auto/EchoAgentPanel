<script setup lang="ts">
//! 聊天主视图：消息列表 + 固定底部输入区（flex 布局，输入区占位不遮挡消息）。
//! 渲染层整体由 @echolab-auto/ui-frame/chat 承担（吸底滚动、回到底部、
//! IME 组合保护、Markdown、工具/思考/分支合并块），这里只做数据适配。
//! 多模态：支持图片粘贴 / 文件选择，data URL 随消息发送给 Core。

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NeumorphismBadge, NeumorphismButton } from '@echolab-auto/ui-frame';
import {
  ChatComposer,
  ChatMessageItem,
  ChatTray,
  type ChatMessage,
} from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { formatTime, toChatMessage, type ChatMessageWithImages } from '../chat-adapter';
import AgentSwitcher from './AgentSwitcher.vue';
import AgentConfigModal from './AgentConfigModal.vue';
import { teamPluginEnabled, teamToolAvailable } from '../capabilities';
import { loopModeOf } from '../protocol';
import ReasoningBlock from './ReasoningBlock.vue';
import SubagentEventBlock from './SubagentEventBlock.vue';
import ContextView from './ContextView.vue';
import ChecklistSidebar from './ChecklistSidebar.vue';
import QqPanel from './QqPanel.vue';
import WorkspacePanel from './WorkspacePanel.vue';
import SessionSwitcher from './SessionSwitcher.vue';
import TasksPanel from './TasksPanel.vue';
import ToolRunGroup, { type ToolRunItem } from './ToolRunGroup.vue';
import PanelSidebar from './PanelSidebar.vue';
import RailDragGhost from './RailDragGhost.vue';
import { railHasVisibleCards } from '../rail-cards';
import { railDragEngaged } from '../rail-drag';

const props = defineProps<{
  sessionId: string;
  activeTeamId?: string | null;
  activeBranchId?: string | null;
}>();
const emit = defineEmits<{
  send: [content: string, images: string[]];
  cancel: [];
  selectTeam: [id: string | null];
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
const adapterTop = ref(0);
const adapterLeft = ref(0);

function toggleAdapter() {
  if (showAdapter.value) {
    showAdapter.value = false;
    return;
  }
  const btn = btnElement(adapterBtnRef.value);
  if (btn) {
    const r = btn.getBoundingClientRect();
    adapterTop.value = Math.round(window.innerHeight - r.top + 8);
    const composer = composerFloatRef.value;
    const cr = composer ? composer.getBoundingClientRect() : null;
    const centerX = cr ? cr.left + cr.width / 2 : r.left + r.width / 2;
    adapterLeft.value = Math.round(centerX - 260);
  }
  showAdapter.value = true;
}
const showChecklist = ref(false);
const checklistBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);
const showContext = ref(false);
const checklistBottom = ref(0);
const checklistLeft = ref(0);

function toggleChecklist() {
  if (showChecklist.value) {
    showChecklist.value = false;
    return;
  }
  const btn = btnElement(checklistBtnRef.value);
  if (btn) {
    const r = btn.getBoundingClientRect();
    // 弹窗底边 = 按钮顶边 - 8px（位于按钮上方，与按钮贴 8px）
    checklistBottom.value = Math.round(window.innerHeight - r.top + 8);
    // 水平居中于输入框：left = composer 中心 - 弹窗半宽
    const composer = composerFloatRef.value;
    const cr = composer ? composer.getBoundingClientRect() : null;
    const centerX = cr ? cr.left + cr.width / 2 : r.left + r.width / 2;
    checklistLeft.value = Math.round(centerX - 260);
  }
  showChecklist.value = true;
}
// 入口按钮固定与输入框间距 12px：观察输入框高度变化（auto-resize），
// bottom = composerHeight + 12(margin) + 12(gap)。
const composerFloatRef = ref<HTMLElement | null>(null);
const entryBottom = ref('170px');
let ctxObserver: ResizeObserver | null = null;

onMounted(() => {
  // 拖选监听：选区出现即临时关 blur（输入框未聚焦时也可能拖选已输入文本）。
  document.addEventListener('selectionchange', onSelectionChange);
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
const ADAPTER_PLUGIN_FALLBACK = ['echo-agent.adapter.qq'];

const currentTeam = computed(() => {
  if (!props.activeTeamId) return null;
  return state.teams.find((t) => t.id === props.activeTeamId) ?? null;
});

/** 当前团队视角下的适配器插件 id 列表（无 plugins 数据时回退到内置 id） */
const adapterPluginIds = computed<string[]>(() => {
  const fromState = state.plugins.filter((p) => p.kind === 'adapter').map((p) => p.id);
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

/** 任务（Subagent/后台/并行/临时分支）按钮显隐：subagent 插件启用，
 * 或当前会话已有任务记录（即使插件后被禁用，历史任务仍可见）。 */
const sessionTasks = computed(() =>
  props.sessionId === 'global'
    ? state.tasks
    : state.tasks.filter((task) => task.sessionId === props.sessionId),
);

const sessionRunningTaskCount = computed(
  () =>
    sessionTasks.value.filter(
      (task) => task.status === 'running' || task.status === 'awaiting',
    ).length,
);

const tasksAvailable = computed(
  () =>
    teamPluginEnabled(currentTeam.value, 'echo-agent.subagent') ||
    sessionTasks.value.length > 0,
);

const showTasks = ref(false);
const tasksBtnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);
const tasksBottom = ref(0);
const tasksLeft = ref(0);

function toggleTasks() {
  if (showTasks.value) {
    showTasks.value = false;
    return;
  }
  const btn = btnElement(tasksBtnRef.value);
  if (btn) {
    const r = btn.getBoundingClientRect();
    tasksBottom.value = Math.round(window.innerHeight - r.top + 8);
    const composer = composerFloatRef.value;
    const cr = composer ? composer.getBoundingClientRect() : null;
    const centerX = cr ? cr.left + cr.width / 2 : r.left + r.width / 2;
    tasksLeft.value = Math.round(centerX - 260);
  }
  showTasks.value = true;
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
const sessionsBottom = ref(0);
const sessionsLeft = ref(0);

function toggleSessions() {
  if (showSessions.value) {
    showSessions.value = false;
    return;
  }
  const btn = btnElement(sessionsBtnRef.value);
  if (btn) {
    const r = btn.getBoundingClientRect();
    sessionsBottom.value = Math.round(window.innerHeight - r.top + 8);
    const composer = composerFloatRef.value;
    const cr = composer ? composer.getBoundingClientRect() : null;
    const centerX = cr ? cr.left + cr.width / 2 : r.left + r.width / 2;
    sessionsLeft.value = Math.round(centerX - 150);
  }
  showSessions.value = true;
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
const workspaceBottom = ref(0);
const workspaceLeft = ref(0);

function toggleWorkspace() {
  if (showWorkspace.value) {
    showWorkspace.value = false;
    return;
  }
  const btn = btnElement(workspaceBtnRef.value);
  if (btn) {
    const r = btn.getBoundingClientRect();
    workspaceBottom.value = Math.round(window.innerHeight - r.top + 8);
    const composer = composerFloatRef.value;
    const cr = composer ? composer.getBoundingClientRect() : null;
    const centerX = cr ? cr.left + cr.width / 2 : r.left + r.width / 2;
    workspaceLeft.value = Math.round(centerX - 260);
  }
  showWorkspace.value = true;
}

// ── 双侧边栏（2026-09-24）：左右两列卡片容器，卡片可互相拖动 ──
// 卡片（连接状态 / 文件浏览器 / Shell / 临时分支）归属哪一列由
// `rail-layout.ts` 持有（可拖动、可持久化）；本组件只负责：
// 1. 两列的显隐——有卡片（门控可见）或正在拖动时渲染，空列不占位；
// 2. 消息区留白——某列有卡片时给滚动区加同宽内边距，正文不被卡片压住
//    （此前只有右列：消息被限宽 640px 且左对齐，恰好躲开；加了左列后
//    正文会撞上卡片，故改为按列留白）。
// 「工作区」入口按钮仍只负责会话管理/git 弹层（与列无关）。
const RAIL_WIDTH = 324;

/** 某列是否有可见卡片（门控 × 用户排序，判据来自共享注册表）。 */
function railHasCards(side: 'left' | 'right'): boolean {
  return railHasVisibleCards(side, props.activeTeamId ?? null);
}

/** 列的显隐：有卡片，或拖动进行中（拖动时需要两列都作为投放区）。 */
const leftRailVisible = computed(() => railHasCards('left') || railDragEngaged.value);
const rightRailVisible = computed(() => railHasCards('right') || railDragEngaged.value);

/**
 * 消息滚动区的左右留白（有**可见卡片**的列 = 列宽）。
 *
 * 拖动期间不改留白：被拖卡片已从源列摘除、尚未落入目标列，此时若让留白
 * 跟随「列是否渲染」（拖动会使空列临时出现）会让正文行宽反复跳变；按
 * 「有可见卡片」判断则拖动全程稳定，落位后再一次性过渡（0.24s）。
 *
 * 注意返回**带单位的字符串**：`v-bind()` 注入 CSS 变量时数字无单位会被
 * 浏览器丢弃（padding-left: 324 非法）。
 */
const trayPadLeft = computed(() => (railHasCards('left') ? `${RAIL_WIDTH}px` : '0px'));
const trayPadRight = computed(() => (railHasCards('right') ? `${RAIL_WIDTH}px` : '0px'));

// 插件/Team 更新回推后，若清单插件变为不可用，关闭残留弹层并清空徽标数据。
watch(checklistAvailable, (available) => {
  if (!available) {
    showChecklist.value = false;
    state.checklists.splice(0, state.checklists.length);
  }
});

// 插件/Team 更新回推后，若 workspace 插件变为不可用，关闭残留弹层。
watch(workspaceAvailable, (available) => {
  if (!available) showWorkspace.value = false;
});

// 切换 Agent 时若适配器/工作区面板打开则关闭，避免残留禁用 agent 的面板
watch(
  () => props.activeTeamId,
  () => {
    showAdapter.value = false;
    showWorkspace.value = false;
    showSessions.value = false;
    showTasks.value = false;
  },
);

// 当前会话是否在运行任务（用于显示"取消任务"按钮）
const busy = computed(() => {
  const a = state.activities[props.sessionId];
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
  const a = state.activities[props.sessionId];
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

// 按会话过滤：全局视图显示全部；具体会话只显示归属该会话的消息。
const messages = computed<ChatMessage[]>(() => {
  const list =
    props.sessionId === 'global'
      ? state.trunk
      : state.trunk.filter((m) => m.sessionId === props.sessionId);
  return list.map(toChatMessage);
});

// ── 连续工具调用合并（2026-09-19）──
// 多个 tool 连续出现时合成一条 ToolRunGroup：折叠态 = 一排圆角矩形图标
// （横向扩展、空间不足自动换行），点击图标在下方浮现具体内容卡片；
// 运行过程中默认折叠，全部完成且有失败时自动展开首个失败项。
type ChatRow =
  | { kind: 'single'; message: ChatMessage }
  | { kind: 'tool-group'; key: string; items: ToolRunItem[] };

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

const toolRowOf = (m: ChatMessage): ToolRunItem | null => {
  const tool = m.tool;
  if (m.role !== 'tool' || !tool) return null;
  return {
    key: String(m.id),
    name: tool.name,
    input: tool.input,
    output: tool.output,
    status: tool.status,
    label: tool.name === 'spawn_subagent' ? subagentTaskLabel(tool.input ?? '') : undefined,
    time: m.time ? formatTime(m.time) : undefined,
  };
};

const messageRows = computed<ChatRow[]>(() => {
  const rows: ChatRow[] = [];
  for (const m of messages.value) {
    const item = toolRowOf(m);
    if (!item) {
      rows.push({ kind: 'single', message: m });
      continue;
    }
    const last = rows[rows.length - 1];
    if (last && last.kind === 'tool-group') {
      last.items.push(item);
    } else {
      rows.push({ kind: 'tool-group', key: `tools:${item.key}`, items: [item] });
    }
  }
  return rows;
});

function rowKey(row: ChatRow): string {
  return row.kind === 'tool-group' ? row.key : String(row.message.id);
}

/** ChatTray 吸底观察源：最后一条消息的尾部内容（与库 ChatMessageList 同源）。 */
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

const emptyText = computed(() =>
  props.sessionId === 'global'
    ? '（暂无消息，从下方输入开始对话）'
    : `（会话 ${props.sessionId} 暂无消息，从下方输入开始对话）`,
);

// 空串占位 → 库回退到 locale 默认（输入消息，Enter 发送…）。
const placeholder = computed(() => (connected.value ? '' : '未连接到 Core，暂时无法发送'));

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
</script>

<template>
  <div class="chat-view" @paste="onPaste">
    <!-- 上下文入口：输入框上方左侧，磨砂玻璃按钮 -->
    <div class="entry-row">
      <div v-if="activityText" class="chat-activity">
        <span class="chat-activity__spinner" />
        <span class="chat-activity__text">{{ activityText }}</span>
      </div>
      <AgentSwitcher
        :active-team-id="props.activeTeamId ?? null"
        @select="emit('selectTeam', $event)"
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
        :value="state.checklists.length"
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

    <!-- 会话切换：跟随入口按钮上方 8px 的毛玻璃面板 -->
    <div
      v-if="showSessions"
      class="checklist-pop"
      :style="{ bottom: sessionsBottom + 'px', left: sessionsLeft + 'px' }"
      @click.self="showSessions = false"
    >
      <SessionSwitcher
        :active-team-id="props.activeTeamId ?? null"
        :active-session-id="props.sessionId"
        @select="pickSession"
      />
    </div>

    <!-- 工作区会话管理：跟随入口按钮上方 8px 的毛玻璃面板
         （文件浏览器已迁至会话视图右侧边栏） -->
    <div
      v-if="showWorkspace"
      class="checklist-pop"
      :style="{ bottom: workspaceBottom + 'px', left: workspaceLeft + 'px' }"
      @click.self="showWorkspace = false"
    >
      <WorkspacePanel :team-id="props.activeTeamId ?? null" />
    </div>

    <!-- 适配器：跟随适配器按钮上方 8px 的毛玻璃面板 -->
    <div
      v-if="showAdapter"
      class="checklist-pop"
      :style="{ bottom: adapterTop + 'px', left: adapterLeft + 'px' }"
      @click.self="showAdapter = false"
    >
      <QqPanel :team-id="props.activeTeamId ?? null" />
    </div>

    <!-- 任务：跟随任务按钮上方 8px 的毛玻璃面板（仅当前 agent 的当前会话） -->
    <div
      v-if="showTasks"
      class="checklist-pop"
      :style="{ bottom: tasksBottom + 'px', left: tasksLeft + 'px' }"
      @click.self="showTasks = false"
    >
      <TasksPanel :session-id="props.sessionId" />
    </div>

    <!-- 清单：跟随清单按钮下方 8px 的毛玻璃面板（无内层卡片） -->
    <div
      v-if="showChecklist"
      class="checklist-pop"
      :style="{ bottom: checklistBottom + 'px', left: checklistLeft + 'px' }"
      @click.self="showChecklist = false"
    >
      <ChecklistSidebar />
    </div>

    <!-- 上下文弹层：与 Agent 配置同几何（上/左/右 12px，底距入口行 12px）；
         点击弹层外背景关闭（@click.self），无独立返回按钮 -->
    <div v-if="showContext" class="ctx-overlay" @click.self="showContext = false">
      <div class="ctx-overlay__panel">
        <div class="ctx-overlay__head">
          <h3 class="ctx-overlay__title">上下文占用</h3>
          <span class="ctx-overlay__id">{{ props.activeTeamId ?? 'default' }}</span>
        </div>
        <div class="ctx-overlay__body">
          <ContextView :team-id="props.activeTeamId ?? null" :session-id="props.sessionId" />
        </div>
      </div>
    </div>
    <!-- 消息列表：flex:1，内部 ChatTray 独立滚动。
         连续工具调用合并为一行图标（ToolRunGroup）；其余消息照旧逐条渲染。
         （不交给 ChatMessageList 的逐条 #message 插槽：工具行需要跨条合并，
         这里自渲染，滚动/吸底沿用库的 ChatTray。） -->
    <ChatTray
      class="chat-view__list"
      :watch-source="trayWatchSource"
    >
      <div v-if="messageRows.length === 0" class="chat-view__empty">{{ emptyText }}</div>
      <template v-for="row in messageRows" :key="rowKey(row)">
        <ToolRunGroup
          v-if="row.kind === 'tool-group'"
          :items="row.items"
          class="chat-view__item"
        />
        <template v-else-if="row.kind === 'single'">
          <!-- 推理：面板扩展角色，由 ReasoningBlock 渲染（打字机动画）；时序穿插 -->
          <ReasoningBlock
            v-if="(row.message as { role: string }).role === 'reasoning'"
            :text="row.message.content"
            :animate="(row.message as ChatMessageWithImages).animate !== false"
          />
          <!-- 子代理完成回报：紧凑一行（任务摘要 + 可展开结论），非 JSON 气泡 -->
          <SubagentEventBlock
            v-else-if="(row.message as { role: string }).role === 'subagent'"
            :event="(row.message as ChatMessageWithImages).subagent ?? { id: '', task: '', success: true, result: '' }"
            :time="row.message.time ? formatTime(row.message.time) : undefined"
            class="chat-view__item"
            :class="{ 'chat-view__item--enter': (row.message as ChatMessageWithImages).animate }"
          />
          <div
            v-else
            class="chat-view__item chat-view__item--msg"
            :class="{ 'chat-view__item--enter': (row.message as ChatMessageWithImages).animate }"
          >
            <div v-if="imagesOf(row.message).length" class="chat-view__images">
              <template v-for="(img, i) in imagesOf(row.message)" :key="i">
                <!-- 可展示项：Core 落盘图的 /media/<id> 引用（同源、懒加载、
                     强缓存）或遗留的 data URI。省略项（空串）计数占位。 -->
                <img
                  v-if="img"
                  :src="img"
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
            <ChatMessageItem :message="row.message" :format-time="formatTime" />
          </div>
        </template>
      </template>
    </ChatTray>

    <!-- Agent 配置悬浮弹层：覆盖会话区（上/左/右 12px，底距配置按钮 12px） -->
    <AgentConfigModal
      v-if="configOpen && configTeam"
      :team="configTeam"
      :bottom-offset="configBottomOffset"
      @close="configOpen = false"
    />

    <!-- 双侧边栏（2026-09-24）：左右各一列卡片栈，卡片可在两列之间拖动
         （机制与动画见 ../rail-drag.ts；列显隐：有卡片或拖动中） -->
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

    <!-- 拖动拖影：跟随指针的卡片缩影（Teleport 到 body，fixed 定位） -->
    <RailDragGhost />

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
          <button class="chat-view__attach-remove" title="移除" @click="removeAttachment(i)">
            ×
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
 * 2. .chat-view__list flex:1 + min-height:0 —— 滚动只在 ChatTray 内部发生，
 *    内容可滚动到输入框之下（输入框悬浮在上层，毛玻璃透出下层消息）；
 *    底部 padding-bottom 预留输入框高度，保证最后一条消息仍可滚出可见；
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
/* 拖动中：投放区提示（列内空态另有虚线框，见 RailStack） */
.chat-rail--dropzone > :deep(.rail-stack) {
  border-radius: 24px;
  background: color-mix(in srgb, var(--panel-accent) 5%, transparent);
  outline: 1px dashed color-mix(in srgb, var(--panel-accent) 28%, transparent);
  outline-offset: -4px;
}

/* ChatTray 需要定高父级才能出现滚动区。
   注意：预留空间必须加在*滚动区内部*（nm-chat-tray__scroll），
   而不是本容器上——外层 padding 会压缩滚动区高度，消息永远
   滚不到输入框后面；滚动区自身延伸到输入框后方，消息才能
   从毛玻璃底下划过。 */
.chat-view__list {
  flex: 1;
  min-height: 0;
}

/* 滚动区内部预留：
   - 底部：按输入框最大高度(5行,约156px) + 边距(12px) + 松量；
   - 左右：有卡片的边栏列宽（正文不被悬浮卡片压住）；拖动中归零，
     避免落位时行宽二次跳变。

   行距（2026-09-28 紧凑化）：库默认 gap 12px 对"工作行"（推理块 / 工具行）
   过宽——一回合里推理与工具交替十几次，屏幕被空白吃掉。改为 gap 6px：
   消息气泡用 .chat-view__item--msg 的 3px 边距补回呼吸（气泡间仍约 12px），
   工作行保持 6px 紧排；推理块/工具行自身不再带外边距。 */
.chat-view__list :deep(.nm-chat-tray__scroll) {
  gap: 6px;
  padding-bottom: 190px;
  padding-left: v-bind(trayPadLeft);
  padding-right: v-bind(trayPadRight);
  transition: padding 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* 消息气泡（用户/Agent/系统/分支合并）：在 6px 容器间距上补 3px 边距，
   与旧版 12px 行距等效；工作行不受影响。 */
.chat-view__item--msg {
  margin: 3px 0;
}

/* 空态占位（自渲染列表后，empty 不再由库 ChatMessageList 提供） */
.chat-view__empty {
  margin: auto;
  padding: 24px;
  color: var(--nm-text-placeholder);
  font-size: var(--nm-font-sm);
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
  border: 1px solid color-mix(in srgb, #ffffff 16%, transparent);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

/* 聚焦/拖选期间：临时关毛玻璃（纯色底撑住视觉），拖选重绘不再触发
   大面积 blur 重栅格化。 */
.chat-composer-float--busy {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background: var(--nm-surface-raised);
}
/* 拖选卡顿根治之二（2026-09-18）：库 NeumorphismTextarea 在悬浮/聚焦态
   默认给文本域容器 `transform: translateY(-1px)` + transform 过渡——
   分数像素位移让选区重绘走"变换文本层"慢路径，跨行拖选每帧重绘时卡顿
   明显。此处置零位移并禁用 transform 过渡（视觉仅差 1px，无感）。 */
.chat-composer-float :deep(.nm-textarea),
.chat-composer-float :deep(.nm-textarea:hover),
.chat-composer-float :deep(.nm-textarea--focused) {
  transform: none !important;
  transition-property: box-shadow, background-color, color, border-color !important;
}

/* 吸底跳转按钮上移，避免被悬浮输入框遮挡 */
.chat-view :deep(.nm-chat-tray__jump) {
  bottom: 180px;
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

/* 图标基准：与 neumorphism stroke 风格保持一致 */
.chat-view__icon {
  width: 17px;
  height: 17px;
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
  width: 15px;
  height: 15px;
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
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 6px var(--nm-shadow-dark, rgba(0, 0, 0, 0.35));
  transition: color 0.15s ease, background 0.15s ease;
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
  background: rgba(0, 0, 0, 0.25);
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
  border: 1px solid color-mix(in srgb, #ffffff 16%, transparent);
  background: color-mix(in srgb, var(--nm-surface-raised) 42%, transparent);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
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


/* 清单面板：跟随按钮下方 8px，磨砂玻璃本体（无内层卡片） */
.checklist-pop {
  position: fixed;
  z-index: 25;
  width: min(520px, 82vw);
  max-height: 68vh;
  overflow-y: auto;
  padding: 18px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--nm-surface-raised) 52%, transparent);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid color-mix(in srgb, #ffffff 14%, transparent);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
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
  border: 1px solid color-mix(in srgb, #ffffff 16%, transparent);
  background: color-mix(in srgb, var(--nm-surface-raised) 48%, transparent);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  font-size: 12px;
  color: var(--nm-text-secondary);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
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
</style>
