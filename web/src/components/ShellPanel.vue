<script setup lang="ts">
//! Shell 面板：后台持久 shell 会话的终端可视化。
//! 每个会话一张终端卡片：启动/停止会话、逐条命令回显 + 流式输出、运行态指示。

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';

/** 详情视图（2026-09-19 起）：`sessionId` 必填，只展示该会话的终端。
 *  会话列表在右侧边栏「Shell」卡（ShellList），点「详情」进入本视图。 */
const props = defineProps<{ sessionId: string }>();
const emit = defineEmits<{ back: [] }>();

const session = computed(() =>
  state.shellSessions.find((s) => s.session_id === props.sessionId) ?? null,
);

const inputBySession = ref<Record<string, string>>({});
const terminalEls = ref<Record<string, HTMLElement | null>>({});

onMounted(() => sendCommand({ RequestShellSessions: {} }));

function stopSession(sessionId: string) {
  sendCommand({ ShellStop: { session_id: sessionId } });
}

function execCommand(sessionId: string) {
  const cmd = (inputBySession.value[sessionId] ?? '').trim();
  if (!cmd) return;
  sendCommand({ ShellExec: { session_id: sessionId, command: cmd } });
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

// 新输出到达时自动滚动到底部
watch(
  () => state.shellTerminals,
  () => {
    void nextTick(() => {
      for (const el of Object.values(terminalEls.value)) {
        if (el) el.scrollTop = el.scrollHeight;
      }
    });
  },
  { deep: true },
);
</script>

<template>
  <div class="shell-panel">
    <!-- 头部：返回 + 会话信息 -->
    <div class="shell-head">
      <div class="shell-head__text">
        <h2>Shell · {{ session?.session_id ?? props.sessionId }}</h2>
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
    <div v-if="!session" class="shell-empty">（会话不存在或已停止，返回列表刷新）</div>

    <div v-else class="shell-card">
      <!-- 终端区 -->
      <div ref="el => (terminalEls[session.session_id] = el)" class="shell-terminal">
        <div v-if="!(state.shellTerminals[session.session_id] ?? []).length" class="shell-terminal__hint">
          输入命令后回车执行…
        </div>
        <div
          v-for="entry in state.shellTerminals[session.session_id] ?? []"
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
.shell-head h2 { margin: 0; font-size: 15px; }
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
  border: 2px solid #30363d; border-top-color: #4c9aff;
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
</style>
