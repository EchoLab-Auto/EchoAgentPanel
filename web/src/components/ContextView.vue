<script setup lang="ts">
//! 上下文分块视图（内嵌于 SessionPanel，取代原 ContextModal 弹窗）。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismProgress from '@echolab-auto/ui-frame/components/NeumorphismProgress';
import NeumorphismSkeleton from '@echolab-auto/ui-frame/components/NeumorphismSkeleton';
import NeumorphismSpinner from '@echolab-auto/ui-frame/components/NeumorphismSpinner';
import { ChatFold } from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { sessionKey } from '../keys';
import { sendCommand, sendPending } from '../connection';
import { releasePending, usePending } from '../pending';
import { useToast } from '@echolab-auto/ui-frame/composables/useToast';
import PanelIcon from './PanelIcon.vue';
import LoadHint from './LoadHint.vue';
import { confirmDialog } from '../confirm';
import {
  compactionCountText,
  compactionPhaseLabel,
  visibleCompaction,
} from '../compaction';

const { addToast } = useToast();

//! 块种类 → 中文徽标（Core 侧 kind 全集的镜像；缺项会裸显英文 kind）。
//! `displayLabel` 会据此剥掉 label 里重复的种类前缀（如「常驻技能 · xx」）。
const KIND_LABEL: Record<string, string> = {
  base: '基础',
  'system-skill': '系统提示词',
  skills: '技能清单',
  skill: '常驻技能',
  triggered: '触发技能',
  workspace: '工作区会话',
  orchestration: '编排',
  boundary: '边界',
  history: '对话历史',
};

const KIND_CLASS: Record<string, string> = {
  base: 'ctx-base',
  'system-skill': 'ctx-system-skill',
  skills: 'ctx-skills',
  skill: 'ctx-skill',
  triggered: 'ctx-triggered',
  workspace: 'ctx-workspace',
  orchestration: 'ctx-orch',
  boundary: 'ctx-boundary',
  history: 'ctx-history',
};

/**
 * 折叠头展示的 label：剥掉与徽标重复的种类前缀。
 * Core 的 label 形如「常驻技能 · concise-dialogue」，徽标已显示「常驻技能」——
 * 不剥就是「常驻技能常驻技能 · concise-dialogue」（此前实测的观感问题）。
 */
function displayLabel(kind: string, label: string): string {
  const kindText = KIND_LABEL[kind] ?? kind;
  if (label === kindText) return '';
  if (label.startsWith(kindText)) {
    return label.slice(kindText.length).replace(/^[\s·:：-]+/, '');
  }
  return label;
}

const showMessages = ref(false);
const confirmClear = ref(false);

const props = defineProps<{
  teamId?: string | null;
  sessionId?: string | null;
  core?: string | null;
}>();
const targetTeamId = computed(() => props.teamId ?? null);
const targetSessionId = computed(() => props.sessionId ?? null);
const targetCore = computed(() => props.core ?? null);

onMounted(() => {
  requestSnapshot();
});

/** 拉取当前（team, session）的上下文快照（多会话，2026-09）。 */
function requestSnapshot() {
  sendPending(
    { RequestContext: { team_id: targetTeamId.value, session_id: targetSessionId.value } },
    'context',
  );
}

// 会话切换/挂载后重拉；忽略归属其他会话的陈旧快照（避免切换瞬间串显）。
watch([targetTeamId, targetSessionId], () => requestSnapshot());

onUnmounted(() => releasePending('context'));

const connected = computed(() => state.connected);
/** 加载三态（见 pending.ts）：快照未到达时区分 连接中 / 加载中 / 超时 / 真空态。 */
const { phase: ctxPhase, loading: ctxLoading, failed: ctxFailed } = usePending('context');

const snapshot = computed(() => {
  // 快照按 (core, session_id) 复合键存储（2026-10 多上游修复）——写入侧已
  // 隔离归属，直接按当前（core, 会话）取；取不到再回退全局口径键
  // （session_id 缺失时 reducer 归入 `sessionKey(core, '')`）。
  return (
    state.contexts[sessionKey(targetCore.value, targetSessionId.value ?? '')] ??
    null
  );
});
const blocks = computed(() => snapshot.value?.blocks ?? []);
const promptTokens = computed(() =>
  blocks.value.filter((b) => b.kind !== 'history').reduce((sum, b) => sum + b.tokens, 0),
);
const historyTokens = computed(() =>
  blocks.value.filter((b) => b.kind === 'history').reduce((sum, b) => sum + b.tokens, 0),
);
/**
 * 当前上下文总占用 = 提示词块 + 历史（Core 的 total_tokens 只计历史，
 * 单看它会出现「提示词 1091t 而总占用 0%」的错位；这里按全部块求和）。
 */
const contextUsed = computed(() => {
  const sum = promptTokens.value + historyTokens.value;
  return sum > 0 ? sum : (snapshot.value?.total_tokens ?? 0);
});
const pct = computed(() =>
  snapshot.value && snapshot.value.limit_tokens > 0
    ? Math.min(100, Math.round((contextUsed.value / snapshot.value.limit_tokens) * 100))
    : 0,
);
const gaugeVariant = computed(() =>
  pct.value >= 90 ? 'error' : pct.value >= 70 ? 'warning' : 'primary',
);
/** 总占用文本：<1% 与 0% 区分（小上下文里 1268t 显示 0% 会被误读为「没东西」）。 */
const pctText = computed(() => {
  if (pct.value >= 1) return `${pct.value}%`;
  return contextUsed.value > 0 ? '<1%' : '0%';
});
const systemBlocks = computed(() => blocks.value.filter((b) => b.kind !== 'history'));
const historyBlocks = computed(() => blocks.value.filter((b) => b.kind === 'history'));

/** 块占**当前上下文总量**的比例（标准口径；此前是相对最大块，误读率高）。 */
function blockPct(tokens: number): number {
  return contextUsed.value > 0 ? (tokens / contextUsed.value) * 100 : 0;
}

/** 百分比文本：不足 1% 显示 `<1%`（而不是取整成 0% 或虚高的 1%）。 */
function blockPctText(tokens: number): string {
  const value = blockPct(tokens);
  if (value >= 1) return `${Math.round(value)}%`;
  return value > 0 ? '<1%' : '0%';
}

/** 块条形宽度：按比例，但给非零块一个最小可见宽度。 */
function blockBarWidth(tokens: number): string {
  const value = blockPct(tokens);
  return `${value > 0 ? Math.max(value, 0.8) : 0}%`;
}

// 两步确认：第一次点击武装，第二次发送清空命令。
// 只清**当前会话**（2026-10 修复）：此前不带 session_id，Core 会把同一
// 人格下所有会话（QQ 群/私聊、其他 workspace 会话）的记忆一并清空。
function handleClear() {
  if (!confirmClear.value) {
    confirmClear.value = true;
    return;
  }
  confirmClear.value = false;
  // fail-closed：会话未知时不发命令——缺 session_id 在 Core 语义是
  // 「清空该人格全部会话」，与按钮「只清当前会话」的承诺不符；误触代价
  // 不可恢复，宁可拒绝（2026-10 用户报告教训）。
  if (!targetSessionId.value) {
    addToast({
      message: '当前会话尚未确定，无法执行清理（防止误清其他会话）。请先选择会话。',
      type: 'warning',
      duration: 5000,
    });
    return;
  }
  sendCommand({
    ClearHistory: { team_id: targetTeamId.value, session_id: targetSessionId.value },
  });
}

function refresh() {
  requestSnapshot();
}

// 手动重载磁盘上的 SKILL.md：刷新技能注册表并重新拉取上下文快照。
function reloadSkills() {
  sendCommand('ReloadSkills');
  refresh();
}

// 归档**当前会话**（2026-10 修复）：此前不带 session_id，Core 走旧语义
// （整档归档 + 全量清空），点一次清掉同人格下所有会话——与确认框
// 「归档当前会话」的承诺不符（「清理历史记忆」同类问题的漏网）。
async function archiveHistory() {
  const ok = await confirmDialog(
    '归档当前会话？将复制完整快照到 archives/ 并清空**当前会话**的历史（其他会话不受影响；不可恢复）。',
    {
      title: '归档会话历史',
      danger: true,
      confirmText: '归档',
    },
  );
  if (!ok) return;
  // fail-closed：会话未知时不发命令——Core 对缺 session_id 同样拒绝
  // （fail-closed：旧语义的降级执行曾是整档归档 + 清掉该人格全部会话，
  // 误触代价不可恢复；同 handleClear 的发送前守卫，2026-10 用户报告教训）。
  if (!targetSessionId.value) {
    addToast({
      message: '当前会话尚未确定，无法执行归档（防止误清其他会话）。请先选择会话。',
      type: 'warning',
      duration: 5000,
    });
    return;
  }
  sendCommand({
    ArchiveHistory: { team_id: targetTeamId.value, session_id: targetSessionId.value },
  });
}

// ── 压缩 / 归档进度 ────────────────────────────────────────────
// 新 Core 按 (core, session) 归档；旧 Core 没有人格以下维度时回退
// (core, team)，兼容升级过程中的旧进度事件。
const compactionKey = computed(() =>
  sessionKey(targetCore.value, targetSessionId.value ?? targetTeamId.value ?? ''),
);
const compactionRaw = computed(
  () =>
    state.compactions[compactionKey.value] ??
    state.compactions[sessionKey(targetCore.value, targetTeamId.value ?? '')] ??
    null,
);

/** 每秒推进一次的"现在"，用于判定终态过期与进行中超时（不需要精确）。 */
const nowTick = ref(Date.now());
let nowTimer: number | undefined;
onMounted(() => {
  nowTimer = window.setInterval(() => (nowTick.value = Date.now()), 1_000);
});
onUnmounted(() => {
  if (nowTimer) window.clearInterval(nowTimer);
});

const compactionView = computed(() => visibleCompaction(compactionRaw.value, nowTick.value));
const compaction = computed(() => compactionView.value?.run ?? null);
const compacting = computed(() => compactionView.value?.running ?? false);
const compactionPct = computed(() => compactionView.value?.pct ?? 0);
const compactionPhaseLabelText = computed(() =>
  compaction.value ? compactionPhaseLabel(compaction.value.phase) : '',
);
const compactionCount = computed(() =>
  compaction.value ? compactionCountText(compaction.value) : '',
);

/** 进度条配色：失败红、完成绿、其余主色。 */
const compactionVariant = computed(() => {
  const phase = compaction.value?.phase;
  if (phase === 'failed') return 'error' as const;
  if (phase === 'done') return 'success' as const;
  return 'primary' as const;
});

// 压缩只作用于当前会话；缺少会话标识时 fail-closed，绝不能退化为全人格压缩。
async function compactHistory() {
  const ok = await confirmDialog(
    '压缩当前会话的历史？早期事件将替换为摘要（保留最近 40 条；LLM 摘要生成可能需要数分钟），其他会话不受影响。',
    {
      title: '压缩当前会话历史',
      danger: true,
      confirmText: '压缩',
    },
  );
  if (!ok) return;
  if (!targetSessionId.value) {
    addToast({
      message: '当前会话尚未确定，无法执行压缩（防止误压其他会话）。请先选择会话。',
      type: 'warning',
      duration: 5000,
    });
    return;
  }
  sendCommand({
    CompactHistory: {
      team_id: targetTeamId.value,
      session_id: targetSessionId.value,
      keep_recent: 40,
    },
  });
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
        title="清空**当前会话**的对话历史与上下文记忆（不可恢复；不影响其他会话）"
        @click="handleClear"
      >
        {{ confirmClear ? '确认清理？不可恢复' : '清理历史记忆' }}
      </button>
      <NeumorphismButton
        variant="glass"
        size="small"
        :disabled="compacting"
        :title="compacting ? '正在压缩/归档中，请等待完成' : '归档当前会话的历史快照'"
        @click="archiveHistory"
      >
        归档
      </NeumorphismButton>
      <NeumorphismButton
        variant="glass"
        size="small"
        :disabled="compacting"
        :title="compacting ? '正在压缩/归档中，请等待完成' : '仅压缩当前会话的历史（其他会话不受影响）'"
        @click="compactHistory"
      >
        压缩
      </NeumorphismButton>
      <NeumorphismButton variant="glass" size="small" title="重新发现技能目录中的 SKILL.md 并刷新注入" @click="reloadSkills">重载技能</NeumorphismButton>
      <NeumorphismButton
        variant="glass"
        size="small"
        title="刷新"
        :loading="ctxLoading"
        aria-label="刷新上下文快照"
        @click="refresh"
      >
        <PanelIcon name="refresh" size="sm" />
      </NeumorphismButton>
    </div>

    <!-- 压缩 / 归档进度：放在**最外层**——它是"点完按钮之后发生了什么"的
         唯一反馈。此前它被包在 `v-else`（有快照）分支里：压缩期间 Core 重载
         会话会让快照短暂为 null，进度条随之消失；无快照时点「压缩」更是全程
         看不到。进度与快照是两个独立事实，不该互相门控。 -->
    <div
      v-if="compaction"
      class="ctx-compaction"
      :class="{
        'ctx-compaction--running': compacting,
        'ctx-compaction--done': compaction.phase === 'done',
        'ctx-compaction--failed': compaction.phase === 'failed',
      }"
      role="status"
      aria-live="polite"
    >
      <div class="ctx-compaction-head">
        <span class="ctx-compaction-phase">{{ compactionPhaseLabelText }}</span>
        <span v-if="compactionCount" class="ctx-compaction-count">
          {{ compactionCount }}
        </span>
        <!-- 只在**长度确定**的阶段显示百分比：不确定阶段（如"正在计算压缩
             计划…"）写"0%"是误导，进度条本身已经表达了"还在跑"。 -->
        <span v-if="compacting && compaction.total > 0" class="ctx-compaction-pct">
          {{ compactionPct }}%
        </span>
      </div>
      <NeumorphismProgress
        v-if="compacting || compaction.phase === 'done'"
        :model-value="compactionPct"
        :variant="compactionVariant"
        :indeterminate="compacting && compaction.total === 0"
        size="small"
      />
      <p class="ctx-compaction-msg">{{ compaction.message }}</p>
    </div>

    <div v-if="!snapshot" class="ctx-state">
      <template v-if="!connected">
        <NeumorphismSpinner size="large" />
        <span class="muted">正在连接 Core…</span>
      </template>
      <template v-else-if="ctxLoading">
        <!-- 骨架：仪表盘 + 块卡片（防闪烁：150ms 内到达不显示） -->
        <div class="ctx-skeleton">
          <NeumorphismSkeleton variant="rect" height="52" />
          <NeumorphismSkeleton variant="rect" height="88" />
          <NeumorphismSkeleton variant="rect" height="88" />
        </div>
      </template>
      <LoadHint
        v-else-if="ctxFailed"
        :phase="ctxPhase"
        label="上下文快照"
        @retry="requestSnapshot"
      />
      <span v-else class="muted">
        （暂无快照——点右上角刷新按钮重新拉取；若持续为空，请确认已选择智能体与会话）
      </span>
    </div>
    <template v-else>
      <div class="ctx-summary">
        <NeumorphismProgress :model-value="pct" :variant="gaugeVariant" show-label />
        <div class="ctx-summary-stats">
          <span>总占用 {{ pctText }}</span>
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
          :default-open="true"
          class="ctx-fold"
        >
          <template #head>
            <span class="ctx-kind" :class="KIND_CLASS[b.kind] ?? ''">
              {{ KIND_LABEL[b.kind] ?? b.kind }}
            </span>
            <span class="ctx-block-label">{{ displayLabel(b.kind, b.label) }}</span>
            <span class="ctx-block-tokens">{{ b.tokens }}t</span>
            <span class="ctx-block-pct">{{ blockPctText(b.tokens) }}</span>
          </template>
          <template #subhead>
            <div class="ctx-block-bar">
              <div
                class="ctx-block-fill"
                :class="KIND_CLASS[b.kind] ?? ''"
                :style="{ width: blockBarWidth(b.tokens) }"
              />
            </div>
          </template>
          <pre class="ctx-block-content">{{ b.content || '（空）' }}</pre>
        </ChatFold>
      </div>

      <div class="ctx-section-title">对话历史（{{ historyBlocks.length }}）</div>
      <div class="ctx-blocks">
        <ChatFold
          v-for="b in historyBlocks"
          :key="b.key"
          :default-open="true"
          class="ctx-fold"
        >
          <template #head>
            <span class="ctx-kind" :class="KIND_CLASS[b.kind] ?? ''">
              {{ KIND_LABEL[b.kind] ?? b.kind }}
            </span>
            <span class="ctx-block-label">{{ displayLabel(b.kind, b.label) }}</span>
            <span class="ctx-block-tokens">{{ b.tokens }}t</span>
            <span class="ctx-block-pct">{{ blockPctText(b.tokens) }}</span>
          </template>
          <template #subhead>
            <div class="ctx-block-bar">
              <div
                class="ctx-block-fill"
                :class="KIND_CLASS[b.kind] ?? ''"
                :style="{ width: blockBarWidth(b.tokens) }"
              />
            </div>
          </template>
          <pre class="ctx-block-content">{{ b.content || '（空）' }}</pre>
        </ChatFold>
      </div>

      <div
        class="ctx-section-title ctx-clickable"
        :aria-expanded="showMessages"
        @click="showMessages = !showMessages"
      >
        逐条消息明细（{{ snapshot.messages.length }}）
        <PanelIcon
          :name="showMessages ? 'chevron-down' : 'chevron-right'"
          size="xs"
          class="ctx-section-title__caret"
        />
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
/* ── 压缩 / 归档进度条（2026-10）─────────────────────────────────────────
   位置在面板最上方（模板里排在 ctx-summary 之前）：它是"点完按钮之后发生了什么"
   的唯一反馈，必须在首屏就能看到。
   三态用左边框与底色区分，不加图标——同一套玻璃配方里塞图标会显得比正文还重。 */
.ctx-compaction {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--nm-border-color);
  border-left: 3px solid var(--panel-accent, #546200);
  border-radius: 10px;
  background: color-mix(in srgb, var(--nm-surface-raised) 60%, transparent);
}
.ctx-compaction--done {
  border-left-color: var(--panel-ok, #2ea46e);
}
.ctx-compaction--failed {
  border-left-color: var(--nm-color-error, #d9534f);
}
.ctx-compaction-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}
.ctx-compaction-phase {
  font-weight: 700;
  color: var(--nm-text-primary);
}
.ctx-compaction-count {
  color: var(--nm-text-secondary);
  font-variant-numeric: tabular-nums;
}
/* 百分比推到最右（`margin-left: auto` 比 justify-content 更稳：中间的计数
   文案在某些阶段为空，用 space-between 会让百分比忽左忽右）。 */
.ctx-compaction-pct {
  margin-left: auto;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--nm-text-primary);
}
.ctx-compaction-msg {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--nm-text-secondary);
  /* 摘要路径可能很长（归档文件路径）：折行而不是撑破面板 */
  overflow-wrap: anywhere;
}

/* 无快照时的三态容器：连接中 / 骨架 / 超时（text-align 与间距） */
.ctx-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
}
.ctx-skeleton {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

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
