<script setup lang="ts">
//! Agent 切换器：悬浮在输入框左侧的 Agent 卡片（头像 + 名字 + 下拉三角），
//! 点击卡片向上拉出 Agent 列表，点击可切换当前对话的 Agent（team）。
//! 数据来自 state.teams（Core TeamsList 事件）；activeTeamId 为空时
//! 显示第一个 team（Core 的 default_id = 配置的第一个 team）。

import { computed, ref } from 'vue';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import PanelPopover from './PanelPopover.vue';
import { state } from '../store';
import { coreDisplay } from '../state';

const props = defineProps<{ activeTeamId: string | null }>();
const emit = defineEmits<{ select: [id: string | null, core: string | null] }>();

const open = ref(false);
/** 卡片按钮 = 弹层锚点（PanelPopover 按它的 rect 定位，移动端则贴底全宽）。 */
const cardRef = ref<HTMLButtonElement | null>(null);

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

// 外部点击 / Escape 的关闭统一交给 PanelPopover（pointerdown 捕获 + keydown），
// 不再自挂 document 监听：两套监听会互相抢先，表现为"点外面关不掉"或"选项点不动"。
</script>

<template>
  <div class="agent-switcher">
    <!-- Agent 卡片：头像 + 名字 + 下拉三角 -->
    <button
      ref="cardRef"
      class="agent-card"
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
      <!-- 统一口径：主名 = 上游**配置名**（与设置页 / 会话徽标 / 命令路由键
           一致），区域名作 title 副注——卡片徽标只有 10px 字号，塞不下第二
           个名字（见 `state.ts::coreDisplay`）。 -->
      <span
        v-if="showRegion(current?.core)"
        class="agent-card__region"
        :title="coreDisplay(state, current?.core).title"
      >
        {{ coreDisplay(state, current?.core).name }}
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
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- 默认朝上（提示菜单向上弹出），打开时旋转 180° 朝下。
             线宽 2（§8：14px 显示档的标准线宽；2.5 仅用于 ≤12px 微图标补偿）。 -->
        <path d="m6 15 6-6 6 6" />
      </svg>
    </button>

    <!-- Agent 列表：交给 PanelPopover（Teleport 到 body + 固定定位）。
         为什么不用就地 absolute 弹层（2026-10 修复）：入口行在窄屏是横向滚动
         容器（`overflow-x: auto`），CSS 规定此时 `overflow-y` 由 visible 计算为
         auto —— 向上弹出的菜单整个落在容器裁剪区外，移动端点了卡片**什么都看
         不到**（实测 375×812：菜单 y=466..632、entry-row top=640，elementFromPoint
         命中消息区）。Teleport 出去后不再受任何祖先裁剪，桌面/移动同一套。 -->
    <PanelPopover
      v-model="open"
      :anchor="cardRef"
      width="360px"
      max-height="52vh"
    >
      <div class="agent-menu">
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
          <span
            v-if="showRegion(team.core)"
            class="agent-menu__core"
            :title="coreDisplay(state, team.core).title"
          >
            {{ coreDisplay(state, team.core).name }}
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
    </PanelPopover>
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
/* 列表本体只负责排布：背景/边框/阴影/定位/滚动全部由 PanelPopover 承担
   （Teleport 到 body，不再被入口行这个横向滚动容器裁剪）。 */
.agent-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

/* 窄屏收敛（2026-10 修复）：卡片曾是 213.9px / 359px 入口行（60%），
   把「会话 / 任务 / 模型」等按钮全挤进横滚。区域徽标信息冗余（菜单里每条
   仍带），移动端隐藏；名字与模型名收紧后卡片 ≈120px，入口行一屏能露出
   前 3 个按钮。 */
@media (max-width: 767.98px) {
  .agent-card {
    gap: 6px;
    padding: 0 8px 0 3px;
  }
  .agent-card__name {
    max-width: 84px;
  }
  .agent-card__model {
    max-width: 64px;
  }
  .agent-card__region {
    display: none;
  }
}
</style>
