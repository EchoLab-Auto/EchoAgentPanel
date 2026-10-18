<script setup lang="ts">
//! select 节点（03a §2.4）：显示值永远来自 state；change 发命令，在途显示
//! 临时值，结算后丢弃临时值回弹 state 投影；无 action → 只读（disabled）。

import { computed, inject, ref } from 'vue';
import NeumorphismAlert from '@echolab-auto/ui-frame/components/NeumorphismAlert';
import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import NeumorphismSkeleton from '@echolab-auto/ui-frame/components/NeumorphismSkeleton';
import { buildPayload, resolveBind } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { SelectNodeDef } from '../types';

const props = defineProps<{ node: SelectNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

/** state 投影值（非 string 视为缺失）。 */
const stateValue = computed(() => {
  const v = resolveBind(ctx.state.value, props.node.bind);
  return typeof v === 'string' ? v : undefined;
});

/** 在途临时值（用户刚选的值；结算后丢弃，03a §2.0）。 */
const tempValue = ref<string | null>(null);
const shown = computed(() => tempValue.value ?? stateValue.value ?? '');

/** 当前值不在 options 内时显示原值并标「未知选项」（03a §2.4）。 */
const options = computed(() => {
  const list = props.node.options.map((o) => ({ label: o.label ?? o.value, value: o.value }));
  const current = stateValue.value;
  if (current !== undefined && !props.node.options.some((o) => o.value === current)) {
    list.push({ label: `${current}（未知选项）`, value: current });
  }
  return list;
});

/** 当前选中项的 hint（GATE_HINTS parity，01a §3.1 options.hint）。 */
const hintText = computed(() => {
  const opt = props.node.options.find((o) => o.value === shown.value);
  return opt?.hint ?? props.node.hint ?? '';
});

const pending = computed(() => ctx.bus.isPending(props.nodeKey));
const error = computed(() => ctx.bus.errorOf(props.nodeKey));
const selectDisabled = computed(
  () => ctx.disabled.value || pending.value || props.node.action == null,
);

async function onChange(value: string | number | (string | number)[] | undefined) {
  const next = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
  const action = props.node.action;
  if (!action || pending.value || ctx.disabled.value) return;
  if (next === (stateValue.value ?? '')) return; // 选中值等于 state 现值时不发
  tempValue.value = next;
  try {
    await ctx.bus.run(props.nodeKey, action.method, buildPayload(action, next, () => ({ value: next })));
  } finally {
    tempValue.value = null; // 成功/失败都丢弃临时值，回到 state 投影
  }
}
</script>

<template>
  <div class="instance-node select-node" :data-node-key="nodeKey">
    <div class="select-node__head">
      <span v-if="node.label" class="instance-node__label">{{ node.label }}</span>
      <span v-if="hintText" class="instance-node__hint">{{ hintText }}</span>
    </div>
    <div v-if="ctx.state.value === null" class="select-node__skeleton">
      <NeumorphismSkeleton />
    </div>
    <template v-else>
      <NeumorphismSelect
        :model-value="shown"
        :options="options"
        size="small"
        :disabled="selectDisabled"
        @change="onChange"
      />
      <NeumorphismAlert
        v-if="error"
        type="error"
        size="small"
        :message="error"
        closable
        @close="ctx.bus.clearError(nodeKey)"
      />
    </template>
  </div>
</template>

<style scoped>
.select-node {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.select-node__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.select-node__skeleton {
  min-height: 28px;
}
</style>
