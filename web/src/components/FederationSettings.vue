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

const props = defineProps<{
  activeSessionId?: string | null;
  activeTeamId?: string | null;
}>();

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
/** 自定义工具列表（formAllowAll=false 时生效；换行或逗号分隔）。 */
const formToolsCustom = ref('');
/** 允许的只读查询种类（2026-10）：全选 = ["*"]。 */
const QUERY_KINDS: Array<{ key: string; label: string }> = [
  { key: 'session_snapshot', label: '会话快照（trunk 历史）' },
  { key: 'workspace_files', label: '工作区文件列举' },
  { key: 'workspace_git_status', label: '工作区 git 状态' },
  { key: 'browse_directories', label: '目录浏览（选择器）' },
];
const formQueries = ref<string[]>(QUERY_KINDS.map((k) => k.key));
const formAllowSubagent = ref(true);
/** 需人工确认的调用（命中即拒；空 = 无需确认）。 */
const formRequireConfirm = ref('');
const inviteInput = ref('');

/** 解析自定义列表（换行/逗号分隔，去空、去重）。 */
function parseList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}
// ── 会话迁移（P3-2b）：把当前会话的历史搬到某个在线 peer ──
const migratePeer = ref('');
const onlinePeers = computed(() => peers.value.filter((p: FederationPeerInfo) => p.link === 'Online'));
/** 迁移要求前端持有的当前会话（global 聚合视图无单一归属，不支持）。 */
const canMigrate = computed(
  () =>
    enabled.value &&
    !!props.activeSessionId &&
    props.activeSessionId !== 'global' &&
    peers.value.some((p: FederationPeerInfo) => p.link === 'Online'),
);
function migrateSession() {
  const sessionId = props.activeSessionId;
  if (!sessionId || sessionId === 'global') return;
  const target =
    migratePeer.value ||
    peers.value.find((p: FederationPeerInfo) => p.link === 'Online')?.name;
  if (!target) return;
  sendCommand({
    MigrateSession: {
      session_id: sessionId,
      team_id: props.activeTeamId ?? null,
      target_peer: target,
    },
  });
}
const inviteError = ref('');

// ── 邀请串（本机生成）──
const inviteText = computed(() => state.federationInvite ?? '');
const inviteCopied = ref(false);

function openAdd() {
  editName.value = '';
  formName.value = '';
  formUrl.value = '';
  formToken.value = '';
  // 默认满权限（2026-10）：邀请串即凭证，配对后按互信对待；可在此收紧。
  formAllowAll.value = true;
  formToolsCustom.value = '';
  formQueries.value = QUERY_KINDS.map((k) => k.key);
  formAllowSubagent.value = true;
  formRequireConfirm.value = '';
  inviteInput.value = '';
  inviteError.value = '';
  showAdd.value = true;
}

function openEdit(peer: FederationPeerInfo) {
  editName.value = peer.name;
  formName.value = peer.name;
  formUrl.value = peer.url;
  formToken.value = ''; // 留空 = 保留旧 token
  // 回填现有授权（编辑必须有原值，否则保存即静默重置为默认）。
  const tools = peer.allow_tools ?? [];
  formAllowAll.value = tools.includes('*');
  formToolsCustom.value = formAllowAll.value ? '' : tools.join('\n');
  const queries = peer.allow_queries ?? [];
  formQueries.value = queries.includes('*')
    ? QUERY_KINDS.map((k) => k.key)
    : queries.filter((q) => QUERY_KINDS.some((k) => k.key === q));
  formAllowSubagent.value = peer.allow_subagent ?? true;
  formRequireConfirm.value = (peer.require_confirm ?? []).join('\n');
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
  const queries = formQueries.value;
  sendCommand({
    SaveFederationPeer: {
      peer: {
        name,
        url: formUrl.value.trim(),
        token: formToken.value.trim(),
        token_set: false,
        allow_tools: formAllowAll.value ? ['*'] : parseList(formToolsCustom.value),
        allow_subagent: formAllowSubagent.value,
        require_confirm: parseList(formRequireConfirm.value),
        // 全选（覆盖全部四种）→ 等价 "*"（对端可新增查询种类时自动覆盖）。
        allow_queries:
          queries.length === QUERY_KINDS.length ? ['*'] : queries,
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
          作用于运行区域：{{ state.activeRegion ?? '（未指定）' }}
        </div>
        <div class="fed-sub" v-if="enabled && fed">
          节点 {{ fed.node_name || fed.node_id }}
          <template v-if="fed.listen"> · 监听 {{ fed.listen }}</template>
          · {{ onlineCount }}/{{ peers.length }} 在线
        </div>
        <div class="fed-sub fed-sub--warn" v-else>
          联邦状态不可用——该区域未响应或尚未加载（确认 Core 在线后点「刷新」）
        </div>
      </div>
      <div class="fed-actions" v-if="enabled">
        <button class="fed-btn" @click="refresh">刷新</button>
        <button class="fed-btn" @click="requestInvite">生成邀请</button>
        <button class="fed-btn fed-btn--primary" @click="openAdd">添加 peer</button>
      </div>
    </div>

    <!-- 会话迁移（P3-2b）：导出当前会话事件日志 → 分块搬运到目标 peer -->
    <div class="fed-migrate">
      <div class="fed-migrate__text">
        <div class="fed-migrate__title">迁移当前会话</div>
        <div class="fed-sub">
          会话：
          {{ props.activeSessionId && props.activeSessionId !== 'global' ? props.activeSessionId : '（全局视图无单一会话）' }}
          · 人格：{{ props.activeTeamId ?? '（未指定）' }}
        </div>
      </div>
      <select v-model="migratePeer" class="fed-input fed-migrate__peer">
        <option value="">（自动：首个在线节点）</option>
        <option v-for="peer in onlinePeers" :key="peer.name" :value="peer.name">
          {{ peer.name }}
        </option>
      </select>
      <button class="fed-btn fed-btn--primary" :disabled="!canMigrate" @click="migrateSession">
        迁移
      </button>
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
          <span>允许对端调用本机全部工具（默认满权限；联邦互信 ≈ SSH 免密）</span>
        </label>
        <label v-if="!formAllowAll" class="fed-field fed-field--wide">
          <span>允许的工具（换行/逗号分隔；如 bash、read_file）</span>
          <textarea v-model="formToolsCustom" class="fed-input fed-textarea" rows="3" placeholder="bash&#10;read_file" />
        </label>
        <div class="fed-field fed-field--wide">
          <span>允许的只读查询（跨机工作区/git/浏览所需）</span>
          <div class="fed-checks">
            <label v-for="kind in QUERY_KINDS" :key="kind.key" class="fed-check">
              <input v-model="formQueries" type="checkbox" :value="kind.key" />
              <span>{{ kind.label }}</span>
            </label>
          </div>
        </div>
        <label class="fed-field fed-field--check">
          <input v-model="formAllowSubagent" type="checkbox" />
          <span>接受对端的子代理委派（spawn_subagent node=本机）</span>
        </label>
        <label class="fed-field fed-field--wide">
          <span>需确认的调用（可选；命中即拒，换行/逗号分隔）</span>
          <input v-model="formRequireConfirm" class="fed-input" placeholder="（空 = 无需确认）" />
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
          <template v-if="(p.allow_queries ?? []).includes('*')"> · 全部查询</template>
          <template v-else-if="(p.allow_queries ?? []).length">
            · {{ p.allow_queries.length }} 类查询
          </template>
          <template v-else> · 无查询授权</template>
          <template v-if="p.allow_subagent"> · 接受委派</template>
        </div>
        <div class="fed-peer-actions">
          <button class="fed-btn fed-btn--small" @click="openEdit(p)">编辑</button>
          <button class="fed-btn fed-btn--small fed-btn--danger" @click="deletePeer(p.name)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fed-textarea {
  resize: vertical;
  min-height: 52px;
  font-family: var(--nm-font-mono, monospace);
}
.fed-field--wide {
  grid-column: 1 / -1;
}
.fed-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12px;
}
.fed-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.fed-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13px;
}
.fed-migrate {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 4px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--nm-border-color, rgba(255, 255, 255, 0.1));
}
.fed-migrate__text {
  flex: 1;
  min-width: 0;
}
.fed-migrate__title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--nm-text-primary);
}
.fed-migrate__peer {
  max-width: 180px;
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
