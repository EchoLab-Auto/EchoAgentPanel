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
  ChatMessageList,
  type ChatMessage,
} from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { formatTime, toChatMessage, type ChatMessageWithImages } from '../chat-adapter';
import AgentSwitcher from './AgentSwitcher.vue';
import AgentConfigModal from './AgentConfigModal.vue';
import { teamPluginEnabled, teamToolAvailable } from '../capabilities';
import { loopModeOf } from '../protocol';
import ReasoningBlock from './ReasoningBlock.vue';
import ContextView from './ContextView.vue';
import ChecklistSidebar from './ChecklistSidebar.vue';
import QqPanel from './QqPanel.vue';
import WorkspacePanel from './WorkspacePanel.vue';
import SessionSwitcher from './SessionSwitcher.vue';
import MenuCard from './MenuCard.vue';

const props = defineProps<{ sessionId: string; activeTeamId?: string | null }>();
const emit = defineEmits<{
  send: [content: string, images: string[]];
  cancel: [];
  selectTeam: [id: string | null];
  selectSession: [id: string];
}>();

const input = ref('');
/** 待发送图片（data URL 形式） */
const attachments = ref<string[]>([]);
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
  const target = composerFloatRef.value;
  if (!target) return;
  ctxObserver = new ResizeObserver(() => {
    const h = target.getBoundingClientRect().height;
    entryBottom.value = `${Math.round(h + 24)}px`;
  });
  ctxObserver.observe(target);
});
onBeforeUnmount(() => ctxObserver?.disconnect());

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

/** 清单按钮显隐：checklist 插件 + checklist 工具都可见才显示。
 * 插件取消勾选后，Core 会卸载工具包；这里同步卸载对应 UI 入口与浮层。 */
const checklistAvailable = computed(() =>
  teamPluginEnabled(currentTeam.value, 'echo-agent.checklist') &&
  teamToolAvailable(currentTeam.value, 'checklist'),
);

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
    workspaceLeft.value = Math.round(centerX - 280);
  }
  showWorkspace.value = true;
}

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
      return '子代理工作中…';
    default:
      return '';
  }
});

/** 当前会话正在等待应答的选单（MenuRequest 事件 → MenuResolved 之间）。
 * 选单内联在会话区消息流尾部（不再弹窗）；归属过滤同消息：
 * 全局视图显示，具体会话只显示归属该会话的选单。 */
const pendingMenu = computed(() => {
  const menu = state.menuPrompt;
  if (!menu) return null;
  if (props.sessionId === 'global') return menu;
  return menu.session_id === props.sessionId ? menu : null;
});

/** 内联选单的合成消息 id 前缀（槽渲染据此前缀分派 MenuCard）。 */
const MENU_MESSAGE_PREFIX = 'menu:';
function isMenuMessage(id: string | number): boolean {
  return String(id).startsWith(MENU_MESSAGE_PREFIX);
}

// 按会话过滤：全局视图显示全部；具体会话只显示归属该会话的消息。
// 末尾追加合成「选单」条目：与消息同列滚动，随 MenuResolved 自动消失。
const messages = computed<ChatMessage[]>(() => {
  const list =
    props.sessionId === 'global'
      ? state.trunk
      : state.trunk.filter((m) => m.sessionId === props.sessionId);
  const mapped = list.map(toChatMessage);
  const menu = pendingMenu.value;
  if (menu) {
    mapped.push({
      id: `${MENU_MESSAGE_PREFIX}${menu.request_id}`,
      role: 'system',
      content: '',
    });
  }
  return mapped;
});

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
        title="工作区会话（多会话 / 多目录 / git 状态）"
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

    <!-- 工作区会话：跟随入口按钮上方 8px 的毛玻璃面板 -->
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
    <!-- 消息列表：flex:1，内部 ChatTray 独立滚动 -->
    <ChatMessageList
      class="chat-view__list"
      :messages="messages"
      :format-time="formatTime"
      :empty-text="emptyText"
    >
      <template #message="slot">
        <!-- 选单：内联卡片（会话区内作答，不弹窗）；归属当前会话且未应答时存在 -->
        <MenuCard
          v-if="isMenuMessage(slot.message.id) && pendingMenu"
          :prompt="pendingMenu"
          class="chat-view__item"
        />
        <!-- 推理：面板扩展角色，由 ReasoningBlock 渲染（打字机动画）；时序穿插 -->
        <ReasoningBlock
          v-else-if="(slot.message as { role: string }).role === 'reasoning'"
          :text="slot.message.content"
          :animate="(slot.message as ChatMessageWithImages).animate !== false"
        />
        <div
          v-else
          class="chat-view__item"
          :class="{ 'chat-view__item--enter': (slot.message as ChatMessageWithImages).animate }"
        >
          <div v-if="imagesOf(slot.message).length" class="chat-view__images">
            <img
              v-for="(img, i) in imagesOf(slot.message)"
              :key="i"
              :src="img"
              class="chat-view__image"
              alt=""
            />
          </div>
          <ChatMessageItem :message="slot.message" :format-time="formatTime" />
        </div>
      </template>
    </ChatMessageList>

    <!-- Agent 配置悬浮弹层：覆盖会话区（上/左/右 12px，底距配置按钮 12px） -->
    <AgentConfigModal
      v-if="configOpen && configTeam"
      :team="configTeam"
      :bottom-offset="configBottomOffset"
      @close="configOpen = false"
    />

    <!-- 输入区：作为 flex 子项固定占位（不遮挡消息），视觉上悬浮 -->
    <div ref="composerFloatRef" class="chat-composer-float">
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

/* ChatTray 需要定高父级才能出现滚动区。
   注意：预留空间必须加在*滚动区内部*（nm-chat-tray__scroll），
   而不是本容器上——外层 padding 会压缩滚动区高度，消息永远
   滚不到输入框后面；滚动区自身延伸到输入框后方，消息才能
   从毛玻璃底下划过。 */
.chat-view__list {
  flex: 1;
  min-height: 0;
}

/* 滚动区内部底部预留：按输入框最大高度(5行,约156px) + 边距(12px) + 松量 */
.chat-view__list :deep(.nm-chat-tray__scroll) {
  padding-bottom: 190px;
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
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border: 1px solid color-mix(in srgb, #ffffff 16%, transparent);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
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
