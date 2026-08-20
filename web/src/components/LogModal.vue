<script setup lang="ts">
//! 日志查看器：Core / Panel 日志，支持 5s 自动刷新。

import { onBeforeUnmount, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismModal,
  NeumorphismSegmented,
} from '@echolab-auto/ui-frame';

type LogKind = 'panel' | 'core';

const LOG_ENDPOINT: Record<LogKind, string> = {
  panel: '/api/logs/panel',
  core: '/api/logs/core',
};

const KIND_OPTIONS = [
  { label: 'Core', value: 'core' },
  { label: 'Panel', value: 'panel' },
];

const visible = defineModel<boolean>({ required: true });

const kind = ref<LogKind>('core');
const text = ref('（正在加载日志…）');
const auto = ref(true);

async function load(selected: LogKind) {
  try {
    const resp = await fetch(LOG_ENDPOINT[selected], { cache: 'no-store' });
    if (!resp.ok) {
      text.value = `日志接口返回 HTTP ${resp.status}`;
      return;
    }
    text.value = await resp.text();
  } catch (error) {
    text.value = `日志读取失败: ${String(error)}`;
  }
}

let timer: number | undefined;
function stopAuto() {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}
function startAuto() {
  stopAuto();
  if (auto.value) {
    timer = window.setInterval(() => load(kind.value), 5000);
  }
}

// 打开时加载并启动自动刷新；关闭时停止。
watch(visible, (open) => {
  if (open) {
    load(kind.value);
    startAuto();
  } else {
    stopAuto();
  }
});
watch([auto, kind], () => {
  if (visible.value) {
    load(kind.value);
    startAuto();
  }
});
onBeforeUnmount(stopAuto);
</script>

<template>
  <NeumorphismModal v-model="visible" size="large" :footer="false">
    <template #header>
      <div class="log-modal-head">
        <h2 class="log-modal-title">日志查看器</h2>
        <NeumorphismSegmented v-model="kind" :options="KIND_OPTIONS" size="small" />
        <NeumorphismButton variant="flat" size="small" @click="auto = !auto">
          {{ auto ? '自动刷新中' : '手动刷新' }}
        </NeumorphismButton>
      </div>
    </template>
    <pre class="log-viewer">{{ text }}</pre>
  </NeumorphismModal>
</template>

<style scoped>
.log-modal-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.log-modal-title {
  margin: 0;
  font-size: 16px;
}
</style>
