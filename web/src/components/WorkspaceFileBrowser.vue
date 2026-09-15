<script setup lang="ts">
//! 工作区文件浏览器（workspace 插件）：只读浏览选中会话的工作区目录。
//!
//! 按需加载：进入目录时向 Core 发 `RequestWorkspaceFiles`，Core 以
//! `WorkspaceFiles` 事件回推条目（目录在前、文件在后，隐藏项跳过）。
//! 服务端用 canonical 前缀校验限定在会话目录及其子孙内，越界返回错误。
//!
//! 导航模型 = 路径栈（`stack`）：index 0 = 活动根目录，每进入一层 push；
//! 面包屑与「上级」都由它派生——不依赖字符串前缀解析（根目录配置形态
//! 与 canonical 路径可能不一致）。

import { computed, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { WorkspaceFileEntry, WorkspaceSessionInfo } from '../protocol';

const props = defineProps<{
  teamId: string | null;
  session: WorkspaceSessionInfo | null;
}>();

/** 导航栈：index 0 = 活动根目录；每进入一层 push。 */
const stack = ref<Array<{ label: string; path: string }>>([]);

const currentPath = computed(() => stack.value[stack.value.length - 1]?.path ?? '');
const listing = computed(() =>
  currentPath.value ? state.workspaceFiles[currentPath.value] : undefined,
);
const entries = computed(() => listing.value?.entries ?? []);
const error = computed(() => listing.value?.error ?? null);
const roots = computed(() => props.session?.directories ?? []);

function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.split('/').filter(Boolean).pop() ?? path;
}

function requestFiles(path: string) {
  if (!state.connected || !props.teamId || !props.session || !path) return;
  sendCommand({
    RequestWorkspaceFiles: { team_id: props.teamId, session_id: props.session.id, path },
  });
}

function openRoot(root: string) {
  stack.value = [{ label: basename(root), path: root }];
  requestFiles(root);
}

function enter(entry: WorkspaceFileEntry) {
  if (!entry.is_dir) return;
  stack.value = [...stack.value, { label: entry.name, path: entry.path }];
  requestFiles(entry.path);
}

/** 面包屑跳转：截断到第 index 级并重新请求。 */
function jump(index: number) {
  if (index < 0 || index >= stack.value.length) return;
  stack.value = stack.value.slice(0, index + 1);
  requestFiles(currentPath.value);
}

function goUp() {
  if (stack.value.length <= 1) return;
  jump(stack.value.length - 2);
}

function refresh() {
  requestFiles(currentPath.value);
}

// 会话切换（或目录配置变化）→ 回到第一个根目录。
watch(
  () => [props.session?.id ?? '', roots.value.join('\n')].join('|'),
  () => {
    const first = roots.value[0];
    if (first) openRoot(first);
    else stack.value = [];
  },
  { immediate: true },
);

// 重连后缓存已清空：重拉当前目录。
watch(
  () => state.connected,
  (connected) => {
    if (connected && currentPath.value) requestFiles(currentPath.value);
  },
);

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
</script>

<template>
  <div class="wfb">
    <div class="wfb-head">
      <span class="wfb-title">文件浏览器</span>
      <div class="wfb-actions">
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="stack.length <= 1"
          title="返回上一级"
          @click="goUp"
        >
          ↑
        </NeumorphismButton>
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="!currentPath"
          title="重新读取当前目录"
          @click="refresh"
        >
          刷新
        </NeumorphismButton>
      </div>
    </div>

    <!-- 多工作区目录：根切换（单目录时不显示） -->
    <div v-if="roots.length > 1" class="wfb-roots">
      <button
        v-for="root in roots"
        :key="root"
        class="wfb-root"
        :class="{ 'is-active': stack[0]?.path === root }"
        :title="root"
        @click="openRoot(root)"
      >
        {{ basename(root) }}
      </button>
    </div>

    <!-- 面包屑（路径栈） -->
    <div v-if="stack.length" class="wfb-crumbs">
      <template v-for="(crumb, index) in stack" :key="crumb.path">
        <span v-if="index" class="wfb-crumb-sep">/</span>
        <button
          class="wfb-crumb"
          :class="{ 'is-current': index === stack.length - 1 }"
          :title="crumb.path"
          @click="jump(index)"
        >
          {{ crumb.label }}
        </button>
      </template>
    </div>

    <!-- 条目列表 -->
    <div class="wfb-list">
      <div v-if="!session" class="muted wfb-empty">（暂无工作区会话）</div>
      <div v-else-if="error" class="wfb-error" :title="error">{{ error }}</div>
      <div v-else-if="!listing" class="muted wfb-empty">读取中…</div>
      <div v-else-if="!entries.length" class="muted wfb-empty">（空目录）</div>
      <button
        v-for="entry in entries"
        :key="entry.path"
        class="wfb-row"
        :class="{ 'is-dir': entry.is_dir }"
        :title="entry.path"
        @click="enter(entry)"
      >
        <span class="wfb-row__name">
          <span v-if="entry.is_dir" class="wfb-row__icon">📁</span>{{ entry.name }}
        </span>
        <span v-if="!entry.is_dir" class="wfb-row__size">{{ formatSize(entry.size) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.wfb {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.wfb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.wfb-title { font-size: 12px; font-weight: 700; color: var(--nm-text-primary); }
.wfb-actions { display: flex; gap: 6px; }

.wfb-roots { display: flex; flex-wrap: wrap; gap: 4px; }
.wfb-root {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--nm-border-color);
  background: var(--panel-hover);
  color: var(--nm-text-secondary);
  font-size: 10px;
  font-family: var(--nm-font-mono, monospace);
  cursor: pointer;
}
.wfb-root:hover { border-color: var(--panel-accent); }
.wfb-root.is-active {
  border-color: var(--panel-accent);
  color: var(--nm-text-primary);
  background: var(--panel-accent-soft);
}

.wfb-crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1px;
  font-size: 11px;
}
.wfb-crumb {
  border: none;
  background: none;
  padding: 1px 4px;
  border-radius: 6px;
  color: var(--nm-text-secondary);
  font-size: 11px;
  cursor: pointer;
}
.wfb-crumb:hover { color: var(--panel-accent); }
.wfb-crumb.is-current { color: var(--nm-text-primary); font-weight: 600; }
.wfb-crumb-sep { color: var(--nm-text-secondary); font-size: 10px; }

.wfb-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 48vh;
  overflow-y: auto;
}
.wfb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--nm-text-primary);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.wfb-row:hover { background: var(--panel-hover); }
.wfb-row.is-dir { color: var(--panel-accent); }
.wfb-row.is-dir:hover { background: var(--panel-accent-soft); }
.wfb-row__name {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wfb-row__icon { font-size: 11px; }
.wfb-row__size {
  flex: none;
  font-size: 10px;
  color: var(--nm-text-secondary);
  font-family: var(--nm-font-mono, monospace);
}

.wfb-empty { font-size: 11px; }
.wfb-error {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  color: var(--panel-error, #d15353);
  background: color-mix(in srgb, var(--panel-error, #d15353) 10%, transparent);
  overflow-wrap: anywhere;
}
</style>
