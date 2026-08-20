<script setup lang="ts">
//! sudo 授权弹窗：Enter 授权，Esc 拒绝；不允许点击背景关闭（安全语义）。

import { onMounted, ref } from 'vue';
import { NeumorphismButton, NeumorphismInput, NeumorphismModal } from '@echolab-auto/ui-frame';
import type { SudoPrompt } from '../state';
import { sendSudoPassword } from '../connection';

const props = defineProps<{ prompt: SudoPrompt }>();

const input = ref('');
const bodyRef = ref<HTMLElement>();

function submit(password: string | null) {
  sendSudoPassword({ request_id: props.prompt.request_id, password });
  input.value = '';
}

onMounted(() => {
  bodyRef.value?.querySelector('input')?.focus();
});
</script>

<template>
  <!-- modelValue 恒 true：弹窗由 App 的 v-if="state.sudoPrompt" 挂载，
       后端 SudoResolved 事件清除 prompt 后自动卸载。 -->
  <NeumorphismModal
    :model-value="true"
    title="🔐 sudo 授权请求"
    :closable="false"
    :mask-closable="false"
    :show-close="false"
    :footer="false"
  >
    <div
      ref="bodyRef"
      @keydown.enter.prevent="submit(input)"
      @keydown.esc="submit(null)"
    >
      <p class="sudo-command">{{ prompt.command }}</p>
      <p class="muted">密码只通过专用通道提交，不会进入日志或对话；Enter 授权，Esc 拒绝。</p>
      <NeumorphismInput v-model="input" type="password" placeholder="输入 sudo 密码" />
      <div class="form-actions">
        <NeumorphismButton variant="flat" @click="submit(null)">拒绝 (Esc)</NeumorphismButton>
        <NeumorphismButton variant="primary" @click="submit(input)">授权 (Enter)</NeumorphismButton>
      </div>
    </div>
  </NeumorphismModal>
</template>
