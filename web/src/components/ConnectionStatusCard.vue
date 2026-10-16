<script setup lang="ts">
//! 连接状态卡（右侧边栏卡片栈）：浏览器↔Panel 通道 + **每个运行区域**（上游
//! Core）的连通性/认证 + 当前区域的 QQ 适配器实例。
//!
//! 注意：这里**不**标记"当前区域"——当前 agent 所属区域在 AgentSwitcher 的
//! 区域徽标里展示，避免同一信息两处重复。
//!
//! 2026-09-23 从顶栏中段迁入：连接状态是"面板级"信息，放顶栏会与业务导航
//! 混在一起，且断连时最该被看见的提示被压在顶栏中线；迁入右侧栏后与
//! 文件浏览器 / Shell 同级，常驻可见、可折叠，且能顺带展示各适配器实例
//! 的连接态（顶栏一行放不下多实例）。
//!
//! 数据源：`state.connected`（management WS）+ `state.adapters`
//! （`AdapterList` / `AdapterStateChanged` 事件维护）。

import { computed } from 'vue';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import { state } from '../store';
import { regionLabel } from '../state';
import { adapterStatusView, type AdapterDotStatus } from '../composables/useAdapterStatusView';

/** 状态点语义：connected（绿）/ running 未连（呼吸）/ stopped（灰）。 */
type DotStatus = AdapterDotStatus;

interface AdapterRow {
  key: string;
  label: string;
  selfId: string | null;
  stateText: string;
  dot: DotStatus;
}

const coreDot = computed<DotStatus>(() => (state.connected ? 'online' : 'connecting'));

/** 逐区域连接状态（Panel 后端 /api/upstreams 周期轮询）。 */
const upstreams = computed(() => state.upstreams);

interface CoreRow {
  name: string;
  /** 展示名：运行区域名（region_name ?? 上游名）。 */
  label: string;
  url: string;
  dot: DotStatus;
  stateText: string;
  detail: string;
}
const coreRows = computed<CoreRow[]>(() =>
  upstreams.value.map((u) => {
    const dot: DotStatus =
      u.connectivity === 'online' ? 'online' : u.connectivity === 'connecting' ? 'connecting' : 'offline';
    const stateText =
      u.connectivity === 'online'
        ? '已连接'
        : u.connectivity === 'connecting'
          ? '连接中'
          : u.auth === 'failed'
            ? '认证失败'
            : '离线';
    return {
      name: u.name,
      label: regionLabel(state, u.name),
      url: u.url,
      dot,
      stateText,
      detail: u.last_error ?? u.url,
    };
  }),
);
// 状态文案 / 状态点：与通用 AdapterPanel 共用计算（03b S1）。
const adapters = computed<AdapterRow[]>(() =>
  state.adapters.map((a) => {
    const view = adapterStatusView(a);
    return {
      key: a.name,
      label: a.display_name || a.name,
      selfId: a.self_id,
      stateText: view.stateText,
      dot: view.dot,
    };
  }),
);
</script>

<template>
  <div class="conn-card">
    <!-- 浏览器 ↔ Panel 通道 -->
    <div class="conn-row">
      <NeumorphismStatusDot :status="coreDot" size="small" />
      <span class="conn-row__label">Panel 通道</span>
      <span class="conn-row__value" :class="state.connected ? 'is-ok' : 'is-pending'">
        {{ state.connected ? '已连接' : '连接中…' }}
      </span>
    </div>
    <p v-if="!state.connected" class="conn-hint">
      与 Panel 断开，正在自动重连（期间命令不会发送）
    </p>

    <!-- 上游 Core：逐 core 连接状态（全部上游，含离线） -->
    <div class="conn-group">
      <div class="conn-group__title">上游 Core（{{ coreRows.length }}）</div>
      <div v-if="coreRows.length === 0" class="conn-hint muted">（未配置上游）</div>
      <div
        v-for="row in coreRows"
        :key="row.name"
        class="conn-row conn-row--core"
        :title="row.detail"
      >
        <NeumorphismStatusDot :status="row.dot" size="small" />
        <span class="conn-row__label">{{ row.label }}</span>
        <span class="conn-row__value" :class="row.dot === 'online' ? 'is-ok' : row.dot === 'offline' ? 'is-off' : 'is-pending'">
          {{ row.stateText }}
        </span>
      </div>
    </div>


    <!-- QQ 适配器实例 -->
    <div v-if="adapters.length" class="conn-group">
      <div class="conn-group__title">
        QQ 适配器（{{ state.activeRegion ?? '本机' }}）
      </div>
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
.conn-row__value.is-off {
  color: var(--nm-text-placeholder, #888);
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
