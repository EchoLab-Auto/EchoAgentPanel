<script setup lang="ts">
//! 选单弹层（menu 插件）：展示 Core 侧 `present_menu` 发起的选项列表，
//! 用户选定或取消后经专用 `menu_answer` 帧回填等待中的工具调用。
//!
//! 交互约定：
//! - 点击选项 / 数字键 1-9 选定；Esc 或「取消」按钮表示**不做选择**
//!   （模型会收到"用户取消"，不会把它当成某个选项）；
//! - 不允许点击背景关闭（避免误触把未表态当成表态）；
//! - `MenuResolved`（选定/取消/超时/中断）到达即由 store 清空 prompt，
//!   弹层随之卸载——不会挂在死请求上。

import { computed, onMounted, ref } from 'vue';
import { NeumorphismButton, NeumorphismModal, NeumorphismTag } from '@echolab-auto/ui-frame';
import type { MenuPrompt } from '../state';
import { sendMenuAnswer } from '../connection';

const props = defineProps<{ prompt: MenuPrompt }>();

const listRef = ref<HTMLElement>();

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

/** 数字键 1-9 直接选定对应项（列表顺序）。 */
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

onMounted(() => {
  listRef.value?.focus();
});
</script>

<template>
  <!-- modelValue 恒 true：弹层由 App 的 v-if="state.menuPrompt" 挂载，
       MenuResolved 事件清空 prompt 后自动卸载。 -->
  <NeumorphismModal
    :model-value="true"
    :title="prompt.title"
    :closable="false"
    :mask-closable="false"
    :show-close="false"
    :footer="false"
  >
    <div ref="listRef" tabindex="-1" class="menu-body" @keydown="onKeydown">
      <p v-if="prompt.description" class="menu-description">{{ prompt.description }}</p>
      <div class="menu-options">
        <button
          v-for="(option, index) in prompt.options"
          :key="option.id"
          type="button"
          class="menu-option"
          @click="choose(option.id)"
        >
          <span class="menu-option-key">{{ index + 1 }}</span>
          <span class="menu-option-text">
            <span class="menu-option-label">{{ option.label }}</span>
            <span v-if="option.description" class="menu-option-note">{{ option.description }}</span>
          </span>
        </button>
      </div>
      <p class="menu-foot muted">
        <NeumorphismTag size="small" variant="default">选单</NeumorphismTag>
        <span>点击选项或按数字键选择{{ timeoutHint ? ` · ${timeoutHint}` : '' }} · Esc 取消</span>
      </p>
      <div class="form-actions">
        <NeumorphismButton variant="glass" @click="cancel">取消 (Esc)</NeumorphismButton>
      </div>
    </div>
  </NeumorphismModal>
</template>

<style scoped>
.menu-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  outline: none;
}

.menu-description {
  margin: 0;
  color: var(--nm-text-secondary);
  line-height: 1.5;
}

.menu-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: var(--nm-surface, transparent);
  box-shadow: var(--nm-shadow-raised, 0 2px 6px rgba(0, 0, 0, 0.15));
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.menu-option:hover {
  box-shadow: var(--nm-shadow-raised-hover, 0 3px 10px rgba(0, 0, 0, 0.2));
}

.menu-option-key {
  flex: none;
  min-width: 1.4em;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--nm-text-secondary);
}

.menu-option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-option-label {
  font-weight: 600;
}

.menu-option-note {
  color: var(--nm-text-secondary);
  font-size: 0.9em;
  line-height: 1.4;
}

.menu-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.9em;
}
</style>
