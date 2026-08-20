<script setup lang="ts">
//! 系统提示词编辑弹窗。

import { ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismModal,
  NeumorphismTextarea,
} from '@echolab-auto/ui-frame';
import { state } from '../store';

const visible = defineModel<boolean>({ required: true });
const emit = defineEmits<{ save: [text: string] }>();

const text = ref(state.systemPrompt);

// 每次打开时以最新的系统提示词重置草稿（对应 React 版的 initialText 同步）。
watch(visible, (open) => {
  if (open) text.value = state.systemPrompt;
});

function save() {
  emit('save', text.value.trimStart());
  visible.value = false;
}
</script>

<template>
  <NeumorphismModal v-model="visible" title="系统提示词插件" :footer="false">
    <p class="muted">
      系统提示词由 Core 的 <code>[plugins.system_prompt]</code> 插件注入，不随 API 配置保存。
    </p>
    <NeumorphismTextarea
      v-model="text"
      :rows="10"
      placeholder="请输入系统提示词，留空表示不注入基础系统提示词"
    />
    <div class="form-actions">
      <NeumorphismButton variant="flat" @click="visible = false">取消</NeumorphismButton>
      <NeumorphismButton variant="primary" @click="save">保存</NeumorphismButton>
    </div>
  </NeumorphismModal>
</template>
