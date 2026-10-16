<script setup lang="ts">
//! list_editor 节点（03a §2.5）：条目列表（行尾移除）+ 新增输入框；
//! 每次增/删立即发送**整表**；显示值来自 state，在途显示临时新列表。

import { computed, inject, ref } from 'vue';
import NeumorphismAlert from '@echolab-auto/ui-frame/components/NeumorphismAlert';
import NeumorphismBadge from '@echolab-auto/ui-frame/components/NeumorphismBadge';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismEmpty from '@echolab-auto/ui-frame/components/NeumorphismEmpty';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismList from '@echolab-auto/ui-frame/components/NeumorphismList';
import NeumorphismSkeleton from '@echolab-auto/ui-frame/components/NeumorphismSkeleton';
import { buildPayload, resolveBind } from '../bind';
import { ADAPTER_UI_CONTEXT } from '../context';
import type { ListEditorNodeDef } from '../types';

const props = defineProps<{ node: ListEditorNodeDef; nodeKey: string }>();
const ctx = inject(ADAPTER_UI_CONTEXT)!;

/** state 投影：非数组视为 []；元素统一 String()（03a §2.5）。 */
const stateList = computed(() => {
  const v = resolveBind(ctx.state.value, props.node.bind);
  return Array.isArray(v) ? v.map(String) : [];
});

/** 在途临时列表（半透明；结算后丢弃）。 */
const tempList = ref<string[] | null>(null);
const shown = computed(() => tempList.value ?? stateList.value);

const draft = ref('');
/** 重复添加提示（不发送）。 */
const notice = ref('');

const pending = computed(() => ctx.bus.isPending(props.nodeKey));
const error = computed(() => ctx.bus.errorOf(props.nodeKey));
const controlsDisabled = computed(
  () => ctx.disabled.value || pending.value || props.node.action == null,
);

async function send(next: string[]) {
  const action = props.node.action;
  if (!action) return;
  tempList.value = next;
  try {
    await ctx.bus.run(props.nodeKey, action.method, buildPayload(action, next, () => ({ value: next })));
  } finally {
    tempList.value = null;
  }
}

function add() {
  const item = draft.value.trim();
  if (!item || controlsDisabled.value) return;
  if (shown.value.includes(item)) {
    notice.value = `「${item}」已在列表中`;
    return;
  }
  notice.value = '';
  draft.value = '';
  void send([...shown.value, item]);
}

function remove(raw: unknown) {
  if (controlsDisabled.value) return;
  // NeumorphismList 泛型在模板中未推断（item: unknown）；元素统一 String()
  //（03a §2.5：state 元素已 String()，此处为同一语义的防御性归一）。
  const item = String(raw);
  void send(shown.value.filter((x) => x !== item));
}
</script>

<template>
  <div class="adapter-node list-editor-node" :class="{ 'is-pending': pending }" :data-node-key="nodeKey">
    <div class="list-editor-node__head">
      <span v-if="node.label" class="adapter-node__label">{{ node.label }}</span>
      <NeumorphismBadge :value="shown.length" show-zero />
    </div>

    <div v-if="ctx.state.value === null" class="list-editor-node__skeleton">
      <NeumorphismSkeleton />
    </div>
    <template v-else>
      <div class="list-editor-node__body">
        <NeumorphismEmpty v-if="shown.length === 0" description="未添加" size="small" />
        <NeumorphismList v-else :items="shown" size="small" split>
          <template #default="{ item }">
            <div class="list-editor-node__row">
              <span class="list-editor-node__item">{{ item }}</span>
              <NeumorphismButton
                size="small"
                variant="glass"
                :disabled="controlsDisabled"
                :aria-label="`移除 ${item}`"
                @click="remove(item)"
              >
                移除
              </NeumorphismButton>
            </div>
          </template>
        </NeumorphismList>
      </div>

      <div v-if="node.action" class="list-editor-node__add">
        <NeumorphismInput
          v-model="draft"
          size="small"
          placeholder="输入 ID 后添加"
          :disabled="controlsDisabled"
          @enter="add"
        />
        <NeumorphismButton
          size="small"
          variant="glass"
          :disabled="controlsDisabled || !draft.trim()"
          :loading="pending"
          @click="add"
        >
          添加
        </NeumorphismButton>
      </div>
      <p v-if="notice" class="adapter-node__hint">{{ notice }}</p>
      <p v-else-if="node.hint" class="adapter-node__hint">{{ node.hint }}</p>
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
.list-editor-node {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
}
.list-editor-node.is-pending .list-editor-node__body {
  opacity: 0.6;
}
.list-editor-node__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.list-editor-node__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}
.list-editor-node__item {
  font-family: var(--nm-font-mono, monospace);
  font-size: 12px;
}
.list-editor-node__add {
  display: flex;
  align-items: center;
  gap: 8px;
}
.list-editor-node__skeleton {
  min-height: 40px;
}
</style>
