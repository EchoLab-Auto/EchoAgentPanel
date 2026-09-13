<script setup lang="ts">
//! QQ 登录状态区（多实例 / Core 代理，2026-09）。
//!
//! 面板**不再**直连 OneBot HTTP 或 docker：登录状态与二维码都由 Core 代理——
//! 发 `RequestQqLoginStatus` / `RequestQqQrcode`（带实例名），Core 用
//! `QqLoginStatus` / `QqQrcode` 事件回推（二维码为 PNG base64）。

import { computed, onMounted, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import type { AdapterStatus } from '../protocol';
import { state } from '../store';
import { sendCommand } from '../connection';

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
/** 该实例的登录态（Core 经 QqLoginStatus 回推）。 */
const instanceState = computed(() => state.qqByAdapter[instanceName.value]);
const online = computed(
  () => instanceState.value?.online ?? props.adapter?.connected ?? false,
);
const selfId = computed(() => instanceState.value?.selfId ?? props.adapter?.self_id ?? null);

function requestStatus() {
  sendCommand({ RequestQqLoginStatus: { adapter: instanceName.value || null } });
}

function loadQr() {
  loading.value = true;
  error.value = null;
  qrRequested.value = true;
  sendCommand({ RequestQqQrcode: { adapter: instanceName.value || null } });
  // Core 以事件回推，超时由事件缺失自然体现（无加载态挂死）。
  window.setTimeout(() => {
    loading.value = false;
  }, 8000);
}

// QqQrcode 事件 → data URL（Core 回推 base64 PNG）。
watch(
  () => (state as unknown as { lastQrcode?: { adapter: string; png_base64: string; error?: string | null } }).lastQrcode,
  (qr) => {
    if (!qr || qr.adapter !== instanceName.value) return;
    loading.value = false;
    if (qr.error) {
      error.value = qr.error;
      qrDataUrl.value = null;
      return;
    }
    qrDataUrl.value = qr.png_base64 ? `data:image/png;base64,${qr.png_base64}` : null;
  },
);

onMounted(requestStatus);
watch(() => props.adapterName, requestStatus);

// 实例已连接 → 不需要二维码。
watch(online, (isOnline) => {
  if (isOnline) qrDataUrl.value = null;
});

// 未连接且未登录时自动拉一次二维码（单次闸）。
watch(
  [() => props.adapter?.running, online],
  () => {
    if (props.adapter?.running && !online.value && !qrDataUrl.value && !loading.value && !qrRequested.value) {
      loadQr();
    }
  },
);

const webuiUrl = computed(
  () => props.adapter?.webui_url ?? `http://${window.location.hostname}:6099`,
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
