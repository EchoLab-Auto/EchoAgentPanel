<script setup lang="ts">
//! 选单卡片（menu 插件，**内联于会话区**）：展示 Core 侧 `present_menu`
//! 发起的选项列表，用户选定或取消后经专用 `menu_answer` 帧回填等待中的
//! 工具调用。
//!
//! 2026-09-14：由弹窗（MenuModal）改为会话区内的内联卡片——选择发生在
//! 对话流里，与消息同列滚动，不再遮挡整个面板。
//!
//! 交互约定：
//! - 点击选项（或聚焦后按数字键 1-9）选定；「取消」按钮 / Esc（聚焦时）
//!   表示**不做选择**（模型会收到"用户取消"，不会把它当成某个选项）；
//! - 不自动聚焦：会话区属输入流，抢焦点会打断用户正在输入的内容；
//! - `MenuResolved`（选定/取消/超时/中断）到达即由 store 清空 prompt，
//!   卡片随之卸载——不会挂在死请求上。

import { computed } from 'vue';
import { NeumorphismButton, NeumorphismTag } from '@echolab-auto/ui-frame';
import type { MenuPrompt } from '../state';
import { sendMenuAnswer } from '../connection';

const props = defineProps<{ prompt: MenuPrompt }>();

const timeoutHint = computed(() => {
  const secs = props.prompt.timeoutSecs;
  if (!secs) return '';
  const minutes = Math.round(secs / 60);
  return minutes >= 1 ? `等待约 ${minutes} 分钟` : `等待 ${secs} 秒`;
});

function choose(optionId: string) {
  sendMenuAnswer({ request_id: props.prompt.request_id, option_id: optionId });
}

function cancel() {
  sendMenuAnswer({ request_id: props.prompt.request_id, option_id: null });
}

/** 数字键 1-9 直接选定对应项（列表顺序）；Esc = 取消。 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    cancel();
    return;
  }
  const index = Number.parseInt(event.key, 10);
  if (Number.isInteger(index) && index >= 1 && index <= props.prompt.options.length) {
    event.preventDefault();
    const option = props.prompt.options[index - 1];
    if (option) choose(option.id);
  }
}
</script>

<template>
  <div class="menu-card" tabindex="0" @keydown="onKeydown">
    <div class="menu-card__head">
      <NeumorphismTag size="small" variant="default">选单</NeumorphismTag>
      <span class="menu-card__title">{{ prompt.title }}</span>
    </div>
    <p v-if="prompt.description" class="menu-card__description">{{ prompt.description }}</p>
    <div class="menu-card__options">
      <button
        v-for="(option, index) in prompt.options"
        :key="option.id"
        type="button"
        class="menu-card__option"
        @click="choose(option.id)"
      >
        <span class="menu-card__option-key">{{ index + 1 }}</span>
        <span class="menu-card__option-text">
          <span class="menu-card__option-label">{{ option.label }}</span>
          <span v-if="option.description" class="menu-card__option-note">
            {{ option.description }}
          </span>
        </span>
      </button>
    </div>
    <div class="menu-card__foot">
      <span class="menu-card__hint muted">
        点击选项或按数字键选择{{ timeoutHint ? ` · ${timeoutHint}` : '' }} · Esc 取消
      </span>
      <NeumorphismButton size="small" variant="glass" @click="cancel">取消 (Esc)</NeumorphismButton>
    </div>
  </div>
</template>

<style scoped>
.menu-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--panel-accent) 45%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--panel-accent) 5%, transparent);
  outline: none;
}
.menu-card:focus-visible {
  border-color: var(--panel-accent);
}

.menu-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-card__title {
  font-weight: 600;
  font-size: 13px;
  color: var(--nm-text-primary);
}

.menu-card__description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--nm-text-secondary);
}

.menu-card__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 选项行：整行可点，主色描边提示可选 */
.menu-card__option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: color-mix(in srgb, var(--nm-text-primary) 4%, transparent);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.menu-card__option:hover,
.menu-card__option:focus-visible {
  border-color: var(--panel-accent);
  background: color-mix(in srgb, var(--panel-accent) 10%, transparent);
}

.menu-card__option-key {
  flex: none;
  min-width: 1.4em;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--nm-text-secondary);
}

.menu-card__option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.menu-card__option-label {
  font-weight: 600;
  font-size: 13px;
}

.menu-card__option-note {
  color: var(--nm-text-secondary);
  font-size: 11.5px;
  line-height: 1.45;
}

.menu-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.menu-card__hint {
  font-size: 11.5px;
}
</style>
