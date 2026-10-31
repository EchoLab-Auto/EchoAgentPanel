<script setup lang="ts">
//! Shell 面板：后台持久 shell 会话的终端可视化。
//! 每个会话一张终端卡片：启动/停止会话、逐条命令回显 + 流式输出、运行态指示。
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { state } from '../store';
import { sendCommand, sendPending } from '../connection';
import { releasePending, usePending } from '../pending';
import { sessionKey } from '../keys';
import { coreDisplay } from '../state';
import LoadHint from './LoadHint.vue';

/** 详情视图（2026-09-19 起）：`sessionId` + 所属 `core` 必填，只展示该会话的终端。
 *  会话列表在右侧边栏「Shell」卡（ShellList），点「详情」进入本视图。
 *
 *  `core` 是会话的**真实归属**（`sh-{seq}` 在每个 core 上从 1 起重复，光凭 id
 *  无法区分）。以前的实现只按 activeRegion 定位：打开 A 的 `sh-1` 后切到 B，
 *  同一面板会显示 B 的 `sh-1`，且在这里执行的命令打到 B——用户以为还在 A。 */
const props = defineProps<{ sessionId: string; core?: string | null }>();
const emit = defineEmits<{ back: [] }>();

/** 本次查看的目标 core：显式传入优先，缺省（旧调用点）回落 activeRegion。 */
const targetCore = computed(() => props.core ?? state.activeRegion ?? null);
/** 多区域部署时才显示区域徽标。 */
const showRegion = computed(() => state.upstreams.length > 1 || state.knownCores.size > 1);

// 会话 id 是 per-core 的 `sh-{seq}`：按 (core, session_id) 精确定位。
const session = computed(
  () =>
    state.shellSessions.find(
      (s) => s.session_id === props.sessionId && (s.core ?? null) === targetCore.value,
    ) ?? null,
);
/** 终端条目的复合键（找不到会话时按目标 core + 请求 id 兜底）。 */
const terminalKey = computed(() => sessionKey(targetCore.value, props.sessionId));

const inputBySession = ref<Record<string, string>>({});
const terminalEls = ref<Record<string, HTMLElement | null>>({});

// 会话数据未到时不再直显"会话不存在"（2026-10 审计修复）：请求登记为
// pending 三态——pending/slow 显示加载、timeout 显示重试；仅 idle 且查无
// pending 三态——pending/slow 显示加载、timeout 显示重试；仅 idle 且查无
// 会话才是真"不存在"。断连时不登记（重连后由重试/挂载补拉）。
const { phase: panelPhase } = usePending('shell:panel:sessions');
function loadSessions() {
  sendPending({ RequestShellSessions: {} }, 'shell:panel:sessions');
}
onMounted(() => {
  if (state.connected) loadSessions();
});
onUnmounted(() => releasePending('shell:panel:sessions'));

// 命令一律按**目标 core** 定向：`ShellExec/ShellStop` 的 payload 只有
// `session_id`，而 `coreForCommand` 只查聊天会话表（shell id 永远查不到），
// 不带 targetCore 就只能落到 activeRegion——切过区域后命令会打进别的机器
// 的同号 shell（2026-10 多 Core 交互修复）。
function stopSession(sessionId: string) {
  sendCommand(
    { ShellStop: { session_id: sessionId, team_id: state.activeTeamId ?? null } },
    targetCore.value ?? undefined,
  );
}

function execCommand(sessionId: string) {
  const cmd = (inputBySession.value[sessionId] ?? '').trim();
  if (!cmd) return;
  sendCommand(
    { ShellExec: { session_id: sessionId, command: cmd, team_id: state.activeTeamId ?? null } },
    targetCore.value ?? undefined,
  );
  inputBySession.value[sessionId] = '';
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('zh-CN', { hour12: false });
}

function statusLabel(entry: { status: string }): string {
  switch (entry.status) {
    case 'running': return '运行中';
    case 'done': return '完成';
    case 'failed': return '失败';
    case 'timeout': return '超时';
    default: return entry.status;
  }
}

// 新输出到达时自动滚动到底部。
//
// **定向签名**（2026-10 内存/性能治理）：此前是 `watch(..., { deep: true })`
// ——`ShellExecOutput` 每个输出块都会触发一次**整棵终端树**的深度遍历
// （所有会话 × 所有历史条目的每个字段），终端开久了每次输出都要遍历几千个
// 属性；随后还要对每个终端读 `scrollHeight`（强制布局）。
//
// 现在只读"每个会话最后一条的输出长度与 seq"这一串标量：输出增长必然
// 改变长度（同长度替换在 shell 输出里不出现），因此语义等价而成本从
// O(全部条目) 降到 O(终端数)。
const shellTailSignature = computed(() =>
  Object.entries(state.shellTerminals)
    .map(([key, entries]) => {
      const last = entries[entries.length - 1];
      return `${key}:${entries.length}:${last?.seq ?? 0}:${last?.output.length ?? 0}:${last?.status ?? ''}`;
    })
    .join('|'),
);

watch(shellTailSignature, () => {
  void nextTick(() => {
    for (const el of Object.values(terminalEls.value)) {
      if (el) el.scrollTop = el.scrollHeight;
    }
  });
});
</script>

<template>
  <div class="shell-panel">
    <!-- 头部：返回 + 会话信息 -->
    <div class="shell-head">
      <div class="shell-head__text">
        <h2>
          Shell · {{ session?.session_id ?? props.sessionId }}
          <!-- 同 ShellList：主名 = 上游配置名，区域名作 title 副注
               （见 `state.ts::coreDisplay`）。 -->
          <span v-if="showRegion" class="shell-head__core" :title="coreDisplay(state, targetCore).title">
            {{ coreDisplay(state, targetCore).name }}
          </span>
        </h2>
        <p class="shell-head__sub">
          {{ session?.workdir ?? '' }} ·
          {{ session ? `${fmtTime(session.created_at_ms)} · ${session.exec_count} 条命令` : '会话不存在或已停止' }}
        </p>
      </div>
      <div class="shell-head__actions">
        <NeumorphismButton size="small" variant="glass" @click="emit('back')">返回列表</NeumorphismButton>
        <NeumorphismButton v-if="session" size="small" variant="glass" @click="stopSession(session.session_id)">
          停止会话
        </NeumorphismButton>
      </div>
    </div>

    <!-- 会话卡片（仅目标会话） -->
    <!-- 数据未到不误报（2026-10 审计修复）：pending/slow/timeout 三态走
         LoadHint，仅 idle 且无会话才是真"不存在"。 -->
    <LoadHint
      v-if="!session && panelPhase !== 'idle'"
      :phase="panelPhase"
      label="Shell 会话"
      @retry="loadSessions"
    />
    <div v-else-if="!session" class="shell-empty">（会话不存在或已停止，返回列表刷新）</div>

    <div v-else class="shell-card">
      <!-- 终端区 -->
      <div ref="el => (terminalEls[session.session_id] = el)" class="shell-terminal">
        <div v-if="!(state.shellTerminals[terminalKey] ?? []).length" class="shell-terminal__hint">
          输入命令后回车执行…
        </div>
        <!-- 条数与单条输出长度由 state 侧限幅（SHELL_ENTRIES_LIMIT /
             SHELL_OUTPUT_TAIL）：FIFO 只留最近 200 条、每条只留尾部 64KB，
             因此这里的 v-for 天然有界，不需要虚拟滚动。 -->
        <div
          v-for="entry in state.shellTerminals[terminalKey] ?? []"
          :key="entry.seq"
          class="shell-entry"
        >
          <div class="shell-entry__cmd">
            <span class="shell-entry__prompt">$</span>
            <span class="shell-entry__cmd-text">{{ entry.command }}</span>
            <span v-if="entry.status === 'running'" class="shell-entry__spinner" />
            <span v-else class="shell-entry__status" :class="`is-${entry.status}`">
              [{{ statusLabel(entry) }}{{ entry.elapsed_ms != null ? ` · ${(entry.elapsed_ms / 1000).toFixed(1)}s` : '' }}]
            </span>
          </div>
          <pre v-if="entry.output" class="shell-entry__out">{{ entry.output }}</pre>
        </div>
      </div>

      <!-- 输入行 -->
      <div class="shell-input">
        <span class="shell-input__prompt">$</span>
        <input
          v-model="inputBySession[session.session_id]"
          class="shell-input__field"
          placeholder="输入命令，回车执行（Esc 清空）"
          spellcheck="false"
          @keyup.enter="execCommand(session.session_id)"
          @keyup.esc="inputBySession[session.session_id] = ''"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 18px;
  height: 100%;
  overflow-y: auto;
}
.shell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.shell-head h2 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }
/* 区域徽标：这个终端在哪台机器上（多上游时才知道命令打去了哪里） */
.shell-head__core {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 5px;
  color: var(--nm-text-secondary);
  background: color-mix(in srgb, var(--nm-text-primary) 8%, transparent);
}
.shell-head__sub { margin: 2px 0 0; font-size: 11px; color: var(--nm-text-secondary); }
.shell-head__actions { display: flex; align-items: center; gap: 8px; }
.shell-workdir {
  background: var(--nm-bg-color);
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
  color: var(--nm-text-primary);
  padding: 6px 10px;
  font-size: 12px;
  width: 240px;
}
.shell-empty { color: var(--nm-text-secondary); font-size: 13px; padding: 20px 0; }

/* 会话卡片 */
.shell-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--nm-border-color);
  border-radius: 12px;
  background: var(--nm-surface-raised);
  padding: 12px;
}
.shell-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.shell-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--panel-ok);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--panel-ok) 18%, transparent);
}
.shell-card__id { font-weight: 700; font-family: var(--nm-font-mono, monospace); }
.shell-card__meta { color: var(--nm-text-secondary); font-size: 11px; }
.shell-card__spacer { flex: 1; }

/* 终端 */
.shell-terminal {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  min-height: 120px;
  max-height: 320px;
  overflow-y: auto;
  padding: 10px 12px;
  font-family: var(--nm-font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.6;
  color: #c9d1d9;
}
.shell-terminal__hint { color: #484f58; }
.shell-entry { margin-bottom: 8px; }
.shell-entry__cmd { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.shell-entry__prompt { color: #3fb950; font-weight: 700; }
.shell-entry__cmd-text { color: #e6edf3; font-weight: 600; }
.shell-entry__spinner {
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #30363d; border-top-color: var(--nm-primary-color);
  animation: shell-spin 0.8s linear infinite;
}
.shell-entry__status { font-size: 10px; opacity: 0.75; }
.shell-entry__status.is-done { color: #3fb950; }
.shell-entry__status.is-failed { color: #f85149; }
.shell-entry__status.is-timeout { color: #d29922; }
.shell-entry__out {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #adbac7;
  font-family: inherit;
}

/* 输入行 */
.shell-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 8px 12px;
}
.shell-input__prompt { color: #3fb950; font-weight: 700; font-family: var(--nm-font-mono, monospace); }
.shell-input__field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e6edf3;
  font-family: var(--nm-font-mono, monospace);
  font-size: 12.5px;
}
@keyframes shell-spin { to { transform: rotate(360deg); } }

/* 竖屏移动端（2026-10，断点 768px）：命令输入行贴底安全区；输入字号
   提至 16px（iOS 聚焦防缩放，native input 同样适用）。 */
@media (max-width: 767.98px) {
  .shell-input {
    padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
  }
  .shell-input__field {
    font-size: 16px;
  }
}
</style>
