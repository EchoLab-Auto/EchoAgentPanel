<script setup lang="ts">
//! 会话切换面板（入口行「会话」按钮弹出，多会话 2026-09）。
//!
//! 列出当前智能体名下的全部会话（本地 / 各平台私聊、群聊 / 其他），
//! 点击切换；当前会话高亮，运行中会话带忙碌点。每个会话拥有独立的
//! 模型上下文（Core 侧按会话投影，见 TrunkStore::snapshot_for）。
//!
//! Local 分组含**工作区通道**（legacy：`local:workspace:<id>:local_user`，
//! 多对话（2026-10）：`local:workspace:<ws>/<conv>:local_user`——scope_id
//! 内嵌 `<ws>/<conv>`，`/` 不与 `:` 段分隔冲突，同一工作区的多条对话
//! 自然展开为多行）：legacy 昵称 = 工作区名，非 legacy 昵称 =
//! 「工作区名 · 对话名」（Core 下发），标签均为「工作区」。点选语义由
//! App 侧双向绑定——选通道 = 激活对应 (工作区, 对话)、选默认会话 =
//! 取消激活（2026-09-14 / 2026-10 多对话扩展）。
//!
//! 通用化（03b §1.3 / §4.3）：非 local 会话按 `platform` 字符串分组
//! （组键 `<platform>-dm / <platform>-group`，行内标签配色类 `.tag-dm /
//! .tag-group`）；分组标题取 `state.adapters` 中 platform 匹配条目的
//! `session_labels`——无 labels 回退 `<display_name> 私聊/群聊`、整个
//! platform 无匹配适配器回退「私聊/群聊」（session-labels.ts）。

import { computed } from 'vue';
import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import { state } from '../store';
import { sessionKey } from '../keys';
import { sendCommand } from '../connection';
import { sessionLabelsFor } from '../session-labels';
import { loopModeOf, type SessionInfo } from '../protocol';

const props = defineProps<{
  /** 当前智能体 id（只显示归属该智能体的会话）。 */
  activeTeamId?: string | null;
  /** 当前选中会话 id。 */
  activeSessionId: string;
}>();

const emit = defineEmits<{ select: [id: string] }>();

interface SessionTag {
  group: string;
  label: string;
  tag: string;
  /** 标签配色键（默认同分组；工作区通道独立配色）。 */
  tagKey: string;
  /** 平台分组元信息（local / other 为 null）——分组标题文案与排序用。 */
  platform: string | null;
  kind: 'dm' | 'group' | null;
}

function sessionTag(session: SessionInfo): SessionTag {
  const parts = session.id.split(':');
  const platform = parts[0] ?? '';
  const scope = parts[1] ?? '';
  if (platform === 'local') {
    // 工作区通道（激活 = 进入项目对话）：昵称 = 工作区名 / 「工作区 · 对话」，
    // 独立标签。多对话通道 scope_id 含 `/`（`<ws>/<conv>`）但不含 `:`，
    // 按 `:` 分段即可正确识别 scope。
    if (scope === 'workspace') {
      return { group: 'local', label: session.nickname || session.id, tag: '工作区', tagKey: 'workspace', platform: null, kind: null };
    }
    return { group: 'local', label: session.nickname || session.id, tag: 'Local', tagKey: 'local', platform: null, kind: null };
  }
  if (!platform) {
    return { group: 'other', label: session.nickname || session.id, tag: '其他', tagKey: 'other', platform: null, kind: null };
  }
  // 通用平台分组（03b §1.3）：组键 `<platform>-dm / <platform>-group`；
  // 行内标签只区分私聊/群，平台上下文由分组标题承载。
  if (scope === 'group') {
    return {
      group: `${platform}-group`,
      label: session.group_name || session.id,
      tag: '群',
      tagKey: 'group',
      platform,
      kind: 'group',
    };
  }
  return {
    group: `${platform}-dm`,
    label: session.nickname || session.id,
    tag: '私聊',
    tagKey: 'dm',
    platform,
    kind: 'dm',
  };
}

interface GroupBucket {
  key: string;
  platform: string | null;
  kind: 'dm' | 'group' | null;
  sessions: SessionInfo[];
}

/** 分组排序位次：local 恒最前，other 殿后，平台组居中。 */
function groupRank(bucket: GroupBucket): number {
  if (bucket.key === 'local') return 0;
  if (bucket.key === 'other') return 2;
  return 1;
}

/** 分组标题：内置组固定文案；平台组取 session_labels（03b §4.3，带回退）。 */
function groupLabel(bucket: GroupBucket): string {
  if (bucket.key === 'local') return 'Local';
  if (bucket.key === 'other' || !bucket.platform) return '其他';
  const labels = sessionLabelsFor(bucket.platform);
  return bucket.kind === 'group' ? labels.group : labels.dm;
}

/** 当前智能体的会话（按最近活跃倒序，分组展示）。
 *
 *  分组顺序（03b §4.3 S3，保持稳定）：local 固定最前 → 平台组（qq 优先，
 *  其余按 platform 字典序；同平台 dm 先于 group）→ other 殿后。 */
const groups = computed(() => {
  const active = props.activeTeamId ?? state.teams[0]?.id ?? null;
  const visible = state.sessions.filter((s) => (s.team_id ?? null) === active);
  const buckets = new Map<string, GroupBucket>();
  for (const session of visible) {
    const tag = sessionTag(session);
    let bucket = buckets.get(tag.group);
    if (!bucket) {
      bucket = { key: tag.group, platform: tag.platform, kind: tag.kind, sessions: [] };
      buckets.set(tag.group, bucket);
    }
    bucket.sessions.push(session);
  }
  return [...buckets.values()]
    .sort((a, b) => {
      if (groupRank(a) !== groupRank(b)) return groupRank(a) - groupRank(b);
      if (a.platform !== b.platform) {
        if (a.platform === 'qq') return -1;
        if (b.platform === 'qq') return 1;
        return (a.platform ?? '').localeCompare(b.platform ?? '');
      }
      return (a.kind === 'group' ? 1 : 0) - (b.kind === 'group' ? 1 : 0);
    })
    .map((bucket) => ({
      key: bucket.key,
      label: groupLabel(bucket),
      sessions: bucket.sessions.sort((a, b) => (b.last_active ?? 0) - (a.last_active ?? 0)),
    }));
});

function isBusy(session: SessionInfo & { core?: string | null }): boolean {
  // 活动态键是复合 (core, session_id)：同名跨 core 不串显"运行中"。
  const activity = state.activities[sessionKey(session.core, session.id)];
  return !!activity && activity.phase !== 'completed';
}

/** 「全局」入口：并行多会话模式显示（跨会话合并视图，取代旧侧栏入口）。 */
const globalVisible = computed(() => {
  const team = state.teams.find((t) => t.id === (props.activeTeamId ?? state.teams[0]?.id));
  return loopModeOf(team) === 'parallel';
});

function pick(session: SessionInfo & { core?: string | null }) {
  // 运行区域由 App.onSessionPick 依据会话归属同步（派生量，不在这里手动设）。
  emit('select', session.id);
}

/** 会话来源 Core（多上游聚合视图；null = 单上游不显示徽标）。 */
function coreBadge(session: SessionInfo & { core?: string | null }): string | null {
  return state.knownCores.size > 0 && session.core ? session.core : null;
}

function pickGlobal() {
  emit('select', 'global');
}

/** 是否工作区通道（会话级 API 仅对其开放：覆盖写入工作区对话持久化）。 */
function isWorkspace(session: SessionInfo): boolean {
  return sessionTag(session).tagKey === 'workspace';
}

/** 下拉选项：首项空值 = 跟随 persona；其余为全局供应商池。列表为空也至少有首项。 */
const apiOptions = computed(() => [
  { label: '跟随 persona', value: '' },
  ...(state.api?.profiles ?? []).map((p) => ({ label: p.name, value: p.name })),
]);

function apiValue(session: SessionInfo): string {
  return state.sessionApiOverrides[session.id] ?? '';
}

function onApiChange(session: SessionInfo & { core?: string | null }, value: unknown) {
  const teamId = session.team_id ?? props.activeTeamId ?? state.teams[0]?.id;
  if (!teamId) return;
  const profile = typeof value === 'string' ? value : '';
  if (profile === apiValue(session)) return;
  // 乐观更新；Core 回推 WorkspaceSessions 时以持久化结果为准。
  if (profile) {
    state.sessionApiOverrides[session.id] = profile;
    sendCommand({ SetSessionApi: { team_id: teamId, session_id: session.id, profile } }, session.core ?? undefined);
  } else {
    delete state.sessionApiOverrides[session.id];
    sendCommand({ ClearSessionApi: { team_id: teamId, session_id: session.id } }, session.core ?? undefined);
  }
}
</script>

<template>
  <div class="session-switcher">
    <div class="sw-head">
      <h2>会话</h2>
      <span class="sw-sub">每个会话独立上下文</span>
    </div>

    <div v-if="!groups.length" class="muted sw-empty">（当前智能体暂无会话）</div>

    <div v-if="globalVisible" class="sw-group">
      <button
        class="sw-item"
        :class="{ 'is-active': props.activeSessionId === 'global' }"
        title="全局视图：显示全部会话的消息"
        @click="pickGlobal"
      >
        <span class="sw-tag tag-global">全局</span>
        <span class="sw-label">全部消息</span>
      </button>
    </div>

    <div v-for="group in groups" :key="group.key" class="sw-group">
      <div class="sw-group__title">{{ group.label }}</div>
      <!-- 行用 div[role=button]：工作区行内嵌下拉，button 内不得嵌交互元素 -->
      <div
        v-for="session in group.sessions"
        :key="`${session.core ?? ''}:${session.id}`"
        class="sw-item"
        :class="{ 'is-active': session.id === props.activeSessionId }"
        :title="session.id"
        role="button"
        tabindex="0"
        @click="pick(session)"
        @keydown.enter.self.prevent="pick(session)"
        @keydown.space.self.prevent="pick(session)"
      >
        <span class="sw-tag" :class="`tag-${sessionTag(session).tagKey}`">{{ sessionTag(session).tag }}</span>
        <span class="sw-label">{{ sessionTag(session).label }}</span>
        <span v-if="coreBadge(session)" class="sw-core">{{ coreBadge(session) }}</span>
        <span v-if="isBusy(session)" class="sw-busy">●</span>
        <!-- 会话级 API 下拉（2026-10）：仅工作区通道（有持久化载体）；点击不触发行选 -->
        <div
          v-if="isWorkspace(session)"
          class="sw-api"
          :title="`会话级 API：${apiValue(session) || '跟随 persona'}`"
          @click.stop
          @keydown.stop
        >
          <NeumorphismSelect
            :model-value="apiValue(session)"
            :options="apiOptions"
            size="small"
            aria-label="会话级 API"
            @update:model-value="(v: unknown) => onApiChange(session, v)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-core {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--panel-hover);
  color: var(--nm-text-secondary);
  flex-shrink: 0;
}

.session-switcher {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 260px;
}
.sw-head { display: flex; align-items: baseline; gap: 8px; }
.sw-head h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nm-text-primary); }
.sw-sub { font-size: 11px; color: var(--nm-text-secondary); }
.sw-empty { margin: 0; font-size: 12px; }

.sw-group { display: flex; flex-direction: column; gap: 4px; }
.sw-group__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nm-text-secondary);
}
.sw-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--nm-text-primary);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.sw-item:hover { background: var(--panel-hover); }
.sw-item.is-active {
  border-color: var(--panel-accent);
  background: var(--panel-accent-soft);
}
.sw-tag {
  flex: 0 0 auto;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--panel-hover);
  color: var(--nm-text-secondary);
}
.sw-tag.tag-global { color: #8b5cf6; }
.sw-tag.tag-local { color: #0ea5e9; }
.sw-tag.tag-workspace { color: #14b8a6; }
.sw-tag.tag-dm { color: #2ea46e; }
.sw-tag.tag-group { color: #f59e0b; }
.sw-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sw-busy { color: var(--panel-ok, #2ea46e); font-size: 10px; }
/* 会话级 API 下拉（2026-10）：工作区通道行内配置，宽度自适应内容 */
.sw-api {
  flex: 0 0 132px;
  width: 132px;
  min-width: 0;
}
.sw-api :deep(.nm-select__wrapper) {
  font-size: 10px;
}
.sw-api :deep(.nm-select__face) {
  padding: 2px 6px;
  min-height: 24px;
}
</style>
