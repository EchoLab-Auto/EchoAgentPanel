//! 联邦设置页（federation Phase 4）：peers 列表、链路状态、添加/删除
//! peer、邀请串配对。
//!
//! 协议：`RequestFederationStatus` → `FederationStatus`（状态快照；
//! peer 增删与链路 Up/Down 时 Core 主动广播）；`SaveFederationPeer` /
//! `DeleteFederationPeer` / `RequestFederationInvite`。
//!
//! 配对流（邀请串，推荐）：A 机点「生成邀请」→ 复制串给 B；B 机把串
//! 粘贴进「从邀请串添加」→ 自动解析 url/token → 保存即连。

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { state } from '../store';
import { sendCommand } from '../connection';
import type { BackendCommand } from '../protocol';
import type { FederationPeerInfo } from '../state';

// ── 状态（reduce 注入 state.federation / state.federationInvite）──
const fed = computed(() => state.federation);
const enabled = computed(() => fed.value?.enabled ?? false);
const peers = computed(() => fed.value?.peers ?? []);
const onlineCount = computed(() => peers.value.filter((p: FederationPeerInfo) => p.link === 'Online').length);

// ── 添加/编辑表单 ──
const showAdd = ref(false);
const editName = ref('');
const formName = ref('');
const formUrl = ref('');
const formToken = ref('');
const formAllowAll = ref(true);
const inviteInput = ref('');
const inviteError = ref('');

// ── 邀请串（本机生成）──
const inviteText = computed(() => state.federationInvite ?? '');
const inviteCopied = ref(false);

function openAdd() {
  editName.value = '';
  formName.value = '';
  formUrl.value = '';
  formToken.value = '';
  formAllowAll.value = true;
  inviteInput.value = '';
  inviteError.value = '';
  showAdd.value = true;
}

function openEdit(name: string, url: string) {
  editName.value = name;
  formName.value = name;
  formUrl.value = url;
  formToken.value = ''; // 留空 = 保留旧 token
  formAllowAll.value = true;
  showAdd.value = true;
}

// 解析 echofed:// 邀请串填入表单（与 echo-federation invite.rs 同规则：
// echofed://host:port?name=<别名>#<token>）。
function applyInvite() {
  inviteError.value = '';
  const raw = inviteInput.value.trim();
  if (!raw.startsWith('echofed://')) {
    inviteError.value = '不是 echofed:// 邀请串';
    return;
  }
  const hash = raw.indexOf('#');
  if (hash < 0 || hash === raw.length - 1) {
    inviteError.value = '邀请串缺少 #<token>';
    return;
  }
  const token = raw.slice(hash + 1).trim();
  const before = raw.slice('echofed://'.length, hash);
  const [hostPort, query] = before.split('?');
  const hp = hostPort.replace(/\/+$/, '');
  if (!hp.includes(':')) {
    inviteError.value = '邀请串 host:port 非法';
    return;
  }
  formUrl.value = `ws://${hp}`;
  formToken.value = token;
  const nameParam = query?.split('&').find((kv) => kv.startsWith('name='));
  if (nameParam && !formName.value) {
    formName.value = decodeURIComponent(nameParam.slice(5));
  }
  if (!formName.value) formName.value = hp.split(':')[0];
}

function savePeer() {
  const name = formName.value.trim();
  if (!name) {
    inviteError.value = 'peer 名称不能为空';
    return;
  }
  sendCommand({
    SaveFederationPeer: {
      peer: {
        name,
        url: formUrl.value.trim(),
        token: formToken.value.trim(),
        token_set: false,
        allow_tools: formAllowAll.value ? ['*'] : [],
        allow_subagent: true,
        require_confirm: [],
        link: 'Offline',
      },
    },
  } as unknown as BackendCommand);
  showAdd.value = false;
}

function deletePeer(name: string) {
  sendCommand({ DeleteFederationPeer: { name } } as unknown as BackendCommand);
}

function requestInvite() {
  sendCommand({ RequestFederationInvite: null } as unknown as BackendCommand);
}

async function copyInvite() {
  if (!inviteText.value) return;
  try {
    await navigator.clipboard.writeText(inviteText.value);
    inviteCopied.value = true;
    setTimeout(() => (inviteCopied.value = false), 1500);
  } catch {
    /* 剪贴板不可用时用户自行选择复制 */
  }
}

function refresh() {
  sendCommand({ RequestFederationStatus: null } as unknown as BackendCommand);
}

onMounted(refresh);
onUnmounted(() => {
  state.federationInvite = null;
});
</script>

<template>
  <div class="fed-page">
    <div class="fed-header">
      <div>
        <div class="fed-title">联邦网络</div>
        <div class="fed-sub" v-if="state.knownCores.size > 0">
          作用于上游 core：{{ state.activeCore ?? '（未指定）' }}
        </div>
        <div class="fed-sub" v-if="enabled && fed">
          节点 {{ fed.node_name || fed.node_id }}
          <template v-if="fed.listen"> · 监听 {{ fed.listen }}</template>
          · {{ onlineCount }}/{{ peers.length }} 在线
        </div>
        <div class="fed-sub fed-sub--warn" v-else>
          联邦未启用——在 Core 配置中设置 [federation] enabled = true 后重启
        </div>
      </div>
      <div class="fed-actions" v-if="enabled">
        <button class="fed-btn" @click="refresh">刷新</button>
        <button class="fed-btn" @click="requestInvite">生成邀请</button>
        <button class="fed-btn fed-btn--primary" @click="openAdd">添加 peer</button>
      </div>
    </div>

    <!-- 邀请串输出 -->
    <div v-if="inviteText" class="fed-invite">
      <div class="fed-invite-label">
        邀请串（含共享密钥，按 SSH 密钥同等级保密；发给对端粘贴即可配对）
      </div>
      <div class="fed-invite-row">
        <code class="fed-invite-text">{{ inviteText }}</code>
        <button class="fed-btn" @click="copyInvite">{{ inviteCopied ? '已复制' : '复制' }}</button>
      </div>
    </div>

    <!-- 添加/编辑表单 -->
    <div v-if="showAdd" class="fed-form">
      <div class="fed-form-title">{{ editName ? `编辑 peer「${editName}」` : '添加 peer' }}</div>
      <div class="fed-form-invite">
        <input
          v-model="inviteInput"
          class="fed-input"
          placeholder="粘贴 echofed:// 邀请串自动填充（推荐）"
          @input="applyInvite"
        />
      </div>
      <div class="fed-form-grid">
        <label class="fed-field">
          <span>名称</span>
          <input v-model="formName" class="fed-input" :disabled="!!editName" placeholder="gpu-box" />
        </label>
        <label class="fed-field">
          <span>地址（留空 = 仅接受对方连入）</span>
          <input v-model="formUrl" class="fed-input" placeholder="ws://192.168.1.20:3133" />
        </label>
        <label class="fed-field">
          <span>共享密钥{{ editName ? '（留空 = 不变）' : '' }}</span>
          <input v-model="formToken" class="fed-input" placeholder="与对端一致" />
        </label>
        <label class="fed-field fed-field--check">
          <input v-model="formAllowAll" type="checkbox" />
          <span>允许对端调用本机全部工具（联邦互信 ≈ SSH 免密，谨慎开启）</span>
        </label>
      </div>
      <div v-if="inviteError" class="fed-error">{{ inviteError }}</div>
      <div class="fed-form-actions">
        <button class="fed-btn" @click="showAdd = false">取消</button>
        <button class="fed-btn fed-btn--primary" @click="savePeer">保存</button>
      </div>
    </div>

    <!-- peers 列表 -->
    <div v-if="enabled" class="fed-list">
      <div v-if="!peers.length" class="fed-empty">
        尚未配置 peer。点「生成邀请」把本机串发给对端，或「添加 peer」粘贴对端的邀请串。
      </div>
      <div v-for="p in peers" :key="p.name" class="fed-peer">
        <span
          class="fed-dot"
          :class="p.link === 'Online' ? 'fed-dot--online' : 'fed-dot--offline'"
          :title="p.link === 'Online' ? '在线' : '离线'"
        />
        <div class="fed-peer-main">
          <div class="fed-peer-name">{{ p.name }}</div>
          <div class="fed-peer-url">{{ p.url || '（仅接受连入）' }}</div>
        </div>
        <div class="fed-peer-meta">
          {{ p.token_set ? '已配置密钥' : '无密钥' }}
          <template v-if="p.allow_tools.includes('*')"> · 全部工具</template>
          <template v-else-if="p.allow_tools.length"> · {{ p.allow_tools.length }} 工具</template>
          <template v-else> · 无工具授权</template>
        </div>
        <div class="fed-peer-actions">
          <button class="fed-btn fed-btn--small" @click="openEdit(p.name, p.url)">编辑</button>
          <button class="fed-btn fed-btn--small fed-btn--danger" @click="deletePeer(p.name)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fed-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13px;
}
.fed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.fed-title {
  font-size: 15px;
  font-weight: 600;
}
.fed-sub {
  color: var(--nf-text-secondary, #888);
  margin-top: 2px;
}
.fed-sub--warn {
  color: var(--nf-warning, #b8860b);
}
.fed-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.fed-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--nf-border, #4444);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}
.fed-btn--primary {
  background: var(--nf-primary, #4a7dff);
  color: #fff;
  border-color: transparent;
}
.fed-btn--danger {
  color: var(--nf-danger, #d64545);
}
.fed-btn--small {
  padding: 3px 8px;
}
.fed-invite,
.fed-form {
  border: 1px solid var(--nf-border, #4444);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fed-invite-label {
  color: var(--nf-text-secondary, #888);
  font-size: 12px;
}
.fed-invite-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.fed-invite-text {
  flex: 1;
  word-break: break-all;
  font-size: 12px;
  background: var(--nf-bg-inset, #0002);
  padding: 6px 8px;
  border-radius: 6px;
}
.fed-form-title {
  font-weight: 600;
}
.fed-form-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fed-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.fed-field span {
  font-size: 12px;
  color: var(--nf-text-secondary, #888);
}
.fed-field--check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.fed-input {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--nf-border, #4444);
  background: var(--nf-bg-inset, #0001);
  font-size: 12px;
}
.fed-error {
  color: var(--nf-danger, #d64545);
  font-size: 12px;
}
.fed-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.fed-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fed-empty {
  color: var(--nf-text-secondary, #888);
  padding: 20px;
  text-align: center;
}
.fed-peer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--nf-border, #4443);
  border-radius: 8px;
}
.fed-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fed-dot--online {
  background: var(--nf-success, #3aa655);
}
.fed-dot--offline {
  background: var(--nf-text-secondary, #999);
}
.fed-peer-main {
  flex: 1;
  min-width: 0;
}
.fed-peer-name {
  font-weight: 600;
}
.fed-peer-url {
  font-size: 12px;
  color: var(--nf-text-secondary, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fed-peer-meta {
  font-size: 12px;
  color: var(--nf-text-secondary, #888);
  flex-shrink: 0;
}
.fed-peer-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
