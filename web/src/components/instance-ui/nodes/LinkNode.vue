<script setup lang="ts">
//! link 节点（03a §2.3）：仅 http/https 渲染 `<a target="_blank"
//! rel="noopener noreferrer">`；其它协议/空值不渲染（坏协议发 bad_field）。

import { computed, inject, ref, watch } from 'vue';
import { resolveBind } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { LinkNodeDef } from '../types';

const props = defineProps<{ node: LinkNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

const url = computed(() => {
  const v = resolveBind(ctx.state.value, props.node.bind);
  return typeof v === 'string' ? v.trim() : '';
});

const safe = computed(() => {
  if (!url.value) return false;
  try {
    const u = new URL(url.value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
});

// 非 http/https 不渲染 + bad_field（同一 URL 只告警一次）。
const warned = ref('');
watch(
  [url, safe],
  ([u, ok]) => {
    if (u && !ok && warned.value !== u) {
      warned.value = u;
      ctx.warn('bad_field', `link 节点（${props.nodeKey}）URL 协议非法，已不渲染：${u.slice(0, 64)}`);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="safe" class="instance-node link-node" :data-node-key="nodeKey">
    <a class="link-node__anchor" :href="url" target="_blank" rel="noopener noreferrer">
      {{ node.label || url }}
    </a>
  </div>
</template>

<style scoped>
.link-node__anchor {
  font-size: 12px;
  color: var(--panel-accent);
  text-decoration: none;
}
.link-node__anchor:hover {
  text-decoration: underline;
}
</style>
