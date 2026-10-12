<script setup lang="ts">
//! Agent 切换器：悬浮在输入框左侧的 Agent 卡片（头像 + 名字 + 下拉三角），
//! 点击卡片向上拉出 Agent 列表，点击可切换当前对话的 Agent（team）。
//! 数据来自 state.teams（Core TeamsList 事件）；activeTeamId 为空时
//! 显示第一个 team（Core 的 default_id = 配置的第一个 team）。

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import { state } from '../store';
import { regionLabel } from '../state';

const props = defineProps<{ activeTeamId: string | null }>();
const emit = defineEmits<{ select: [id: string | null, core: string | null] }>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

// 当前展示的 Agent：优先 (activeTeamId, activeRegion) 匹配；为空时取
// 第一个 team（默认）。同名 team 跨 core 时用 core 消歧。
const current = computed(() => {
  const teams = state.teams;
  if (!teams.length) return null;
  const active = props.activeTeamId
    ? teams.find(
        (t) =>
          t.id === props.activeTeamId &&
          (state.activeRegion == null || (t.core ?? null) === state.activeRegion),
      ) ?? teams.find((t) => t.id === props.activeTeamId)
    : undefined;
  return active ?? teams[0];
});

/** 选中高亮：同名 team 跨 core 时只高亮 activeRegion 那一条。 */
function isActive(team: { id: string; core?: string | null }): boolean {
  const activeId = props.activeTeamId ?? state.teams[0]?.id ?? null;
  if (team.id !== activeId) return false;
  if (state.activeRegion == null) return true;
  return (team.core ?? null) === state.activeRegion;
}

/** 多区域时才展示「运行区域」徽标（单区域零变化）。 */
function showRegion(core: string | null | undefined): boolean {
  return state.knownCores.size > 0 && !!core;
}

// 头像颜色：按名字 hash 从色板选色
const PALETTE = ['#5b8def', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];
function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const avatarText = (name: string) => (name.trim()[0] ?? 'A').toUpperCase();

/** 从全局供应商池解析某个 team 当前生效的模型名（'' = 跟随全局默认） */
function resolveModel(team: { api_profile?: string | null }): string {
  const ref = team.api_profile;
  if (!ref) return state.api?.model ?? '';
  const p = state.api?.profiles?.find((x) => x.name === ref);
  return p?.model ?? '';
}
function teamModel(team: NonNullable<typeof state.teams>[number]): string {
  return resolveModel(team);
}
function currentModel(team: NonNullable<typeof state.teams>[number] | null): string {
  return team ? resolveModel(team) : '';
}

function select(id: string, core: string | null) {
  open.value = false;
  emit('select', id, core);
}

// 点击卡片外部关闭菜单
function onClickOutside(e: MouseEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}
onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <div ref="rootRef" class="agent-switcher">
    <!-- Agent 卡片：头像 + 名字 + 下拉三角 -->
    <button
      class="agent-card"
      :class="{ 'agent-card--open': open }"
      :disabled="!current"
      :title="current ? current.description || '切换 Agent' : '未配置 Agent'"
      @click="open = !open"
    >
      <span
        v-if="current"
        class="agent-card__avatar"
        :class="{ 'agent-card__avatar--off': !current.enabled }"
        :style="{ background: avatarColor(current.name) }"
      >
        {{ avatarText(current.name) }}
      </span>
      <span v-else class="agent-card__avatar agent-card__avatar--off">?</span>
      <span class="agent-card__name">{{ current?.name ?? '未配置' }}</span>
      <span v-if="showRegion(current?.core)" class="agent-card__region">
        {{ regionLabel(state, current?.core) }}
      </span>
      <span v-if="currentModel(current)" class="agent-card__model" :title="currentModel(current)!">
        {{ currentModel(current) }}
      </span>
      <svg
        class="agent-card__caret"
        :class="{ 'agent-card__caret--rot': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- 默认朝上（提示菜单向上弹出），打开时旋转 180° 朝下 -->
        <path d="m6 15 6-6 6 6" />
      </svg>
    </button>

    <!-- 上拉 Agent 列表：从卡片上方弹出 -->
    <div v-if="open && current" class="agent-menu">
      <div v-if="state.teams.length === 0" class="agent-menu__empty">（未配置 Team 成员）</div>
      <div
        v-for="team in state.teams"
        :key="`${team.core ?? ''}:${team.id}`"
        class="agent-menu__item"
        :class="{ 'agent-menu__item--active': isActive(team) }"
        @click="select(team.id, team.core ?? null)"
      >
        <span
          class="agent-card__avatar agent-menu__avatar"
          :class="{ 'agent-card__avatar--off': !team.enabled }"
          :style="{ background: avatarColor(team.name) }"
        >
          {{ avatarText(team.name) }}
        </span>
        <span class="agent-menu__name">{{ team.name }}</span>
        <span v-if="showRegion(team.core)" class="agent-menu__core">
          {{ regionLabel(state, team.core) }}
        </span>
        <span v-if="teamModel(team)" class="agent-menu__model" :title="teamModel(team)!">
          {{ teamModel(team) }}
        </span>
        <NeumorphismStatusDot
          :status="team.enabled ? 'online' : 'offline'"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-switcher {
  position: relative;
  flex: 0 0 auto;
}

/* Agent 卡片：玻璃质感 pill */
.agent-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 4px;
  border: 1px solid var(--panel-glass-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--nm-surface-raised) 42%, transparent);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  color: var(--nm-text-primary);
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  transition: background 0.15s ease, transform 0.15s ease;
}
.agent-card:hover {
  background: color-mix(in srgb, var(--nm-surface-raised) 65%, transparent);
  transform: translateY(-1px);
}
.agent-card:disabled {
  cursor: default;
  opacity: 0.7;
  transform: none;
}

.agent-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex: 0 0 auto;
  user-select: none;
}
.agent-card__avatar--off {
  background: color-mix(in srgb, var(--nm-text-placeholder) 60%, transparent) !important;
  color: var(--nm-text-secondary, #bbb);
}

.agent-card__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-card__model {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--nm-text-secondary);
}

.agent-card__caret {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  opacity: 0.7;
  transition: transform 0.15s ease;
}
.agent-card__caret--rot {
  transform: rotate(180deg);
}

/* 上拉菜单：毛玻璃面板，位于卡片上方（卡片贴屏幕底部，向下会溢出视口） */
.agent-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 30;
  min-width: 220px;
  max-height: min(60vh, calc(100vh - 200px));
  overflow-y: auto;
  padding: 6px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--nm-surface-raised) 85%, transparent);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid var(--panel-glass-border);
  box-shadow: var(--panel-glass-shadow-lg);
}

.agent-menu__empty {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--nm-text-secondary, #999);
}

.agent-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.agent-menu__item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.agent-menu__item--active {
  background: color-mix(in srgb, var(--nm-primary-color, #5b8def) 18%, transparent);
  outline: 1px solid color-mix(in srgb, var(--nm-primary-color, #5b8def) 40%, transparent);
}

.agent-menu__avatar {
  width: 24px;
  height: 24px;
  font-size: 12px;
}
.agent-card__region {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 6px;
  font-size: 10px;
  line-height: 15px;
  opacity: 0.7;
  background: rgba(127, 127, 127, 0.18);
  white-space: nowrap;
}
.agent-menu__core {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 6px;
  font-size: 10px;
  line-height: 16px;
  opacity: 0.7;
  background: rgba(127, 127, 127, 0.18);
  white-space: nowrap;
}
.agent-menu__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.agent-menu__model {
  margin-left: auto;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--nm-text-secondary);
}
</style>
