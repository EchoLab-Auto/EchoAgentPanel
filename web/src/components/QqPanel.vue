<script setup lang="ts">
//! QQ 适配器管理：登录状态、门控模式、白名单/黑名单（用户与群）。
//! 注意：chips 无本地草稿态——点击即发送更新命令，展示派生自 state.qqFilter。

import { computed, onMounted, watch } from 'vue';
import { NeumorphismButton, NeumorphismSegmented } from '@echolab-auto/ui-frame';
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

function refreshLists() {
  sendCommand('RequestGroupList');
  sendCommand('RequestFriendList');
  sendCommand('RequestQqFilterConfig');
  sendCommand('RequestQqOwner');
}

// 挂载/重连时都刷新，切回 QQ 面板也能拿到最新列表。
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

function applyAllowlist() {
  sendCommand({
    UpdateQqAllowlist: {
      user_ids: state.qqFilter.allowlist_users,
      group_ids: state.qqFilter.allowlist_groups,
    },
  });
}

function applyDenylist() {
  sendCommand({
    UpdateQqDenylist: {
      user_ids: state.qqFilter.denylist_users,
      group_ids: state.qqFilter.denylist_groups,
    },
  });
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
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <h2>QQ 适配器管理</h2>
      <NeumorphismButton size="small" variant="flat" @click="refreshLists">刷新列表</NeumorphismButton>
    </div>

    <QqLoginSection :adapter="qqAdapter" :owner="state.qqOwner" />

    <div class="panel-section">
      <h3>门控模式</h3>
      <NeumorphismSegmented
        :model-value="state.qqGateMode"
        :options="GATE_OPTIONS"
        @change="setGateMode"
      />
    </div>

    <div class="panel-grid">
      <div class="panel-section">
        <h3>白名单用户</h3>
        <div class="id-list">
          <span
            v-for="id in state.qqFilter.allowlist_users"
            :key="id"
            class="id-chip"
            @click="toggleAllowUser(id)"
          >
            {{ id }} ×
          </span>
          <span v-if="state.qqFilter.allowlist_users.length === 0" class="muted">（空）</span>
        </div>
        <NeumorphismButton size="small" @click="applyAllowlist">保存白名单</NeumorphismButton>
        <div class="friend-list">
          <button
            v-for="[id, name] in state.qqFriends"
            :key="id"
            class="friend-chip"
            :class="{ selected: state.qqFilter.allowlist_users.includes(id) }"
            @click="toggleAllowUser(id)"
          >
            {{ name }} ({{ id }})
          </button>
        </div>
      </div>

      <div class="panel-section">
        <h3>黑名单用户</h3>
        <div class="id-list">
          <span
            v-for="id in state.qqFilter.denylist_users"
            :key="id"
            class="id-chip"
            @click="toggleDenyUser(id)"
          >
            {{ id }} ×
          </span>
          <span v-if="state.qqFilter.denylist_users.length === 0" class="muted">（空）</span>
        </div>
        <NeumorphismButton size="small" @click="applyDenylist">保存黑名单</NeumorphismButton>
      </div>

      <div class="panel-section">
        <h3>白名单群</h3>
        <div class="id-list">
          <span v-for="id in state.qqFilter.allowlist_groups" :key="id" class="id-chip">{{ id }}</span>
          <span v-if="state.qqFilter.allowlist_groups.length === 0" class="muted">（空）</span>
        </div>
        <div class="group-list">
          <button
            v-for="[id, name] in state.qqGroups"
            :key="id"
            class="group-chip"
            :class="{ selected: state.qqFilter.allowlist_groups.includes(id) }"
            @click="toggleAllowGroup(id)"
          >
            {{ name }} ({{ id }})
          </button>
        </div>
      </div>

      <div class="panel-section">
        <h3>黑名单群</h3>
        <div class="id-list">
          <span v-for="id in state.qqFilter.denylist_groups" :key="id" class="id-chip">{{ id }}</span>
          <span v-if="state.qqFilter.denylist_groups.length === 0" class="muted">（空）</span>
        </div>
      </div>
    </div>
  </div>
</template>
