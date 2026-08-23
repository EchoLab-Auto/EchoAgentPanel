<script setup lang="ts">
//! 日志查看视图（内嵌于 SessionPanel，取代原 LogModal 弹窗）。

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NeumorphismButton, NeumorphismSegmented } from '@echolab-auto/ui-frame';
import { fetchWithTimeout } from '../api';

type LogKind = 'panel' | 'core';

const LOG_ENDPOINT: Record<LogKind, string> = {
  panel: '/api/logs/panel?lines=100',
  core: '/api/logs/core?lines=100',
};

const KIND_OPTIONS = [
  { label: 'Core', value: 'core' },
  { label: 'Panel', value: 'panel' },
];

const kind = ref<LogKind>('core');
const text = ref('（正在加载日志…）');
const auto = ref(true);

async function load(selected: LogKind) {
  try {
    const resp = await fetchWithTimeout(LOG_ENDPOINT[selected], { cache: 'no-store' });
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

onMounted(() => {
  load(kind.value);
  startAuto();
});
onBeforeUnmount(stopAuto);
watch([auto, kind], () => {
  load(kind.value);
  startAuto();
});
</script>

<template>
  <div>
    <div class="log-head">
      <h2 class="log-title">日志查看器</h2>
      <NeumorphismSegmented v-model="kind" :options="KIND_OPTIONS" size="small" />
      <NeumorphismButton variant="flat" size="small" @click="auto = !auto">
        {{ auto ? '自动刷新中' : '手动刷新' }}
      </NeumorphismButton>
    </div>
    <pre class="log-viewer">{{ text }}</pre>
  </div>
</template>

<style scoped>
.log-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.log-title {
  margin: 0;
  font-size: 16px;
}
</style>
