<script setup lang="ts">
//! 工作区 git 状态卡（workspace 插件，2026-10 从「工作区会话管理」面板里提出）。
//!
//! 为什么单独成卡：git 状态是**常看**的信息（改代码时反复扫一眼「现在哪条
//! 分支、几个文件没提交」），而工作区会话管理是**偶尔**的操作。挤在弹层里
//! 意味着每次都要开一次弹层；提成边栏卡后常驻可见，且与文件浏览器卡并列
//! （同一个工作区、同一批目录）。
//!
//! **默认每目录一行**（2026-10 实测后的形态）：边栏一列同时开 3-4 张卡时，
//! 本卡内容区只有约 100px——按目录平铺「分支 + 计数 + 提交 + 文件 chip」
//! 五六个目录就溢出了，一屏只能看一个仓库。改成行式后 5 个目录一屏可见，
//! 点行展开细节（计数全称 / 最近提交 / 变更文件 chip）。工作区只有一个目录
//! 时默认展开（单仓项目占比最高，那正是想看细节的场景）。
//!
//! 数据流：挂载 / 切换工作区会话 / 重连时发 `RequestWorkspaceGitStatus`
//! （必须带 `team_id`，否则 Core 路由到默认 agent），Core 以
//! `WorkspaceGitStatus` 回推按目录分组的快照，落 `state.workspaceGitBySession`。
//! 不做轮询 —— git 状态只在用户主动改代码后变，刷新按钮 + 上述时机足够；
//! 定时拉会把 `git status` 变成常驻后台开销（工作区目录可能是跨机节点）。
//!
//! 绑定对象与文件浏览器卡同源（`rail-cards.ts::workspaceCardFor`）：本窗口
//! 会话是工作区通道就用该通道，否则退回全局激活工作区——两卡不会指向不同
//! 的工作区。

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { state } from '../store';
import { sendCommand } from '../connection';
import { sessionKey } from '../keys';
import type { WorkspaceGitInfo, WorkspaceSessionInfo } from '../protocol';

const props = defineProps<{
  teamId: string | null;
  session: WorkspaceSessionInfo | null;
}>();

/** 本次请求的加载态（事件回推或 8s 超时收敛，无挂死）。 */
const loading = ref(false);
let settleTimer: number | undefined;

/** 当前会话的 git 快照（按目录）。 */
const dirs = computed(() =>
  props.session
    ? (state.workspaceGitBySession[sessionKey(state.activeRegion, props.session.id)] ?? [])
    : [],
);

function request() {
  const session = props.session;
  if (!state.connected || !props.teamId || !session) return;
  // 已有快照（手动刷新）就直接显示旧数据，不闪「读取中…」；只有没有数据可
  // 显示时才进加载态。
  loading.value = dirs.value.length === 0;
  sendCommand({
    RequestWorkspaceGitStatus: { team_id: props.teamId, session_id: session.id },
  });
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    loading.value = false;
  }, 8000);
}

// 快照到达 → 收掉加载态（比计时器精确：跨机目录可能要几秒）。
watch(dirs, () => {
  loading.value = false;
});

/** 用户手动展开/收起的行（未点过时按「单目录自动展开」推断）。 */
const expanded = ref<Set<string>>(new Set());
/** 用户是否动过展开态（动过就以用户的选择为准，不再自动展开）。 */
const touched = ref(false);

// 切会话（或目录集变化）→ 立刻拉一份；展开态重置（旧会话的行对不上）。
watch(
  () => [props.session?.id ?? '', (props.session?.directories ?? []).length].join('|'),
  () => {
    expanded.value = new Set();
    touched.value = false;
    if (props.session) request();
    else loading.value = false;
  },
  { immediate: true },
);

// 重连后缓存已清空（connection.ts 清 workspaceGitBySession）：重拉。
watch(
  () => state.connected,
  (connected) => {
    if (connected) request();
  },
);

onBeforeUnmount(() => window.clearTimeout(settleTimer));

// ── 展开态 ───────────────────────────────────────────────────────────

/** 单目录工作区默认展开（点过任意行后以用户选择为准）。 */
function isExpanded(dir: WorkspaceGitInfo): boolean {
  if (touched.value) return expanded.value.has(dir.directory);
  return dirs.value.length === 1;
}

function toggle(dir: WorkspaceGitInfo) {
  const next = new Set(touched.value ? expanded.value : autoExpanded());
  touched.value = true;
  if (next.has(dir.directory)) next.delete(dir.directory);
  else next.add(dir.directory);
  expanded.value = next;
}

function autoExpanded(): Set<string> {
  return dirs.value.length === 1 ? new Set([dirs.value[0].directory]) : new Set<string>();
}

// ── 展示 ─────────────────────────────────────────────────────────────

/** 目录的显示名：取末段（`node://host/a/b` → `b`），悬停给全路径。 */
function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.split('/').filter(Boolean).pop() ?? path;
}

/**
 * 父目录（不含末段）。去掉 `node://host` 前缀后取 dirname——`node://` 的
 * 两段会被当路径段混进父目录里，先剥掉再算。
 */
function parentOf(path: string): string {
  const remote = path.startsWith('node://');
  const local = remote ? path.slice(7).split('/').slice(1).join('/') : path;
  const trimmed = local.replace(/\/+$/, '');
  const cut = trimmed.lastIndexOf('/');
  if (cut <= 0) return '';
  const parent = trimmed.slice(0, cut);
  // 本机路径自带前导 `/`；跨机路径剥掉 `node://host` 后要以 `/` 补回
  return remote ? `/${parent}` : parent;
}

/**
 * 重名目录的集合（basename 冲突）。
 *
 * 工作区常把多个仓库的 `source/` 子目录并列为目录（本机实测 5 个目录里就
 * 有两个叫 `source`），收起态只显示末段时无法区分——冲突时补一段父目录的
 * 末段（`source / echo-agent-core`）作为消歧，唯一的目录不加（省宽度）。
 */
const dupNames = computed(() => {
  const counts = new Map<string, number>();
  for (const dir of dirs.value) {
    const name = basename(dir.directory);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name));
});

/** 父目录最后一段（消歧后缀）。 */
function parentTail(path: string): string {
  return parentOf(path).split('/').filter(Boolean).pop() ?? '';
}

/** 目录是否跨机（`node://` 前缀）——跨机节点用徽标标注。 */
function nodeOf(directory: string): string | null {
  return directory.startsWith('node://') ? (directory.slice(7).split('/')[0] ?? null) : null;
}

/** 变更文件总数（行右侧的数字 / 干净判定）。 */
function changedCount(dir: {
  staged?: number;
  modified?: number;
  untracked?: number;
}): number {
  return (dir.staged ?? 0) + (dir.modified ?? 0) + (dir.untracked ?? 0);
}

/** 「已暂存 3 · 已修改 5 · 未跟踪 2」，全零时是一句「工作区干净」。 */
function summary(dir: {
  staged?: number;
  modified?: number;
  untracked?: number;
}): string {
  const parts: string[] = [];
  if (dir.staged) parts.push(`已暂存 ${dir.staged}`);
  if (dir.modified) parts.push(`已修改 ${dir.modified}`);
  if (dir.untracked) parts.push(`未跟踪 ${dir.untracked}`);
  return parts.length ? parts.join(' · ') : '工作区干净';
}

/** 行悬停提示：全路径 + 分支 / 同步 / 计数 / 最近提交（收起态也能读到全部）。 */
function rowTip(dir: WorkspaceGitInfo): string {
  const head = `${dir.directory}${nodeOf(dir.directory) ? `（节点 ${nodeOf(dir.directory)}）` : ''}`;
  if (!dir.is_repo) return `${head}\n${dir.error || '不是 git 仓库'}`;
  const bits = [`⑂ ${dir.branch || '（未知分支）'}`];
  if (dir.ahead) bits.push(`领先 ${dir.ahead}`);
  if (dir.behind) bits.push(`落后 ${dir.behind}`);
  bits.push(summary(dir));
  if (dir.last_commit) bits.push(dir.last_commit);
  return `${head}\n${bits.join(' · ')}`;
}

/** 有真实仓库的目录数（徽标；非仓 / 读失败不计）。 */
const repoCount = computed(() => dirs.value.filter((d) => d.is_repo).length);
</script>

<template>
  <div class="wgc">
    <div class="wgc-head">
      <span class="wgc-title">
        工作区 git 状态
        <span v-if="repoCount > 1" class="wgc-badge" title="工作区内的仓库数">
          {{ repoCount }}
        </span>
      </span>
      <NeumorphismButton
        size="small"
        variant="glass"
        :disabled="loading || !state.connected || !session"
        title="重新读取各目录的 git 状态"
        @click="request()"
      >
        {{ loading ? '读取中…' : '刷新' }}
      </NeumorphismButton>
    </div>

    <p v-if="!session" class="muted wgc-empty">（当前没有激活的工作区会话）</p>
    <p v-else-if="!dirs.length" class="muted wgc-empty">
      {{ loading ? '（正在读取 git 状态…）' : '（该工作区没有目录）' }}
    </p>

    <div class="wgc-list">
      <template v-for="dir in dirs" :key="dir.directory">
        <!-- 行：目录名 + 分支 + 同步 + 变更数（非仓库行不可展开，直接给错误） -->
        <div
          class="wgc-row"
          :class="{
            'wgc-row--open': dir.is_repo && isExpanded(dir),
            'wgc-row--error': !dir.is_repo,
          }"
          :title="rowTip(dir)"
          @click="dir.is_repo && toggle(dir)"
        >
          <span v-if="dir.is_repo" class="wgc-caret" aria-hidden="true">›</span>
          <span class="wgc-row__name">{{ basename(dir.directory) }}</span>
          <span
            v-if="dupNames.has(basename(dir.directory))"
            class="wgc-row__hint"
            title="同名的其他目录，用父目录末段消歧"
          >
            {{ parentTail(dir.directory) }}
          </span>
          <span v-if="dir.is_repo" class="wgc-row__branch">
            ⑂ {{ dir.branch || '？' }}
          </span>
          <span v-if="dir.ahead" class="wgc-sync" title="领先上游的提交数">↑{{ dir.ahead }}</span>
          <span v-if="dir.behind" class="wgc-sync" title="落后上游的提交数">↓{{ dir.behind }}</span>
          <span v-if="nodeOf(dir.directory)" class="wgc-node" :title="`跨机节点 ${nodeOf(dir.directory)}`">
            {{ nodeOf(dir.directory) }}
          </span>
          <span
            v-if="dir.is_repo"
            class="wgc-row__count"
            :class="{ 'wgc-row__count--clean': changedCount(dir) === 0 }"
            :title="summary(dir)"
          >
            {{ changedCount(dir) || '✓' }}
          </span>
          <span v-else class="wgc-row__err">{{ dir.error || '不是 git 仓库' }}</span>
        </div>

        <!-- 展开：计数全称 + 最近提交 + 变更文件 chip -->
        <div v-if="dir.is_repo && isExpanded(dir)" class="wgc-detail">
          <div class="wgc-detail__counts" :class="{ 'wgc-detail__counts--clean': changedCount(dir) === 0 }">
            {{ summary(dir) }}
          </div>
          <div class="wgc-detail__path">{{ parentOf(dir.directory) }}</div>
          <div v-if="dir.last_commit" class="wgc-commit" :title="dir.last_commit">
            {{ dir.last_commit }}
          </div>
          <div v-if="(dir.changed_files ?? []).length" class="wgc-files">
            <span v-for="file in dir.changed_files" :key="file" class="wgc-file" :title="file">
              {{ file }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 边栏卡内容：窄（右栏 ~300px）、可用高度小，一切尺寸按 11px 正文写 */
.wgc {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.wgc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.wgc-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--nm-text-secondary);
}
.wgc-badge {
  padding: 0 5px;
  border-radius: 8px;
  background: var(--panel-accent-soft);
  color: var(--panel-accent);
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
}

.wgc-empty {
  margin: 0;
  font-size: 11px;
}

.wgc-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* 行：单行 20px，一屏塞得下五六个目录 */
.wgc-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 4px;
  border-radius: 7px;
  font-size: 11px;
  cursor: pointer;
}
.wgc-row:hover {
  background: var(--panel-hover);
}
.wgc-row--error {
  cursor: default;
}

.wgc-caret {
  flex: 0 0 auto;
  width: 8px;
  color: var(--nm-text-secondary);
  opacity: 0.7;
  transition: transform 0.15s ease-out;
}
.wgc-row--open .wgc-caret {
  transform: rotate(90deg);
}

.wgc-row__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--nm-text-primary);
}
.wgc-row__hint {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: var(--nm-text-secondary);
  opacity: 0.65;
}
.wgc-row__branch {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--nm-text-secondary);
  opacity: 0.85;
}
.wgc-sync {
  flex: 0 0 auto;
  font-weight: 700;
  color: var(--panel-accent);
}
.wgc-node {
  flex: 0 0 auto;
  padding: 0 4px;
  border-radius: 6px;
  background: var(--panel-hover);
  color: var(--panel-warn);
  font-size: 10px;
  line-height: 14px;
}
.wgc-row__count {
  flex: 0 0 auto;
  min-width: 16px;
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--panel-warn);
}
.wgc-row__count--clean {
  color: var(--nm-text-secondary);
  opacity: 0.7;
}
.wgc-row__err {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: var(--panel-err);
}

/* 展开块：左侧缩进对齐目录名（caret 8 + gap 6） */
.wgc-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0 0 4px 14px;
  padding-left: 8px;
  border-left: 1px solid var(--nm-border-color);
}
.wgc-detail__counts {
  font-size: 11px;
  color: var(--panel-warn);
}
.wgc-detail__counts--clean {
  color: var(--nm-text-secondary);
  opacity: 0.8;
}
.wgc-detail__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: var(--nm-text-secondary);
  opacity: 0.7;
}
.wgc-commit {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-family: var(--nm-font-mono, monospace);
  color: var(--nm-text-secondary);
}

/* 变更文件 chip：最多两行高度，多则内部滚动（文件可能上百） */
.wgc-files {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 38px;
  overflow-y: auto;
}
.wgc-file {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 5px;
  border-radius: 6px;
  background: var(--panel-hover);
  font-size: 10px;
  line-height: 16px;
  color: var(--nm-text-secondary);
}
</style>
