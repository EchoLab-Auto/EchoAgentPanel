<script setup lang="ts">
//! QQ 登录状态区（多实例 / Core 代理，2026-09）。
//!
//! 面板**不再**直连 OneBot HTTP 或 docker：登录状态与二维码都由 Core 代理——
//! 经统一适配器 op 通道（InvokeAdapterOp / AdapterOpResult）读取与发起，
//! 展示取实例状态文档（AdapterState）+ 读结果覆盖层（qqView，02b）。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import type { AdapterStatus } from '../protocol';
import { state } from '../store';
import { invokeAdapterOp } from '../adapterOps';
import { scopedKey } from '../keys';
import { applyLoginStatus, applyRead, docOf, readOverlay, toQqView } from './qq/qqView';

const props = defineProps<{
  adapter?: AdapterStatus | null;
  /** 实例名（多实例寻址；缺省 = 唯一实例）。 */
  adapterName?: string;
  owner: number;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const qrDataUrl = ref<string | null>(null);
const qrRequested = ref(false);

const instanceName = computed(() => props.adapterName || props.adapter?.name || '');
/** 该实例的登录态（AdapterState 状态文档 + 读结果覆盖层；02b §2.1）。 */
// QQ 实例名跨 core 可重复（默认都叫 qq）：按 (activeRegion, 实例) 取态。
const key = computed(() => scopedKey(state.activeRegion, instanceName.value));
const view = computed(() =>
  toQqView(state.adapterUiByKey[key.value] ?? null, readOverlay[key.value]),
);
const online = computed(() => view.value.online ?? props.adapter?.connected ?? false);
const selfId = computed(() => view.value.selfId ?? props.adapter?.self_id ?? null);

function requestStatus() {
  // 无实例（QQ 未启用）：不发——带实例名的请求会得到"QQ 实例未找到"。
  if (!instanceName.value) return;
  const core = state.activeRegion ?? null;
  const name = instanceName.value;
  invokeAdapterOp(core, name, 'login_status', {})
    .then(({ result, error: err }) => {
      if (!err) applyRead(scopedKey(core, name), applyLoginStatus, result);
    })
    .catch(() => {});
}

function loadQr() {
  if (!instanceName.value) return; // 无实例：不发二维码请求
  loading.value = true;
  error.value = null;
  qrRequested.value = true;
  // 结果局部归属（02b §2.3）：发起时捕获 (core, name)，回包校验仍是当前
  // 实例且组件未卸载，否则丢弃——替代旧全局单槽的串号路径。
  const core = state.activeRegion ?? null;
  const name = instanceName.value;
  invokeAdapterOp(core, name, 'login_qrcode', {})
    .then(({ result, error: err }) => {
      if (disposed || name !== instanceName.value || core !== (state.activeRegion ?? null)) return;
      loading.value = false;
      error.value = err ?? null;
      const b64 = (result as { png_base64?: string } | null)?.png_base64;
      qrDataUrl.value = !err && b64 ? `data:image/png;base64,${b64}` : null;
    })
    .catch((e) => {
      // 超时/断线：内联错误文案（业务失败改发 AdapterOpResult{error} 后
      // err 分支即恢复内联原文，组件无需再改；02b §2.3）。
      if (!disposed) {
        loading.value = false;
        error.value = String((e as Error)?.message ?? '获取二维码超时');
      }
    });
  // 按钮加载态时长与现状一致：8 秒后自动复位（结果到达时也会复位）。
  // 计时器句柄保存并随卸载清理（2026-10 审计：此前泄漏到组件销毁后）。
  if (qrcodeTimeout != null) window.clearTimeout(qrcodeTimeout);
  qrcodeTimeout = window.setTimeout(() => {
    loading.value = false;
    qrcodeTimeout = null;
  }, 8000);
}

let qrcodeTimeout: number | null = null;
let disposed = false;
onUnmounted(() => {
  disposed = true;
  if (qrcodeTimeout != null) {
    window.clearTimeout(qrcodeTimeout);
    qrcodeTimeout = null;
  }
});

onMounted(requestStatus);
watch(() => props.adapterName, requestStatus);

// 实例已连接 → 不需要二维码。
watch(online, (isOnline) => {
  if (isOnline) qrDataUrl.value = null;
});

// 未连接且未登录时自动拉一次二维码（单次闸）。
//
// `immediate: true` 是关键：面板在有实例时（v-if 包裹）才渲染本组件，
// 挂载时 adapter.running 已是 true、online 已是 false——若只监听变化，
// watch 初值即终值、永不触发（实测：打开面板不出码，必须手动点按钮）。
// immediate 让"挂载即满足条件"的场景也拉一次；后续 adapter 状态变化
// （如从停止变为运行中）同样覆盖。
watch(
  [() => props.adapter?.running, online],
  () => {
    if (props.adapter?.running && !online.value && !qrDataUrl.value && !loading.value && !qrRequested.value) {
      loadQr();
    }
  },
  { immediate: true },
);

/** WebUI 登录地址：状态文档（新通道）→ AdapterStatus 旧字段（deprecated）→ 默认端口（02b §2.4）。 */
const webuiUrl = computed(
  () =>
    docOf(instanceName.value)?.instance?.webui_url ??
    props.adapter?.webui_url ??
    `http://${window.location.hostname}:6099`,
);
</script>


<template>
  <div class="panel-section qq-login">
    <div class="qq-login-head">
      <h3>QQ 登录</h3>
      <NeumorphismButton size="small" variant="glass" :disabled="loading" @click="loadQr">
        {{ loading ? '读取中…' : '获取登录二维码' }}
      </NeumorphismButton>
    </div>

    <div v-if="online" class="qq-login-status qq-login-online">
      <span class="qq-dot qq-dot--ok"></span>
      <span>QQ 已连接：{{ selfId || '已连接' }}</span>
    </div>
    <div v-else class="qq-login-status qq-login-offline">
      <span class="qq-dot qq-dot--warn"></span>
      <span>
        {{
          adapter
            ? `QQ 未连接（实例 ${adapter.running ? '运行中，无客户端' : '未启动'}），请使用手机 QQ 扫码登录`
            : 'QQ 未登录，请使用手机 QQ 扫码登录'
        }}
      </span>
    </div>

    <div v-if="qrDataUrl" class="qq-login-qr">
      <img :src="qrDataUrl" alt="QQ 登录二维码" class="qr-img" />
      <div class="muted">二维码约 2 分钟有效，过期请点击"获取登录二维码"刷新</div>
    </div>
    <div v-if="error" class="qq-login-error">{{ error }}</div>
    <div class="muted">QQ 管理员：{{ owner > 0 ? owner : '（未设置）' }}</div>
    <div class="muted">
      WebUI 登录地址：<a :href="webuiUrl" target="_blank" rel="noreferrer">{{ webuiUrl }}</a>
    </div>
  </div>
</template>
