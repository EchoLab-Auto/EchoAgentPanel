<script setup lang="ts">
//! 连接状态卡（右侧边栏卡片栈）：Core 管理通道 + 各 QQ 适配器实例的实时状态。
//!
//! 2026-09-23 从顶栏中段迁入：连接状态是"面板级"信息，放顶栏会与业务导航
//! 混在一起，且断连时最该被看见的提示被压在顶栏中线；迁入右侧栏后与
//! 文件浏览器 / Shell 同级，常驻可见、可折叠，且能顺带展示各适配器实例
//! 的连接态（顶栏一行放不下多实例）。
//!
//! 数据源：`state.connected`（management WS）+ `state.adapters`
//! （`AdapterList` / `AdapterStateChanged` 事件维护）。

import { computed } from 'vue';
import { NeumorphismStatusDot } from '@echolab-auto/ui-frame';
import { state } from '../store';

/** 状态点语义：connected（绿）/ running 未连（呼吸）/ stopped（灰）。 */
type DotStatus = 'online' | 'connecting' | 'offline';

interface AdapterRow {
  key: string;
  label: string;
  selfId: string | null;
  stateText: string;
  dot: DotStatus;
}

const coreDot = computed<DotStatus>(() => (state.connected ? 'online' : 'connecting'));

/** 可切换的上游 core（多上游聚合视图；单上游为空隐藏选择器）。 */
const coreOptions = computed(() => Array.from(state.knownCores).sort());

/** 切换"管理目标 core"：清缓存 + 重拉由 App.vue 的 activeCore watcher 统一处理。 */
function onCoreChange(event: Event) {
  state.activeCore = (event.target as HTMLSelectElement).value || null;
}

/** 展示用短 NodeId（载荷内建身份；无则空）。 */
function shortNode(core: string): string {
  const id = state.coreNodeIds[core];
  if (!id) return '';
  return id.length > 12 ? `${id.slice(0, 9)}…` : id;
}

const adapters = computed<AdapterRow[]>(() =>
  state.adapters.map((a) => ({
    key: a.name,
    label: a.display_name || a.name,
    selfId: a.self_id,
    stateText: !a.running ? '已停止' : a.connected ? '已连接' : '等待连接',
    dot: !a.running ? 'offline' : a.connected ? 'online' : 'connecting',
  })),
);
</script>

<template>
  <div class="conn-card">
    <!-- Core 管理通道（management WS） -->
    <div class="conn-row">
      <NeumorphismStatusDot :status="coreDot" size="small" />
      <span class="conn-row__label">Core</span>
      <span class="conn-row__value" :class="state.connected ? 'is-ok' : 'is-pending'">
        {{ state.connected ? '已连接' : '连接中…' }}
      </span>
    </div>
    <p v-if="!state.connected" class="conn-hint">
      与 Core 断开，正在自动重连（期间命令不会发送）
    </p>

    <!-- 管理目标 core（多上游）：设置/QQ/联邦等管理面作用于所选 core。 -->
    <div v-if="coreOptions.length > 0" class="conn-row">
      <span class="conn-row__label" title="管理面（设置/QQ/联邦）作用的目标 core">管理目标</span>
      <select class="conn-core-select" :value="state.activeCore ?? ''" @change="onCoreChange">
        <option v-for="c in coreOptions" :key="c" :value="c" :title="state.coreNodeIds[c] ?? ''">
          {{ c }}{{ shortNode(c) ? ` · ${shortNode(c)}` : '' }}
        </option>
      </select>
    </div>

    <!-- QQ 适配器实例 -->
    <div v-if="adapters.length" class="conn-group">
      <div class="conn-group__title">QQ 适配器</div>
      <div v-for="row in adapters" :key="row.key" class="conn-row">
        <NeumorphismStatusDot :status="row.dot" size="small" />
        <span class="conn-row__label" :title="row.label">{{ row.label }}</span>
        <span v-if="row.selfId" class="conn-row__id">{{ row.selfId }}</span>
        <span class="conn-row__value" :class="row.dot === 'online' ? 'is-ok' : 'is-muted'">
          {{ row.stateText }}
        </span>
      </div>
    </div>
    <p v-else class="conn-hint muted">（无适配器）</p>
  </div>
</template>

<style scoped>
.conn-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px 12px;
}
.conn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12.5px;
}
.conn-row__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--nm-text-primary);
}
.conn-row__id {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--nm-text-placeholder, #888);
}
.conn-row__value {
  flex-shrink: 0;
  font-size: 11.5px;
  color: var(--nm-text-secondary);
}
.conn-row__value.is-ok {
  color: var(--panel-ok);
}
.conn-row__value.is-pending {
  color: var(--panel-warn);
}
.conn-core-select {
  flex-shrink: 0;
  max-width: 120px;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.12));
  background: var(--nm-bg-raised, rgba(255, 255, 255, 0.06));
  color: var(--nm-text-primary);
  font-size: 11.5px;
}
.conn-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--panel-warn);
}
.conn-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.08));
}
.conn-group__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--nm-text-placeholder, #888);
}
</style>
