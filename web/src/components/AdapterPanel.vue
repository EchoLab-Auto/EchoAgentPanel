<script setup lang="ts">
//! 通用适配器管理面板（03b §2）：头部 + 实例切换 + 状态行 + 启停重启 +
//! 内嵌适配器 UI 渲染器（S3 接入）。渲染器直接消费 `AdapterStatus.ui` 与
//! `adapterUiByKey[scopedKey(core, adapter)]`，无 `ui` 的适配器显示占位；
//! 实例切换以 `:key` 重挂渲染器、隔离节点局部态（03a §4.3）。本轮仍不挂载
//! （S5 才切 ChatView 挂载点）。
//!
//! 实例范围（03b §2.3-1）：列 `state.adapters` 全部平台；`persona` 非空且
//! ≠ 当前 teamId 的条目不显示（别的 agent 的实例既不显示状态也不作为命令
//! 目标）；`persona` 为空 = 全局实例，始终显示。零噪音：无可见实例时打开
//! 面板不发任何命令（QqPanel.test.ts:63/113 语义）。
//!
//! 命令路由：`core` 显式寻址（多上游）；缺省 null = 单上游，沿用
//! `resolveTargetCore` 的默认解析。启停重启的 pending 键为通用形式
//! `adapter:<op>:<core>:<adapter>`（03b §2.2）；渲染器动作由渲染器内部直发
//! `invokeAdapterOp`，本组件只透传其 op / op-result / warning 旁路通知。

import { computed, onMounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import AdapterUiRenderer from './adapter-ui/AdapterUiRenderer.vue';
import type { AdapterUiMeta, UiWarning } from './adapter-ui/types';
import type { OpEmitPayload, OpResultEmitPayload } from './adapter-ui/useAdapterOp';
import { state } from '../store';
import { sendCommand, sendPending } from '../connection';
import { scopedKey } from '../keys';
import { adapterStatusView } from '../composables/useAdapterStatusView';

const props = defineProps<{
  /** 当前智能体 id（persona 过滤：别的 agent 的实例不进面板）。 */
  teamId?: string | null;
  /** 目标 core（多上游显式寻址；null/缺省 = 单上游，走 resolveTargetCore）。 */
  core?: string | null;
}>();

/** 渲染器旁路通知透传（03a §1.3）：命令由渲染器内部直发，本组件只转发
 *  观测事件（S5 挂载方无需订阅即可工作）。 */
const emit = defineEmits<{
  op: [payload: OpEmitPayload];
  'op-result': [payload: OpResultEmitPayload];
  warning: [payload: UiWarning];
}>();

// ── 实例列表与选中（QqPanel :46-70 逻辑上移 + 泛化）──

/** 可见实例：persona 为空 = 全局实例；persona 非空只认当前 teamId。 */
const visibleAdapters = computed(() =>
  state.adapters.filter((a) => !a.persona || a.persona === props.teamId),
);

/** 当前面板正在配置的实例名（默认第一个；实例消失时自动回退）。 */
const activeInstance = ref('');
const visibleNames = computed(() => visibleAdapters.value.map((a) => a.name));
const activeAdapter = computed(
  () =>
    visibleAdapters.value.find((a) => a.name === activeInstance.value) ??
    visibleAdapters.value[0] ??
    null,
);
const activeName = computed(() => activeAdapter.value?.name ?? '');

watch(
  visibleNames,
  (names) => {
    if (!names.includes(activeInstance.value)) {
      activeInstance.value = names[0] ?? '';
    }
  },
  { immediate: true },
);

/** 多实例时才显示实例切换（单实例零变化）。 */
const multiInstance = computed(() => visibleAdapters.value.length > 1);

/** 选择器选项文本 = display_name + persona 标签（无 persona 的全局实例只显示名字）。 */
const instanceOptions = computed(() =>
  visibleAdapters.value.map((a) => ({
    label: a.persona ? `${a.display_name || a.name}（${a.persona}）` : a.display_name || a.name,
    value: a.name,
  })),
);

/** 状态行（状态点/文案与 ConnectionStatusCard 共用计算，03b S1）。 */
const rows = computed(() =>
  visibleAdapters.value.map((adapter) => ({ adapter, view: adapterStatusView(adapter) })),
);

// ── 管理界面渲染器接线（S3；03a §4.1/§4.4）──

/** 能力门控（03b §2.3-4）：`ui` 存在才挂渲染器；否则显示占位文案。 */
const hasUi = computed(() => activeAdapter.value?.ui != null);

/** 状态文档 = `adapterUiByKey[scopedKey(core, adapter)]`；null/非对象 =
 *  尚未收到 AdapterState（渲染器按 null 态显示 skeleton，03a §2.0）。 */
const activeUiState = computed<Record<string, unknown> | null>(() => {
  const adapter = activeAdapter.value;
  if (!adapter) return null;
  const doc = state.adapterUiByKey[scopedKey(props.core, adapter.name)];
  return typeof doc === 'object' && doc !== null ? (doc as Record<string, unknown>) : null;
});

/** 渲染器元信息（03a §1.2；来自 AdapterStatus）：core/adapter 决定命令
 *  路由与 pending 键（03a §4.2）。 */
const rendererMeta = computed<AdapterUiMeta>(() => {
  const adapter = activeAdapter.value;
  return {
    core: props.core ?? null,
    adapter: adapter?.name ?? '',
    displayName: adapter?.display_name,
    running: adapter?.running ?? false,
    connected: adapter?.connected ?? false,
  };
});

// ── 命令 ──

/** 刷新 = 重新请求适配器列表（`RequestAdapterStatus` → `AdapterList` 事件）；
 *  状态文档由 `AdapterState` 推送，无需主动拉（03b §2.3-5）。 */
function refresh(): void {
  if (!state.connected) return;
  sendCommand('RequestAdapterStatus', props.core ?? undefined);
}

// 挂载/重连即拉一次列表——但**无可见实例时不发**（零噪音：不因打开面板
// 触发必被 Core 拒绝的请求；QqPanel.test.ts:63/113 语义）。
onMounted(() => {
  if (visibleAdapters.value.length) refresh();
});
watch(
  () => state.connected,
  (connected) => {
    if (connected && visibleAdapters.value.length) refresh();
  },
);

type AdapterOpKind = 'start' | 'stop' | 'restart';

/** 通用 pending 键（03b §2.2）：`adapter:<op>:<core>:<adapter>`（core=null → 空段）。 */
function adapterOpPendingKey(op: AdapterOpKind, name: string): string {
  return `adapter:${op}:${props.core ?? ''}:${name}`;
}

/** 启停重启：命令已中立（Start/Stop/RestartAdapter），pending 键通用化。 */
function runAdapterOp(op: AdapterOpKind, name: string): void {
  const command =
    op === 'restart'
      ? { RestartAdapter: { name } }
      : op === 'start'
        ? { StartAdapter: { name } }
        : { StopAdapter: { name } };
  sendPending(command, adapterOpPendingKey(op, name), props.core ?? undefined);
}
</script>

<template>
  <div class="adapter-panel">
    <!-- 头部：标题 + 刷新（P1：刷新 = 重新请求适配器列表） -->
    <div class="ap-head">
      <div class="ap-head__text">
        <h2>适配器管理</h2>
        <p class="ap-head__sub">连接状态 · 启停控制 · 管理界面</p>
      </div>
      <NeumorphismButton
        size="small"
        variant="glass"
        :disabled="!state.connected"
        @click="refresh"
      >
        刷新
      </NeumorphismButton>
    </div>

    <!-- 多实例选择器（≥2 个可见实例才显示） -->
    <div v-if="multiInstance" class="ap-section">
      <div class="ap-section__head">
        <h3>适配器实例</h3>
        <span class="ap-section__hint">每个实例独立寻址，可分别启停与配置</span>
      </div>
      <NeumorphismSegmented
        :model-value="activeName"
        :options="instanceOptions"
        @change="(v) => (activeInstance = String(v))"
      />
    </div>

    <!-- 无可见实例空态：不显示别的 agent 的实例，也不发任何命令 -->
    <p v-if="visibleAdapters.length === 0" class="muted ap-empty">
      （当前智能体没有适配器实例{{ props.teamId ? `：${props.teamId}` : '' }}——Core 侧需为该智能体启用
      对应平台的「适配器」插件并完成实例分配）
    </p>

    <!-- 适配器状态行（仅可见实例） -->
    <div v-for="row in rows" :key="row.adapter.name" class="adapter-row">
      <NeumorphismStatusDot :status="row.view.dot" size="small" />
      <span class="adapter-row__name">{{ row.adapter.display_name || row.adapter.name }}</span>
      <span v-if="row.adapter.self_id" class="adapter-row__id">{{ row.adapter.self_id }}</span>
      <span class="adapter-row__state" :class="`is-${row.view.dot}`">
        {{ row.view.stateText }}
      </span>
      <span class="adapter-row__actions">
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="!state.connected"
          @click="runAdapterOp(row.adapter.running ? 'stop' : 'start', row.adapter.name)"
        >
          {{ row.adapter.running ? '停止' : '启动' }}
        </NeumorphismButton>
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="!state.connected"
          @click="runAdapterOp('restart', row.adapter.name)"
        >
          重启
        </NeumorphismButton>
      </span>
    </div>

    <!-- 管理界面（S3）：有 ui → 内嵌渲染器（key = scopedKey(core, adapter)，
         切换实例强制重挂、隔离节点局部态 03a §4.3）；无 ui → 占位（03b §2.3-3） -->
    <div v-if="activeAdapter" class="ap-renderer">
      <AdapterUiRenderer
        v-if="hasUi"
        :key="scopedKey(props.core, activeAdapter.name)"
        :descriptor="activeAdapter.ui"
        :state="activeUiState"
        :meta="rendererMeta"
        :disabled="!state.connected"
        @op="(p) => emit('op', p)"
        @op-result="(p) => emit('op-result', p)"
        @warning="(p) => emit('warning', p)"
      />
      <p v-else class="muted ap-renderer__placeholder">该适配器未提供管理界面</p>
    </div>
  </div>
</template>

<style scoped>
.adapter-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── 头部 ── */
.ap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ap-head__text { min-width: 0; }
.ap-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.ap-head__sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--nm-text-secondary);
}

/* ── 实例切换 ── */
.ap-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ap-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ap-section h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--nm-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ap-section__hint { font-size: 11px; color: var(--nm-text-secondary); }

.ap-empty { margin: 0; font-size: 12px; line-height: 1.5; }

/* ── 适配器状态行 ── */
.adapter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
}
.adapter-row__name {
  font-weight: 600;
  font-size: 13px;
}
.adapter-row__id {
  font-family: var(--nm-font-mono, monospace);
  font-size: 11px;
  color: var(--nm-text-secondary);
}
.adapter-row__state {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.adapter-row__state.is-online {
  color: var(--panel-ok);
  background: color-mix(in srgb, var(--panel-ok) 12%, transparent);
}
.adapter-row__state.is-connecting {
  color: var(--panel-warn);
  background: color-mix(in srgb, var(--panel-warn) 12%, transparent);
}
.adapter-row__state.is-offline {
  color: var(--nm-text-secondary);
  background: var(--panel-hover);
}
.adapter-row__actions { display: flex; gap: 6px; }

/* ── 管理界面渲染器（S3） ── */
.ap-renderer { display: flex; flex-direction: column; gap: 8px; }
.ap-renderer__placeholder { margin: 0; font-size: 12px; }
</style>
