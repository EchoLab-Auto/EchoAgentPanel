<script setup lang="ts">
//! 当前会话的紧凑摘要：名称 + 上下文占用 / 窗口上限。
//!
//! 数据复用 Core 的 `ContextSnapshot`（与「上下文分块」同一口径），按
//! (core, team, session) 读取，避免多会话 / 多 Agent 间串显。这里的总占用
//! 包含提示词块与历史；Core 的 total_tokens 只计历史，不能直接当作总占用。

import { computed, watch } from 'vue';
import NeumorphismProgress from '@echolab-auto/ui-frame/components/NeumorphismProgress';
import { sendCommand } from '../connection';
import { railSessionId } from '../rail-cards';
import { sessionScopedKey } from '../keys';
import { state } from '../store';
import PanelIcon from './PanelIcon.vue';

const props = defineProps<{ teamId: string | null }>();

const teamId = computed(() => props.teamId ?? state.teams[0]?.id ?? null);
const session = computed(() => {
  const candidates = state.sessions.filter(
    (item) => item.id === railSessionId.value && (item.team_id ?? null) === teamId.value,
  );
  return (
    candidates.find((item) => (item.core ?? null) === state.activeRegion) ??
    candidates[0] ??
    null
  );
});
const core = computed(() => session.value?.core ?? state.activeRegion);
const sessionName = computed(
  () => session.value?.group_name || session.value?.nickname || railSessionId.value || '未选择会话',
);
const snapshot = computed(() =>
  railSessionId.value
    ? state.contexts[sessionScopedKey(core.value, teamId.value, railSessionId.value)] ?? null
    : null,
);
const used = computed(() => {
  const data = snapshot.value;
  if (!data) return 0;
  const blocksTotal = data.blocks.reduce((sum, block) => sum + block.tokens, 0);
  return blocksTotal > 0 ? blocksTotal : data.total_tokens;
});
const limit = computed(() => snapshot.value?.limit_tokens ?? 0);
const percent = computed(() =>
  limit.value > 0 ? Math.min(100, Math.round((used.value / limit.value) * 100)) : 0,
);
const percentText = computed(() => {
  if (percent.value > 0) return `${percent.value}%`;
  return used.value > 0 && limit.value > 0 ? '<1%' : '0%';
});
const progressVariant = computed(() =>
  percent.value >= 90 ? 'error' : percent.value >= 70 ? 'warning' : 'primary',
);

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}K`;
  return String(value);
}

function requestSnapshot() {
  if (!railSessionId.value) return;
  sendCommand({
    RequestContext: { team_id: teamId.value, session_id: railSessionId.value },
  });
}

watch([railSessionId, teamId, core], requestSnapshot, { immediate: true });

/** 一轮回答结束后刷新一次；不轮询整个上下文，也不复用全局请求加载态。 */
const activityPhase = computed(() =>
  railSessionId.value
    ? state.activities[sessionScopedKey(core.value, teamId.value, railSessionId.value)]?.phase
    : undefined,
);
watch(activityPhase, (phase, previous) => {
  if ((phase === 'completed' || phase === 'failed') && previous && phase !== previous) {
    requestSnapshot();
  }
});
</script>

<template>
  <section class="session-context" aria-label="当前会话上下文">
    <div class="session-context__session">
      <div class="session-context__label">会话名称</div>
      <div class="session-context__name" :title="sessionName">{{ sessionName }}</div>
    </div>
    <button
      class="session-context__refresh"
      type="button"
      title="刷新上下文占用"
      aria-label="刷新上下文占用"
      @click="requestSnapshot"
    >
      <PanelIcon name="refresh" size="sm" />
    </button>

    <template v-if="snapshot">
      <div class="session-context__meter-head">
        <span>上下文容量</span>
        <strong>{{ percentText }}</strong>
      </div>
      <NeumorphismProgress :model-value="percent" :variant="progressVariant" size="small" />
      <div
        class="session-context__usage"
        :title="`${used} / ${limit} tokens`"
      >
        <span>{{ formatTokens(used) }} / {{ formatTokens(limit) }}</span>
        <span>tokens</span>
      </div>
    </template>
    <div v-else class="session-context__pending">
      {{ railSessionId ? (state.connected ? '正在读取上下文…' : '等待连接 Core') : '请选择会话' }}
    </div>
  </section>
</template>

<style scoped>
.session-context {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  padding: 2px 0 4px;
}
.session-context__session {
  min-width: 0;
  padding-right: 28px;
}
.session-context__label,
.session-context__meter-head,
.session-context__usage,
.session-context__pending {
  color: var(--nm-text-secondary);
  font-size: 11px;
}
.session-context__name {
  margin-top: 4px;
  overflow: hidden;
  color: var(--nm-text-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-context__refresh {
  position: absolute;
  top: 2px;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--nm-text-secondary);
  cursor: pointer;
}
.session-context__refresh:hover {
  background: var(--panel-hover);
  color: var(--panel-accent);
}
.session-context__meter-head,
.session-context__usage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.session-context__meter-head strong {
  color: var(--nm-text-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.session-context__usage {
  font-variant-numeric: tabular-nums;
}
.session-context__pending {
  padding: 5px 0;
  line-height: 1.5;
}
</style>
