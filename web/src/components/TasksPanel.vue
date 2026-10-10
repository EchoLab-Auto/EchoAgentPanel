<script setup lang="ts">
//! 任务与分支面板：Subagent / 临时回复分支的实时进度。
//! `sessionId` 传入且非 'global' 时只显示该会话的任务（入口行弹层：
//! 只对应当前 agent 的当前会话）；不传/传 'global' 显示全部。

import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { NeumorphismButton, NeumorphismTag } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { cancelSessionWork } from '../state';
import { sendCommand } from '../connection';

const props = defineProps<{ sessionId?: string; core?: string | null }>();

const KIND_LABEL: Record<string, string> = {
  subagent: 'Subagent',
  reply: '临时回复',
};

const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const STATUS_VARIANT: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  running: 'primary',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const BRANCH_LABEL: Record<string, string> = {
  running: '运行中',
  succeeded: '成功',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const BRANCH_VARIANT: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  running: 'primary',
  succeeded: 'success',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

// 有任务在跑时每秒重渲染一次，刷新"已耗时"显示。
const now = ref(Date.now());
let timer: number | undefined;

/** 面板展示范围：限定会话时只取该会话的任务。 */
const scopedTasks = computed(() => {
  const core = props.core ?? null;
  const inCore = (t: { core?: string | null }) => core == null || (t.core ?? null) === core;
  return props.sessionId && props.sessionId !== 'global'
    ? state.tasks.filter((task) => task.sessionId === props.sessionId && inCore(task))
    : state.tasks.filter(inCore);
});

const hasActiveTask = computed(() => scopedTasks.value.some((task) => task.status === 'running'));

watch(
  hasActiveTask,
  (active) => {
    if (active && timer === undefined) {
      now.value = Date.now();
      timer = window.setInterval(() => {
        now.value = Date.now();
      }, 1000);
    } else if (!active && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
});

const tasks = computed(() => [...scopedTasks.value].reverse());

function formatMs(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s}s` : `${s}s`;
}

function elapsed(createdAtMs: number): string {
  return formatMs(now.value - createdAtMs);
}

function isActive(status: string): boolean {
  return status === 'running';
}

function cancel(sessionId: string) {
  cancelSessionWork(state, sessionId, props.core ?? null);
  sendCommand({
    CancelRequestedWork: {
      session_id: sessionId,
      all: false,
      team_id: state.activeTeamId || undefined,
    },
  });
}
</script>

<template>
  <div v-if="tasks.length === 0" class="panel muted">
    （暂无后台任务 / Subagent / 临时回复分支）
  </div>
  <div v-else class="panel">
    <div class="panel-head">
      <h2>任务与分支</h2>
    </div>
    <div
      v-for="task in tasks"
      :key="task.id"
      class="task-card"
      :class="{ active: isActive(task.status) }"
    >
      <div class="task-head">
        <NeumorphismTag size="small" variant="default">
          {{ KIND_LABEL[task.kind] ?? task.kind }}
        </NeumorphismTag>
        <NeumorphismTag size="small" :variant="STATUS_VARIANT[task.status] ?? 'default'">
          {{ STATUS_LABEL[task.status] ?? task.status }}
        </NeumorphismTag>
        <span class="task-elapsed">{{ elapsed(task.createdAtMs) }}</span>
        <NeumorphismButton
          v-if="isActive(task.status) && task.sessionId"
          size="small"
          variant="glass"
          @click="cancel(task.sessionId)"
        >
          取消
        </NeumorphismButton>
      </div>
      <div class="task-objective">{{ task.objective }}</div>
      <div class="task-branches">
        <div v-for="branch in task.branches" :key="branch.branchId" class="task-branch">
          <span class="task-branch-id">{{ branch.branchId }}</span>
          <span class="task-branch-task">{{ branch.task || '—' }}</span>
          <span class="task-branch-target muted">{{ branch.target }}</span>
          <NeumorphismTag size="small" :variant="BRANCH_VARIANT[branch.status] ?? 'default'">
            {{ BRANCH_LABEL[branch.status] ?? branch.status }}
          </NeumorphismTag>
          <pre v-if="branch.result" class="task-branch-result">{{ branch.result }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
