<script setup lang="ts">
//! 上下文分块视图（内嵌于 SessionPanel，取代原 ContextModal 弹窗）。

import { computed, onMounted, ref } from 'vue';
import { NeumorphismButton, NeumorphismProgress } from '@echolab-auto/ui-frame';
import { ChatFold } from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { sendCommand } from '../connection';

const KIND_LABEL: Record<string, string> = {
  base: '基础',
  skills: '技能清单',
  skill: '常驻技能',
  triggered: '触发技能',
  orchestration: '编排',
  boundary: '边界',
  history: '历史',
};

const KIND_CLASS: Record<string, string> = {
  base: 'ctx-base',
  skills: 'ctx-skills',
  skill: 'ctx-skill',
  triggered: 'ctx-triggered',
  orchestration: 'ctx-orch',
  boundary: 'ctx-boundary',
  history: 'ctx-history',
};

const showMessages = ref(false);
const confirmClear = ref(false);

onMounted(() => {
  sendCommand({ RequestContext: { team_id: null } });
});

const snapshot = computed(() => state.context);
const blocks = computed(() => snapshot.value?.blocks ?? []);
const maxBlockTokens = computed(() => Math.max(1, ...blocks.value.map((b) => b.tokens)));
const pct = computed(() =>
  snapshot.value && snapshot.value.limit_tokens > 0
    ? Math.min(100, Math.round((snapshot.value.total_tokens / snapshot.value.limit_tokens) * 100))
    : 0,
);
const gaugeVariant = computed(() =>
  pct.value >= 90 ? 'error' : pct.value >= 70 ? 'warning' : 'primary',
);
const promptTokens = computed(() =>
  blocks.value.filter((b) => b.kind !== 'history').reduce((sum, b) => sum + b.tokens, 0),
);
const historyTokens = computed(() =>
  blocks.value.filter((b) => b.kind === 'history').reduce((sum, b) => sum + b.tokens, 0),
);
const systemBlocks = computed(() => blocks.value.filter((b) => b.kind !== 'history'));
const historyBlocks = computed(() => blocks.value.filter((b) => b.kind === 'history'));

function blockPct(tokens: number): number {
  return maxBlockTokens.value > 0
    ? Math.max(1, Math.round((tokens / maxBlockTokens.value) * 100))
    : 0;
}

// 两步确认：第一次点击武装，第二次发送清空命令。
function handleClear() {
  if (!confirmClear.value) {
    confirmClear.value = true;
    return;
  }
  sendCommand('ClearHistory');
  confirmClear.value = false;
}

function refresh() {
  sendCommand({ RequestContext: { team_id: null } });
}

function archiveHistory() {
  if (!window.confirm('归档当前会话历史？将复制快照到 archives/ 并清空当前历史。')) return;
  sendCommand({ ArchiveHistory: { team_id: null } });
}

function compactHistory() {
  if (!window.confirm('压缩当前会话历史？早期事件将替换为规则摘要，保留最近 40 条。')) return;
  sendCommand({ CompactHistory: { team_id: null, keep_recent: 40 } });
}
</script>

<template>
  <div class="ctx-view">
    <div class="ctx-view-head">
      <h2 class="ctx-view-title">
        上下文分块
        <span v-if="snapshot" class="muted ctx-modal-subtitle">
          · {{ snapshot.total_tokens }}/{{ snapshot.limit_tokens }} tokens ·
          {{ snapshot.messages.length }} 条
        </span>
      </h2>
      <button
        class="ctx-clear"
        :class="{ confirm: confirmClear }"
        title="清空 agent 的全部对话历史与上下文记忆（不可恢复）"
        @click="handleClear"
      >
        {{ confirmClear ? '确认清理？不可恢复' : '清理历史记忆' }}
      </button>
      <NeumorphismButton variant="flat" size="small" @click="archiveHistory">归档</NeumorphismButton>
      <NeumorphismButton variant="flat" size="small" @click="compactHistory">压缩</NeumorphismButton>
      <NeumorphismButton variant="flat" size="small" title="刷新" @click="refresh">↻</NeumorphismButton>
    </div>

    <div v-if="!snapshot" class="muted">（暂无快照，可在聊天中发送 /context 获取）</div>
    <template v-else>
      <div class="ctx-summary">
        <NeumorphismProgress :model-value="pct" :variant="gaugeVariant" show-label />
        <div class="ctx-summary-stats">
          <span>总占用 {{ pct }}%</span>
          <span>提示词 {{ promptTokens }}t</span>
          <span>历史 {{ historyTokens }}t</span>
          <span>上限 {{ snapshot.limit_tokens }}t</span>
        </div>
      </div>

      <div class="ctx-section-title">系统提示词与注入块（{{ systemBlocks.length }}）</div>
      <div class="ctx-blocks">
        <ChatFold
          v-for="b in systemBlocks"
          :key="b.key"
          :default-open="b.kind === 'base'"
          class="ctx-fold"
        >
          <template #head>
            <span class="ctx-kind" :class="KIND_CLASS[b.kind] ?? ''">
              {{ KIND_LABEL[b.kind] ?? b.kind }}
            </span>
            <span class="ctx-block-label">{{ b.label }}</span>
            <span class="ctx-block-tokens">{{ b.tokens }}t</span>
            <span class="ctx-block-pct">{{ blockPct(b.tokens) }}%</span>
          </template>
          <template #subhead>
            <div class="ctx-block-bar">
              <div
                class="ctx-block-fill"
                :class="KIND_CLASS[b.kind] ?? ''"
                :style="{ width: `${blockPct(b.tokens)}%` }"
              />
            </div>
          </template>
          <pre class="ctx-block-content">{{ b.content || '（空）' }}</pre>
        </ChatFold>
      </div>

      <div class="ctx-section-title">对话历史（{{ historyBlocks.length }}）</div>
      <div class="ctx-blocks">
        <ChatFold v-for="b in historyBlocks" :key="b.key" class="ctx-fold">
          <template #head>
            <span class="ctx-kind" :class="KIND_CLASS[b.kind] ?? ''">
              {{ KIND_LABEL[b.kind] ?? b.kind }}
            </span>
            <span class="ctx-block-label">{{ b.label }}</span>
            <span class="ctx-block-tokens">{{ b.tokens }}t</span>
            <span class="ctx-block-pct">{{ blockPct(b.tokens) }}%</span>
          </template>
          <template #subhead>
            <div class="ctx-block-bar">
              <div
                class="ctx-block-fill"
                :class="KIND_CLASS[b.kind] ?? ''"
                :style="{ width: `${blockPct(b.tokens)}%` }"
              />
            </div>
          </template>
          <pre class="ctx-block-content">{{ b.content || '（空）' }}</pre>
        </ChatFold>
      </div>

      <div class="ctx-section-title ctx-clickable" @click="showMessages = !showMessages">
        逐条消息明细（{{ snapshot.messages.length }}） {{ showMessages ? '▾' : '▸' }}
      </div>
      <template v-if="showMessages">
        <div v-for="(message, index) in snapshot.messages" :key="index" class="context-row">
          <span class="context-role" :class="message.role">{{ message.role }}</span>
          <span class="context-tokens">{{ message.tokens }}t</span>
          <span class="context-content">{{ message.content }}</span>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.ctx-view-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.ctx-view-title {
  margin: 0;
  font-size: 16px;
}
.ctx-modal-subtitle {
  font-size: 12px;
  font-weight: normal;
}
</style>
