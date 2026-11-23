<script setup lang="ts">
//! 「设置 · 面板」→ 部署方式（2026-11）。
//!
//! ## 为什么要有这一块
//!
//! 同一个 Web 界面有四种装法组合，而界面上完全看不出来：内嵌在 Core 里还是
//! 独立外壳、前端来自安装前缀还是源码目录。于是每次"面板怎么更新 / 为什么
//! 重启不了 / 这个路径是谁写的"都要去翻进程和目录——问的人说不清自己装的
//! 是哪一种，答的人也只能猜。
//!
//! ## 只显示进程自己知道的事实
//!
//! 数据全部来自 `GET /api/panel-identity`（后端同一个进程自己报）。刻意**不
//! 推断**「Core 是二进制装还是源码编译」：Panel 读不到邻进程的状态文件（前缀
//! 和用户都可能不同），猜错比说"未知"差得多。`layout` 只说三件事之一：
//! 前端产物在安装前缀（`installed`）、在 git checkout 里（`source`）、或者
//! 都不是（`unknown`）。

import { onMounted, ref } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import NeumorphismTag from '@echolab-auto/ui-frame/components/NeumorphismTag';
import { panelIdentity, resetPanelIdentityCache, type PanelIdentityView } from '../federation-directory';

const loading = ref(true);
const view = ref<PanelIdentityView | null>(null);

/** 形态：内嵌模块（随 Core 进程）还是独立外壳。旧后端缺字段时按独立处理
 *  ——独立是历史形态，内嵌才是 2026-11 之后新增的。 */
const embedded = () => view.value?.embedded === true;

const FORMS = {
  embedded: {
    label: '内嵌模块',
    note: 'Panel 的代码编译在 Core 二进制里，随 Core 一起启动和退出；更新 Panel 等于更新 Core。',
  },
  standalone: {
    label: '独立外壳',
    note: 'Panel 是独立进程（echo-agent-panel），有自己的版本与服务生命周期，连着一个或多个 Core。',
  },
} as const;

const LAYOUTS: Record<string, { label: string; note: string; variant: 'default' | 'success' | 'warning' }> = {
  installed: {
    label: '安装布局',
    note: '前端产物在安装前缀的 libexec 下——由安装脚本（二进制包或源码安装）落盘，不是临时构建的。',
    variant: 'success',
  },
  source: {
    label: '源码目录',
    note: '前端产物来自 git checkout 里的 web/dist——本机直接构建的产物，改动会随源码更新而变化。',
    variant: 'warning',
  },
  unknown: {
    label: '未知',
    note: '前端既不在安装前缀下、也不在 git checkout 里（自定义目录或反向代理挂载的静态站）。',
    variant: 'default',
  },
};

function layoutInfo() {
  return LAYOUTS[view.value?.layout ?? ''] ?? LAYOUTS.unknown;
}

function formInfo() {
  return embedded() ? FORMS.embedded : FORMS.standalone;
}

/** 旧后端没有这些字段时统一显示"（旧版后端未上报）"，而不是空白。 */
function text(value: string | undefined, fallback = '（旧版后端未上报）'): string {
  return value && value.trim() ? value : fallback;
}

async function load(refresh = false) {
  loading.value = true;
  if (refresh) resetPanelIdentityCache();
  try {
    view.value = await panelIdentity();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="dep-page">
    <div class="dep-header">
      <div>
        <div class="dep-title">部署方式</div>
        <div class="dep-sub">
          这个 Web 界面本身是怎么装起来的：跑在哪个进程里、前端从哪个目录读。
          都是本进程自报的事实，不跨进程推断。
        </div>
      </div>
      <NeumorphismButton size="small" variant="glass" :loading="loading" @click="load(true)">
        刷新
      </NeumorphismButton>
    </div>

    <NeumorphismCard class="dep-card" :elevation="2">
      <div class="dep-row">
        <span class="dep-row__label">运行形态</span>
        <NeumorphismTag :variant="embedded() ? 'success' : 'default'">
          {{ formInfo().label }}
        </NeumorphismTag>
      </div>
      <div class="dep-note">{{ formInfo().note }}</div>

      <div class="dep-row">
        <span class="dep-row__label">前端产物</span>
        <NeumorphismTag :variant="layoutInfo().variant">{{ layoutInfo().label }}</NeumorphismTag>
        <span class="dep-mono dep-path">{{ text(view?.static_dir, '（未知目录）') }}</span>
      </div>
      <div class="dep-note">{{ layoutInfo().note }}</div>

      <div class="dep-row">
        <span class="dep-row__label">Panel 版本</span>
        <span class="dep-mono">{{ text(view?.version) }}</span>
        <span v-if="embedded()" class="dep-muted">
          （模块自身版本；内嵌时随 Core 二进制一起发布，Core 版本见 <code>echo-agent-core --version</code>）
        </span>
      </div>

      <div class="dep-row">
        <span class="dep-row__label">基址</span>
        <span class="dep-mono">{{ text(view?.base_path) }}</span>
        <span v-if="view?.serve_root" class="dep-muted">根路径入口也接受（子路径部署）</span>
      </div>

      <div class="dep-row">
        <span class="dep-row__label">监听地址</span>
        <span class="dep-mono">{{ text(view?.bind) }}</span>
      </div>
    </NeumorphismCard>
  </div>
</template>

<style scoped>
.dep-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
  padding: 4px 2px 8px;
}

.dep-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dep-title {
  font-size: 16px;
  font-weight: 600;
}

.dep-sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--nm-text-secondary, #888);
}

.dep-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dep-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-wrap: wrap;
}

.dep-row__label {
  flex: 0 0 96px;
  color: var(--nm-text-secondary, #888);
}

.dep-mono {
  font-family: var(--nm-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
}

/* 路径可能很长（安装前缀 + hash 目录）：给个换行边界，别把卡片撑破。 */
.dep-path {
  word-break: break-all;
}

.dep-muted {
  font-size: 12px;
  color: var(--nm-text-secondary, #888);
}

.dep-note {
  font-size: 12px;
  line-height: 1.6;
  color: var(--nm-text-secondary, #888);
  padding-left: 96px;
}
</style>
