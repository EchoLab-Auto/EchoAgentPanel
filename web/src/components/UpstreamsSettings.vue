//! Core 连接设置页（多上游聚合视图的管理面，2026-10）：
//! 部署零配置——在线增删上游 Core 连接，写回 Panel 配置文件
//! （`[[cores]]` 段）持久化，中继动态并入/摘除。
//!
//! API（Panel 后端本地，不经 Core）：
//! - `GET    /api/upstreams`        → 列表（含在线状态，token 脱敏）
//! - `POST   /api/upstreams`        → 新增/更新
//! - `DELETE /api/upstreams/{name}` → 删除

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import {
  NeumorphismButton,
  NeumorphismInput,
  NeumorphismCard,
  NeumorphismEmpty,
  NeumorphismStatusDot,
  NeumorphismTag,
  NeumorphismSpinner,
} from '@echolab-auto/ui-frame';
import { panelFetch } from '../connection';
import { state } from '../store';
import { removeSessionsOfCore } from '../state';

interface UpstreamStatus {
  name: string;
  url: string;
  token_set: boolean;
  online: boolean;
  connectivity: 'online' | 'connecting' | 'offline';
  auth: 'ok' | 'failed' | 'unknown';
  last_error: string | null;
  last_checked: number;
}

/** 连通性文案与状态点映射。 */
function connectivityMeta(u: UpstreamStatus): { status: 'online' | 'offline' | 'busy'; label: string } {
  switch (u.connectivity) {
    case 'online':
      return { status: 'online', label: '已连接' };
    case 'connecting':
      return { status: 'busy', label: '连接中' };
    default:
      return { status: 'offline', label: '离线' };
  }
}

/** 认证文案与徽标变体。 */
function authMeta(u: UpstreamStatus): { variant: 'success' | 'error' | 'default'; label: string } {
  switch (u.auth) {
    case 'ok':
      return { variant: 'success', label: '认证通过' };
    case 'failed':
      return { variant: 'error', label: '认证失败' };
    default:
      return { variant: 'default', label: u.token_set ? '未验证' : '无令牌' };
  }
}

function formatChecked(unix: number): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString();
}

const list = ref<UpstreamStatus[]>([]);
const loading = ref(false);
const error = ref('');

const showAdd = ref(false);
const editName = ref('');
const formName = ref('');
const formUrl = ref('');
const formToken = ref('');
const formError = ref('');
const saving = ref(false);

async function refresh() {
  loading.value = true;
  error.value = '';
  try {
    const res = await panelFetch('/api/upstreams');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list.value = await res.json();
    // knownCores 与管理面同步（徽标显示/命令路由候选）。
    for (const u of list.value) state.knownCores.add(u.name);
  } catch (e) {
    error.value = `加载失败：${e}`;
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  editName.value = '';
  formName.value = '';
  formUrl.value = '';
  formToken.value = '';
  formError.value = '';
  showAdd.value = true;
}

function openEdit(u: UpstreamStatus) {
  editName.value = u.name;
  formName.value = u.name;
  formUrl.value = u.url;
  formToken.value = '';
  formError.value = '';
  showAdd.value = true;
}

async function save() {
  formError.value = '';
  if (!formName.value.trim()) {
    formError.value = '名称不能为空';
    return;
  }
  saving.value = true;
  try {
    const res = await panelFetch('/api/upstreams', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: formName.value.trim(),
        url: formUrl.value.trim(),
        access_token: formToken.value.trim(),
      }),
    });
    if (!res.ok) {
      formError.value = await res.text();
      return;
    }
    showAdd.value = false;
    await refresh();
  } finally {
    saving.value = false;
  }
}

async function remove(name: string) {
  const res = await panelFetch(`/api/upstreams/${encodeURIComponent(name)}`, { method: 'DELETE' });
  // 侧栏清理：该上游名下会话/活动/选中态一并移除（🟡 修复死会话残留）。
  removeSessionsOfCore(state, name);
  if (!res.ok && res.status !== 404) {
    error.value = `删除失败：HTTP ${res.status}`;
    return;
  }
  if (state.activeCore === name) state.activeCore = null;
  await refresh();
}


onMounted(() => {
  refresh();
  // 健康轮询：连接状态随重连循环实时变化，3s 拉一次保持可视。
  const timer = window.setInterval(refresh, 3000);
  onUnmounted(() => window.clearInterval(timer));
});
</script>

<template>
  <div class="up-page">
    <div class="up-header">
      <div>
        <div class="up-title">Core 连接</div>
        <div class="up-sub">
          Panel 同时连接的上游 Core（聚合视图）。配置写回 Panel 配置文件持久化；
          变更即时生效，无需重启。
        </div>
      </div>
      <div class="up-actions">
        <NeumorphismButton size="small" @click="refresh">刷新</NeumorphismButton>
        <NeumorphismButton size="small" variant="primary" @click="openAdd">添加 Core</NeumorphismButton>
      </div>
    </div>

    <NeumorphismCard v-if="error" variant="pressed" class="up-error-card">{{ error }}</NeumorphismCard>

    <!-- 添加/编辑表单 -->
    <NeumorphismCard v-if="showAdd" class="up-form" :elevation="2">
      <div class="up-form-title">{{ editName ? `编辑「${editName}」` : '添加 Core 连接' }}</div>
      <label class="up-field">
        <span>名称（会话列表徽标 / 命令路由键）</span>
        <NeumorphismInput v-model="formName" :disabled="!!editName" placeholder="workstation" />
      </label>
      <label class="up-field">
        <span>地址（management WS）</span>
        <NeumorphismInput v-model="formUrl" placeholder="ws://192.168.1.10:3132" />
      </label>
      <label class="up-field">
        <span>访问令牌{{ editName ? '（留空 = 不变）' : '（Core management_access_token，可空）' }}</span>
        <NeumorphismInput v-model="formToken" type="password" placeholder="可空" />
      </label>
      <div v-if="formError" class="up-error">{{ formError }}</div>
      <div class="up-form-actions">
        <NeumorphismButton size="small" @click="showAdd = false">取消</NeumorphismButton>
        <NeumorphismButton size="small" variant="primary" :loading="saving" @click="save">保存</NeumorphismButton>
      </div>
    </NeumorphismCard>

    <!-- 列表 -->
    <div class="up-list">
      <NeumorphismEmpty
        v-if="!list.length && !loading"
        size="medium"
        description="尚未配置 Core 连接。点「添加 Core」填入对端 management WS 地址即可上线。"
      />
      <div v-if="loading" class="up-loading"><NeumorphismSpinner size="small" /></div>
      <NeumorphismCard
        v-for="u in list"
        :key="u.name"
        class="up-item"
      >
        <NeumorphismStatusDot :status="connectivityMeta(u).status" size="small" />
        <div class="up-item-main">
          <div class="up-item-name">
            {{ u.name }}
          </div>
          <div class="up-item-url">{{ u.url || '（未配置地址）' }}</div>
          <!-- 健康详情（2026-10 连通性/认证可视性）：固定高度+占位，
               状态变化不引起布局跳动 -->
          <div class="up-item-health">
            <span class="up-health-label">
              <NeumorphismSpinner v-if="u.connectivity === 'connecting'" size="small" class="up-health-spinner" />
              {{ connectivityMeta(u).label }}
            </span>
            <span class="up-health-time">{{ u.last_checked ? `· ${formatChecked(u.last_checked)}` : '' }}</span>
            <div class="up-health-error" :class="{ 'up-health-error--empty': !u.last_error }" :title="u.last_error ?? ''">
              {{ u.last_error ?? '\u00a0' }}
            </div>
          </div>
        </div>
        <NeumorphismTag :variant="authMeta(u).variant" size="small">
          {{ authMeta(u).label }}
        </NeumorphismTag>
        <div class="up-item-actions">
          <NeumorphismButton size="small" @click="openEdit(u)">编辑</NeumorphismButton>
          <NeumorphismButton size="small" @click="remove(u.name)">删除</NeumorphismButton>
        </div>
      </NeumorphismCard>
    </div>
  </div>
</template>

<style scoped>
.up-page { padding: 16px; display: flex; flex-direction: column; gap: 14px; font-size: 13px; }
.up-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.up-title { font-size: 15px; font-weight: 600; }
.up-sub { color: var(--nm-text-secondary, #888); margin-top: 2px; max-width: 520px; }
.up-actions { display: flex; gap: 8px; flex-shrink: 0; }
.up-error-card { padding: 10px 12px; color: var(--nm-error, #d64545); font-size: 12px; }
.up-form { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.up-form-title { font-weight: 600; }
.up-field { display: flex; flex-direction: column; gap: 4px; }
.up-field span { font-size: 12px; color: var(--nm-text-secondary, #888); }
.up-error { color: var(--nm-error, #d64545); font-size: 12px; }
.up-form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.up-list { display: flex; flex-direction: column; gap: 8px; }
.up-loading { display: flex; justify-content: center; padding: 12px; }
.up-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; min-height: 68px; }
.up-item > :first-child { transition: opacity 0.3s ease; }
.up-item--active { outline: 1px solid var(--nm-primary, #4a7dff); }
.up-item-main { flex: 1; min-width: 0; }
.up-item-name { font-weight: 600; display: flex; align-items: center; gap: 8px; }
.up-item-url { font-size: 12px; color: var(--nm-text-secondary, #888); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.up-item-actions { display: flex; gap: 6px; flex-shrink: 0; }

.up-item-health {
  font-size: 12px;
  opacity: 0.75;
  margin-top: 2px;
  min-height: 32px; /* 两行（状态+错误占位）固定高度——无错误时不塌 */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.up-health-label { display: inline-flex; align-items: center; gap: 6px; }
.up-health-spinner { opacity: 0.8; }

.up-health-error {
  color: var(--nm-color-error, #d64545);
  font-size: 11px;
  margin-top: 2px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.up-health-error--empty {
  visibility: hidden; /* 占位但不可见——布局高度保持稳定 */
}

.up-item-name, .up-item-url, .up-item-health {
  transition: color 0.3s ease, opacity 0.3s ease;
}
</style>
