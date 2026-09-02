<script setup lang="ts">
//! QQ 登录状态区：轮询登录状态、二维码获取、NapCat WebUI 链接。

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NeumorphismButton } from '@echolab-auto/ui-frame';
import type { AdapterStatus } from '../protocol';
import { fetchWithTimeout } from '../api';

interface LoginStatus {
  online: boolean;
  user_id?: string | null;
  nickname?: string | null;
  error?: string | null;
}

const props = defineProps<{ adapter?: AdapterStatus; owner: number }>();

const status = ref<LoginStatus | null>(null);
const loading = ref(false);
const qrUrl = ref<string | null>(null);
const error = ref<string | null>(null);
const qrRequested = ref(false);

async function loadStatus() {
  try {
    const resp = await fetchWithTimeout('/api/qq/login-status', { cache: 'no-store' });
    const data = await resp.json();
    if (!resp.ok) {
      status.value = { online: false };
      return;
    }
    status.value = data as LoginStatus;
    if (data.online) qrUrl.value = null;
  } catch {
    status.value = null;
  }
}

let timer: number | undefined;
onMounted(() => {
  loadStatus();
  timer = window.setInterval(loadStatus, 5000);
});
onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
});

async function loadQr() {
  loading.value = true;
  error.value = null;
  try {
    const resp = await fetchWithTimeout('/api/qq/qrcode');
    if (!resp.ok) {
      let message = `二维码读取失败 (HTTP ${resp.status})`;
      try {
        const data = await resp.json();
        if (data && data.error) message = data.error;
      } catch {
        // keep default message
      }
      qrUrl.value = null;
      error.value = message;
      return;
    }
    const blob = await resp.blob();
    if (qrUrl.value) URL.revokeObjectURL(qrUrl.value);
    qrUrl.value = URL.createObjectURL(blob);
  } catch {
    qrUrl.value = null;
    error.value = '二维码读取失败，请确认 NapCat 容器正在运行';
  } finally {
    loading.value = false;
  }
}

// 后端报告 QQ 未登录时自动拉取一次二维码。
watch(
  [() => props.adapter?.connected, status, qrUrl, loading],
  () => {
    if (
      !props.adapter?.connected &&
      status.value &&
      !status.value.online &&
      !qrUrl.value &&
      !loading.value &&
      !qrRequested.value
    ) {
      qrRequested.value = true;
      loadQr();
    }
  },
);

const webuiUrl = `http://${window.location.hostname}:6099`;
</script>

<template>
  <div class="panel-section qq-login">
    <div class="qq-login-head">
      <h3>QQ 登录</h3>
      <NeumorphismButton size="small" variant="glass" :disabled="loading" @click="loadQr">
        {{ loading ? '读取中…' : '获取登录二维码' }}
      </NeumorphismButton>
    </div>

    <div v-if="adapter?.connected" class="qq-login-status qq-login-online">
      <span class="qq-dot qq-dot--ok"></span>
      <span>QQ 已连接：{{ adapter.self_id || '已连接' }}</span>
      <span v-if="status?.online"> · {{ status.nickname || '已登录' }}（{{ status.user_id }}）</span>
    </div>
    <div v-else-if="status?.online" class="qq-login-status qq-login-online">
      <span class="qq-dot qq-dot--ok"></span>
      <span>QQ 已登录：{{ status.nickname || '未知昵称' }}（{{ status.user_id }}）</span>
    </div>
    <div v-else class="qq-login-status qq-login-offline">
      <span class="qq-dot qq-dot--warn"></span>
      <span>
        {{
          status === null
            ? '正在检查登录状态…'
            : adapter
              ? `QQ 未连接（适配器 ${adapter.running ? '运行中，无客户端' : '未启动'}），请使用手机 QQ 扫码登录`
              : 'QQ 未登录，请使用手机 QQ 扫码登录'
        }}
      </span>
      <div v-if="status?.error" class="muted">登录状态接口暂不可用：{{ status.error }}</div>
    </div>

    <div v-if="qrUrl" class="qq-login-qr">
      <img :src="qrUrl" alt="QQ 登录二维码" class="qr-img" />
      <div class="muted">二维码约 2 分钟有效，过期请点击"获取登录二维码"刷新</div>
    </div>
    <div v-if="error" class="qq-login-error">{{ error }}</div>
    <div class="muted">QQ 管理员：{{ owner > 0 ? owner : '（未设置）' }}</div>
    <div class="muted">
      WebUI 登录地址：<a :href="webuiUrl" target="_blank" rel="noreferrer">{{ webuiUrl }}</a>
    </div>
  </div>
</template>
