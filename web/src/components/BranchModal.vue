<script setup lang="ts">
//! 临时分支查看器：展示分支运行期间的实时活动
//! （推理、工具调用、临时内容、最终输出）。
//!
//! 渲染复用主时间线的面板组件（2026-09-30；2026-10 一般化）：工作条目
//! （工具调用 + 思考）统一走 `WorkRunGroup`（小圆角矩形 chip 行 + 点击
//! 展开）——与主视图「同概念同实现」，不再依赖库的 chat 组合组件（已移除）。

import { computed, nextTick, ref, watch } from 'vue';
import NeumorphismModal from '@echolab-auto/ui-frame/components/NeumorphismModal';
import NeumorphismTag from '@echolab-auto/ui-frame/components/NeumorphismTag';
import { state } from '../store';
import type { BranchTab } from '../state';
import { formatTime } from '../chat-adapter';
import WorkRunGroup, { type WorkRunItem } from './WorkRunGroup.vue';

const props = defineProps<{ branchId: string }>();
const emit = defineEmits<{ close: [] }>();

// 分支完成后 tab 会被 reducer 移除；弹窗保持打开并显示归档提示。
const tab = computed(() => state.branchTabs[props.branchId] ?? null);

const viewerRef = ref<HTMLElement>();

// 新活动到达时滚到底部。
watch(
  () => tab.value?.msgs.length,
  async () => {
    await nextTick();
    const viewer = viewerRef.value;
    if (viewer) viewer.scrollTop = viewer.scrollHeight;
  },
);

const shortId = computed(() =>
  props.branchId.length > 8 ? props.branchId.slice(0, 8) : props.branchId,
);

const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  completed: '已完成',
  cancelled: '已取消',
  failed: '失败',
};
const STATUS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'error'> = {
  running: 'primary',
  completed: 'success',
  cancelled: 'warning',
  failed: 'error',
};

function onModalToggle(open: boolean) {
  if (!open) emit('close');
}

type BranchMsg = BranchTab['msgs'][number];

/** 行模型与主时间线同构：连续工作条目（工具调用 + 思考）合并为一组 chip 行。 */
type BranchRow =
  | { kind: 'work-group'; key: string; items: WorkRunItem[] }
  | { kind: 'msg'; key: string; msg: BranchMsg };

const rows = computed<BranchRow[]>(() => {
  const out: BranchRow[] = [];
  (tab.value?.msgs ?? []).forEach((m, index) => {
    let item: WorkRunItem | null = null;
    if (m.kind === 'tool') {
      item = {
        kind: 'tool',
        key: `${index}`,
        name: m.toolName ?? m.text,
        input: m.input,
        output: m.output ?? null,
        status: m.status,
        time: formatTime(m.time),
        startedAtMs: m.startedAtMs,
        elapsedMs: m.elapsedMs,
      };
    } else if (m.kind === 'reasoning') {
      // 分支回放：不播打字机（animate=false），点击 chip 展开正文。
      item = {
        kind: 'reasoning',
        key: `r:${index}`,
        text: m.text,
        animate: false,
        time: formatTime(m.time),
      };
    }
    if (!item) {
      out.push({ kind: 'msg', key: `m:${index}`, msg: m });
      return;
    }
    const last = out[out.length - 1];
    if (last && last.kind === 'work-group') last.items.push(item);
    else out.push({ kind: 'work-group', key: `work:${index}`, items: [item] });
  });
  return out;
});
</script>

<template>
  <NeumorphismModal
    :model-value="true"
    size="large"
    :footer="false"
    @update:model-value="onModalToggle"
  >
    <template #header>
      <div class="branch-modal-head">
        <h2 class="branch-modal-title">临时分支 · {{ shortId }}</h2>
        <NeumorphismTag
          v-if="tab"
          :variant="STATUS_VARIANT[tab.status] ?? 'default'"
          size="small"
        >
          {{ STATUS_LABEL[tab.status] ?? tab.status }}
        </NeumorphismTag>
      </div>
    </template>

    <div v-if="!tab" class="muted">（分支已结束并合并到主会话）</div>
    <template v-else>
      <div class="branch-meta muted">
        <div>任务：{{ tab.task }}</div>
        <div>目标：{{ tab.target }} · 会话：{{ tab.sessionId }}</div>
      </div>
      <div ref="viewerRef" class="branch-viewer">
        <div v-if="tab.msgs.length === 0" class="muted">（暂无活动，等待分支执行…）</div>
        <template v-for="row in rows" :key="row.key">
          <WorkRunGroup v-if="row.kind === 'work-group'" :items="row.items" />
          <div v-else-if="row.msg.kind === 'content'" class="branch-msg-content">
            {{ row.msg.text }}
          </div>
          <div v-else class="muted">{{ row.msg.text }}</div>
        </template>
        <div v-if="tab.status === 'running'" class="muted branch-running-hint">分支执行中…</div>
      </div>
    </template>
  </NeumorphismModal>
</template>

<style scoped>
.branch-modal-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.branch-modal-title {
  margin: 0;
  font-size: 16px;
}
.branch-meta {
  font-size: 12px;
  margin-bottom: 8px;
}
.branch-viewer {
  max-height: 55vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.branch-msg-content {
  white-space: pre-wrap;
  word-break: break-word;
}
.branch-running-hint {
  font-size: 12px;
}
</style>
