<script setup lang="ts">
//! 后台 Shell 会话列表（右侧边栏「Shell」卡内容）：只保留会话行 + 详情按钮。
//! 终端内容不在此展示——点「详情」经 `openDetail` 事件打开 Shell 详情卡。

import { onMounted } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';

const emit = defineEmits<{ openDetail: [sessionId: string] }>();

function refresh() {
  sendCommand('RequestShellSessions');
}
onMounted(refresh);

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
    <div v-if="state.shellSessions.length === 0" class="muted shell-list__empty">
      （暂无 shell 会话）
    </div>
    <div v-for="session in state.shellSessions" :key="session.session_id" class="shell-row">
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
