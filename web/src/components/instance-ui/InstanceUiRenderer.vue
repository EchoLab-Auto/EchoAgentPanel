<script setup lang="ts">
//! 实例 UI 通用渲染器（03a §1）：消费原始描述符 + 状态文档 + 元信息，
//! 遍历 panels → nodes 分发到 7 类节点组件；命令经 useInstanceOp 直发
//! （`invokeInstanceOp`，显式 meta.core 路由），`op`/`op-result`/`warning`
//! 为旁路通知（观测/测试断言用，不影响发送）。

import { computed, provide, watch } from 'vue';
import NeumorphismAlert from '@echolab-auto/ui-frame/components/NeumorphismAlert';
import NeumorphismEmpty from '@echolab-auto/ui-frame/components/NeumorphismEmpty';
import InstanceUiPanel from './InstanceUiPanel.vue';
import { ADAPTER_UI_CONTEXT } from './context';
import { parseDescriptor } from './parse';
import { useInstanceOp } from './useInstanceOp';
import type { InstanceUiMeta, UiWarning } from './types';

const props = withDefaults(
  defineProps<{
    /** 原始描述符（未解析）；null/undefined → 渲染空，无 warning。 */
    descriptor?: unknown;
    /** 状态文档（instanceUiByKey[scopedKey(core, instance)]）；null = 未收到 InstanceState。 */
    state?: Record<string, unknown> | null;
    meta: InstanceUiMeta;
    /** 外层强制禁用（核心断线/权限不足等）。 */
    disabled?: boolean;
  }>(),
  // descriptor 不给默认值：`unknown` 类型的 default 无法通过 vue-tsc 推断；
  // 缺省时 props.descriptor === undefined，parseDescriptor 同样按「渲染空」处理。
  { state: null, disabled: false },
);

const emit = defineEmits<{
  op: [payload: { method: string; payload: unknown; nodeKey: string }];
  'op-result': [payload: { method: string; ok: boolean; result?: unknown; error?: string; nodeKey: string }];
  warning: [payload: UiWarning];
}>();

// 解析结果 memo 化：descriptor 引用不变不重复解析/发 warning（03a §3.2）。
const parsed = computed(() => parseDescriptor(props.descriptor));
watch(
  parsed,
  (p) => {
    for (const w of p.warnings) emit('warning', w);
  },
  { immediate: true },
);

const bus = useInstanceOp(
  () => ({ core: props.meta.core, instance: props.meta.instance }),
  {
    op: (p) => emit('op', p),
    opResult: (p) => emit('op-result', p),
  },
);

provide(ADAPTER_UI_CONTEXT, {
  state: computed(() => props.state ?? null),
  disabled: computed(() => props.disabled || !props.meta.running),
  running: computed(() => props.meta.running),
  bus,
  warn: (code, detail) => emit('warning', { code, detail }),
});
</script>

<template>
  <div class="instance-ui">
    <NeumorphismEmpty v-if="parsed.invalid" description="界面描述无效" />
    <template v-else>
      <NeumorphismAlert
        v-if="parsed.newerVersion"
        type="info"
        size="small"
        :message="`该实例的界面描述版本较新（v${parsed.version}），部分控件可能未显示，请升级 Panel`"
      />
      <InstanceUiPanel v-for="panel in parsed.panels" :key="panel.id" :panel="panel" />
    </template>
  </div>
</template>

<style>
/* 节点共享样式（非 scoped：跨 7 个节点组件复用；类名带 instance- 前缀防冲突）。 */
.instance-ui {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.instance-node__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
}
.instance-node__hint {
  margin: 0;
  font-size: 11px;
  color: var(--nm-text-secondary);
}
</style>
