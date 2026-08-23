<script setup lang="ts">
//! 系统提示词编辑视图（内嵌于 SessionPanel，取代原 SystemPromptModal 弹窗）。

import { onMounted, ref, watch } from 'vue';
import { NeumorphismButton, NeumorphismTextarea } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';

const text = ref(state.systemPrompt);
const saved = ref(false);

onMounted(() => {
  sendCommand('RequestSystemPrompt');
});

// 后端回播时刷新草稿（仅在用户尚未手动编辑时覆盖）。
watch(
  () => state.systemPrompt,
  (value) => {
    if (!dirty.value) text.value = value;
  },
);

// 简单手动编辑标记。
const dirty = ref(false);
watch(text, () => {
  dirty.value = true;
  saved.value = false;
});

function save() {
  sendCommand({ SetSystemPrompt: { prompt: text.value.trimStart() } });
  dirty.value = false;
  saved.value = true;
}
</script>

<template>
  <div>
    <div class="sp-head">
      <h2 class="sp-title">系统提示词插件</h2>
      <div class="sp-actions">
        <NeumorphismButton variant="flat" @click="sendCommand('RequestSystemPrompt')">
          重新载入
        </NeumorphismButton>
        <NeumorphismButton variant="primary" @click="save">保存</NeumorphismButton>
      </div>
    </div>
    <p class="muted">
      系统提示词由 Core 的 <code>[plugins.system_prompt]</code> 插件注入，不随 API 配置保存。
      留空表示不注入基础系统提示词。
    </p>
    <NeumorphismTextarea
      v-model="text"
      :rows="14"
      placeholder="请输入系统提示词"
    />
    <div v-if="saved" class="sp-saved muted">已保存</div>
  </div>
</template>

<style scoped>
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.sp-title {
  margin: 0;
  font-size: 16px;
}
.sp-actions {
  display: flex;
  gap: 8px;
}
.sp-saved {
  margin-top: 6px;
}
</style>
