//! 「Core 连接」页 · 上游区块（多上游聚合视图的管理面，2026-10）：
//! 部署零配置——在线增删上游 Core 连接，写回 Panel 配置文件
//! （`[[cores]]` 段）持久化，中继动态并入/摘除。
//! 2026-10 末：与联邦区块（FederationSettings）合并进同一「Core 连接」页展示；
//! 同期新增 **SSH 接入**（云服务器只开 SSH 端口时，面板经 SSH 隧道接入
//! Core；隧道由 Panel 后端自动建立/重连，媒体与日志同走该通道）。
//!
//! API（Panel 后端本地，不经 Core）：
//! - `GET    /api/upstreams`        → 列表（含在线状态与 SSH 隧道阶段，凭据脱敏）
//! - `POST   /api/upstreams`        → 新增/更新（`ssh` 段出现即 SSH 接入）
//! - `DELETE /api/upstreams/{name}` → 删除

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import NeumorphismEmpty from '@echolab-auto/ui-frame/components/NeumorphismEmpty';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismSegmented from '@echolab-auto/ui-frame/components/NeumorphismSegmented';
import NeumorphismSpinner from '@echolab-auto/ui-frame/components/NeumorphismSpinner';
import NeumorphismStatusDot from '@echolab-auto/ui-frame/components/NeumorphismStatusDot';
import NeumorphismTag from '@echolab-auto/ui-frame/components/NeumorphismTag';
import { panelFetch } from '../connection';
import { state } from '../store';
import { removeSessionsOfCore, type UpstreamStatus } from '../state';
import { refreshUpstreams } from '../upstreams';

type AccessMode = 'direct' | 'ssh';

const ACCESS_OPTIONS = [
  { label: '直连', value: 'direct' },
  { label: 'SSH 隧道', value: 'ssh' },
];

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

/** SSH 隧道阶段文案（仅 SSH 接入且有状态时展示）。 */
function sshPhaseMeta(u: UpstreamStatus): { status: 'online' | 'offline' | 'busy'; label: string } {
  switch (u.ssh?.phase) {
    case 'online':
      return { status: 'online', label: '隧道已连接' };
    case 'connecting':
      return { status: 'busy', label: '隧道连接中' };
    default:
      return { status: 'offline', label: '隧道离线' };
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

/** 列表行地址展示：直连 = WS 地址；SSH = ssh://… → 远端 management 端口。 */
function addressOf(u: UpstreamStatus): string {
  if (u.access === 'ssh' && u.ssh) {
    return `ssh://${u.ssh.user}@${u.ssh.host}:${u.ssh.port} → 127.0.0.1:${u.ssh.remote_port}`;
  }
  return u.url || '（未配置地址）';
}

// 与连接状态卡共用同一份轮询结果（单一数据源）。
const list = computed(() => state.upstreams);
const loading = ref(false);
const error = ref('');

const showAdd = ref(false);
const editName = ref('');
const formName = ref('');
const formAccess = ref<AccessMode>('direct');
const formUrl = ref('');
const formToken = ref('');
// SSH 段
const formSshHost = ref('');
const formSshPort = ref('22');
const formSshUser = ref('');
const formSshIdentity = ref('');
const formSshPassword = ref('');
const formSshRemotePort = ref('3132');
const formSshMediaDir = ref('');
const formError = ref('');
const saving = ref(false);

async function refresh() {
  loading.value = true;
  error.value = '';
  try {
    await refreshUpstreams();
    // knownCores 与管理面同步（徽标显示/命令路由候选）。
    for (const u of state.upstreams) state.knownCores.add(u.name);
    if (state.upstreams.length === 0) error.value = '（未配置上游）';
  } catch (e) {
    error.value = `加载失败：${e}`;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formName.value = '';
  formAccess.value = 'direct';
  formUrl.value = '';
  formToken.value = '';
  formSshHost.value = '';
  formSshPort.value = '22';
  formSshUser.value = '';
  formSshIdentity.value = '';
  formSshPassword.value = '';
  formSshRemotePort.value = '3132';
  formSshMediaDir.value = '';
  formError.value = '';
}

function openAdd() {
  editName.value = '';
  resetForm();
  showAdd.value = true;
}

function openEdit(u: UpstreamStatus) {
  editName.value = u.name;
  resetForm();
  formName.value = u.name;
  formAccess.value = u.access === 'ssh' ? 'ssh' : 'direct';
  formUrl.value = u.url;
  if (u.ssh) {
    formSshHost.value = u.ssh.host;
    formSshPort.value = String(u.ssh.port);
    formSshUser.value = u.ssh.user;
    formSshIdentity.value = u.ssh.identity_file;
    formSshRemotePort.value = String(u.ssh.remote_port);
    formSshMediaDir.value = u.ssh.remote_media_dir;
  }
  showAdd.value = true;
}

/** 端口解析（1-65535；非法返回 null）。 */
function parsePort(value: string, fallback: number): number | null {
  const n = Number(value.trim() || String(fallback));
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
  return n;
}

async function save() {
  formError.value = '';
  if (!formName.value.trim()) {
    formError.value = '名称不能为空';
    return;
  }
  let sshPayload: Record<string, unknown> | null = null;
  if (formAccess.value === 'ssh') {
    if (!formSshHost.value.trim()) {
      formError.value = 'SSH 主机不能为空';
      return;
    }
    if (!formSshUser.value.trim()) {
      formError.value = 'SSH 用户不能为空';
      return;
    }
    const sshPort = parsePort(formSshPort.value, 22);
    if (sshPort === null) {
      formError.value = 'SSH 端口须为 1-65535';
      return;
    }
    const remotePort = parsePort(formSshRemotePort.value, 3132);
    if (remotePort === null) {
      formError.value = '远端 management 端口须为 1-65535';
      return;
    }
    sshPayload = {
      host: formSshHost.value.trim(),
      port: sshPort,
      user: formSshUser.value.trim(),
      identity_file: formSshIdentity.value.trim(),
      password: formSshPassword.value,
      remote_port: remotePort,
      remote_media_dir: formSshMediaDir.value.trim(),
    };
  }
  saving.value = true;
  try {
    const res = await panelFetch('/api/upstreams', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: formName.value.trim(),
        url: formAccess.value === 'direct' ? formUrl.value.trim() : '',
        access_token: formToken.value.trim(),
        ssh: sshPayload,
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
  if (state.activeRegion === name) state.activeRegion = null;
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
        <div class="up-title">上游 Core</div>
        <div class="up-sub">
          Panel 同时连接的上游 Core（聚合视图）。配置写回 Panel 配置文件持久化；
          变更即时生效，无需重启。云服务器只开 SSH 端口时选「SSH 隧道」接入。
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
      <div class="up-field">
        <span>接入方式</span>
        <NeumorphismSegmented v-model="formAccess" :options="ACCESS_OPTIONS" size="small" />
      </div>

      <template v-if="formAccess === 'direct'">
        <label class="up-field">
          <span>地址（management WS）</span>
          <NeumorphismInput v-model="formUrl" placeholder="ws://192.168.1.10:3132" />
        </label>
      </template>
      <template v-else>
        <div class="up-row">
          <label class="up-field up-row__grow">
            <span>SSH 主机</span>
            <NeumorphismInput v-model="formSshHost" placeholder="203.0.113.7" />
          </label>
          <label class="up-field up-row__port">
            <span>SSH 端口</span>
            <NeumorphismInput v-model="formSshPort" placeholder="22" />
          </label>
        </div>
        <label class="up-field">
          <span>SSH 用户（须为运行 Core 的用户）</span>
          <NeumorphismInput v-model="formSshUser" placeholder="root" />
        </label>
        <label class="up-field">
          <span>私钥文件（可空 = ssh-agent / 默认密钥；支持 ~）</span>
          <NeumorphismInput v-model="formSshIdentity" placeholder="~/.ssh/id_ed25519" />
        </label>
        <label class="up-field">
          <span>私钥口令或密码{{ editName ? '（留空 = 不变）' : '（可空；密钥优先）' }}</span>
          <NeumorphismInput v-model="formSshPassword" type="password" placeholder="可空" />
        </label>
        <div class="up-row">
          <label class="up-field up-row__port">
            <span>远端 management 端口</span>
            <NeumorphismInput v-model="formSshRemotePort" placeholder="3132" />
          </label>
          <label class="up-field up-row__grow">
            <span>远端媒体目录（可空 = 默认）</span>
            <NeumorphismInput v-model="formSshMediaDir" placeholder="~/.local/share/echo-agent-core/media" />
          </label>
        </div>
        <div class="up-hint">
          Panel 经 SSH 隧道接入 Core：隧道自动重连；远端 Core 的聊天图片与日志
          也经该通道读取（需 SSH 用户对 Core 数据可读）。
        </div>
      </template>

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
        description="尚未配置 Core 连接。点「添加 Core」填入对端 management WS 地址或 SSH 信息即可上线。"
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
            <NeumorphismTag v-if="u.access === 'ssh'" variant="default" size="small">SSH</NeumorphismTag>
            <!-- 自动发现（P2）：由联邦节点目录派生，不是人工配置。
                 标签的意义是"我知道它从哪来"——删掉它不会影响真实节点，
                 下一个巡检周期若它仍在联邦里会被重新发现。 -->
            <NeumorphismTag
              v-if="u.source === 'discovered'"
              variant="success"
              size="small"
              title="由联邦节点目录自动发现（删除后若仍在联邦中会被重新发现）"
            >自动</NeumorphismTag>
          </div>
          <div class="up-item-url">{{ addressOf(u) }}</div>
          <!-- 健康详情（2026-10 连通性/认证可视性）：固定高度+占位，
               状态变化不引起布局跳动 -->
          <div class="up-item-health">
            <span class="up-health-label">
              <NeumorphismSpinner v-if="u.connectivity === 'connecting'" size="small" class="up-health-spinner" />
              {{ connectivityMeta(u).label }}
              <template v-if="u.access === 'ssh'">· {{ sshPhaseMeta(u).label }}</template>
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
.up-error-card { padding: 10px 12px; color: var(--nm-color-error); font-size: 12px; }
.up-form { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.up-form-title { font-weight: 600; }
.up-field { display: flex; flex-direction: column; gap: 4px; }
.up-field span { font-size: 12px; color: var(--nm-text-secondary, #888); }
.up-row { display: flex; gap: 10px; align-items: flex-end; }
.up-row__grow { flex: 1; min-width: 0; }
.up-row__port { width: 140px; flex-shrink: 0; }
.up-hint { font-size: 12px; color: var(--nm-text-secondary, #888); line-height: 1.5; }
.up-error { color: var(--nm-color-error); font-size: 12px; }
.up-form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.up-list { display: flex; flex-direction: column; gap: 8px; }
.up-loading { display: flex; justify-content: center; padding: 12px; }
.up-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; min-height: 68px; }
.up-item > :first-child { transition: opacity 0.3s ease; }
.up-item--active { outline: 1px solid var(--nm-primary-color); }
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
