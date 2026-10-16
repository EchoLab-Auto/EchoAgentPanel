<script setup lang="ts">
//! status 节点（03a §2.1）：StatusDot + label + 状态文字；无 action。

import { computed, inject } from 'vue';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import { resolveBind } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { StatusNodeDef } from '../types';

const props = defineProps<{ node: StatusNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

const value = computed(() => resolveBind(ctx.state.value, props.node.bind));

/** true→绿点；false/undefined/字符串→中性灰点（字符串原样显示，03a §2.1 值映射）。 */
const dot = computed<'online' | 'offline'>(() => (value.value === true ? 'online' : 'offline'));

const text = computed(() => {
  const v = value.value;
  if (v === true) return '在线';
  if (v === false) return '离线';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '未知'; // undefined / state 为 null
});
</script>

<template>
  <div class="adapter-node status-node" :data-node-key="nodeKey">
    <span v-if="node.label" class="adapter-node__label">{{ node.label }}</span>
    <NeumorphismStatusDot :status="dot" size="small" />
    <span class="status-node__text">{{ text }}</span>
  </div>
</template>

<style scoped>
.status-node {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-node__text {
  font-size: 12px;
  color: var(--nm-text-primary);
}
</style>
