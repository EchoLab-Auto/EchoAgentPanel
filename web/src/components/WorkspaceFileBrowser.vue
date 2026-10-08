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
//!
//! 根切换 chip 的悬停速览（2026-09-28）：chip 只显示目录 basename，多根同名
//! 时（如两个 `source/`）无法区分；悬停显示**绝对路径**。自绘 + Teleport，
//! 不复用原生 `title`（约 1s 延迟、样式不可控、长路径被系统截断），也不复用
//! 库 `NeumorphismTooltip`（相对定位不 Teleport，会被 rail 卡体的
//! `overflow-y: auto` 裁剪）。

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NeumorphismSpinner, NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import { scopedKey } from '../keys';
import type { WorkspaceFileEntry, WorkspaceSessionInfo } from '../protocol';
import { directoryToInput, isRemoteDirectoryInput } from '../workspace';

const props = defineProps<{
  teamId: string | null;
  session: WorkspaceSessionInfo | null;
}>();

/** 导航栈：index 0 = 活动根目录；每进入一层 push。 */
const stack = ref<Array<{ label: string; path: string }>>([]);

const currentPath = computed(() => stack.value[stack.value.length - 1]?.path ?? '');
const listing = computed(() =>
  currentPath.value
    ? state.workspaceFiles[scopedKey(state.activeRegion, currentPath.value)]
    : undefined,
);
const entries = computed(() => listing.value?.entries ?? []);
const error = computed(() => listing.value?.error ?? null);
/** 目录根（规范化为字符串：本机路径 / 跨机 node:// 串）——Core 线格式
 * 中跨机目录是 `{path,node}` 表，直接当字符串用（basename/startsWith）
 * 会崩，这里统一规范化（2026-10）。 */
const roots = computed(() => (props.session?.directories ?? []).map(directoryToInput));

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

// ── 根切换 chip 的悬停速览（绝对路径） ────────────────────────────────
//
// 定位用 `position: fixed` + 视口坐标：Teleport 到 body 后不受卡片滚动容器
// 裁剪；宽上限与 CSS 的 max-width 保持一致（超长路径换行、不截断）。

/** 速览宽度上限（px）——与 `.wfb-root-tip` 的 max-width 保持一致。 */
const ROOT_TIP_MAX_WIDTH = 340;

interface RootTip {
  path: string;
  x: number;
  y: number;
  /** true = 悬于 chip 上方（默认）；顶部空间不足时翻到下方。 */
  above: boolean;
}

const rootTip = ref<RootTip | null>(null);

function showRootTip(path: string, event: Event) {
  const el = event.currentTarget as HTMLElement | null;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  // 视口内夹取：chip 在窗口右侧栏内，靠右时左移使整条路径可见。
  const x = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - ROOT_TIP_MAX_WIDTH - 8),
  );
  const above = rect.top > 72; // 上方留得下（约两行路径）就悬于上方
  rootTip.value = { path, x, y: above ? rect.top - 6 : rect.bottom + 6, above };
}

function hideRootTip() {
  rootTip.value = null;
}

/** 定位样式：`above` 时以上边缘为锚点整体上移。 */
const rootTipStyle = computed(() => {
  const tip = rootTip.value;
  if (!tip) return undefined;
  return {
    left: `${tip.x}px`,
    top: `${tip.y}px`,
    transform: tip.above ? 'translateY(-100%)' : 'none',
  };
});

// 滚动/缩放时 chip 的视口坐标会漂移：直接收起（重新悬停即可）。
onMounted(() => {
  window.addEventListener('scroll', hideRootTip, true);
  window.addEventListener('resize', hideRootTip);
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', hideRootTip, true);
  window.removeEventListener('resize', hideRootTip);
});

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
        :aria-label="`切换到 ${root}`"
        @mouseenter="showRootTip(root, $event)"
        @mouseleave="hideRootTip"
        @click="openRoot(root)"
      >
        <span v-if="isRemoteDirectoryInput(root)" class="wfb-root__node">
          {{ root.slice('node://'.length).split('/')[0] }}⛓
        </span>{{ basename(root) }}
      </button>
    </div>

    <!-- 根切换 chip 的悬停速览（绝对路径）：Teleport 到 body + fixed 定位，
         不被卡片滚动容器（overflow: auto）裁剪（见脚本区注释） -->
    <Teleport to="body">
      <div
        v-if="rootTip"
        class="wfb-root-tip"
        :style="rootTipStyle"
        role="tooltip"
      >
        {{ rootTip.path }}
      </div>
    </Teleport>

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
      <div v-else-if="!listing" class="muted wfb-empty">
        <NeumorphismSpinner size="small" /> 读取中…
      </div>
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
.wfb-root__node {
  color: var(--panel-accent, #0969da);
  font-weight: 600;
  margin-right: 2px;
}
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

/* 悬停速览（绝对路径）。
   注意：本节是 Teleport 到 body 的节点，**不属于 rail 卡片**——scoped 样式
   通过组件 id 属性仍能命中（Vue 给 teleport 内容加同一 scope id）。
   z-index 40：高于边栏（4）/入口行（6）/清单浮层（25）/Agent 菜单（30），
   低于模态与浮层遮罩（50+）。 */
.wfb-root-tip {
  position: fixed;
  z-index: 40;
  max-width: 340px; /* 与脚本 ROOT_TIP_MAX_WIDTH 保持一致 */
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--nm-border-color);
  background: var(--nm-surface-color);
  color: var(--nm-text-primary);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  font-family: var(--nm-font-mono, monospace);
  font-size: 11px;
  line-height: 1.45;
  word-break: break-all; /* 长路径按任意字符换行，不截断 */
  pointer-events: none; /* 不抢 hover，避免闪烁 */
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
  color: var(--panel-err);
  background: color-mix(in srgb, var(--panel-err) 10%, transparent);
  overflow-wrap: anywhere;
}
</style>
