<script setup lang="ts">
//! Shell 面板：后台持久 shell 会话的终端可视化。
//! 每个会话一张终端卡片：启动/停止会话、逐条命令回显 + 流式输出、运行态指示。

import { nextTick, onMounted, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';

/** 新建会话的工作目录（默认空 = 框架 workspace） */
const workdir = ref('');
const inputBySession = ref<Record<string, string>>({});
const terminalEls = ref<Record<string, HTMLElement | null>>({});

function refresh() {
  sendCommand('RequestShellSessions');
}
onMounted(refresh);

function startSession() {
  sendCommand({ ShellStart: { workdir: workdir.value.trim() || null } });
  workdir.value = '';
  refresh();
}

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
    <!-- 头部 -->
    <div class="shell-head">
      <div class="shell-head__text">
        <h2>后台 Shell</h2>
        <p class="shell-head__sub">持久 bash 会话 · 终端可视化 · 与 LLM 工具共用同一会话</p>
      </div>
      <div class="shell-head__actions">
        <input
          v-model="workdir"
          class="shell-workdir"
          placeholder="工作目录（默认框架 workspace）"
          @keyup.enter="startSession"
        />
        <NeumorphismButton size="small" variant="primary" @click="startSession">新建会话</NeumorphismButton>
        <NeumorphismButton size="small" variant="glass" @click="refresh">刷新</NeumorphismButton>
      </div>
    </div>

    <!-- 会话卡片 -->
    <div v-if="state.shellSessions.length === 0" class="shell-empty">
      （暂无 shell 会话，点击「新建会话」开始）
    </div>

    <div
      v-for="session in state.shellSessions"
      :key="session.session_id"
      class="shell-card"
    >
      <div class="shell-card__head">
        <span class="shell-dot" />
        <span class="shell-card__id">{{ session.session_id }}</span>
        <span class="shell-card__meta">{{ session.workdir }}</span>
        <span class="shell-card__meta">{{ fmtTime(session.created_at_ms) }} · {{ session.exec_count }} 条命令</span>
        <span class="shell-card__spacer" />
        <NeumorphismButton size="small" variant="glass" @click="stopSession(session.session_id)">
          停止
        </NeumorphismButton>
      </div>

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
