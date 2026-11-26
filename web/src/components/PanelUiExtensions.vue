<script setup lang="ts">
//! 面板 UI 扩展的加载状态（运行期加载的可见面）。
//!
//! ## 为什么这块要存在
//!
//! 运行期加载的固有代价是**失败变晚**：构建期错误在 `npm run build` 就报，
//! 运行期错误只出现在某个用户的浏览器控制台里。而新路径最典型的故障是
//! "面板看起来正常，只是某个模块的入口没了"——2026-11 那次的形状完全一样
//! （模块在 Core 里挂着、界面上什么都没有、构建与启动都不报错）。
//!
//! 所以这里把 `echo-agent.panel-ui.list` 的结果与每条 `import()` 的成败
//! 摆出来：装了哪些、哪个失败了、为什么。

import { computed, ref } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import { panelUiStatus, panelUiSummary } from '../panel-ui-status';
import { reloadPanelExtensions } from '../extension-loader';

const status = computed(() => panelUiStatus.value);
const summary = computed(() => panelUiSummary(status.value));
const loadedCount = computed(() => status.value.loaded.length);
const failedCount = computed(() => status.value.failed.length);
/** 健康态：不需要用户做任何事。 */
const healthy = computed(() => status.value.phase === 'ready' || status.value.phase === 'unavailable');

/** 手动重载中（按钮 loading；重载本身很轻，只防连点）。 */
const reloading = ref(false);

async function reload() {
  if (reloading.value) return;
  reloading.value = true;
  try {
    await reloadPanelExtensions();
  } finally {
    reloading.value = false;
  }
}
</script>

<template>
  <section class="panel-ui-ext" :class="{ 'panel-ui-ext--warn': !healthy }">
    <header class="panel-ui-ext__head">
      <div class="panel-ui-ext__title">
        <strong>面板 UI 扩展</strong>
        <span class="panel-ui-ext__counts">
          {{ loadedCount }} 个已加载<template v-if="failedCount">，{{ failedCount }} 个失败</template>
        </span>
      </div>
      <div class="panel-ui-ext__actions">
        <span class="panel-ui-ext__sdk">SDK {{ status.sdk || '—' }}</span>
        <!-- 手动重载（2026-11）：自动重试用尽后界面就是空的，而这时唯一能做的
             「刷新整页」连入口都没有。这里把自救成本降到一次点击。 -->
        <NeumorphismButton :size="26" variant="ghost" :loading="reloading" @click="reload">
          重新加载
        </NeumorphismButton>
      </div>
    </header>

    <p v-if="summary" class="panel-ui-ext__summary">{{ summary }}</p>

    <!-- 失败的先列：那是需要动作的部分。 -->
    <ul v-if="failedCount" class="panel-ui-ext__list">
      <li v-for="item in status.failed" :key="item.id" class="panel-ui-ext__row panel-ui-ext__row--bad">
        <span class="panel-ui-ext__id">{{ item.id }}</span>
        <span class="panel-ui-ext__reason">{{ item.reason }}</span>
      </li>
    </ul>

    <ul v-if="loadedCount" class="panel-ui-ext__list">
      <li v-for="id in status.loaded" :key="id" class="panel-ui-ext__row">
        <span class="panel-ui-ext__id">{{ id }}</span>
      </li>
    </ul>

    <p v-if="status.phase === 'idle'" class="panel-ui-ext__hint">等待与 Core 建立连接后加载。</p>
  </section>
</template>

<style scoped>
.panel-ui-ext {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--nm-border-radius-md, 12px);
  background: var(--nm-surface-color, rgba(255, 255, 255, 0.04));
}

.panel-ui-ext--warn {
  /* 失败态用左侧描边而不是整块红底：这页是设置页，红色大面积会盖掉同屏
     其它设置项的可读性。 */
  border-left: 3px solid var(--panel-err);
}

.panel-ui-ext__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.panel-ui-ext__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.panel-ui-ext__counts,
.panel-ui-ext__sdk {
  font-size: 12px;
  opacity: 0.7;
}

/* 右组：SDK 版本 + 手动重载钮（版本是诊断信息，重载是动作，同一行右对齐）。 */
.panel-ui-ext__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-ui-ext__summary {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}

.panel-ui-ext__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.panel-ui-ext__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.panel-ui-ext__row--bad .panel-ui-ext__id {
  color: var(--panel-err);
}

.panel-ui-ext__id {
  font-family: var(--nm-font-mono, ui-monospace, monospace);
  opacity: 0.85;
}

.panel-ui-ext__reason {
  opacity: 0.7;
  /* 失败原因可能带 URL，允许换行而不是横向溢出。 */
  overflow-wrap: anywhere;
}

.panel-ui-ext__hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
</style>
