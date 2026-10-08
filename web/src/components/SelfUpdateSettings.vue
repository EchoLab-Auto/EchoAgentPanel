<script setup lang="ts">
//! 框架自更新设置页（2026-10）：触发 Core 自更新 + 状态可视。
//! 流程：RequestSelfUpdate → updater service 构建/替换/重启（Graceful
//! Drain 保当前回复完整）→ 轮询 SelfUpdateStatus 观察；看到 restarting
//! 即停止轮询（服务即将重启，后续验证属新 turn）。
import { onUnmounted, ref } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCard,
  NeumorphismTag,
  NeumorphismSpinner,
} from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import { schedulePolicy, setSchedulePolicy, type SchedulePolicy } from '../scheduler';
import { NeumorphismSegmented } from '@echolab-auto/ui-frame';

// ── 节点调度（P2/P4）──
const policy = ref<SchedulePolicy>(schedulePolicy());
const policyOptions = [
  { label: '负载均衡', value: 'least_busy' },
  { label: '轮询', value: 'round_robin' },
];

function onPolicyChange(value: string | number) {
  policy.value = String(value) as SchedulePolicy;
  setSchedulePolicy(policy.value);
}

/** 节点负载一览（本机 + 联邦在线 peers）。 */
const nodeLoads = () => {
  const rows: Array<{ name: string; load: number; online: boolean }> = [];
  const local = Object.values(state.activities).filter(
    a => a.phase === 'thinking' || a.phase === 'tool' || a.phase === 'subagent',
  ).length;
  rows.push({ name: `${state.federation?.node_name ?? '本机'}（本机）`, load: local, online: true });
  for (const peer of state.federation?.peers ?? []) {
    rows.push({
      name: peer.name,
      load: peer.active_turns ?? 0,
      online: peer.link === 'Online',
    });
  }
  return rows;
};

interface SelfUpdateStatus {
  state: string;
  phase?: string | null;
  revision?: string | null;
  message?: string | null;
  updated_at?: string | null;
}

/** 更新阶段序列（与 update.sh PHASE 对应；进度条高亮当前/已完成）。 */
const PHASES: Array<{ key: string; label: string }> = [
  { key: 'initializing', label: '初始化' },
  { key: 'building', label: '构建' },
  { key: 'installing', label: '安装' },
  { key: 'restarting', label: '重启' },
  { key: 'verifying', label: '验证' },
];

/** 当前阶段序号（用于进度条；未知阶段 -1）。 */
function phaseIndex(phase: string | null | undefined): number {
  if (!phase) return -1;
  const i = PHASES.findIndex(p => p.key === phase);
  // PHASE 名与 update.sh 一致（fetching/building/installing/restarting/
  // verifying）——building 前的 fetching 视为 initializing 之后。
  if (i >= 0) return i;
  if (phase === 'fetching') return 0;
  return -1;
}

/** 阶段是否已完成（在序列当前阶段之前）。 */
function phaseDone(idx: number, current: number): boolean {
  return current >= 0 && idx < current;
}

const status = ref<SelfUpdateStatus | null>(null);
const triggering = ref(false);
const error = ref('');
let pollTimer: number | undefined;

function stateMeta(s: string): { variant: 'success' | 'error' | 'info' | 'warning' | 'default'; label: string } {
  switch (s) {
    case 'updated': return { variant: 'success', label: '已更新' };
    case 'running': return { variant: 'info', label: '更新中…' };
    case 'restarting': return { variant: 'warning', label: '重启中…' };
    case 'failed':
    case 'rolled_back': return { variant: 'error', label: s === 'failed' ? '更新失败' : '已回滚' };
    default: return { variant: 'default', label: s || '空闲' };
  }
}

function onStatusEvent(ev: SelfUpdateStatus) {
  status.value = ev;
  if (ev.state === 'restarting') {
    // 服务即将重启——停止轮询（等下去会被断连打断）；重连后用户
    // 可再点"刷新状态"验证。
    stopPoll();
  }
}

function stopPoll() {
  if (pollTimer !== undefined) {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

function startPoll() {
  stopPoll();
  pollTimer = window.setInterval(() => {
    sendCommand('RequestSelfUpdateStatus');
  }, 5000);
}

function trigger() {
  triggering.value = true;
  error.value = '';
  sendCommand('RequestSelfUpdate');
  startPoll();
  window.setTimeout(() => (triggering.value = false), 3000);
}

function refreshStatus() {
  sendCommand('RequestSelfUpdateStatus');
}

// 监听 SelfUpdateStatus 事件（state.selfUpdateStatus 由 state.ts reduce 写入）。
import { watch } from 'vue';
watch(
  () => state.selfUpdateStatus,
  ev => {
    if (ev) onStatusEvent(ev as SelfUpdateStatus);
  },
  { immediate: true },
);

onUnmounted(stopPoll);
</script>

<template>
  <div class="su-page">
    <div class="su-header">
      <div>
        <div class="su-title">框架自更新</div>
        <div class="su-sub">
          从受管源码检出重新构建并替换 Core 二进制，随后自动重启（Graceful Drain：
          进行中的回复会完整生成后再重启，面板短暂重连后会话自动恢复）。
        </div>
      </div>
      <NeumorphismButton variant="primary" :loading="triggering" @click="trigger">
        立即更新 Core
      </NeumorphismButton>
    </div>

    <NeumorphismCard class="su-status" :elevation="1">
      <div class="su-status-row">
        <span class="su-label">当前状态</span>
        <NeumorphismTag :variant="stateMeta(status?.state ?? '').variant" size="small">
          {{ stateMeta(status?.state ?? '').label }}
        </NeumorphismTag>
        <NeumorphismSpinner v-if="status?.state === 'running'" size="small" />
      </div>
      <!-- 阶段进度条（state=running/restarting 时显示） -->
      <div v-if="status && (status.state === 'running' || status.state === 'restarting')" class="su-phases">
        <div
          v-for="(p, i) in PHASES"
          :key="p.key"
          class="su-phase"
          :class="{
            'su-phase--current': phaseIndex(status.phase) === i,
            'su-phase--done': phaseDone(i, phaseIndex(status.phase)),
          }"
        >
          <span class="su-phase-dot" />
          <span class="su-phase-label">{{ p.label }}</span>
        </div>
      </div>
      <div v-if="status?.message" class="su-field su-message"><span>进度</span>{{ status.message }}</div>
      <div v-if="status?.revision" class="su-field"><span>版本</span>{{ status.revision }}</div>
      <div v-if="status?.updated_at" class="su-field"><span>时间</span>{{ status.updated_at }}</div>
      <div class="su-actions">
        <NeumorphismButton size="small" @click="refreshStatus">刷新状态</NeumorphismButton>
      </div>
    </NeumorphismCard>

    <div v-if="error" class="su-error">{{ error }}</div>

    <!-- 节点调度（2026-10 深度融合 P2/P4） -->
    <div class="su-title" style="margin-top: 8px">节点调度</div>
    <div class="su-sub">
      新会话/任务的节点分配策略。已有归属的会话仍按归属自动路由；调度只决定
      「无归属新会话」落在哪个节点。
    </div>
    <NeumorphismCard class="su-status" :elevation="1">
      <div class="su-status-row">
        <span class="su-label">调度策略</span>
        <NeumorphismSegmented
          :model-value="policy"
          :options="policyOptions"
          size="small"
          @update:model-value="onPolicyChange"
        />
      </div>
      <div class="su-nodes">
        <div
          v-for="n in nodeLoads()"
          :key="n.name"
          class="su-node"
          :class="{ 'su-node--offline': !n.online }"
        >
          <span class="su-node-name">{{ n.name }}</span>
          <NeumorphismTag :variant="n.online ? 'default' : 'error'" size="small">
            {{ n.online ? '在线' : '离线' }}
          </NeumorphismTag>
          <span class="su-node-load">负载 {{ n.load }}</span>
        </div>
        <div v-if="!state.federation?.enabled" class="su-node-hint">
          联邦状态未就绪——暂仅本机参与调度（该区域暂无 peer / 状态未加载）。
        </div>
      </div>
    </NeumorphismCard>
  </div>
</template>

<style scoped>
.su-page { padding: 16px; display: flex; flex-direction: column; gap: 14px; font-size: 13px; }
.su-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.su-title { font-size: 15px; font-weight: 600; }
.su-sub { color: var(--nm-text-secondary, #888); margin-top: 2px; max-width: 560px; }
.su-status { padding: 12px; }
.su-status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.su-label { font-weight: 600; }
.su-field { font-size: 12px; opacity: 0.8; margin-top: 4px; }
.su-field span { display: inline-block; width: 40px; opacity: 0.6; }
.su-actions { margin-top: 10px; }
.su-error { color: var(--nm-color-error, #d64545); font-size: 12px; }

.su-phases {
  display: flex;
  gap: 4px;
  margin: 10px 0;
}

.su-phase {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--nm-text-secondary, #999);
}

.su-phase-dot {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--panel-hover);
}

.su-phase--done { color: var(--nm-color-success, #4a8); }
.su-phase--done .su-phase-dot { background: var(--nm-color-success, #4a8); }
.su-phase--current { color: var(--nm-primary-color); font-weight: 600; }
.su-phase--current .su-phase-dot {
  background: var(--nm-primary-color);
  animation: su-pulse 1.2s ease-in-out infinite;
}

.su-message { font-size: 12px; }

.su-nodes { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.su-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 0;
}
.su-node--offline { opacity: 0.5; }
.su-node-name { flex: 1; font-weight: 500; }
.su-node-load { opacity: 0.7; min-width: 60px; text-align: right; }
.su-node-hint { font-size: 12px; opacity: 0.6; padding: 4px 0; }

@keyframes su-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
