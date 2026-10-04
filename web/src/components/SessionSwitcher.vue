<script setup lang="ts">
//! 会话切换面板（入口行「会话」按钮弹出，多会话 2026-09）。
//!
//! 列出当前智能体名下的全部会话（本地 / QQ 私聊 / QQ 群 / 其他），
//! 点击切换；当前会话高亮，运行中会话带忙碌点。每个会话拥有独立的
//! 模型上下文（Core 侧按会话投影，见 TrunkStore::snapshot_for）。
//!
//! Local 分组含**工作区通道**（`local:workspace:<id>:local_user`，
//! 昵称 = 工作区名，标签「工作区」）：点选语义由 App 侧双向绑定
//! ——选通道 = 激活对应工作区、选默认会话 = 取消激活（2026-09-14）。

import { computed } from 'vue';
import { state } from '../store';
import { sessionKey } from '../keys';
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
}

function sessionTag(session: SessionInfo): SessionTag {
  const parts = session.id.split(':');
  const platform = parts[0] ?? '';
  const scope = parts[1] ?? '';
  if (platform === 'local') {
    // 工作区通道（激活 = 进入项目对话）：昵称 = 工作区名，独立标签。
    if (scope === 'workspace') {
      return { group: 'local', label: session.nickname || session.id, tag: '工作区', tagKey: 'workspace' };
    }
    return { group: 'local', label: session.nickname || session.id, tag: 'Local', tagKey: 'local' };
  }
  if (platform === 'qq') {
    if (scope === 'group') {
      return { group: 'qq-group', label: session.group_name || session.id, tag: '群', tagKey: 'qq-group' };
    }
    return { group: 'qq-dm', label: session.nickname || session.id, tag: '私聊', tagKey: 'qq-dm' };
  }
  return { group: 'other', label: session.nickname || session.id, tag: platform, tagKey: 'other' };
}

const GROUP_LABEL: Record<string, string> = {
  local: 'Local',
  'qq-dm': 'QQ 私聊',
  'qq-group': 'QQ 群',
  other: '其他',
};

/** 当前智能体的会话（按最近活跃倒序，分组展示）。 */
const groups = computed(() => {
  const active = props.activeTeamId ?? state.teams[0]?.id ?? null;
  const visible = state.sessions.filter((s) => (s.team_id ?? null) === active);
  const order = ['local', 'qq-dm', 'qq-group', 'other'];
  const buckets = new Map<string, SessionInfo[]>();
  for (const session of visible) {
    const tag = sessionTag(session);
    if (!buckets.has(tag.group)) buckets.set(tag.group, []);
    buckets.get(tag.group)!.push(session);
  }
  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: GROUP_LABEL[key] ?? key,
      sessions: buckets
        .get(key)!
        .sort((a, b) => (b.last_active ?? 0) - (a.last_active ?? 0)),
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
      <button
        v-for="session in group.sessions"
        :key="session.id"
        class="sw-item"
        :class="{ 'is-active': session.id === props.activeSessionId }"
        :title="session.id"
        @click="pick(session)"
      >
        <span class="sw-tag" :class="`tag-${sessionTag(session).tagKey}`">{{ sessionTag(session).tag }}</span>
        <span class="sw-label">{{ sessionTag(session).label }}</span>
        <span v-if="coreBadge(session)" class="sw-core">{{ coreBadge(session) }}</span>
        <span v-if="isBusy(session)" class="sw-busy">●</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sw-core {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--nf-bg-inset, #0002);
  color: var(--nf-text-secondary, #888);
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
.sw-tag.tag-qq-dm { color: #2ea46e; }
.sw-tag.tag-qq-group { color: #f59e0b; }
.sw-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sw-busy { color: var(--panel-ok, #2ea46e); font-size: 10px; }
</style>
