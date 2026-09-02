<script setup lang="ts">
//! 适配器管理面板：连接状态、门控模式、白名单/黑名单（用户与群）。
//! 名单无本地草稿态——点击即发送更新命令，展示派生自 state.qqFilter。

import { computed, onMounted, watch } from 'vue';
import { NeumorphismButton, NeumorphismSegmented, NeumorphismStatusDot } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { GateMode } from '../protocol';
import QqLoginSection from './QqLoginSection.vue';

const qqAdapter = computed(() => state.adapters.find((adapter) => adapter.name === 'qq'));

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
  return GATE_HINTS[state.qqGateMode] ?? GATE_HINTS.none;
}

function refreshLists() {
  sendCommand('RequestGroupList');
  sendCommand('RequestFriendList');
  sendCommand('RequestQqFilterConfig');
  sendCommand('RequestQqOwner');
}

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
  sendCommand({ SetQqGateMode: { mode: value as GateMode } });
}

function toggleAllowUser(id: number) {
  const list = state.qqFilter.allowlist_users;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqAllowlist: { user_ids: next, group_ids: state.qqFilter.allowlist_groups },
  });
}

function toggleDenyUser(id: number) {
  const list = state.qqFilter.denylist_users;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqDenylist: { user_ids: next, group_ids: state.qqFilter.denylist_groups },
  });
}

function toggleAllowGroup(id: number) {
  const list = state.qqFilter.allowlist_groups;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqAllowlist: { user_ids: state.qqFilter.allowlist_users, group_ids: next },
  });
}

function toggleDenyGroup(id: number) {
  const list = state.qqFilter.denylist_groups;
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  sendCommand({
    UpdateQqDenylist: { user_ids: state.qqFilter.denylist_users, group_ids: next },
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
      <NeumorphismButton size="small" variant="glass" :disabled="!state.connected" @click="refreshLists">
        刷新列表
      </NeumorphismButton>
    </div>

    <!-- 适配器状态行 -->
    <div v-if="state.adapters.length === 0" class="muted">（无适配器信息）</div>
    <div v-for="adapter in state.adapters" :key="adapter.name" class="adapter-row">
      <NeumorphismStatusDot :status="adapter.running ? 'online' : 'offline'" size="small" />
      <span class="adapter-row__name">{{ adapter.display_name || adapter.name }}</span>
      <span v-if="adapter.self_id" class="adapter-row__id">{{ adapter.self_id }}</span>
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

    <QqLoginSection :adapter="qqAdapter" :owner="state.qqOwner" />

    <!-- 门控模式 -->
    <div class="qq-section">
      <div class="qq-section__head">
        <h3>门控模式</h3>
        <span class="qq-section__hint">{{ gateHint() }}</span>
      </div>
      <NeumorphismSegmented
        :model-value="state.qqGateMode"
        :options="GATE_OPTIONS"
        @change="setGateMode"
      />
    </div>

    <!-- 名单：2 × 2 卡片 -->
    <div class="qq-grid">
      <div class="qq-list-card">
        <div class="qq-list-card__head">
          <h3>白名单用户</h3>
          <span class="qq-count">{{ state.qqFilter.allowlist_users.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in state.qqFilter.allowlist_users" :key="id" class="id-chip" @click="toggleAllowUser(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="state.qqFilter.allowlist_users.length === 0" class="muted">未添加</span>
        </div>
        <div class="qq-select">
          <button
            v-for="[id, name] in state.qqFriends"
            :key="id"
            class="pick-chip"
            :class="{ selected: state.qqFilter.allowlist_users.includes(id) }"
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
          <span class="qq-count">{{ state.qqFilter.denylist_users.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in state.qqFilter.denylist_users" :key="id" class="id-chip is-deny" @click="toggleDenyUser(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="state.qqFilter.denylist_users.length === 0" class="muted">未添加</span>
        </div>
        <div class="qq-select">
          <button
            v-for="[id, name] in state.qqFriends"
            :key="id"
            class="pick-chip"
            :class="{ selected: state.qqFilter.denylist_users.includes(id) }"
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
          <span class="qq-count">{{ state.qqFilter.allowlist_groups.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in state.qqFilter.allowlist_groups" :key="id" class="id-chip" @click="toggleAllowGroup(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="state.qqFilter.allowlist_groups.length === 0" class="muted">未添加</span>
        </div>
        <div class="qq-select">
          <button
            v-for="[id, name] in state.qqGroups"
            :key="id"
            class="pick-chip"
            :class="{ selected: state.qqFilter.allowlist_groups.includes(id) }"
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
          <span class="qq-count">{{ state.qqFilter.denylist_groups.length }}</span>
        </div>
        <div class="qq-picked">
          <span v-for="id in state.qqFilter.denylist_groups" :key="id" class="id-chip is-deny" @click="toggleDenyGroup(id)">
            {{ id }}<span class="id-chip__x">×</span>
          </span>
          <span v-if="state.qqFilter.denylist_groups.length === 0" class="muted">未添加</span>
        </div>
        <p class="qq-select-empty">群列表仅对白名单开放，黑名单群请在 Core 侧配置</p>
      </div>
    </div>

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
