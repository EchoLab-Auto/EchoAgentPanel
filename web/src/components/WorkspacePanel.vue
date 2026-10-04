<script setup lang="ts">
//! 工作区会话面板（workspace 插件）：会话管理（新建/编辑/删除/激活）与
//! 各目录 git 状态。文件浏览器已迁至会话视图右侧边栏（2026-09-19，
//! `ChatView` 的 workspace-rail 卡）。
//!
//! 数据流：命令带 team_id 路由到对应 persona（去主智能体后必填）；
//! Core 以 `WorkspaceSessions` / `WorkspaceGitStatus` 事件回推。
//! 弹层几何由 ChatView 的 `.checklist-pop` 提供。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand, sendPending } from '../connection';
import { sessionKey } from '../keys';
import { releasePending, usePending } from '../pending';
import LoadHint from './LoadHint.vue';
import type { WorkspaceSessionInfo } from '../protocol';

const props = defineProps<{ teamId: string | null }>();

/** 当前列表归属 (team, core) 与请求目标一致才渲染（避免跨 team/core 串显）。 */
const fresh = computed(
  () =>
    state.workspaceTeamId === props.teamId &&
    (state.workspaceCore ?? null) === (state.activeTeamCore ?? null),
);
const sessions = computed(() => (fresh.value ? state.workspaceSessions : []));
const activeId = computed(() => (fresh.value ? state.workspaceActive : null));

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
    ? (state.workspaceGitBySession[sessionKey(state.activeTeamCore, selected.value.id)] ?? [])
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
  if (!state.workspaceGitBySession[sessionKey(state.activeTeamCore, session.id)]) requestGit(session.id);
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
  formDirs.value = (session.directories ?? []).join('\n');
}

function cancelEdit() {
  editing.value = null;
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

function remove(session: WorkspaceSessionInfo) {
  if (!props.teamId) return;
  if (!window.confirm(`删除工作区会话「${session.name}」？（不影响磁盘目录与对话历史）`)) return;
  sendCommand({ DeleteWorkspaceSession: { team_id: props.teamId, id: session.id } });
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
        <span>工作区目录（每行一个绝对路径）</span>
        <textarea
          v-model="formDirs"
          class="ws-textarea"
          rows="4"
          placeholder="/home/evence/.local/share/echo-agent-core/source&#10;/home/evence/.local/share/echo-agent-panel/source"
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
          <span v-for="dir in session.directories ?? []" :key="dir" class="ws-dir-chip" :title="dir">
            {{ dir }}
          </span>
          <span v-if="!(session.directories ?? []).length" class="muted">（尚未配置目录）</span>
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
