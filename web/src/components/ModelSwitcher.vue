<script setup lang="ts">
//! 入口行「模型」入口：查看并切换当前智能体的 API profile（`SwitchApi`）。
//!
//! 为什么值得一个独立入口（2026-10-20）：此前改模型只有两条路——设置页
//! → API → 切换激活 profile（离会话三层），或「会话」弹层里工作区通道的
//! 行内下拉（仅工作区会话、且是会话级覆盖）。入口行的 Agent 卡片**展示**
//! 模型名（`agent-card__model`，数据源同为 `state.api.model`），却没有
//! 对应的**操作**口——用户看到模型却改不了。本组件补上这个缺口。
//!
//! 语义：切换 persona 级 `active_api`（Core 重建 provider 并对全部会话生效，
//! 会话级覆盖除外）。这与 Agent 卡片模型名严格同源——卡片显示什么，这里
//! 切的就是什么。会话级覆盖仍归「会话」弹层管，两者不互相顶替。

import { computed, ref } from 'vue';
import PanelPopover from './PanelPopover.vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { ApiProfileInfo } from '../protocol';

const open = ref(false);
const btnRef = ref<InstanceType<typeof NeumorphismButton> | null>(null);

const profiles = computed(() => state.api?.profiles ?? []);
/** 当前生效模型名（Core 解析后的值）。 */
const currentModel = computed(() => state.api?.model ?? '');
/** 当前激活的 profile 名；空串 = 跟随默认配置。 */
const activeName = computed(() => state.api?.active_api ?? '');

function isActive(name: string): boolean {
  return name === activeName.value;
}

function pick(name: string) {
  open.value = false;
  if (name === activeName.value) return;
  sendCommand({ SwitchApi: { name } });
}

function labelOf(p: ApiProfileInfo): string {
  return `${p.provider} / ${p.model}`;
}

/** 组件实例 → 根元素（同 ChatView.btnElement；模板里直接 `$el` 过不了类型检查）。 */
function anchorEl(): HTMLElement | null {
  const el = btnRef.value?.$el;
  return el instanceof HTMLElement ? el : null;
}
</script>

<template>
  <NeumorphismButton
    ref="btnRef"
    class="ctx-entry"
    variant="glass"
    shape="pill"
    size="small"
    :title="`当前模型：${currentModel || '未知'}（点击切换 API profile）`"
    @click="open = !open"
  >
    <svg
      class="ctx-entry__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 2v2" />
      <path d="M15 2v2" />
      <path d="M9 20v2" />
      <path d="M15 20v2" />
      <path d="M2 9h2" />
      <path d="M2 15h2" />
      <path d="M20 9h2" />
      <path d="M20 15h2" />
    </svg>
    {{ currentModel || '模型' }}
  </NeumorphismButton>

  <PanelPopover
    :model-value="open"
    :anchor="anchorEl()"
    width="360px"
    @update:model-value="open = $event"
  >
    <div class="model-menu">
      <div class="model-menu__head">
        <h2>模型</h2>
        <span class="model-menu__sub">切换当前智能体的 API profile</span>
      </div>
      <div
        class="model-menu__item"
        :class="{ 'model-menu__item--active': isActive('') }"
        :title="'使用 [agent] 段的默认配置'"
        @click="pick('')"
      >
        <span class="model-menu__name">默认配置</span>
        <span class="model-menu__meta">跟随 persona 基础配置</span>
        <span v-if="isActive('')" class="model-menu__check">✓</span>
      </div>
      <div
        v-for="p in profiles"
        :key="p.name"
        class="model-menu__item"
        :class="{ 'model-menu__item--active': isActive(p.name) }"
        :title="`${p.base_url}${p.api_key_set ? '' : '（无 key）'}`"
        @click="pick(p.name)"
      >
        <span class="model-menu__name">{{ p.name }}</span>
        <span class="model-menu__meta">{{ labelOf(p) }}{{ p.api_key_set ? '' : ' · 无 key' }}</span>
        <span v-if="isActive(p.name)" class="model-menu__check">✓</span>
      </div>
      <div v-if="!profiles.length" class="model-menu__empty">
        （暂无 API profile——到 设置 → API 添加）
      </div>
    </div>
  </PanelPopover>
</template>

<style scoped>
.model-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}
.model-menu__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.model-menu__head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--nm-text-primary);
}
.model-menu__sub {
  font-size: 11px;
  color: var(--nm-text-secondary);
}
.model-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  color: var(--nm-text-primary);
  font-size: 12.5px;
}
.model-menu__item:hover {
  background: var(--panel-hover);
}
.model-menu__item--active {
  border-color: var(--panel-glass-border);
  background: var(--panel-hover);
}
.model-menu__name {
  font-weight: 600;
  flex: 0 0 auto;
}
.model-menu__meta {
  font-size: 11px;
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
}
.model-menu__check {
  color: var(--nm-text-secondary);
  flex: 0 0 auto;
}
.model-menu__empty {
  font-size: 12px;
  color: var(--nm-text-secondary);
  padding: 8px 9px;
}
</style>
