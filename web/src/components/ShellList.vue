<script setup lang="ts">
//! 后台 Shell 会话列表（右侧边栏「Shell」卡内容）：只保留会话行 + 详情按钮。
//! 终端内容不在此展示——点「详情」经 `openDetail` 事件打开 Shell 详情卡。

import { computed, onMounted, onUnmounted, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { state } from '../store';
import { sendCommand, sendPending } from '../connection';
import { sessionKey } from '../keys';
import { coreDisplay } from '../state';
import { releasePending, usePending } from '../pending';
import LoadHint from './LoadHint.vue';

/** 当前 agent（team）：Shell 列表只显示该 agent 的后台会话，
 *  不串显其他 agent（去主智能体：team_id 必填）。 */
const props = defineProps<{ teamId: string | null }>();

/**
 * 打开详情的意图：会话 id 是 per-core 的 `sh-{seq}`，**必须连 core 一起带出去**
 * ——只传 id 的话详情面板只能按 activeRegion 猜，切区域后会把 A 的 `sh-1`
 * 当成 B 的 `sh-1`（在"以为在 B"的终端里执行的命令实际打在 A 上）。
 */
const emit = defineEmits<{ openDetail: [sessionId: string, core: string | null] }>();

const teamKey = computed(() => props.teamId ?? state.teams[0]?.id ?? null);

/** 本 agent 的会话（事件按 team_id 过滤）。注：核心服务代理处理的会话
 *（无 persona 归属）team_id 为空，此类会话对所有 agent 可见（不过滤）。
 *
 * 区域维度：列表按 activeRegion 过滤（= 当前区域的后台 shell）；每行自带
 * `core`，详情/停止/执行一律按**行自身的 core** 定向。 */
const sessions = computed(() =>
  state.shellSessions.filter(
    (s) =>
      (s.team_id === undefined || s.team_id === null || s.team_id === teamKey.value) &&
      (state.activeRegion == null || (s.core ?? null) === state.activeRegion),
  ),
);

/** 多区域部署时才显示行内区域徽标（单上游不占视觉）。 */
const showRegion = computed(() => state.upstreams.length > 1 || state.knownCores.size > 1);

const { phase: listPhase } = usePending('shell:sessions');

function refresh() {
  sendPending({ RequestShellSessions: { team_id: teamKey.value } }, 'shell:sessions');
}
/** 新建 shell：显式定向当前运行区域（不依赖 resolveTargetCore 的隐式兜底）。 */
function startShell() {
  // team_id = 新会话的归属人格（Core 据此按人格过滤列表；缺省会让会话无归属）。
  sendCommand(
    { ShellStart: { workdir: null, team_id: state.activeTeamId ?? null } },
    state.activeRegion ?? undefined,
  );
}
// 断连守卫（2026-10 审计修复）：未连接时登记 pending 会 20s 后假"超时"，
// 且重连后不补拉。挂载/team 变化仅在已连接时发起；由 connected 监听补拉。
onMounted(() => {
  if (state.connected) refresh();
});
watch(
  () => state.connected,
  (connected) => {
    if (connected) refresh();
  },
);
// 切换 agent 后重拉（列表归属变化）。
watch(teamKey, () => {
  if (state.connected) refresh();
});
onUnmounted(() => releasePending('shell:sessions'));
</script>

<template>
  <div class="shell-list">
    <div class="shell-list__actions">
      <NeumorphismButton size="small" variant="glass" :disabled="!state.connected" @click="startShell">
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
      <!-- 徽标主名 = 上游**配置名**（与设置页、会话列表徽标、命令路由键一致）；
           区域名放 title 副注——行内空间只有几十像素，塞第二个名字会把
           session_id 挤掉（见 `state.ts::coreDisplay`）。 -->
      <span
        v-if="showRegion && session.core"
        class="shell-row__core"
        :title="coreDisplay(state, session.core).title"
      >
        {{ coreDisplay(state, session.core).name }}
      </span>
      <span class="shell-row__meta" :title="session.workdir">
        {{ session.workdir }} · {{ session.exec_count }} 条
      </span>
      <NeumorphismButton
        size="small"
        variant="glass"
        @click="emit('openDetail', session.session_id, session.core ?? null)"
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
.shell-row__core {
  flex: 0 0 auto;
  padding: 0 5px;
  border-radius: 5px;
  font-size: 10px;
  color: var(--nm-text-secondary);
  background: color-mix(in srgb, var(--nm-text-primary) 8%, transparent);
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
