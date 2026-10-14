//! 工作区会话面板（workspace 插件）：会话管理（新建/编辑/删除/激活）、
//! 会话内**对话管理**（2026-10 多对话：新建/重命名/删除/切换）与
//! 各目录 git 状态。文件浏览器已迁至会话视图右侧边栏（2026-09-19，
//! `ChatView` 的 workspace-rail 卡）。
//!
//! 数据流：命令带 team_id 路由到对应 persona（去主智能体后必填）；
//! Core 以 `WorkspaceSessions` / `WorkspaceGitStatus` 事件回推。
//! 弹层几何由 ChatView 的 `.checklist-pop` 提供。
//!
//! 对话 CRUD：Core 无独立协议命令——经 `SaveWorkspaceSession` 全量
//! upsert 会话（conversations 数组整体替换，面板侧镜像 Core
//! `upsert_conversation` 的物化/slug/legacy 语义）；删除对话额外按通道
//! id 发 `ClearHistory` 清空其聊天历史（两步确认，不可恢复）。

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { state } from '../store';
import { sendCommand, sendPending } from '../connection';
import { sessionKey } from '../keys';
import { releasePending, usePending } from '../pending';
import LoadHint from './LoadHint.vue';
import type { WorkspaceConversationInfo, WorkspaceSessionInfo } from '../protocol';
import {
  conversationsView,
  conversationIdForName,
  directoryNode,
  directoryPath,
  directoryToInput,
  workspaceChannelSessionId,
} from '../workspace';
import DirectoryPicker from './DirectoryPicker.vue';
import { confirmDialog } from '../confirm';

const props = defineProps<{ teamId: string | null }>();

/** 当前列表归属 (team, core) 与请求目标一致才渲染（避免跨 team/core 串显）。 */
const fresh = computed(
  () =>
    state.workspaceTeamId === props.teamId &&
    (state.workspaceCore ?? null) === (state.activeRegion ?? null),
);
const sessions = computed(() => (fresh.value ? state.workspaceSessions : []));
const activeId = computed(() => (fresh.value ? state.workspaceActive : null));
/** 当前激活对话 id（2026-10 多对话；旧 Core 恒 null）。 */
const activeConversationId = computed(() =>
  fresh.value ? state.workspaceActiveConversation : null,
);

const selectedId = ref<string>('');
const selected = computed(
  () => sessions.value.find((s) => s.id === selectedId.value) ?? sessions.value[0] ?? null,
);

// 列表变化时校正选择（删除/切换 team 后回退到激活会话或首个）。
watch(
  sessions,
  (list) => {
    if (!list.some((s) => s.id === selectedId.value)) {
      selectedId.value = activeId.value && list.some((s) => s.id === activeId.value)
        ? activeId.value
        : (list[0]?.id ?? '');
    }
  },
  { immediate: true },
);

function requestSessions() {
  if (!props.teamId) return; // 未选择智能体：不发（Core 会拒绝无 team_id 的会话类命令）
  sendPending({ RequestWorkspaceSessions: { team_id: props.teamId } }, 'workspace:sessions');
}

// ── git 状态 ──
const gitLoading = ref(false);
const gitDirs = computed(() =>
  selected.value
    ? (state.workspaceGitBySession[sessionKey(state.activeRegion, selected.value.id)] ?? [])
    : [],
);

function requestGit(sessionId?: string) {
  const id = sessionId ?? selected.value?.id;
  if (!props.teamId || !id) return;
  gitLoading.value = true;
  sendCommand({ RequestWorkspaceGitStatus: { team_id: props.teamId, session_id: id } });
  // 事件缺失时自然超时收敛（无挂死加载态）。
  window.setTimeout(() => {
    gitLoading.value = false;
  }, 8000);
}

function select(session: WorkspaceSessionInfo) {
  selectedId.value = session.id;
  if (!state.workspaceGitBySession[sessionKey(state.activeRegion, session.id)]) requestGit(session.id);
}

watch(gitDirs, () => {
  gitLoading.value = false;
});

// ── 新建 / 编辑 ──
const editing = ref<null | { id: string }>(null);
const formName = ref('');
const formDescription = ref('');
const formDirs = ref('');

function startCreate() {
  editing.value = { id: '' };
  formName.value = '';
  formDescription.value = '';
  formDirs.value = '';
}

function startEdit(session: WorkspaceSessionInfo) {
  editing.value = { id: session.id };
  formName.value = session.name;
  formDescription.value = session.description ?? '';
  // 规范化：跨机目录 {path,node} → `node://<node>/<path>` 编辑串
  // （此前直接 join 会把对象变成 "[object Object]"）。
  formDirs.value = (session.directories ?? []).map(directoryToInput).join('\n');
}

function cancelEdit() {
  editing.value = null;
}

// ── 目录选择器（2026-10）：浏览本机/联邦节点目录树挑选 ──
const pickerOpen = ref(false);

/** 选择器回填：追加一行目录到编辑框（去重，保留手写能力）。 */
function onPickDirectory(path: string) {
  const lines = formDirs.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!lines.includes(path)) {
    lines.push(path);
  }
  formDirs.value = lines.join('\n');
  pickerOpen.value = false;
}

function save() {
  if (!props.teamId) return;
  const session: WorkspaceSessionInfo = {
    id: editing.value?.id ?? '',
    name: formName.value.trim(),
    description: formDescription.value.trim(),
    directories: formDirs.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  };
  if (!session.name) return;
  sendCommand({ SaveWorkspaceSession: { team_id: props.teamId, session } });
  editing.value = null;
}

// ── 激活 / 删除 ──
function toggleActive(session: WorkspaceSessionInfo) {
  if (!props.teamId) return;
  const id = session.id === activeId.value ? null : session.id;
  sendCommand({ ActivateWorkspaceSession: { team_id: props.teamId, id } });
}

async function remove(session: WorkspaceSessionInfo) {
  if (!props.teamId) return;
  const ok = await confirmDialog(
    `删除工作区会话「${session.name}」？（不影响磁盘目录与对话历史）`,
    { title: '删除工作区会话', danger: true, confirmText: '删除' },
  );
  if (!ok) return;
  sendCommand({ DeleteWorkspaceSession: { team_id: props.teamId, id: session.id } });
}

// ── 对话管理（2026-10 多对话）──
// Core 无独立对话 CRUD 命令：经 SaveWorkspaceSession 全量 upsert 会话
//（conversations 整体替换，镜像 Core upsert_conversation 的物化/slug/
// legacy 语义）；删除对话额外按通道 id 发 ClearHistory 清空其聊天历史。

/** (工作区, 对话) 是否当前激活对。 */
function isActiveConversation(
  session: WorkspaceSessionInfo,
  conv: WorkspaceConversationInfo,
): boolean {
  return session.id === activeId.value && conv.id === activeConversationId.value;
}

/** 全量 upsert 会话（仅替换 conversations / last_conversation，其余字段原样回传）。 */
function saveConversations(
  session: WorkspaceSessionInfo,
  conversations: WorkspaceConversationInfo[],
  lastConversation?: string | null,
) {
  if (!props.teamId) return;
  sendCommand({
    SaveWorkspaceSession: {
      team_id: props.teamId,
      session: {
        id: session.id,
        name: session.name,
        description: session.description ?? '',
        directories: session.directories ?? [],
        conversations,
        last_conversation:
          lastConversation === undefined ? (session.last_conversation ?? null) : lastConversation,
      },
    },
  });
}

/** 点选对话 = 激活 (工作区, 对话)；已是当前对 → 不重发。 */
function switchConversation(session: WorkspaceSessionInfo, conv: WorkspaceConversationInfo) {
  if (!props.teamId || isActiveConversation(session, conv)) return;
  sendCommand({
    ActivateWorkspaceSession: { team_id: props.teamId, id: session.id, conversation: conv.id },
  });
}

/** 对话内联表单：convId = null 新建，否则重命名该对话。 */
const convForm = ref<null | { wsId: string; convId: string | null }>(null);
const convFormName = ref('');

function startConvCreate(session: WorkspaceSessionInfo) {
  convForm.value = { wsId: session.id, convId: null };
  convFormName.value = '';
}

function startConvRename(session: WorkspaceSessionInfo, conv: WorkspaceConversationInfo) {
  convForm.value = { wsId: session.id, convId: conv.id };
  convFormName.value = conv.name;
}

function cancelConvForm() {
  convForm.value = null;
}

function saveConvForm(session: WorkspaceSessionInfo) {
  const name = convFormName.value.trim();
  if (!name || !convForm.value) return;
  // 物化隐式主对话（旧档 conversations 为空时补位 {id:"main", legacy:true}），
  // 与 Core 写入路径 materialize_conversations 一致。
  const convs = conversationsView(session).map((c) => ({ ...c }));
  if (convForm.value.convId === null) {
    const id = conversationIdForName(name, convs.map((c) => c.id));
    // 镜像 Core：存量裸通道（legacy）每工作区至多一条；legacy 对话被删后
    // 新对话可再次占用裸通道（其历史已在删除时清空）。
    convs.push({ id, name, legacy: !convs.some((c) => c.legacy) });
  } else {
    const target = convs.find((c) => c.id === convForm.value!.convId);
    if (!target) return;
    target.name = name;
  }
  saveConversations(session, convs);
  convForm.value = null;
}

async function removeConversation(session: WorkspaceSessionInfo, conv: WorkspaceConversationInfo) {
  if (!props.teamId) return;
  const ok = await confirmDialog(
    `删除对话「${conv.name}」？该对话的聊天历史将被清空，不可恢复。`,
    { title: '删除对话', danger: true, confirmText: '删除' },
  );
  if (!ok) return;
  // 先清通道历史（legacy → 裸 ws 通道；其余 → <ws>/<conv> 通道）。
  sendCommand({
    ClearHistory: {
      team_id: props.teamId,
      session_id: workspaceChannelSessionId(session.id, conv),
    },
  });
  const rest = conversationsView(session).filter((c) => c.id !== conv.id).map((c) => ({ ...c }));
  // last_conversation 指向被删对话时回退首条（Core set_active 亦有兜底）。
  const last =
    session.last_conversation === conv.id ? (rest[0]?.id ?? null) : undefined;
  saveConversations(session, rest, last);
}

const { phase: sessionsPhase } = usePending('workspace:sessions');

onMounted(() => {
  if (!state.connected) return;
  requestSessions();
  requestGit();
});

onUnmounted(() => releasePending('workspace:sessions'));

watch(
  () => state.connected,
  (connected) => {
    if (connected) {
      requestSessions();
      requestGit();
    }
  },
);

const gitSummary = (dir: { staged?: number; modified?: number; untracked?: number }): string => {
  const parts: string[] = [];
  if (dir.staged) parts.push(`已暂存 ${dir.staged}`);
  if (dir.modified) parts.push(`已修改 ${dir.modified}`);
  if (dir.untracked) parts.push(`未跟踪 ${dir.untracked}`);
  return parts.length ? parts.join(' · ') : '工作区干净';
};
</script>

<template>
  <div class="ws-panel">
    <!-- 会话管理与 git 状态 -->
    <section class="ws-pane--main">
      <div class="ws-head">
      <div class="ws-head__text">
        <h2>工作区会话</h2>
        <p class="ws-head__sub">多会话 · 多工作区目录 · git 状态</p>
      </div>
      <div class="ws-head__actions">
        <NeumorphismButton size="small" variant="glass" :disabled="!state.connected" @click="startCreate">
          新建
        </NeumorphismButton>
        <NeumorphismButton size="small" variant="glass" :disabled="!state.connected" @click="requestSessions">
          刷新
        </NeumorphismButton>
      </div>
    </div>

    <p v-if="!teamId" class="muted ws-hint">（请先在上方选择智能体）</p>

    <!-- 新建 / 编辑表单 -->
    <div v-if="editing" class="ws-form">
      <label class="ws-field">
        <span>名称</span>
        <input v-model="formName" class="ws-input" placeholder="例如：EchoAgent 框架" />
      </label>
      <label class="ws-field">
        <span>描述</span>
        <input v-model="formDescription" class="ws-input" placeholder="可选" />
      </label>
      <label class="ws-field">
        <span class="ws-form__dirs-head">
          工作区目录（每行一个绝对路径；跨机工作区（2026-10）支持
          <code>node://&lt;联邦peer&gt;/&lt;绝对路径&gt;</code> 远程目录，
          如 <code>node://gpu-box/srv/repo</code>——需联邦在线且对端
          allow_queries 放行 workspace_files / workspace_git_status /
          browse_directories）
          <NeumorphismButton size="small" variant="glass" @click="pickerOpen = true">
            浏览…
          </NeumorphismButton>
        </span>
        <textarea
          v-model="formDirs"
          class="ws-textarea"
          rows="4"
          placeholder="/home/evence/.local/share/echo-agent-core/source&#10;node://gpu-box/srv/remote-repo"
        />
      </label>
      <div class="ws-form__actions">
        <NeumorphismButton size="small" variant="glass" :disabled="!formName.trim()" @click="save">
          保存
        </NeumorphismButton>
        <NeumorphismButton size="small" variant="glass" @click="cancelEdit">取消</NeumorphismButton>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="ws-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="ws-card"
        :class="{ 'is-active': session.id === activeId, 'is-selected': session.id === selected?.id }"
        @click="select(session)"
      >
        <div class="ws-card__head">
          <span class="ws-card__name">{{ session.name }}</span>
          <span v-if="session.id === activeId" class="ws-badge">已激活</span>
        </div>
        <p v-if="session.description" class="ws-card__desc">{{ session.description }}</p>
        <div class="ws-card__dirs">
          <span
            v-for="(dir, index) in session.directories ?? []"
            :key="directoryToInput(dir) + index"
            class="ws-dir-chip"
            :title="directoryToInput(dir)"
          >
            <span v-if="directoryNode(dir)" class="ws-dir-chip__node">
              {{ directoryNode(dir) }}⛓
            </span>{{ directoryPath(dir) }}
          </span>
          <span v-if="!(session.directories ?? []).length" class="muted">（尚未配置目录）</span>
        </div>
        <!-- 对话管理（2026-10 多对话）：点选 = 切换激活对话；删除两步确认并清历史 -->
        <div class="ws-convs" @click.stop>
          <div class="ws-convs__head">
            <span class="ws-convs__title">对话</span>
            <NeumorphismButton
              size="small"
              variant="glass"
              :disabled="!state.connected"
              @click="startConvCreate(session)"
            >
              新建对话
            </NeumorphismButton>
          </div>
          <div
            v-for="conv in conversationsView(session)"
            :key="conv.id"
            class="ws-conv"
            :class="{ 'is-active': isActiveConversation(session, conv) }"
            :title="workspaceChannelSessionId(session.id, conv)"
            @click="switchConversation(session, conv)"
          >
            <template v-if="convForm && convForm.wsId === session.id && convForm.convId === conv.id">
              <input
                v-model="convFormName"
                class="ws-input ws-conv__input"
                placeholder="对话名称"
                @click.stop
                @keyup.enter="saveConvForm(session)"
                @keyup.esc="cancelConvForm"
              />
              <span class="ws-conv__actions">
                <NeumorphismButton
                  size="small"
                  variant="glass"
                  :disabled="!convFormName.trim()"
                  @click="saveConvForm(session)"
                >
                  保存
                </NeumorphismButton>
                <NeumorphismButton size="small" variant="glass" @click="cancelConvForm">
                  取消
                </NeumorphismButton>
              </span>
            </template>
            <template v-else>
              <span class="ws-conv__name">{{ conv.name }}</span>
              <span v-if="isActiveConversation(session, conv)" class="ws-badge">当前</span>
              <span class="ws-conv__actions">
                <NeumorphismButton size="small" variant="glass" @click.stop="startConvRename(session, conv)">
                  改名
                </NeumorphismButton>
                <NeumorphismButton size="small" variant="glass" @click.stop="removeConversation(session, conv)">
                  删除
                </NeumorphismButton>
              </span>
            </template>
          </div>
          <div
            v-if="convForm && convForm.wsId === session.id && convForm.convId === null"
            class="ws-conv ws-conv--form"
          >
            <input
              v-model="convFormName"
              class="ws-input ws-conv__input"
              placeholder="新对话名称"
              @click.stop
              @keyup.enter="saveConvForm(session)"
              @keyup.esc="cancelConvForm"
            />
            <span class="ws-conv__actions">
              <NeumorphismButton
                size="small"
                variant="glass"
                :disabled="!convFormName.trim()"
                @click="saveConvForm(session)"
              >
                创建
              </NeumorphismButton>
              <NeumorphismButton size="small" variant="glass" @click="cancelConvForm">
                取消
              </NeumorphismButton>
            </span>
          </div>
        </div>
        <div class="ws-card__actions" @click.stop>
          <NeumorphismButton size="small" variant="glass" @click="toggleActive(session)">
            {{ session.id === activeId ? '取消激活' : '激活' }}
          </NeumorphismButton>
          <NeumorphismButton size="small" variant="glass" @click="startEdit(session)">编辑</NeumorphismButton>
          <NeumorphismButton size="small" variant="glass" @click="remove(session)">删除</NeumorphismButton>
        </div>
      </div>
      <LoadHint :phase="sessionsPhase" label="工作区会话" @retry="requestSessions" />
      <div v-if="teamId && !sessions.length && sessionsPhase === 'idle'" class="muted ws-empty">
        （暂无工作区会话，点击「新建」创建第一个）
      </div>
    </div>

    <!-- 选中会话的 git 状态 -->
    <div v-if="selected" class="ws-section">
      <div class="ws-section__head">
        <h3>git 状态 · {{ selected.name }}</h3>
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="gitLoading || !state.connected"
          @click="requestGit()"
        >
          {{ gitLoading ? '读取中…' : '刷新状态' }}
        </NeumorphismButton>
      </div>

      <div v-for="dir in gitDirs" :key="dir.directory" class="ws-git">
        <div class="ws-git__path" :title="dir.directory">{{ dir.directory }}</div>
        <template v-if="dir.is_repo">
          <div class="ws-git__row">
            <span class="ws-git__branch">⑂ {{ dir.branch || '（未知分支）' }}</span>
            <span v-if="dir.ahead" class="ws-git__sync">↑{{ dir.ahead }}</span>
            <span v-if="dir.behind" class="ws-git__sync">↓{{ dir.behind }}</span>
            <span class="ws-git__counts">{{ gitSummary(dir) }}</span>
          </div>
          <div v-if="dir.last_commit" class="ws-git__commit">{{ dir.last_commit }}</div>
          <div v-if="(dir.changed_files ?? []).length" class="ws-git__files">
            <span v-for="file in dir.changed_files" :key="file" class="ws-file-chip">{{ file }}</span>
          </div>
        </template>
        <div v-else class="ws-git__error">{{ dir.error || '不是 git 仓库' }}</div>
      </div>
      <div v-if="!gitDirs.length" class="muted ws-empty">
        （{{ gitLoading ? '正在读取 git 状态…' : '暂无数据，点击「刷新状态」' }}）
      </div>
      </div>
    </section>
  </div>

  <!-- 目录选择器（2026-10）：浏览本机/联邦节点目录树 -->
  <DirectoryPicker
    v-if="pickerOpen"
    @select="onPickDirectory"
    @close="pickerOpen = false"
  />
</template>

<style scoped>
/* 外层几何由 ChatView 的 .checklist-pop 提供：这里只负责内部排版。 */
.ws-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ws-pane--main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.ws-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ws-head__text { min-width: 0; }
.ws-head h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nm-text-primary); }
.ws-head__sub { margin: 2px 0 0; font-size: 11px; color: var(--nm-text-secondary); }
.ws-head__actions { display: flex; gap: 6px; flex: 0 0 auto; }

.ws-hint { margin: 0; font-size: 12px; }

.ws-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--panel-accent);
  border-radius: 12px;
  background: var(--panel-accent-soft);
}
.ws-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--nm-text-secondary); }
.ws-form__dirs-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ws-input, .ws-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--nm-text-primary);
  background: var(--nm-surface-raised);
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
  resize: vertical;
}
.ws-textarea { font-family: var(--nm-font-mono, monospace); min-height: 64px; }
.ws-form__actions { display: flex; gap: 6px; justify-content: flex-end; }

.ws-list { display: flex; flex-direction: column; gap: 8px; }
.ws-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.ws-card:hover { border-color: var(--panel-accent); }
.ws-card.is-selected { border-color: var(--panel-accent); }
.ws-card.is-active { background: var(--panel-accent-soft); }
.ws-card__head { display: flex; align-items: center; gap: 8px; }
.ws-card__name { font-size: 13px; font-weight: 600; color: var(--nm-text-primary); }
.ws-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--panel-ok, #2ea46e);
  background: color-mix(in srgb, var(--panel-ok, #2ea46e) 14%, transparent);
  border-radius: 999px;
  padding: 1px 8px;
}
.ws-card__desc { margin: 0; font-size: 11px; color: var(--nm-text-secondary); }
.ws-card__dirs { display: flex; flex-wrap: wrap; gap: 4px; }
.ws-dir-chip__node {
  color: var(--panel-accent, #0969da);
  font-weight: 600;
  margin-right: 2px;
}
.ws-card__actions { display: flex; gap: 6px; justify-content: flex-end; }

/* 对话管理（2026-10 多对话）：卡内嵌列表，风格对齐会话切换器行。 */
.ws-convs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px dashed var(--nm-border-color);
}
.ws-convs__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ws-convs__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nm-text-secondary);
}
.ws-conv {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  color: var(--nm-text-primary);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.ws-conv:hover { background: var(--panel-hover); }
.ws-conv.is-active {
  border-color: var(--panel-accent);
  background: var(--panel-accent-soft);
}
.ws-conv--form { cursor: default; }
.ws-conv__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-conv__input { flex: 1 1 auto; min-width: 0; }
.ws-conv__actions { display: flex; gap: 4px; flex: 0 0 auto; }
.ws-dir-chip {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--nm-font-mono, monospace);
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid var(--nm-border-color);
  background: var(--panel-hover);
  color: var(--nm-text-secondary);
}
.ws-card__actions { display: flex; gap: 6px; justify-content: flex-end; }

.ws-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--nm-border-color);
}
.ws-section__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ws-section h3 { margin: 0; font-size: 12px; font-weight: 700; color: var(--nm-text-primary); }

.ws-git {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
}
.ws-git__path {
  font-family: var(--nm-font-mono, monospace);
  font-size: 11px;
  word-break: break-all;
  color: var(--nm-text-primary);
}
.ws-git__row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 11px; }
.ws-git__branch {
  font-family: var(--nm-font-mono, monospace);
  font-weight: 700;
  color: var(--panel-accent);
  background: var(--panel-accent-soft);
  border-radius: 999px;
  padding: 1px 8px;
}
.ws-git__sync { font-weight: 700; color: var(--panel-accent); }
.ws-git__counts { color: var(--nm-text-secondary); }
.ws-git__commit {
  font-family: var(--nm-font-mono, monospace);
  font-size: 11px;
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-git__files { display: flex; flex-wrap: wrap; gap: 4px; max-height: 96px; overflow-y: auto; }
.ws-file-chip {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--nm-font-mono, monospace);
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--nm-border-color);
  background: var(--panel-hover);
  color: var(--nm-text-secondary);
}
.ws-git__error { font-size: 11px; color: var(--panel-err, #d9534f); }
.ws-empty { margin: 0; font-size: 12px; }
</style>
