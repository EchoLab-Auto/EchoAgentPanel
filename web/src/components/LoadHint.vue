<script setup lang="ts">
//! 加载提示条（2026-09-30）：各视图「加载中 / 慢 / 超时」的统一样式。
//!
//! 阶段来源 `pending.ts::usePending`（登记请求 → 响应销账 → 时间推进）：
//! - `pending`  → 转圈 + 「正在加载{label}…」（150ms 内完成不显示）；
//! - `slow`     → 加注「Core 响应较慢，可能正在重启」（>6s）；
//! - `timeout`  → 错误 + 重试按钮（>20s；请求幂等，重发安全）；
//! - `idle`     → 不渲染（由调用方无条件放置，无需自行判断）。
import { NeumorphismButton, NeumorphismSpinner } from '@echolab-auto/ui-frame';
import type { PendingPhase } from '../pending';

defineProps<{
  /** 跟踪阶段（usePending(key).phase） */
  phase: PendingPhase;
  /** 加载对象名（文案用，如「技能」「上下文」） */
  label: string;
}>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="phase === 'timeout'" class="load-hint load-hint--error">
    <span>加载{{ label }}超时——Core 可能正在重启</span>
    <NeumorphismButton size="small" variant="glass" @click="$emit('retry')">重试</NeumorphismButton>
  </div>
  <div v-else-if="phase === 'pending' || phase === 'slow'" class="load-hint">
    <NeumorphismSpinner size="small" />
    <span v-if="phase === 'slow'">正在加载{{ label }}…（Core 响应较慢，可能正在重启）</span>
    <span v-else>正在加载{{ label }}…</span>
  </div>
</template>

<style scoped>
.load-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: var(--nm-font-sm);
  color: var(--nm-text-placeholder);
  border-radius: 10px;
  animation: load-hint-enter 0.15s ease-out both;
}
.load-hint--error {
  color: var(--nm-text-secondary);
  background: rgba(224, 92, 92, 0.08);
  border: 1px solid rgba(224, 92, 92, 0.25);
  justify-content: space-between;
}
@keyframes load-hint-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
