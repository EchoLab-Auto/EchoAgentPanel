<script setup lang="ts">
//! 全局确认对话框（App 根挂载一次）：渲染 `confirm.ts` 的模块级确认请求，
//! 样式/键盘/焦点圈全部来自库 `NeumorphismModal`（Esc 关闭、焦点陷阱、
//! aria-modal 与主题跟随）——替代原生 window.confirm 的阻塞与样式不可控。

import { NeumorphismButton, NeumorphismModal } from '@echolab-auto/ui-frame';
import { confirmActive, settleConfirm } from '../confirm';

const active = confirmActive();

/** 遮罩点击 / 右上关闭 / Esc 都经 update:modelValue(false) 走取消结算。 */
function onVisibleChange(open: boolean) {
  if (!open) settleConfirm(false);
}
</script>

<template>
  <NeumorphismModal
    :model-value="active !== null"
    :title="active?.title ?? '确认操作'"
    size="small"
    :footer="false"
    @update:model-value="onVisibleChange"
  >
    <div class="confirm-dialog">
      <p class="confirm-dialog__message">{{ active?.message }}</p>
      <div class="confirm-dialog__actions">
        <NeumorphismButton size="small" variant="glass" @click="settleConfirm(false)">
          {{ active?.cancelText ?? '取消' }}
        </NeumorphismButton>
        <NeumorphismButton
          size="small"
          variant="primary"
          :class="{ 'confirm-dialog__confirm--danger': active?.danger }"
          @click="settleConfirm(true)"
        >
          {{ active?.confirmText ?? '确定' }}
        </NeumorphismButton>
      </div>
    </div>
  </NeumorphismModal>
</template>

<style scoped>
.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.confirm-dialog__message {
  margin: 0;
  line-height: 1.6;
  color: var(--nm-text-primary);
  font-size: 13px;
  /* 消息里可能含换行（多段提示） */
  white-space: pre-line;
}
.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
/* 危险操作：主按钮换错误色（局部覆盖主色令牌，只影响这个按钮） */
.confirm-dialog__confirm--danger {
  --nm-primary-color: var(--panel-err);
  --nm-primary-light: var(--panel-err);
  --nm-primary-dark: var(--panel-err);
}
</style>
