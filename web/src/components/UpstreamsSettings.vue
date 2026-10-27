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
import { computed, onMounted, ref } from 'vue';
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

/** 上游快照的唯一数据源（与连接状态卡共用）。 */
const list = computed(() => state.upstreams);

/**
 * 首屏加载态——**只**用于「列表还没有数据」时的文案。
 *
 * 历史教训（2026-10 修「Core 连接页一直在闪」）：此前每次 `refresh()` 都把它
 * 翻成 true，模板里 `<div v-if="loading">` 于是每 3s 往列表里插一块
 * spinner、300ms 后再摘掉——实测下方 5 张卡片整体上下跳 46px，观感就是整页
 * 一直在闪。现在只有首屏用它，后台轮询完全静默。
 */
const loading = ref(false);
/** 手动刷新中（按钮自己的 loading 态，不占布局）。 */
const refreshing = ref(false);
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

/**
 * 拉一次上游快照。
 *
 * @param opts.silent 静默刷新（列表已在屏上时的重新拉取）：**不动任何加载态**。
 *   原则是「结构没变的刷新不该有 DOM 变更」——加载指示只出现在用户主动触发
 *   的动作上（首屏 / 点刷新 / 保存后），否则就是闪烁。
 */
async function refresh(opts: { silent?: boolean } = {}) {
  if (!opts.silent) {
    if (list.value.length === 0) loading.value = true;
    else refreshing.value = true;
  }
  error.value = '';
  try {
    await refreshUpstreams();
    // knownCores 与管理面同步（徽标显示 / 命令路由候选）。
    for (const u of state.upstreams) state.knownCores.add(u.name);
  } catch (e) {
    error.value = `加载失败：${e}`;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

/** 用户点「刷新」：看得见的动作，给按钮自己的 loading 态。 */
function refreshNow() {
  void refresh();
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
  // 首屏：本地还没有快照时给一次性「读取中」文案；已有则静默补一次。
  void refresh({ silent: list.value.length > 0 });
  // **不在这里起第二条轮询**（2026-10 修闪烁）：`main.ts` 的全局 8s 泵
  // （`startUpstreamsPolling`）已经在维护同一份 `state.upstreams`，页面里
  // 再挂一个 3s 定时器等于把请求量翻近三倍，而且每轮都重渲染整张列表。
  // 要更即时的一次，卡头有「刷新」按钮。
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
        <NeumorphismButton :size="32" :loading="refreshing" @click="refreshNow">刷新</NeumorphismButton>
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

    <!-- 列表：紧凑网格（2026-10 布局改）——每个上游一格，宽屏 2-3 列。
         此前每张卡片独占一整行且内部三行（名称/地址/健康块外加 32px 固定
         占位）≈100px，5 个上游要 500px+，一屏装不下还全是空白。 -->
    <div v-if="!list.length && !loading" class="up-empty">
      <NeumorphismEmpty
        size="medium"
        description="尚未配置 Core 连接。点「添加 Core」填入对端 management WS 地址或 SSH 信息即可上线。"
      />
    </div>
    <div v-else-if="!list.length" class="up-loading-hint">正在读取 Core 连接…</div>
    <div v-else class="up-grid">
      <NeumorphismCard v-for="u in list" :key="u.name" no-padding class="up-item">
        <!-- 第一行：状态点 · 名称 · 来源标签 …… 操作 -->
        <div class="up-item__head">
          <NeumorphismStatusDot :status="connectivityMeta(u).status" size="small" />
          <span class="up-item__name" :title="u.name">{{ u.name }}</span>
          <NeumorphismTag v-if="u.access === 'ssh'" variant="default" size="small">SSH</NeumorphismTag>
          <!-- 自动发现（P2）：由联邦节点目录派生，不是人工配置。
               标签的意义是"我知道它从哪来"——删掉它不影响真实节点，
               下一个巡检周期若它仍在联邦里会被重新发现。 -->
          <NeumorphismTag
            v-if="u.source === 'discovered'"
            variant="success"
            size="small"
            title="由联邦节点目录自动发现（删除后若仍在联邦中会被重新发现）"
          >自动</NeumorphismTag>
          <span class="up-item__grow" />
          <div class="up-item__actions">
            <NeumorphismButton :size="26" @click="openEdit(u)">编辑</NeumorphismButton>
            <NeumorphismButton :size="26" @click="remove(u.name)">删除</NeumorphismButton>
          </div>
        </div>
        <!-- 第二行：地址 · 连通性 · 认证 · 探活时间（单行，地址让位） -->
        <div class="up-item__meta">
          <span class="up-item__url" :title="addressOf(u)">{{ addressOf(u) }}</span>
          <span class="up-item__health" :title="`探活时间 ${formatChecked(u.last_checked) || '—'}`">
            <NeumorphismSpinner v-if="u.connectivity === 'connecting'" size="small" />
            {{ connectivityMeta(u).label }}<template v-if="u.access === 'ssh'">·{{ sshPhaseMeta(u).label }}</template>
          </span>
          <NeumorphismTag :variant="authMeta(u).variant" size="small">{{ authMeta(u).label }}</NeumorphismTag>
        </div>
        <!-- 错误只在真有的时候占一行（占位式隐藏会让卡片高度在有无错误间跳） -->
        <div v-if="u.last_error" class="up-item__err" :title="u.last_error">{{ u.last_error }}</div>
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
/* 紧凑网格（2026-10 布局改）：宽屏一列放 2-3 个上游。
   `minmax(min(100%, 340px), 1fr)` 让窄屏自动退化为单列，不需要媒体查询。 */
.up-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 8px;
  align-items: start;
}
.up-empty { display: flex; justify-content: center; }
.up-loading-hint {
  font-size: 12px;
  color: var(--nm-text-secondary, #888);
  padding: 10px 2px;
}

/* 单个上游：两行（名称行 + 元信息行），错误只在有时加一行。
   高度 ≈ 26（名称行，按钮 26px 撑开）+ 18（元信息行）+ padding 16 ≈ 60px，
   旧的固定 32px 健康占位与 68px min-height 都已去掉。 */
.up-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 10px;
  min-width: 0;
}
.up-item__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.up-item__name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 46%;
}
.up-item__grow { flex: 1 1 auto; min-width: 4px; }
.up-item__actions { display: flex; gap: 4px; flex-shrink: 0; }

.up-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  color: var(--nm-text-secondary, #888);
  /* 标签（20px）比这一行文字高：固定行高免得随标签有无而抖 */
  min-height: 20px;
}
/* 地址是第一让位者：窄了就省略，悬停有全量 */
.up-item__url {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--nm-font-mono, monospace);
  opacity: 0.85;
}
.up-item__health {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  white-space: nowrap;
}
.up-item__err {
  font-size: 11px;
  color: var(--nm-color-error, #d64545);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 窄屏（手机/窄侧栏）：单列，且两行里的次要信息允许换行不挤成一坨 */
@media (max-width: 520px) {
  .up-item__meta { flex-wrap: wrap; row-gap: 2px; }
  .up-item__name { max-width: 40%; }
}
</style>
