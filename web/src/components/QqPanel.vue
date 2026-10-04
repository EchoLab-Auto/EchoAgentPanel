<script setup lang="ts">
//! 适配器管理面板：连接状态、门控模式、白名单/黑名单（用户与群）。
//! 名单无本地草稿态——点击即发送更新命令，展示派生自 state.qqFilter。

import { computed, onMounted, ref, watch } from 'vue';
import { NeumorphismButton, NeumorphismSegmented, NeumorphismStatusDot } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { defaultQqInstanceState } from '../state';
import { scopedKey } from '../keys';
import { sendCommand, sendPending } from '../connection';
import { usePending, type PendingPhase } from '../pending';
import type { GateMode } from '../protocol';
import LoadHint from './LoadHint.vue';
import QqLoginSection from './QqLoginSection.vue';

const props = defineProps<{
  /** 当前智能体 id（面板只展示归属该智能体的 QQ 实例）。 */
  teamId?: string | null;
}>();

// ── 多实例（2026-09）：面板按实例寻址 ──
// 实例列表来自 AdapterList（platform=qq）；单实例时行为与旧版一致。
// AdapterStatus 不带 platform：QQ 实例以「有 persona 元数据或名为 qq*」识别，
// 其余适配器（如未来的 tg）不进入 QQ 面板。
const allQqAdapters = computed(() =>
  state.adapters.filter((a) => a.persona != null || a.name === 'qq' || a.name.startsWith('qq')),
);

/** 只展示**当前智能体**的实例（persona = team id）——别的 agent 的实例
 * 既不显示状态也不作为命令目标（去主智能体后每个 agent 管自己的 QQ）。
 * 兼容旧 Core（无 persona 元数据）：当没有任何实例匹配且存在无归属实例时，
 * 退化为展示这些实例（旧 Core 无从区分归属，只有单实例）。 */
const qqAdapters = computed(() => {
  const all = allQqAdapters.value;
  const team = props.teamId;
  if (!team) return all;
  const scoped = all.filter((a) => a.persona === team);
  if (scoped.length === 0 && all.some((a) => a.persona == null)) {
    return all.filter((a) => a.persona == null);
  }
  return scoped;
});
/** 当前面板正在配置的实例名（默认第一个；实例消失时自动回退）。 */
const activeInstance = ref<string>('');

const instanceNames = computed(() => qqAdapters.value.map((a) => a.name));
const activeAdapter = computed(
  () =>
    qqAdapters.value.find((a) => a.name === activeInstance.value) ?? qqAdapters.value[0] ?? null,
);
const qqAdapter = computed(() => activeAdapter.value);
/** 当前实例的 QQ 管理态（门控/名单/owner/群/好友）。 */
// 实例名跨 core 可重复（默认都叫 qq）：按 (activeCore, 实例) 取态。
const instanceState = computed(
  () =>
    state.qqByAdapter[scopedKey(state.activeCore, activeAdapter.value?.name ?? 'qq')] ??
    defaultQqInstanceState(),
);
const activeName = computed(() => activeAdapter.value?.name ?? '');
/** 多实例时才显示实例切换（单实例零变化）。 */
const multiInstance = computed(() => qqAdapters.value.length > 1);

watch(
  instanceNames,
  (names) => {
    if (!names.includes(activeInstance.value)) {
      activeInstance.value = names[0] ?? '';
    }
  },
  { immediate: true },
);

const GATE_OPTIONS = [
  { label: '无约束', value: 'none' },
  { label: '白名单', value: 'allowlist' },
  { label: '黑名单', value: 'denylist' },
];

const GATE_HINTS: Record<string, string> = {
  none: '所有消息均可触发，不做过滤',
  allowlist: '仅名单内的用户 / 群可触发',
  denylist: '名单内的用户 / 群被拒绝触发',
};

function gateHint(): string {
  return GATE_HINTS[instanceState.value.gateMode] ?? GATE_HINTS.none;
}

function refreshLists() {
  // 无实例（QQ 未启用/未注册）：不发——Core 会以"适配器未找到"拒绝，
  // 面板一打开就堆一串错误提示（纯噪音）。有实例时逐个刷新（多实例），
  // 单实例行为与旧版一致。
  if (!instanceNames.value.length) return;
  for (const adapter of instanceNames.value) {
    const key = adapter || null;
    const pk = (name: string) => `qq:${name}:${key ?? '_'}`;
    // 逐查询登记加载跟踪（按实例分 key；面板只展示 active 实例的阶段）。
    sendPending({ RequestGroupList: { adapter: key } }, pk('groups'));
    sendPending({ RequestFriendList: { adapter: key } }, pk('friends'));
    sendPending({ RequestQqFilterConfig: { adapter: key } }, pk('filter'));
    sendPending({ RequestQqOwner: { adapter: key } }, pk('owner'));
    sendPending({ RequestQqLoginStatus: { adapter: key } }, pk('login'));
  }
}

// 名单/门控区的组合加载阶段（active 实例的 4 个查询取最高阶段）。
const { phase: qqFilterPhase } = usePending(() => `qq:filter:${activeName.value || '_'}`);
const { phase: qqGroupsPhase } = usePending(() => `qq:groups:${activeName.value || '_'}`);
const { phase: qqFriendsPhase } = usePending(() => `qq:friends:${activeName.value || '_'}`);
const { phase: qqOwnerPhase } = usePending(() => `qq:owner:${activeName.value || '_'}`);
const qqListsPhase = computed<PendingPhase>(() => {
  const phases = [
    qqFilterPhase.value,
    qqGroupsPhase.value,
    qqFriendsPhase.value,
    qqOwnerPhase.value,
  ];
  if (phases.includes('timeout')) return 'timeout';
  if (phases.includes('slow')) return 'slow';
  if (phases.includes('pending')) return 'pending';
  return 'idle';
});

onMounted(() => {
  if (state.connected) refreshLists();
});
watch(
  () => state.connected,
  (connected) => {
    if (connected) refreshLists();
  },
);

function setGateMode(value: string | number) {
  sendCommand({ SetQqGateMode: { mode: value as GateMode, adapter: activeName.value } });
}

function toggleAllowUser(id: number) {
  const list = instanceState.value.filter.allowlist_users;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqAllowlist: {
      user_ids: next,
      group_ids: instanceState.value.filter.allowlist_groups,
      adapter: activeName.value,
    },
  });
}

function toggleDenyUser(id: number) {
  const list = instanceState.value.filter.denylist_users;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqDenylist: {
      user_ids: next,
      group_ids: instanceState.value.filter.denylist_groups,
      adapter: activeName.value,
    },
  });
}

function toggleAllowGroup(id: number) {
  const list = instanceState.value.filter.allowlist_groups;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqAllowlist: {
      user_ids: instanceState.value.filter.allowlist_users,
      group_ids: next,
      adapter: activeName.value,
    },
  });
}

function toggleDenyGroup(id: number) {
  const list = instanceState.value.filter.denylist_groups;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqDenylist: {
      user_ids: instanceState.value.filter.denylist_users,
      group_ids: next,
      adapter: activeName.value,
    },
  });
}
</script>

<template>
  <div class="qq-panel">
    <!-- 头部：标题 + 刷新 -->
    <div class="qq-head">
      <div class="qq-head__text">
        <h2>适配器管理</h2>
        <p class="qq-head__sub">连接状态 · 门控策略 · 名单配置</p>
      </div>
      <NeumorphismButton
        size="small"
        variant="glass"
        :disabled="!state.connected"
        :loading="qqListsPhase === 'pending' || qqListsPhase === 'slow'"
        @click="refreshLists"
      >
        刷新列表
      </NeumorphismButton>
    </div>

    <!-- 多实例选择器（仅多实例时显示） -->
    <div v-if="multiInstance" class="qq-section">
      <div class="qq-section__head">
        <h3>QQ 实例</h3>
        <span class="qq-section__hint">每个实例一个容器 / 连接通道，互不干扰</span>
      </div>
      <NeumorphismSegmented
        :model-value="activeName"
        :options="qqAdapters.map((a) => ({ label: a.persona ? `${a.name}（${a.persona}）` : a.name, value: a.name }))"
        @change="(v) => (activeInstance = String(v))"
      />
    </div>

    <!-- 无实例空态：不显示别的 agent 的状态，也不发任何请求 -->
    <p v-if="qqAdapters.length === 0" class="muted qq-empty">
      （当前智能体没有 QQ 实例{{ teamId ? `：${teamId}` : '' }}——Core 侧需为该智能体启用
      「QQ 适配器」插件并完成实例分配）
    </p>

    <!-- 适配器状态行（仅当前智能体的实例） -->
    <div v-for="adapter in qqAdapters" :key="adapter.name" class="adapter-row">
      <NeumorphismStatusDot :status="adapter.running ? 'online' : 'offline'" size="small" />
      <span class="adapter-row__name">{{ adapter.display_name || adapter.name }}</span>
      <span v-if="adapter.self_id" class="adapter-row__id">{{ adapter.self_id }}</span>
      <span v-if="adapter.container" class="adapter-row__container" :title="`NapCat 容器：${adapter.container}`">
        {{ adapter.container }}
      </span>
      <span class="adapter-row__state" :class="adapter.running ? 'is-run' : 'is-stop'">
        {{ adapter.running ? '运行中' : '已停止' }}
      </span>
      <span class="adapter-row__actions">
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="!state.connected"
          @click="sendCommand(adapter.running ? { StopAdapter: { name: adapter.name } } : { StartAdapter: { name: adapter.name } })"
        >
          {{ adapter.running ? '停止' : '启动' }}
        </NeumorphismButton>
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="!state.connected"
          @click="sendCommand({ RestartAdapter: { name: adapter.name } })"
        >
          重启
        </NeumorphismButton>
      </span>
    </div>

    <template v-if="qqAdapters.length > 0">
    <QqLoginSection :adapter="qqAdapter" :adapter-name="activeName" :owner="instanceState.owner" />

    <!-- 门控模式 -->
    <div class="qq-section">
      <div class="qq-section__head">
        <h3>门控模式</h3>
        <span class="qq-section__hint">{{ gateHint() }}</span>
      </div>
      <NeumorphismSegmented
        :model-value="instanceState.gateMode"
        :options="GATE_OPTIONS"
        @change="setGateMode"
      />
    </div>

    <!-- 名单：2 × 2 卡片 -->
    <LoadHint
      v-if="qqAdapters.length"
      :phase="qqListsPhase"
      label="QQ 名单与配置"
      @retry="refreshLists"
    />
    <div class="qq-grid">
      <div class="qq-list-card">
        <div class="qq-list-card__head">
          <h3>白名单用户</h3>
          <span class="qq-count">{{ instanceState.filter.allowlist_users.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in instanceState.filter.allowlist_users" :key="id" class="id-chip" @click="toggleAllowUser(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="instanceState.filter.allowlist_users.length === 0" class="muted">未添加</span>
        </div>
        <div class="qq-select">
          <button
            v-for="[id, name] in instanceState.friends"
            :key="id"
            class="pick-chip"
            :class="{ selected: instanceState.filter.allowlist_users.includes(id) }"
            @click="toggleAllowUser(id)"
          >
            <span class="pick-chip__name">{{ name }}</span>
            <span class="pick-chip__id">{{ id }}</span>
          </button>
        </div>
      </div>

      <div class="qq-list-card">
        <div class="qq-list-card__head">
          <h3>黑名单用户</h3>
          <span class="qq-count">{{ instanceState.filter.denylist_users.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in instanceState.filter.denylist_users" :key="id" class="id-chip is-deny" @click="toggleDenyUser(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="instanceState.filter.denylist_users.length === 0" class="muted">未添加</span>
        </div>
        <div class="qq-select">
          <button
            v-for="[id, name] in instanceState.friends"
            :key="id"
            class="pick-chip"
            :class="{ selected: instanceState.filter.denylist_users.includes(id) }"
            @click="toggleDenyUser(id)"
          >
            <span class="pick-chip__name">{{ name }}</span>
            <span class="pick-chip__id">{{ id }}</span>
          </button>
        </div>
      </div>

      <div class="qq-list-card">
        <div class="qq-list-card__head">
          <h3>白名单群</h3>
          <span class="qq-count">{{ instanceState.filter.allowlist_groups.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in instanceState.filter.allowlist_groups" :key="id" class="id-chip" @click="toggleAllowGroup(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="instanceState.filter.allowlist_groups.length === 0" class="muted">未添加</span>
        </div>
        <div class="qq-select">
          <button
            v-for="[id, name] in instanceState.groups"
            :key="id"
            class="pick-chip"
            :class="{ selected: instanceState.filter.allowlist_groups.includes(id) }"
            @click="toggleAllowGroup(id)"
          >
            <span class="pick-chip__name">{{ name }}</span>
            <span class="pick-chip__id">{{ id }}</span>
          </button>
        </div>
      </div>

      <div class="qq-list-card">
        <div class="qq-list-card__head">
          <h3>黑名单群</h3>
          <span class="qq-count">{{ instanceState.filter.denylist_groups.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in instanceState.filter.denylist_groups" :key="id" class="id-chip is-deny" @click="toggleDenyGroup(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="instanceState.filter.denylist_groups.length === 0" class="muted">未添加</span>
        </div>
        <p class="qq-select-empty">群列表仅对白名单开放，黑名单群请在 Core 侧配置</p>
      </div>
    </div>

    </template>

    <p class="qq-foot">点击名单条目即生效（无需手动保存）</p>
  </div>
</template>

<style scoped>
.qq-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── 头部 ── */
.qq-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.qq-head__text { min-width: 0; }
.qq-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.qq-head__sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--nm-text-secondary);
}

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
.adapter-row__container {
  font-family: var(--nm-font-mono, monospace);
  font-size: 10px;
  color: var(--nm-text-secondary);
  background: var(--panel-hover);
  border: 1px solid var(--nm-border-color);
  border-radius: 999px;
  padding: 1px 7px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.adapter-row__state {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.adapter-row__state.is-run { color: var(--panel-ok); background: color-mix(in srgb, var(--panel-ok) 12%, transparent); }
.adapter-row__state.is-stop { color: var(--nm-text-secondary); background: var(--panel-hover); }
.adapter-row__actions { display: flex; gap: 6px; }

/* ── 分区 ── */
.qq-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qq-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.qq-section h3, .qq-list-card h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.qq-section__hint { font-size: 11px; color: var(--nm-text-secondary); }

/* ── 名单网格 ── */
.qq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.q-list-card, .qq-list-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
}
.qq-list-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qq-count {
  min-width: 20px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--panel-accent);
  background: var(--panel-accent-soft);
  border-radius: 999px;
  padding: 1px 7px;
}

/* 已选 chips */
.qq-picked {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 26px;
  align-content: flex-start;
}
.id-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--nm-font-mono, monospace);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--nm-border-color);
  background: var(--panel-hover);
  color: var(--nm-text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.id-chip:hover { border-color: var(--panel-err); color: var(--panel-err); }
.id-chip.is-deny { background: color-mix(in srgb, var(--panel-err) 10%, transparent); color: var(--panel-err); }
.id-chip.is-deny:hover { border-color: var(--panel-err); background: color-mix(in srgb, var(--panel-err) 18%, transparent); }
.id-chip__x { opacity: 0.7; font-size: 12px; }

/* 可选列表 */
.qq-select {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 128px;
  overflow-y: auto;
  padding: 2px;
  align-content: flex-start;
}
.qq-select::-webkit-scrollbar { width: 6px; }
.qq-select::-webkit-scrollbar-thumb { background: var(--nm-border-color); border-radius: 3px; }
.pick-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--nm-border-color);
  background: transparent;
  color: var(--nm-text-primary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.pick-chip:hover { border-color: var(--panel-accent); background: var(--panel-accent-soft); }
.pick-chip.selected {
  border-color: var(--panel-accent);
  background: var(--panel-accent-soft);
  color: var(--panel-accent);
  font-weight: 600;
}
.pick-chip__name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-chip__id { font-size: 10px; opacity: 0.65; font-family: var(--nm-font-mono, monospace); }
.qq-select-empty { margin: 0; font-size: 11px; color: var(--nm-text-secondary); line-height: 1.5; }

/* 底部提示 */
.qq-foot {
  margin: 0;
  font-size: 11px;
  color: var(--nm-text-secondary);
  text-align: center;
}
</style>
