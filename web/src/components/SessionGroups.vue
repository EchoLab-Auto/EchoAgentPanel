<script setup lang="ts">
//! 会话分组列表：全局 / Local / QQ 私聊 / QQ 群 / 其他。

import { computed } from 'vue';
import type { SessionInfo } from '../protocol';
import { state } from '../store';

const props = defineProps<{ activeSessionId: string }>();
const emit = defineEmits<{ select: [id: string] }>();

interface SessionTag {
  group: string;
  label: string;
  tag: string;
}

function sessionTag(session: SessionInfo): SessionTag {
  if (session.id === 'global') {
    return { group: 'global', label: '全部消息', tag: '全局' };
  }
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

const SESSION_GROUP_LABEL: Record<string, string> = {
  global: '全局',
  local: 'Local',
  'qq-dm': 'QQ 私聊',
  'qq-group': 'QQ 群',
  other: '其他',
};

// 「全局会话」是否启用：由当前 agent（team）的 global_session_enabled 决定。
// 后端按 persona enabled_plugins 白名单推导；当前 agent 未显式配置时默认启用。
const globalSessionEnabled = computed(() => {
  const team = state.teams.find((t) => t.id === state.activeTeamId);
  if (!team) return true; // 主/默认 agent：未配置限定时默认启用
  return team.global_session_enabled !== false;
});

/** 会话是否属于当前激活 team（null = 主/默认 agent）。
 * SessionInfo.team_id 由后端 annotate（主 agent 为其 id，如 alix）；
 * Panel 的 activeTeamId 用 null 表示主 agent，因此需要归一化匹配。 */
function sessionBelongsToActiveTeam(session: SessionInfo, activeTeamId: string | null): boolean {
  const owner = session.team_id ?? null;
  if (activeTeamId === null) {
    if (owner === null) return true;
    const primary = state.teams.find((t) => t.is_default);
    // TeamsList 尚未到达时不放行他属会话：避免非默认 team 的会话在启动
    // 瞬间闪现到主 agent 分组再消失。
    return primary ? owner === primary.id : false;
  }
  return owner === activeTeamId;
}

const groups = computed(() => {
  const visibleSessions = state.sessions.filter((s) =>
    sessionBelongsToActiveTeam(s, state.activeTeamId),
  );
  const result: Array<{ key: string; label: string; sessions: SessionInfo[] }> = [];
  if (globalSessionEnabled.value) {
    result.push({ key: 'global', label: SESSION_GROUP_LABEL.global, sessions: [] });
  }
  result.push(
    { key: 'local', label: SESSION_GROUP_LABEL.local, sessions: [] },
    { key: 'qq-dm', label: SESSION_GROUP_LABEL['qq-dm'], sessions: [] },
    { key: 'qq-group', label: SESSION_GROUP_LABEL['qq-group'], sessions: [] },
    { key: 'other', label: SESSION_GROUP_LABEL.other, sessions: [] },
  );
  for (const session of visibleSessions) {
    const tag = sessionTag(session);
    const group = result.find((g) => g.key === tag.group) ?? result[result.length - 1];
    group.sessions.push(session);
  }
  // 组内按最近活跃倒序：有活动的会话上浮，列表顺序稳定可读。
  for (const group of result) {
    group.sessions.sort((a, b) => (b.last_active ?? 0) - (a.last_active ?? 0));
  }
  return result;
});

function tagOf(session: SessionInfo): SessionTag {
  return sessionTag(session);
}

function isBusy(session: SessionInfo): boolean {
  const activity = state.activities[session.id];
  return !!activity && activity.phase !== 'completed';
}
</script>

<template>
  <div class="session-list">
    <template v-for="group in groups" :key="group.key">
      <div v-if="group.sessions.length > 0 || group.key === 'global'" class="session-group">
        <div class="session-group-title">{{ group.label }}</div>
        <div
          v-if="group.key === 'global'"
          class="session-item"
          :class="{ active: props.activeSessionId === 'global' }"
          title="全局上下文：显示全部会话的消息"
          @click="emit('select', 'global')"
        >
          <div class="session-title">
            <span class="session-tag tag-global">全局</span>
            全部消息
          </div>
          <div class="session-preview">共享同一 trunk 上下文</div>
        </div>
        <div
          v-for="session in group.sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: props.activeSessionId === session.id }"
          title="点击切换到此会话"
          @click="emit('select', session.id)"
        >
          <div class="session-title">
            <span class="session-tag" :class="`tag-${tagOf(session).group}`">
              {{ tagOf(session).tag }}
            </span>
            {{ session.nickname || session.id }}
            <span v-if="isBusy(session)" class="session-busy">●</span>
          </div>
          <div class="session-preview">{{ session.last_message || '' }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
