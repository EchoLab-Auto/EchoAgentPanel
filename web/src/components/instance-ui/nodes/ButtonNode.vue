<script setup lang="ts">
//! button 节点（03a §2.7）：点击发送 action；`confirm` 先弹确认框；
//! `$value` 叶子替换为 null 并告警；字符串 result 短暂提示（3s）。

import { computed, inject, onUnmounted, ref } from 'vue';
import NeumorphismAlert from '@echolab-auto/ui-frame/components/NeumorphismAlert';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { confirmDialog } from '../../../confirm';
import { buildPayload, containsValuePlaceholder } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { ButtonNodeDef } from '../types';

const props = defineProps<{ node: ButtonNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

// button 无当前值：arg 中的 $value 叶子替换为 null（03a §2.7），挂载即告警一次。
if (containsValuePlaceholder(props.node.action.arg)) {
  ctx.warn('bad_field', `button 节点（${props.nodeKey}）arg 含 $value，已替换为 null`);
}

const pending = computed(() => ctx.bus.isPending(props.nodeKey));
const error = computed(() => ctx.bus.errorOf(props.nodeKey));
/** 字符串 result 的短暂提示（NeumorphismBadge 文案，3s 消失）。 */
const notice = ref<string | null>(null);
let noticeTimer: number | undefined;
onUnmounted(() => window.clearTimeout(noticeTimer));

async function activate() {
  if (pending.value || ctx.disabled.value) return;
  if (props.node.confirm) {
    if (!(await confirmDialog(props.node.confirm, { danger: true }))) return;
    if (pending.value || ctx.disabled.value) return; // 确认框期间状态可能变化
  }
  const outcome = await ctx.bus.run(
    props.nodeKey,
    props.node.action.method,
    buildPayload(props.node.action, null, () => ({})),
  );
  if (outcome && !outcome.error && typeof outcome.result === 'string' && outcome.result) {
    notice.value = outcome.result;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => {
      notice.value = null;
    }, 3000);
  }
}
</script>

<template>
  <div class="instance-node button-node" :data-node-key="nodeKey">
    <NeumorphismButton
      size="small"
      variant="glass"
      :disabled="ctx.disabled.value"
      :loading="pending"
      @click="activate"
    >
      {{ node.label || node.action.method }}
    </NeumorphismButton>
    <span v-if="notice" class="button-node__notice">{{ notice }}</span>
    <p v-if="node.hint" class="instance-node__hint">{{ node.hint }}</p>
    <NeumorphismAlert
      v-if="error"
      type="error"
      size="small"
      :message="error"
      closable
      @close="ctx.bus.clearError(nodeKey)"
    />
  </div>
</template>

<style scoped>
.button-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.button-node__notice {
  font-size: 11px;
  color: var(--panel-ok);
}
</style>
