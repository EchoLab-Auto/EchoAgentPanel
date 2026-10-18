<script setup lang="ts">
//! image 节点（03a §2.6 / §4.3）：不自动拉取；点击「获取/刷新」经
//! `fetch:{method,result_key}` 拉 base64 PNG；结果只存组件局部（替代
//! 已删除的旧全局单槽方案，避免多实例串号）；`clear_when` 为真或 running → false 时清图。

import { computed, inject, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { resolveBind } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { ImageNodeDef } from '../types';

const props = defineProps<{ node: ImageNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

/** 拉取结果（base64 PNG；局部槽，不进全局 state，03a §4.3-1）。 */
const img = ref<string | null>(null);
/** 本地校验错误（「未返回图片」）；命令错误走 bus.errorOf。 */
const localError = ref<string | null>(null);
const requested = ref(false);

const pending = computed(() => ctx.bus.isPending(props.nodeKey));
const error = computed(() => localError.value ?? ctx.bus.errorOf(props.nodeKey));
const alt = computed(() => props.node.label || '实例图片');

async function load() {
  if (pending.value || ctx.disabled.value) return;
  requested.value = true;
  img.value = null;
  localError.value = null;
  const outcome = await ctx.bus.run(props.nodeKey, props.node.fetch.method, {});
  if (!outcome || outcome.error) return; // 并发忽略 / 业务失败（bus 已记错误）
  const result = outcome.result;
  const b64 =
    typeof result === 'object' && result !== null
      ? (result as Record<string, unknown>)[props.node.fetch.result_key]
      : undefined;
  if (typeof b64 === 'string' && b64) img.value = b64;
  else localError.value = '未返回图片'; // 非字符串或空 → 错误（03a §2.6）
}

// clear_when：该 bind 路径值为真时清图（登录成功等，03a §4.3-4）。
watch(
  () => (props.node.clear_when ? resolveBind(ctx.state.value, props.node.clear_when) : undefined),
  (v) => {
    if (v) {
      img.value = null;
      localError.value = null;
    }
  },
);
// running → false 清图（03a §4.3-4）。
watch(ctx.running, (running) => {
  if (!running) {
    img.value = null;
    localError.value = null;
  }
});
</script>

<template>
  <div class="instance-node image-node" :data-node-key="nodeKey">
    <div class="image-node__head">
      <span v-if="node.label" class="instance-node__label">{{ node.label }}</span>
      <NeumorphismButton
        size="small"
        variant="glass"
        :disabled="ctx.disabled.value"
        :loading="pending"
        @click="load"
      >
        {{ img ? '刷新' : requested && error ? '重试' : '获取' }}
      </NeumorphismButton>
    </div>

    <div v-if="img" class="image-node__box">
      <img class="image-node__img" :src="'data:image/png;base64,' + img" :alt="alt" />
    </div>
    <div v-else-if="requested || pending" class="image-node__box image-node__box--empty">
      <span v-if="pending" class="image-node__placeholder">获取中…</span>
      <span v-else-if="error" class="image-node__error">{{ error }}</span>
    </div>
  </div>
</template>

<style scoped>
.image-node {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.image-node__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.image-node__box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px dashed var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
  padding: 8px;
}
.image-node__img {
  max-width: 180px;
  border-radius: 8px;
}
.image-node__placeholder {
  font-size: 12px;
  color: var(--nm-text-secondary);
}
.image-node__error {
  font-size: 12px;
  color: var(--panel-err);
}
</style>
