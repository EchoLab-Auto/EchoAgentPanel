<script setup lang="ts">
//! text 节点（03a §2.2）：只读展示 + 复制；`editable` + 合法 action 时为
//! 输入框 + 保存（01a §3.1 扩展字段）。显示值永远来自 state（单向数据流）。

import { computed, inject, ref, watch } from 'vue';
import NeumorphismAlert from '@echolab-auto/ui-frame/components/NeumorphismAlert';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismSkeleton from '@echolab-auto/ui-frame/components/NeumorphismSkeleton';
import { buildPayload, resolveBind } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { TextNodeDef } from '../types';

const props = defineProps<{ node: TextNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

const raw = computed(() => resolveBind(ctx.state.value, props.node.bind));

/** 展示值：String()；数组 join(', ')；对象 JSON.stringify 截断 80（03a §2.2）。 */
const display = computed(() => {
  const v = raw.value;
  if (v === undefined || v === null) return '—';
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }
  return String(v); // number owner 也按字符串展示（03a A3）
});

/** 可编辑 = editable === true 且带合法 action（01a §3.1 冻结扩展字段）。 */
const editable = computed(() => props.node.editable === true && props.node.action != null);

const draft = ref('');
/** 用户正在编辑（脏）：state 更新不覆盖输入框（03a §2.2）。 */
const dirty = ref(false);

watch(
  display,
  (v) => {
    if (!dirty.value) draft.value = v === '—' ? '' : v;
  },
  { immediate: true },
);

const pending = computed(() => ctx.bus.isPending(props.nodeKey));
const error = computed(() => ctx.bus.errorOf(props.nodeKey));
const trimmed = computed(() => draft.value.trim());
const canSave = computed(
  () => editable.value && !pending.value && !ctx.disabled.value && trimmed.value.length > 0,
);

async function save() {
  if (!canSave.value || !props.node.action) return;
  const action = props.node.action;
  await ctx.bus.run(
    props.nodeKey,
    action.method,
    buildPayload(action, trimmed.value, () => ({ value: trimmed.value })),
  );
  dirty.value = false; // 结算后回到 state 投影（03a §2.0）
}

function copy() {
  // 复制失败静默（剪贴板权限）；不改变状态。
  void navigator.clipboard?.writeText(display.value).catch(() => {});
}
</script>

<template>
  <div class="instance-node text-node" :data-node-key="nodeKey">
    <span v-if="node.label" class="instance-node__label">{{ node.label }}</span>

    <template v-if="editable">
      <div v-if="ctx.state.value === null" class="text-node__skeleton">
        <NeumorphismSkeleton />
      </div>
      <template v-else>
        <div class="text-node__edit">
          <NeumorphismInput
            v-model="draft"
            size="small"
            :disabled="pending || ctx.disabled.value"
            @update:model-value="dirty = true"
            @enter="save"
          />
          <NeumorphismButton
            size="small"
            variant="glass"
            :disabled="!canSave"
            :loading="pending"
            @click="save"
          >
            保存
          </NeumorphismButton>
        </div>
        <NeumorphismAlert
          v-if="error"
          type="error"
          size="small"
          :message="error"
          closable
          @close="ctx.bus.clearError(nodeKey)"
        />
      </template>
    </template>

    <template v-else>
      <span class="text-node__value">{{ display }}</span>
      <NeumorphismButton
        v-if="display !== '—'"
        size="small"
        variant="glass"
        aria-label="复制"
        @click="copy"
      >
        复制
      </NeumorphismButton>
    </template>
    <p v-if="node.hint" class="instance-node__hint">{{ node.hint }}</p>
  </div>
</template>

<style scoped>
.text-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.text-node__value {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12px;
  color: var(--nm-text-primary);
  word-break: break-all;
}
.text-node__edit {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.text-node__skeleton {
  flex: 1;
  min-height: 24px;
}
</style>
