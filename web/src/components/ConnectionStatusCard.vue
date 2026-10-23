<script setup lang="ts">
//! 连接状态卡（右侧边栏卡片栈）：浏览器↔Panel 通道 + **每个运行区域**（上游
//! Core）的连通性/认证 + 当前区域的 QQ 实例。
//!
//! 注意：这里**不**标记"当前区域"——当前 agent 所属区域在 AgentSwitcher 的
//! 区域徽标里展示，避免同一信息两处重复。
//!
//! 2026-09-23 从顶栏中段迁入：连接状态是"面板级"信息，放顶栏会与业务导航
//! 混在一起，且断连时最该被看见的提示被压在顶栏中线；迁入右侧栏后与
//! 文件浏览器 / Shell 同级，常驻可见、可折叠，且能顺带展示各实例
//! 的连接态（顶栏一行放不下多实例）。
//!
//! 数据源：`state.connected`（management WS）+ `state.instances`
//! （`InstanceList` / `InstanceStateChanged` 事件维护）。
//!
//! ## 上游显示名用**配置名**，不用区域名（2026-10 用户报告修复）
//!
//! 这里列的是「Panel 连到哪些 Core」——用户认的是**设置页里自己填的那个名字**
//! （`[cores]` 的 `name`），它同时是：
//! - 会话列表的 core 徽标（`SessionSwitcher::coreBadge` 直接用 `session.core`）；
//! - 命令路由键（`{core: "<name>"}` 信封里的值）。
//!
//! 此前这行用的是区域名（Core 载荷里的 `region_name`，如「本机」「AI 站」）
//! ——那三个"同一台机器的名字"于是对不上：设置页写 `core`、会话徽标显示
//! `core`、连接状态却显示「本机」，排查时没法把它们对应起来。
//!
//! 现在统一走 `state.ts::coreDisplay()`：主名 = 配置名；区域名作为**副注**
//! （仅当与配置名不同才显示）——两者都有用：前者是键，后者是人对那台机器的
//! 称呼，不必二选一。

import { computed } from 'vue';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import { state } from '../store';
import { coreDisplay } from '../state';
import { instanceStatusView, type InstanceDotStatus } from '../composables/useInstanceStatusView';

/** 状态点语义：connected（绿）/ running 未连（呼吸）/ stopped（灰）。 */
type DotStatus = InstanceDotStatus;

interface InstanceRow {
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
  /** 上游配置名（`[cores].name`）：会话列表徽标与命令路由键同源，**必须**展示。 */
  name: string;
  /**
   * 区域展示名（Core 载荷的 `region_name`，如「本机」「AI 站」）。
   * 与 `name` 相同时为 `null` —— 副注只在两者确实不同时才有信息量。
   */
  region: string | null;
  url: string;
  dot: DotStatus;
  stateText: string;
  /** 悬停详情：配置名 → 区域名 → 地址/最近错误（排障按这个顺序读）。 */
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
    // 统一口径：配置名为主名、区域名为副注（见 `state.ts::coreDisplay`）。
    const shown = coreDisplay(state, u.name);
    return {
      name: shown.name,
      region: shown.region,
      url: u.url,
      dot,
      stateText,
      detail: [shown.title, u.last_error ?? u.url].join(' · '),
    };
  }),
);
// 状态文案 / 状态点：与通用 InstancePanel 共用计算（03b S1）。
const instances = computed<InstanceRow[]>(() =>
  state.instances.map((a) => {
    const view = instanceStatusView(a);
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
        <span class="conn-row__label">
          {{ row.name }}
          <!-- 区域名是"人对那台机器的称呼"，配置名是"键"：两者不同才并列显示，
               避免同一行出现两个看起来互相矛盾的名字。 -->
          <span v-if="row.region" class="conn-row__region">{{ row.region }}</span>
        </span>
        <span class="conn-row__value" :class="row.dot === 'online' ? 'is-ok' : row.dot === 'offline' ? 'is-off' : 'is-pending'">
          {{ row.stateText }}
        </span>
      </div>
    </div>


    <!-- QQ 实例 -->
    <div v-if="instances.length" class="conn-group">
      <div class="conn-group__title">
        QQ 实例（{{ state.activeRegion ?? '本机' }}）
      </div>
      <div v-for="row in instances" :key="row.key" class="conn-row">
        <NeumorphismStatusDot :status="row.dot" size="small" />
        <span class="conn-row__label" :title="row.label">{{ row.label }}</span>
        <span v-if="row.selfId" class="conn-row__id">{{ row.selfId }}</span>
        <span class="conn-row__value" :class="row.dot === 'online' ? 'is-ok' : 'is-muted'">
          {{ row.stateText }}
        </span>
      </div>
    </div>
    <p v-else class="conn-hint muted">（无实例）</p>
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
/* 区域名副注：跟在配置名后面，同色系但更弱——它是"称呼"而不是"键"，
   不能抢主名的分量（否则又与修复前一样看错重点）。 */
.conn-row__region {
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-border-color) 45%, transparent);
  font-size: 10.5px;
  color: var(--nm-text-secondary);
  vertical-align: 1px;
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
