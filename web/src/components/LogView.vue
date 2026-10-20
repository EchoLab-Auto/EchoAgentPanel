<script setup lang="ts">
//! 日志查看面板（设置视图「日志」分类的工作区，原为独立视图）。
//! Core/Panel 双来源，5s 自动刷新；挂载/卸载随分类切换，定时器随卸载清理。
//! 2026-10 末：SSH 接入的上游 Core 日志经隧道在**远端**读取——Core 视图
//! 提供上游选择器（列出 SSH 上游；「本机」= 读取本机 journal）。
//!
//! 2026-10 日志治理：默认只拿到「最近 N 行原文」时，排障要在几万字里人肉
//! 找一条 WARN。这里加三层客户端过滤（级别 / 关键字 / 跟随最新）：
//!
//! - **级别**：按行首的 `INFO`/`WARN`/`ERROR` 词元判定（text 与 json 两种
//!   输出都命中）；无法判定级别的续行（多行字段）在级别过滤下保留，
//!   避免把上下文切碎；
//! - **关键字**：大小写不敏感子串匹配，命中行之外全部隐藏；
//! - **跟随最新**：默认滚到底部；关掉后内容更新不再抢滚动位置（读旧日志
//!   时不会被 5s 刷新甩回底部）。

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import { fetchWithTimeout } from '../api';
import { state } from '../store';

type LogKind = 'panel' | 'core';
type LevelFilter = 'all' | 'info' | 'warn' | 'error';

const KIND_OPTIONS = [
  { label: 'Core', value: 'core' },
  { label: 'Panel', value: 'panel' },
];

const LEVEL_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: 'INFO+', value: 'info' },
  { label: 'WARN+', value: 'warn' },
  { label: 'ERROR', value: 'error' },
];

/** 级别高低序（数值越大越严重）；`null` = 行内无法判定级别。 */
const LEVEL_RANK: Record<string, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };

/** SSH 接入的上游（其日志经隧道在远端读取）。 */
const sshCores = computed(() => state.upstreams.filter((u) => u.access === 'ssh'));

/** 日志来源选择：本机 + 全部 SSH 上游（无 SSH 上游时整个选择器隐藏）。 */
const coreOptions = computed(() => [
  { label: '本机', value: '' },
  ...sshCores.value.map((u) => ({ label: u.name, value: u.name })),
]);

const kind = ref<LogKind>('core');
/** 选中的上游名（'' = 本机日志）。 */
const core = ref<string>('');
const text = ref('（正在加载日志…）');
const auto = ref(true);
const level = ref<LevelFilter>('all');
const keyword = ref('');
/** 跟随最新：内容更新后自动滚到底部（关掉 = 停在当前阅读位置）。 */
const follow = ref(true);
const viewer = ref<HTMLElement | null>(null);

const allLines = computed(() => text.value.split('\n'));

/** 行内级别词元（text 输出 ` INFO ` / json 输出 `"level":"INFO"` 都命中）。 */
function lineRank(line: string): number | null {
  const match = /\b(TRACE|DEBUG|INFO|WARN|ERROR)\b/.exec(line);
  return match ? (LEVEL_RANK[match[1].toLowerCase()] ?? null) : null;
}

const filtered = computed(() => {
  const min = level.value === 'all' ? -1 : LEVEL_RANK[level.value];
  const needle = keyword.value.trim().toLowerCase();
  if (min < 0 && !needle) return allLines.value;
  return allLines.value.filter((line) => {
    if (min >= 0) {
      const rank = lineRank(line);
      // 判不出级别的续行保留：级别过滤不该把一条记录的多行上下文切散。
      if (rank !== null && rank < min) return false;
    }
    if (needle && !line.toLowerCase().includes(needle)) return false;
    return true;
  });
});

const visibleText = computed(() =>
  filtered.value.length === 0 ? '（没有匹配的行）' : filtered.value.join('\n'),
);

function endpointFor(selected: LogKind, upstream: string): string {
  if (selected === 'panel') return '/api/logs/panel?lines=100';
  const suffix = upstream ? `&core=${encodeURIComponent(upstream)}` : '';
  return `/api/logs/core?lines=100${suffix}`;
}

function scrollToBottom() {
  const element = viewer.value;
  if (element) element.scrollTop = element.scrollHeight;
}

async function load() {
  try {
    const resp = await fetchWithTimeout(endpointFor(kind.value, core.value), {
      cache: 'no-store',
    });
    if (!resp.ok) {
      text.value = `日志接口返回 HTTP ${resp.status}`;
      return;
    }
    text.value = await resp.text();
    if (follow.value) {
      // 等过滤后的内容渲染完再滚，否则滚的是上一帧的高度。
      await nextTick();
      scrollToBottom();
    }
  } catch (error) {
    text.value = `日志读取失败: ${String(error)}`;
  }
}

let timer: number | undefined;
function stopAuto() {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}
function startAuto() {
  stopAuto();
  if (auto.value) {
    timer = window.setInterval(() => load(), 5000);
  }
}

onMounted(() => {
  load();
  startAuto();
});
onBeforeUnmount(stopAuto);
watch([auto, kind, core], () => {
  load();
  startAuto();
});
// 选中的 SSH 上游被删除/改为直连时回退「本机」（core 变化触发上面的 watch）。
watch(sshCores, () => {
  if (core.value && !sshCores.value.some((u) => u.name === core.value)) {
    core.value = '';
  }
});
</script>

<template>
  <div class="log-view-panel">
    <div class="log-head">
      <NeumorphismSegmented v-model="kind" :options="KIND_OPTIONS" size="small" />
      <NeumorphismSegmented
        v-if="kind === 'core' && sshCores.length"
        v-model="core"
        :options="coreOptions"
        size="small"
      />
      <NeumorphismSegmented v-model="level" :options="LEVEL_OPTIONS" size="small" />
      <input
        v-model="keyword"
        class="log-filter"
        type="search"
        placeholder="过滤关键字（大小写不敏感）"
        aria-label="过滤关键字"
      />
      <span class="log-count">{{ filtered.length }} / {{ allLines.length }} 行</span>
      <NeumorphismButton variant="glass" size="small" @click="follow = !follow">
        {{ follow ? '跟随最新' : '已暂停跟随' }}
      </NeumorphismButton>
      <NeumorphismButton variant="glass" size="small" @click="auto = !auto">
        {{ auto ? '自动刷新中' : '手动刷新' }}
      </NeumorphismButton>
      <NeumorphismButton variant="glass" size="small" @click="load()">刷新</NeumorphismButton>
    </div>
    <pre ref="viewer" class="log-viewer">{{ visibleText }}</pre>
  </div>
</template>

<style scoped>
.log-view-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.log-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.log-filter {
  flex: 1 1 180px;
  min-width: 140px;
  padding: 5px 10px;
  border: 1px solid var(--nm-border-subtle);
  border-radius: 8px;
  background: var(--nm-bg-color);
  color: inherit;
  font-size: 12px;
}
.log-count {
  color: var(--nm-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
</style>
