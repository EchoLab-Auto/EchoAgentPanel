<script setup lang="ts">
//! 会话切换面板（入口行「会话」按钮弹出，多会话 2026-09）。
//!
//! 列出当前智能体名下的全部会话（本地 / QQ 私聊 / QQ 群 / 其他），
//! 点击切换；当前会话高亮，运行中会话带忙碌点。每个会话拥有独立的
//! 模型上下文（Core 侧按会话投影，见 TrunkStore::snapshot_for）。

import { computed } from 'vue';
import { state } from '../store';
import type { SessionInfo } from '../protocol';

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
}

function sessionTag(session: SessionInfo): SessionTag {
  const parts = session.id.split(':');
  const platform = parts[0] ?? '';
  const scope = parts[1] ?? '';
  if (platform === 'local') {
    return { group: 'local', label: session.nickname || session.id, tag: 'Local' };
  }
  if (platform === 'qq') {
    if (scope === 'group') {
      return { group: 'qq-group', label: session.group_name || session.id, tag: '群' };
    }
    return { group: 'qq-dm', label: session.nickname || session.id, tag: '私聊' };
  }
  return { group: 'other', label: session.nickname || session.id, tag: platform };
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

function isBusy(session: SessionInfo): boolean {
  const activity = state.activities[session.id];
  return !!activity && activity.phase !== 'completed';
}

function pick(session: SessionInfo) {
  emit('select', session.id);
}
</script>

<template>
  <div class="session-switcher">
    <div class="sw-head">
      <h2>会话</h2>
      <span class="sw-sub">每个会话独立上下文</span>
    </div>

    <div v-if="!groups.length" class="muted sw-empty">（当前智能体暂无会话）</div>

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
        <span class="sw-tag" :class="`tag-${group.key}`">{{ sessionTag(session).tag }}</span>
        <span class="sw-label">{{ sessionTag(session).label }}</span>
        <span v-if="isBusy(session)" class="sw-busy">●</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
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
.sw-tag.tag-local { color: #0ea5e9; }
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
