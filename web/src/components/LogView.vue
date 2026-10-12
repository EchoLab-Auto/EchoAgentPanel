<script setup lang="ts">
//! 日志查看面板（设置视图「日志」分类的工作区，原为独立视图）。
//! Core/Panel 双来源，5s 自动刷新；挂载/卸载随分类切换，定时器随卸载清理。
//! 2026-10 末：SSH 接入的上游 Core 日志经隧道在**远端**读取——Core 视图
//! 提供上游选择器（列出 SSH 上游；「本机」= 读取本机 journal）。

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NeumorphismButton, NeumorphismSegmented } from '@echolab-auto/ui-frame';
import { fetchWithTimeout } from '../api';
import { state } from '../store';

type LogKind = 'panel' | 'core';

const KIND_OPTIONS = [
  { label: 'Core', value: 'core' },
  { label: 'Panel', value: 'panel' },
];

/** SSH 接入的上游（其日志经隧道在远端读取）。 */
const sshCores = computed(() => state.upstreams.filter((u) => u.access === 'ssh'));

/** 日志来源选择：本机 + 全部 SSH 上游（无 SSH 上游时整个选择器隐藏）。 */
const coreOptions = computed(() => [
  { label: '本机', value: '' },
  ...sshCores.value.map((u) => ({ label: u.name, value: u.name })),
]);

const kind = ref<LogKind>('core');
/** 选中的上游名（'' = 本机日志）。 */
const core = ref<string>('');
const text = ref('（正在加载日志…）');
const auto = ref(true);

function endpointFor(selected: LogKind, upstream: string): string {
  if (selected === 'panel') return '/api/logs/panel?lines=100';
  const suffix = upstream ? `&core=${encodeURIComponent(upstream)}` : '';
  return `/api/logs/core?lines=100${suffix}`;
}

async function load() {
  try {
    const resp = await fetchWithTimeout(endpointFor(kind.value, core.value), {
      cache: 'no-store',
    });
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
    timer = window.setInterval(() => load(), 5000);
  }
}

onMounted(() => {
  load();
  startAuto();
});
onBeforeUnmount(stopAuto);
watch([auto, kind, core], () => {
  load();
  startAuto();
});
// 选中的 SSH 上游被删除/改为直连时回退「本机」（core 变化触发上面的 watch）。
watch(sshCores, () => {
  if (core.value && !sshCores.value.some((u) => u.name === core.value)) {
    core.value = '';
  }
});
</script>

<template>
  <div class="log-view-panel">
    <div class="log-head">
      <NeumorphismSegmented v-model="kind" :options="KIND_OPTIONS" size="small" />
      <NeumorphismSegmented
        v-if="kind === 'core' && sshCores.length"
        v-model="core"
        :options="coreOptions"
        size="small"
      />
      <NeumorphismButton variant="glass" size="small" @click="auto = !auto">
        {{ auto ? '自动刷新中' : '手动刷新' }}
      </NeumorphismButton>
      <NeumorphismButton variant="glass" size="small" @click="load()">刷新</NeumorphismButton>
    </div>
    <pre class="log-viewer">{{ text }}</pre>
  </div>
</template>

<style scoped>
.log-view-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.log-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
</style>
