<script setup lang="ts">
//! 后台 Shell 会话列表（右侧边栏「Shell」卡内容）：只保留会话行 + 详情按钮。
//! 终端内容不在此展示——点「详情」经 `openDetail` 事件打开 Shell 详情卡。

import { computed, onMounted, onUnmounted, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand, sendPending } from '../connection';
import { sessionKey } from '../keys';
import { releasePending, usePending } from '../pending';
import LoadHint from './LoadHint.vue';

/** 当前 agent（team）：Shell 列表只显示该 agent 的后台会话，
 *  不串显其他 agent（去主智能体：team_id 必填）。 */
const props = defineProps<{ teamId: string | null }>();

const emit = defineEmits<{ openDetail: [sessionId: string] }>();

const teamKey = computed(() => props.teamId ?? state.teams[0]?.id ?? null);

/** 本 agent 的会话（事件按 team_id 过滤；旧 core 无 team_id 字段时不过滤）。 */
const sessions = computed(() =>
  state.shellSessions.filter(
    (s) =>
      (s.team_id === undefined || s.team_id === null || s.team_id === teamKey.value) &&
      (state.activeRegion == null || (s.core ?? null) === state.activeRegion),
  ),
);

const { phase: listPhase } = usePending('shell:sessions');

function refresh() {
  sendPending({ RequestShellSessions: { team_id: teamKey.value } }, 'shell:sessions');
}
onMounted(refresh);
// 切换 agent 后重拉（列表归属变化）。
watch(teamKey, refresh);
onUnmounted(() => releasePending('shell:sessions'));

</script>

<template>
  <div class="shell-list">
    <div class="shell-list__actions">
      <NeumorphismButton size="small" variant="glass" :disabled="!state.connected" @click="sendCommand({ ShellStart: { workdir: null } })">
        新建
      </NeumorphismButton>
      <NeumorphismButton size="small" variant="glass" :disabled="!state.connected" @click="refresh">
        刷新
      </NeumorphismButton>
    </div>
    <LoadHint :phase="listPhase" label="Shell 会话" @retry="refresh" />
    <div v-if="sessions.length === 0 && listPhase === 'idle'" class="muted shell-list__empty">
      （当前 agent 暂无 shell 会话）
    </div>
    <div v-for="session in sessions" :key="sessionKey(session.core, session.session_id)" class="shell-row">
      <span class="shell-row__dot" />
      <span class="shell-row__id">{{ session.session_id }}</span>
      <span class="shell-row__meta" :title="session.workdir">
        {{ session.workdir }} · {{ session.exec_count }} 条
      </span>
      <NeumorphismButton
        size="small"
        variant="glass"
        @click="emit('openDetail', session.session_id)"
      >
        详情
      </NeumorphismButton>
    </div>
  </div>
</template>

<style scoped>
.shell-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.shell-list__actions {
  display: flex;
  gap: 6px;
}
.shell-list__empty {
  font-size: 12px;
  padding: 8px 0;
}
.shell-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
  font-size: 12px;
}
.shell-row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--panel-ok);
  flex: 0 0 auto;
}
.shell-row__id {
  font-family: var(--nm-font-mono, monospace);
  color: var(--nm-text-primary);
}
.shell-row__meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--nm-text-secondary);
  font-size: 11px;
}
</style>
