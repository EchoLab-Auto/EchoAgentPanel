//! 联邦网络（Core ↔ Core）：以 **Core** 为单位的组网管理。
//!
//! 2026-10 校正：联邦是 **Core 之间**的事（peer 链路、邀请串、授权都随
//! Core 配置走），管理面不应跟随"当前选中的 Agent / 运行区域"。本页为
//! 每个上游 Core 各展示一张卡片（节点身份 / 监听地址 / peer 列表 / 邀请
//! 串），并提供「跨 Core 配对」：选定两个 Core 后一键完成
//! 邀请（一侧生成）→ 接入（另一侧添加 peer 并主动连接）。
//!
//! 命令路由：联邦命令全部**显式定向**到目标 Core（`sendCommand(cmd, core)`：
//! 多上游由中继包 `{core, frame}` 定向；单上游无壳直发）。状态按来源 core
//! 归档在 `state.federations` / `state.federationInvites`（reducer 注入）。
//!
//! 手动配对流（等价于跨 Core 配对的两步）：A 点「生成邀请」→ 复制串给 B；
//! B「添加 peer」粘贴串 → 自动解析 url/token → 保存即连。

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCheckbox,
  NeumorphismInput,
  NeumorphismSelect,
  NeumorphismStatusDot,
  NeumorphismTextarea,
} from '@echolab-auto/ui-frame';
import { state } from '../store';
import { sendCommand } from '../connection';
import { currentRegion } from '../state';
import type { BackendCommand } from '../protocol';
import type { FederationPeerInfo, FederationStatus } from '../state';

const props = defineProps<{
  activeSessionId?: string | null;
  activeTeamId?: string | null;
}>();

// ── Core 目标解析 ──
/** 多上游 = 命令必须显式定向；单上游走无壳直发（与中继语义一致）。 */
const multi = computed(() => state.upstreams.length > 1);

/** 发一条命令到指定 Core（单上游/空名 → 无壳直发）。 */
function sendTo(core: string, cmd: BackendCommand) {
  const target = multi.value && core ? core : undefined;
  if (target) sendCommand(cmd, target);
  else sendCommand(cmd);
}

/** Core 列表（来自 Panel 已配置的上游；尚未拉到清单时留一个占位卡片）。 */
const coreList = computed<Array<{ name: string; online: boolean }>>(() => {
  if (state.upstreams.length) {
    return state.upstreams.map((u) => ({ name: u.name, online: u.connectivity === 'online' }));
  }
  return [{ name: '', online: true }];
});

/** 某 Core 的联邦状态（按来源 core 归档；单上游回落唯一桶）。 */
function fedOf(core: string): FederationStatus | null {
  const exact = state.federations[core];
  if (exact) return exact;
  if (multi.value) return null;
  return Object.values(state.federations)[0] ?? null;
}

/** 某 Core 最近生成的邀请串。 */
function inviteOf(core: string): string {
  const exact = state.federationInvites[core];
  if (exact) return exact;
  if (multi.value) return '';
  const values = Object.values(state.federationInvites);
  return values.length === 1 ? values[0] : '';
}

/** 卡片数据（一次算好，避免模板里反复调用函数）。 */
const cards = computed(() =>
  coreList.value.map((c) => {
    const fed = fedOf(c.name);
    return {
      name: c.name,
      label: c.name || '（当前 Core）',
      online: c.online,
      fed,
      enabled: fed?.enabled ?? false,
      peers: fed?.peers ?? [],
      invite: inviteOf(c.name),
      onlinePeers: (fed?.peers ?? []).filter((p) => p.link === 'Online').length,
    };
  }),
);

function refreshCore(core: string) {
  sendTo(core, { RequestFederationStatus: null } as unknown as BackendCommand);
}

function refreshAll() {
  if (state.upstreams.length) state.upstreams.forEach((u) => refreshCore(u.name));
  else refreshCore('');
}

onMounted(refreshAll);
// 上游清单是异步轮询来的：首次到达时补一次全量刷新。
watch(
  () => state.upstreams.length,
  (n, prev) => {
    if (n > 0 && n !== prev) refreshAll();
  },
);

// ── 邀请串 ──
function requestInvite(core: string) {
  sendTo(core, { RequestFederationInvite: null } as unknown as BackendCommand);
}

const copiedCore = ref('');
async function copyInvite(core: string) {
  const text = inviteOf(core);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedCore.value = core;
    window.setTimeout(() => {
      if (copiedCore.value === core) copiedCore.value = '';
    }, 1500);
  } catch {
    /* 剪贴板不可用时用户自行选择复制 */
  }
}

// ── 跨 Core 配对（一键）──
const pairLeft = ref(''); // 邀请方（被连入；需被接入方网络可达）
const pairRight = ref(''); // 接入方（主动连接）
const pairing = ref(false);
const pairStatus = ref('');
const pairError = ref('');

const pairOptions = computed(() =>
  coreList.value.filter((c) => c.name).map((c) => ({ label: c.name, value: c.name })),
);

/** 默认选中前两个 Core（可在选择器里改方向；⇄ 交换）。 */
watch(
  pairOptions,
  (opts) => {
    const names = opts.map((o) => o.value);
    if (!pairLeft.value && names[0]) pairLeft.value = names[0];
    if (!pairRight.value && names[1]) pairRight.value = names[1];
  },
  { immediate: true },
);

function swapPair() {
  const t = pairLeft.value;
  pairLeft.value = pairRight.value;
  pairRight.value = t;
}

/** 等待某 Core 返回**新的**邀请串（事件异步到达；超时返回 null）。 */
function waitForInvite(core: string, before: string, ms: number): Promise<string | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const cur = inviteOf(core);
      if (cur && cur !== before) return resolve(cur);
      if (Date.now() - start >= ms) return resolve(null);
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

async function pairCores() {
  const a = pairLeft.value;
  const b = pairRight.value;
  pairStatus.value = '';
  pairError.value = '';
  if (!a || !b) {
    pairError.value = '请先选择两个 Core（在「上游 Core」里确认都已配置）';
    return;
  }
  if (a === b) {
    pairError.value = '请选择两个不同的 Core';
    return;
  }
  pairing.value = true;
  try {
    const before = inviteOf(a);
    requestInvite(a);
    const invite = await waitForInvite(a, before, 8000);
    if (!invite) {
      pairError.value = `「${a}」未返回邀请串——确认该 Core 在线且联邦功能正常`;
      return;
    }
    const parsed = parseInvite(invite);
    if (!parsed) {
      pairError.value = '邀请串解析失败（须为 echofed://host:port…#token）';
      return;
    }
    // 在接入方登记邀请方为 peer：保存即触发对方主动连接。
    // 邀请串即凭证 → 默认满权限（可在卡片里随时收紧）。
    sendTo(b, {
      SaveFederationPeer: {
        peer: {
          name: a || parsed.name || 'peer',
          url: parsed.url,
          token: parsed.token,
          token_set: false,
          allow_tools: ['*'],
          allow_subagent: true,
          require_confirm: [],
          allow_queries: ['*'],
          link: 'Offline',
        },
      },
    } as unknown as BackendCommand);
    pairStatus.value = `已发起：「${a}」生成邀请 →「${b}」接入连接；数秒内两侧 peer 应转为在线（可点卡片「刷新」查看）。`;
  } finally {
    pairing.value = false;
  }
}

// ── 添加/编辑表单（作用于指定 Core）──
const showAdd = ref(false);
const formCore = ref('');
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
const inviteError = ref('');

/** 查询授权勾选（库 Checkbox 为布尔模型；数组语义在本层维护）。 */
function toggleQuery(key: string, checked: boolean) {
  if (checked) {
    if (!formQueries.value.includes(key)) formQueries.value = [...formQueries.value, key];
  } else {
    formQueries.value = formQueries.value.filter((k) => k !== key);
  }
}

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

function openAdd(core: string) {
  formCore.value = core;
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

function openEdit(core: string, peer: FederationPeerInfo) {
  formCore.value = core;
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
  inviteInput.value = '';
  inviteError.value = '';
  showAdd.value = true;
}

function savePeer() {
  const name = formName.value.trim();
  if (!name) {
    inviteError.value = 'peer 名称不能为空';
    return;
  }
  const queries = formQueries.value;
  sendTo(formCore.value, {
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
        allow_queries: queries.length === QUERY_KINDS.length ? ['*'] : queries,
        link: 'Offline',
      },
    },
  } as unknown as BackendCommand);
  showAdd.value = false;
}

function deletePeer(core: string, name: string) {
  sendTo(core, { DeleteFederationPeer: { name } } as unknown as BackendCommand);
}

// ── 邀请串解析（与 echo-federation invite.rs 同规则：
//    echofed://host:port?name=<别名>#<token>）──
function parseInvite(raw: string): { url: string; token: string; name: string | null } | null {
  const text = raw.trim();
  if (!text.startsWith('echofed://')) return null;
  const hash = text.indexOf('#');
  if (hash < 0 || hash === text.length - 1) return null;
  const token = text.slice(hash + 1).trim();
  if (!token) return null;
  const before = text.slice('echofed://'.length, hash);
  const [hostPortRaw, query] = before.split('?');
  const hp = (hostPortRaw ?? '').replace(/\/+$/, '');
  if (!hp.includes(':')) return null;
  const nameParam = query?.split('&').find((kv) => kv.startsWith('name='));
  let name: string | null = null;
  if (nameParam) {
    try {
      name = decodeURIComponent(nameParam.slice(5));
    } catch {
      name = nameParam.slice(5);
    }
  }
  return { url: `ws://${hp}`, token, name };
}

/** 解析 echofed:// 邀请串填入表单。 */
function applyInvite() {
  inviteError.value = '';
  const parsed = parseInvite(inviteInput.value);
  if (!parsed) {
    inviteError.value = '不是合法的 echofed:// 邀请串（缺 host:port 或 #token）';
    return;
  }
  formUrl.value = parsed.url;
  formToken.value = parsed.token;
  if (!formName.value) {
    formName.value = parsed.name || parsed.url.replace(/^ws:\/\//, '').split(':')[0];
  }
}

// ── 会话迁移（会话级操作；作用于当前会话所属 Core 的在线 peer）──
const migratePeer = ref('');
/** 会话所属 Core（= 当前运行区域；迁移命令按会话路由）。 */
const sessionCore = computed(() => currentRegion(state) ?? '');
const sessionFed = computed(() => fedOf(sessionCore.value));
const onlinePeers = computed(() =>
  (sessionFed.value?.peers ?? []).filter((p: FederationPeerInfo) => p.link === 'Online'),
);
/** 迁移目标下拉（库 Select options；空值 = 自动选首个在线节点）。 */
const migrateOptions = computed(() => [
  { label: '（自动：首个在线节点）', value: '' },
  ...onlinePeers.value.map((p) => ({ label: p.name, value: p.name })),
]);
/** 迁移要求前端持有的当前会话（global 聚合视图无单一归属，不支持）。 */
const canMigrate = computed(
  () =>
    !!sessionFed.value?.enabled &&
    !!props.activeSessionId &&
    props.activeSessionId !== 'global' &&
    onlinePeers.value.length > 0,
);

function migrateSession() {
  const sessionId = props.activeSessionId;
  if (!sessionId || sessionId === 'global') return;
  const target = migratePeer.value || onlinePeers.value[0]?.name;
  if (!target) return;
  sendCommand({
    MigrateSession: {
      session_id: sessionId,
      team_id: props.activeTeamId ?? null,
      target_peer: target,
    },
  });
}
</script>

<template>
  <div class="fed-page">
    <div class="fed-header">
      <div>
        <div class="fed-title">联邦网络</div>
        <div class="fed-sub">
          Core ↔ Core 直连组网：下方每个 Core 各一份状态与邀请串，或用「跨 Core
          配对」一键互联——与当前选中的 Agent / 运行区域无关。
        </div>
      </div>
      <div class="fed-actions">
        <NeumorphismButton
          size="small"
          variant="glass"
          class="fed-btn fed-refresh"
          @click="refreshAll"
        >
          刷新全部
        </NeumorphismButton>
      </div>
    </div>

    <!-- 跨 Core 配对：选定两个 Core，一键完成 邀请（一侧）→ 接入（另一侧） -->
    <div class="fed-pair">
      <div class="fed-pair__title">跨 Core 配对</div>
      <div class="fed-pair__row">
        <label class="fed-field fed-pair__field">
          <span>邀请方（被连入；需被接入方网络可达）</span>
          <NeumorphismSelect
            v-model="pairLeft"
            class="fed-input"
            size="small"
            :options="pairOptions"
            placeholder="选择 Core"
          />
        </label>
        <NeumorphismButton
          size="small"
          variant="glass"
          class="fed-btn fed-pair__swap"
          @click="swapPair"
        >
          ⇄ 交换
        </NeumorphismButton>
        <label class="fed-field fed-pair__field">
          <span>接入方（主动连接；负责到达邀请方）</span>
          <NeumorphismSelect
            v-model="pairRight"
            class="fed-input"
            size="small"
            :options="pairOptions"
            placeholder="选择 Core"
          />
        </label>
        <NeumorphismButton
          size="small"
          variant="primary"
          class="fed-btn fed-btn--primary fed-pair__go"
          :disabled="pairing || pairOptions.length < 2"
          @click="pairCores"
        >
          {{ pairing ? '配对中…' : '开始配对' }}
        </NeumorphismButton>
      </div>
      <div v-if="pairError" class="fed-error">{{ pairError }}</div>
      <div v-else-if="pairStatus" class="fed-sub fed-pair__status">{{ pairStatus }}</div>
      <div v-else class="fed-sub">
        方向说明：邀请方需能被接入方访问到——内网 / NAT 后的 Core 适合做「接入方」主动连向对端。
      </div>
    </div>

    <!-- 每个 Core 一张卡片 -->
    <div class="fed-cores">
      <div v-for="c in cards" :key="c.name || '(core)'" class="fed-core">
        <div class="fed-core__head">
          <span class="fed-dot">
            <NeumorphismStatusDot :status="c.online ? 'online' : 'offline'" size="small" />
          </span>
          <div class="fed-core__id">
            <div class="fed-core__name">{{ c.label }}</div>
            <div v-if="c.fed" class="fed-sub">
              节点 {{ c.fed.node_name || c.fed.node_id }}
              <template v-if="c.fed.listen"> · 监听 {{ c.fed.listen }}</template>
              · {{ c.onlinePeers }}/{{ c.peers.length }} peer 在线
            </div>
            <div v-else class="fed-sub fed-sub--warn">
              联邦状态未加载（点「刷新」重试；Core 离线时不可用）
            </div>
          </div>
          <div class="fed-core__actions">
            <NeumorphismButton
              size="small"
              variant="glass"
              class="fed-btn fed-refresh-core"
              @click="refreshCore(c.name)"
            >
              刷新
            </NeumorphismButton>
            <NeumorphismButton
              size="small"
              variant="glass"
              class="fed-btn fed-gen-invite"
              @click="requestInvite(c.name)"
            >
              生成邀请
            </NeumorphismButton>
            <NeumorphismButton
              size="small"
              variant="glass"
              class="fed-btn fed-add-peer"
              @click="openAdd(c.name)"
            >
              添加 peer
            </NeumorphismButton>
          </div>
        </div>

        <!-- 邀请串输出 -->
        <div v-if="c.invite" class="fed-invite">
          <div class="fed-invite-label">
            邀请串（含共享密钥，按 SSH 密钥同等级保密；发给对端粘贴即可配对）
          </div>
          <div class="fed-invite-row">
            <code class="fed-invite-text">{{ c.invite }}</code>
            <NeumorphismButton
              size="small"
              variant="glass"
              class="fed-btn fed-copy-invite"
              @click="copyInvite(c.name)"
            >
              {{ copiedCore === c.name ? '已复制' : '复制' }}
            </NeumorphismButton>
          </div>
        </div>

        <!-- 添加/编辑表单（归属本卡片 Core） -->
        <div v-if="showAdd && formCore === c.name" class="fed-form">
          <div class="fed-form-title">
            {{ editName ? `编辑 peer「${editName}」` : `在「${c.label}」上添加 peer` }}
          </div>
          <div class="fed-form-invite">
            <NeumorphismInput
              v-model="inviteInput"
              class="fed-input"
              size="small"
              placeholder="粘贴 echofed:// 邀请串自动填充（推荐）"
              @update:model-value="applyInvite"
            />
          </div>
          <div class="fed-form-grid">
            <label class="fed-field">
              <span>名称</span>
              <NeumorphismInput
                v-model="formName"
                class="fed-input"
                size="small"
                :disabled="!!editName"
                placeholder="gpu-box"
              />
            </label>
            <label class="fed-field">
              <span>地址（留空 = 仅接受对方连入）</span>
              <NeumorphismInput
                v-model="formUrl"
                class="fed-input"
                size="small"
                placeholder="ws://192.168.1.20:3133"
              />
            </label>
            <label class="fed-field">
              <span>共享密钥{{ editName ? '（留空 = 不变）' : '' }}</span>
              <NeumorphismInput
                v-model="formToken"
                class="fed-input"
                size="small"
                placeholder="与对端一致"
              />
            </label>
            <div class="fed-field fed-field--check">
              <NeumorphismCheckbox
                v-model="formAllowAll"
                size="small"
                label="允许对端调用本机全部工具（默认满权限；联邦互信 ≈ SSH 免密）"
              />
            </div>
            <label v-if="!formAllowAll" class="fed-field fed-field--wide">
              <span>允许的工具（换行/逗号分隔；如 bash、read_file）</span>
              <NeumorphismTextarea
                v-model="formToolsCustom"
                class="fed-input fed-textarea"
                size="small"
                :rows="3"
                placeholder="bash&#10;read_file"
              />
            </label>
            <div class="fed-field fed-field--wide">
              <span>允许的只读查询（跨机工作区/git/浏览所需）</span>
              <div class="fed-checks">
                <div v-for="kind in QUERY_KINDS" :key="kind.key" class="fed-check">
                  <NeumorphismCheckbox
                    :model-value="formQueries.includes(kind.key)"
                    size="small"
                    :label="kind.label"
                    @update:model-value="(v: boolean) => toggleQuery(kind.key, v)"
                  />
                </div>
              </div>
            </div>
            <div class="fed-field fed-field--check">
              <NeumorphismCheckbox
                v-model="formAllowSubagent"
                size="small"
                label="接受对端的子代理委派（spawn_subagent node=本机）"
              />
            </div>
            <label class="fed-field fed-field--wide">
              <span>需确认的调用（可选；命中即拒，换行/逗号分隔）</span>
              <NeumorphismInput
                v-model="formRequireConfirm"
                class="fed-input"
                size="small"
                placeholder="（空 = 无需确认）"
              />
            </label>
          </div>
          <div v-if="inviteError" class="fed-error">{{ inviteError }}</div>
          <div class="fed-form-actions">
            <NeumorphismButton
              size="small"
              variant="glass"
              class="fed-btn fed-form-cancel"
              @click="showAdd = false"
            >
              取消
            </NeumorphismButton>
            <NeumorphismButton
              size="small"
              variant="primary"
              class="fed-btn fed-btn--primary fed-form-save"
              @click="savePeer"
            >
              保存
            </NeumorphismButton>
          </div>
        </div>

        <!-- peers 列表 -->
        <div v-if="c.enabled" class="fed-list">
          <div v-if="!c.peers.length" class="fed-empty">
            该 Core 尚未配置 peer——点「生成邀请」把串发给对端，或「添加 peer」粘贴对端邀请串。
          </div>
          <div v-for="p in c.peers" :key="p.name" class="fed-peer">
            <span class="fed-dot" :title="p.link === 'Online' ? '在线' : '离线'">
              <NeumorphismStatusDot
                :status="p.link === 'Online' ? 'online' : 'offline'"
                size="small"
              />
            </span>
            <div class="fed-peer-main">
              <div class="fed-peer-name">{{ p.name }}</div>
              <div class="fed-peer-url">{{ p.url || '（仅接受连入）' }}</div>
            </div>
            <div class="fed-peer-meta">
              {{ p.token_set ? '已配置密钥' : '无密钥' }}
              <template v-if="(p.allow_tools ?? []).includes('*')"> · 全部工具</template>
              <template v-else-if="(p.allow_tools ?? []).length">
                · {{ p.allow_tools.length }} 工具
              </template>
              <template v-else> · 无工具授权</template>
              <template v-if="(p.allow_queries ?? []).includes('*')"> · 全部查询</template>
              <template v-else-if="(p.allow_queries ?? []).length">
                · {{ p.allow_queries.length }} 类查询
              </template>
              <template v-else> · 无查询授权</template>
              <template v-if="p.allow_subagent"> · 接受委派</template>
            </div>
            <div class="fed-peer-actions">
              <NeumorphismButton
                size="small"
                variant="glass"
                class="fed-btn fed-btn--small fed-peer-edit"
                @click="openEdit(c.name, p)"
              >
                编辑
              </NeumorphismButton>
              <NeumorphismButton
                size="small"
                variant="glass"
                class="fed-btn fed-btn--small fed-btn--danger fed-peer-del"
                @click="deletePeer(c.name, p.name)"
              >
                删除
              </NeumorphismButton>
            </div>
          </div>
        </div>
        <div v-else-if="c.fed" class="fed-empty">该 Core 未启用联邦（在其配置中开启 federation）。</div>
      </div>
    </div>

    <!-- 会话迁移（会话级操作；作用于当前会话所属 Core 的在线 peer） -->
    <div class="fed-migrate">
      <div class="fed-migrate__text">
        <div class="fed-migrate__title">迁移当前会话</div>
        <div class="fed-sub">
          会话：
          {{ props.activeSessionId && props.activeSessionId !== 'global' ? props.activeSessionId : '（全局视图无单一会话）' }}
          · 人格：{{ props.activeTeamId ?? '（未指定）' }} · 目标 Core 的在线
          peer：{{ onlinePeers.length }}
        </div>
      </div>
      <NeumorphismSelect
        v-model="migratePeer"
        class="fed-migrate__peer"
        size="small"
        :options="migrateOptions"
        placeholder="（自动：首个在线节点）"
      />
      <NeumorphismButton
        size="small"
        variant="primary"
        class="fed-btn fed-btn--primary fed-migrate__go"
        :disabled="!canMigrate"
        @click="migrateSession"
      >
        迁移
      </NeumorphismButton>
    </div>
  </div>
</template>

<style scoped>
.fed-pair {
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fed-pair__title {
  font-weight: 600;
}
.fed-pair__row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.fed-pair__field {
  flex: 1;
  min-width: 180px;
}
.fed-pair__swap {
  margin-bottom: 1px;
}
.fed-pair__go {
  margin-bottom: 1px;
}
.fed-pair__status {
  color: var(--panel-ok, var(--nm-text-secondary));
}
.fed-cores {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fed-core {
  border: 1px solid var(--nm-border-color);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fed-core__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.fed-core__id {
  flex: 1;
  min-width: 0;
}
.fed-core__name {
  font-weight: 600;
}
.fed-core__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
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
  color: var(--nm-text-secondary);
  margin-top: 2px;
}
.fed-sub--warn {
  color: var(--panel-warn);
}
.fed-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.fed-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--nm-border-color);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}
.fed-btn--primary {
  background: var(--panel-accent);
  color: #fff;
  border-color: transparent;
}
.fed-btn--danger {
  color: var(--panel-err);
}
.fed-btn--small {
  padding: 3px 8px;
}
.fed-invite,
.fed-form {
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fed-invite-label {
  color: var(--nm-text-secondary);
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
  background: var(--panel-hover);
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
  color: var(--nm-text-secondary);
}
.fed-field--check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.fed-input {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--nm-border-color);
  background: var(--panel-hover);
  font-size: 12px;
}
.fed-error {
  color: var(--panel-err);
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
  color: var(--nm-text-secondary);
  padding: 12px;
  text-align: center;
}
.fed-peer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--nm-border-color);
  border-radius: 8px;
}
.fed-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fed-dot--online {
  background: var(--panel-ok);
}
.fed-dot--offline {
  background: var(--nm-text-placeholder);
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
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fed-peer-meta {
  font-size: 12px;
  color: var(--nm-text-secondary);
  flex-shrink: 0;
}
.fed-peer-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
