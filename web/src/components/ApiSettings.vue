<script setup lang="ts">
//! API 设置页（设置视图的工作区面板）：概览视图（Profiles 列表）+
//! 按需展开的编辑表单（点击「编辑」/「添加 API 服务商」时出现，保存/收起后回到概览）。
//! 由设置视图整页渲染（原为 SettingsModal 弹窗）；样式类复用 styles.css 全局定义。
//!
//! 2026-09-14：「默认」标记与「设为默认」按钮已移除（默认提供商功能去除）——
//! profiles 只是可供 persona 引用的供应商池，不再有"哪个是默认"的概念。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import NeumorphismChartLine from '@echolab-auto/ui-frame/components/NeumorphismChartLine';
import NeumorphismInput from '@echolab-auto/ui-frame/components/NeumorphismInput';
import NeumorphismSelect from '@echolab-auto/ui-frame/components/NeumorphismSelect';
import NeumorphismTag from '@echolab-auto/ui-frame/components/NeumorphismTag';
import { ChatCopyButton } from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { pushToast } from '../state';
import PanelIcon from './PanelIcon.vue';
import {
  alignBalanceSeries,
  alignUsageSeries,
  balanceSeries,
  entryTotals,
  formatMoney,
  formatTokens,
  formatTsLabel,
  latestBalance,
  usageSeries,
} from '../api-metrics';
import type { MetricsSeries } from '../api-metrics';
import { sendCommand, sendPending } from '../connection';

interface ApiTemplate {
  key: string;
  label: string;
  provider: string;
  base_url: string;
  model: string;
  thinking: 'enabled' | 'disabled';
  reasoning: 'low' | 'high' | 'max';
  hint?: string;
}

interface ApiProfile {
  name: string;
  provider: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
  thinking: 'enabled' | 'disabled';
  reasoning_effort: 'low' | 'high' | 'max';
}

// 预配置模板：展开表单后点击自动填充字段，只需填 API Key 即可保存。
// DeepSeek 合并为单一预设（默认官方 Anthropic 兼容端点，支持思考模式）；
// 需要 OpenAI 格式时把地址改为 https://api.deepseek.com/v1 并换模型名。
const TEMPLATES: ApiTemplate[] = [
  {
    key: 'deepseek',
    label: 'DeepSeek',
    provider: 'deepseek',
    base_url: 'https://api.deepseek.com/anthropic',
    model: 'deepseek-v4-flash',
    thinking: 'enabled',
    reasoning: 'max',
    hint: 'Anthropic 端点（思考模式）；OpenAI 格式改 /v1 + deepseek-chat',
  },
  {
    key: 'kimi',
    label: 'Kimi For Coding',
    provider: 'kimi',
    base_url: 'https://api.kimi.com/coding',
    model: 'k3',
    thinking: 'enabled',
    reasoning: 'high',
  },
  {
    key: 'third-party',
    label: '中转站（OpenAI 兼容）',
    provider: 'third-party',
    base_url: '',
    model: '',
    thinking: 'enabled',
    reasoning: 'max',
    hint: '填中转站 /v1 地址与模型名（one-api / new-api 等）',
  },
  {
    key: 'opencode-go',
    label: 'OpenCode Go（订阅）',
    provider: 'opencode-go',
    base_url: 'https://opencode.ai/inference/go/openai/v1',
    model: 'kimi-k3',
    thinking: 'enabled',
    reasoning: 'max',
    hint: 'Go $10/月订阅；Key 在 opencode.ai Console 创建（oc_sk_…）。可选模型：kimi-k3 / glm-5.2 / deepseek-v4-pro 等（Chat Completions 形态）',
  },
  {
    key: 'opencode',
    label: 'OpenCode Zen（按量）',
    provider: 'opencode',
    base_url: 'https://opencode.ai/inference/openai/v1',
    model: 'kimi-k3',
    thinking: 'enabled',
    reasoning: 'max',
    hint: 'Zen 按量付费（$20 起充）；与 Go 共用同一个 Console Key，端点少一层 /go 前缀',
  },
  {
    key: 'openai-chatgpt',
    label: 'ChatGPT 订阅',
    provider: 'openai-chatgpt',
    // base_url 会被 Core 忽略（这条通道只有 chatgpt.com/backend-api/codex 一个入口）
    base_url: '',
    // api_key 故意留空：凭据是 OAuth 登录态
    model: 'gpt-5-codex',
    thinking: 'enabled',
    reasoning: 'max',
    hint: '用 Plus/Pro 订阅额度，不消耗 API 计费。先在 Core 上运行 `echo-agent-core login-chatgpt` 完成登录；Key 留空（凭据是登录态）。地区受限时需给 Core 配 HTTPS_PROXY',
  },
  {
    key: 'openai',
    label: 'OpenAI',
    provider: 'openai',
    base_url: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    thinking: 'disabled',
    reasoning: 'low',
    hint: 'OpenAI 官方 API',
  },
  {
    key: 'anthropic',
    label: 'Anthropic',
    provider: 'anthropic',
    base_url: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
    thinking: 'enabled',
    reasoning: 'max',
    hint: '原生 Anthropic Messages API',
  },
  {
    key: 'ollama',
    label: 'Ollama（本地）',
    provider: 'ollama',
    base_url: 'http://localhost:11434/v1',
    model: 'llama3.1',
    thinking: 'disabled',
    reasoning: 'low',
    hint: '本地模型，无需 API Key',
  },
];

const THINKING_OPTIONS = [
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' },
];

const REASONING_OPTIONS = [
  { label: 'low', value: 'low' },
  { label: 'high', value: 'high' },
  { label: 'max', value: 'max' },
];

const api = computed(() => state.api);

/** 表单状态：none = 概览（默认）；edit = 编辑已有 profile；add = 新增 API 服务商 */
const formMode = ref<'none' | 'edit' | 'add'>('none');
/** 正在编辑的 profile 名（仅 edit 模式；提交用原名） */
const editingProfile = ref<string | null>(null);
/** 编辑模式的名称输入（可改名，2026-10：Core RenameApi；提交时两步走） */
const editName = ref('');
const provider = ref('');
const model = ref('');
const baseUrl = ref('');
const apiKey = ref('');
const thinking = ref<'enabled' | 'disabled'>('enabled');
const reasoning = ref<'low' | 'high' | 'max'>('max');
/** 添加模式的新 profile 名称（仅 add 模式显示） */
const profileName = ref('');
/** 测试中的目标（'' = 默认配置；否则 profile 名）；null = 空闲 */
const testing = ref<string | null>(null);
/** 本次表单展开后是否发起过测试（name → true），防止展示上次展开的旧结果 */
const formTested = ref<Record<string, boolean>>({});

/** 待确认的改名（已发 RenameApi、等待 profiles 出现新名）；null = 无 */
const pendingRename = ref<{ from: string; to: string } | null>(null);
/** 改名时点下的表单字段快照（确认后按新名补发；含 apiKey） */
let pendingFields: {
  provider: string;
  model: string;
  base_url: string;
  api_key: string;
  thinking: 'enabled' | 'disabled';
  reasoning_effort: 'low' | 'high' | 'max';
} | null = null;
/** 改名确认超时计时器（失败/无响应时还原表单，避免卡死） */
let renameTimer: ReturnType<typeof setTimeout> | null = null;
/** 改名的本地错误提示（超时等；Core 失败会回 Error 事件自行展示） */
const renameError = ref('');
/** 表单打开时的字段基线（判断"有无字段改动"；不含 apiKey——空=保持） */
let formBaseline = '';

/** 当前表单字段值（提交载荷）。 */
function currentFormPayload() {
  return {
    provider: provider.value,
    model: model.value,
    base_url: baseUrl.value,
    api_key: apiKey.value,
    thinking: thinking.value,
    reasoning_effort: reasoning.value,
  };
}

/** 基线键：只含会随保存提交的字段（apiKey 另行判定——空 = 保持不变）。 */
function baselineKey(p: { provider: string; model: string; base_url: string }): string {
  return JSON.stringify([p.provider, p.model, p.base_url, thinking.value, reasoning.value]);
}

/** 相对表单打开时是否有字段改动（含填了新 key）。 */
function fieldsChangedSinceOpen(): boolean {
  if (apiKey.value.trim() !== '') return true;
  return baselineKey(currentFormPayload()) !== formBaseline;
}

function clearRenamePending() {
  pendingRename.value = null;
  pendingFields = null;
  if (renameTimer) {
    clearTimeout(renameTimer);
    renameTimer = null;
  }
}

/** 编辑中的目标名：改名输入框（trim 后）；空白回退原名（仅展示用）。 */
const editNameTrimmed = computed(() => editName.value.trim());

/** 名称合法性提示（编辑模式：空白 / 与现有 profile 撞名）。 */
const editNameError = computed(() => {
  if (formMode.value !== 'edit') return '';
  const to = editNameTrimmed.value;
  if (!to) return '名称不能为空';
  if (to !== editingProfile.value && (api.value?.profiles ?? []).some((p) => p.name === to)) {
    return `名称「${to}」已存在，请换一个`;
  }
  return '';
});

/** 保存按钮禁用：改名进行中 / 名称非法 / 添加模式未填名。 */
const saveDisabled = computed(() => {
  if (pendingRename.value) return true;
  if (formMode.value === 'add') return !profileName.value.trim();
  if (formMode.value === 'edit') return editNameError.value !== '';
  return true;
});

const formTarget = computed(() => (formMode.value === 'edit' ? (editingProfile.value ?? '') : ''));

const formTitle = computed(() =>
  formMode.value === 'edit'
    ? `编辑 Profile · ${editNameTrimmed.value || editingProfile.value}`
    : '新增 API 服务商',
);

const saveLabel = computed(() =>
  formMode.value === 'edit'
    ? `保存到 ${editNameTrimmed.value || editingProfile.value}`
    : '保存',
);

function fillForm(p: Partial<{
  provider: string;
  model: string;
  base_url: string;
  thinking: 'enabled' | 'disabled';
  reasoning_effort: 'low' | 'high' | 'max';
}>) {
  if (p.provider !== undefined) provider.value = p.provider;
  if (p.model !== undefined) model.value = p.model;
  if (p.base_url !== undefined) baseUrl.value = p.base_url;
  if (p.thinking !== undefined) thinking.value = p.thinking;
  if (p.reasoning_effort !== undefined) reasoning.value = p.reasoning_effort;
}

/** 展开表单：清空上次测试结果（仅表单视角，不污染概览的列表结果） */
function resetFormResults() {
  formTested.value = {};
}

function openEdit(profile: ApiProfile) {
  formMode.value = 'edit';
  editingProfile.value = profile.name;
  editName.value = profile.name;
  profileName.value = '';
  fillForm(profile);
  apiKey.value = '';
  resetFormResults();
  formBaseline = baselineKey(currentFormPayload());
  renameError.value = '';
  clearRenamePending();
}

function openAdd() {
  formMode.value = 'add';
  editingProfile.value = null;
  editName.value = '';
  profileName.value = '';
  // 添加模式：空表单，Provider 默认第三方（OpenAI 兼容），快速模板可一键填充
  provider.value = 'third-party';
  model.value = '';
  baseUrl.value = '';
  thinking.value = 'enabled';
  reasoning.value = 'max';
  apiKey.value = '';
  resetFormResults();
  formBaseline = baselineKey(currentFormPayload());
  renameError.value = '';
  clearRenamePending();
}

function closeForm() {
  formMode.value = 'none';
  editingProfile.value = null;
  editName.value = '';
  profileName.value = '';
  apiKey.value = '';
  renameError.value = '';
  clearRenamePending();
}

function applyTemplate(t: ApiTemplate) {
  fillForm(t);
}

// ── 联邦分布式供应商共享（2026-10）：从节点导入 ──
// 流程：选 peer → RequestRemoteApiProfiles → Core 经 Query(ApiProfiles)
// 拉远端**脱敏**池 → RemoteApiProfiles 事件存 state.remoteApiProfiles
// → 这里列出 → 「导入」把 provider/model/base_url 预填进添加表单
// （api_key 明文永不过线——用户在本机补填后保存）。

/** 在线的联邦 peer 名列表（联邦页数据；本机 'local' 不算远端）。 */
const federatedPeers = computed(() => {
  const peers = state.federation?.peers ?? [];
  return peers.filter((p) => p.link === 'Online').map((p) => p.name);
});

const importPeer = ref('');
/** 该 peer 最近一次查询结果（state.remoteApiProfiles）。 */
const remotePool = computed(() => (importPeer.value ? state.remoteApiProfiles[importPeer.value] : undefined));
const remoteLoading = ref(false);

function queryRemoteProfiles() {
  if (!importPeer.value) return;
  remoteLoading.value = true;
  sendPending(
    { RequestRemoteApiProfiles: { peer: importPeer.value } },
    'api:remote-profiles',
  );
}

// 查询结果到达（事件写入 state）即结束加载态
watch(remotePool, () => {
  remoteLoading.value = false;
});

/** 把远端条目预填进「添加 API 服务商」表单（key 留空待补）。 */
function importFromRemote(entry: import('../protocol').RemoteApiProfileEntry) {
  openAdd();
  profileName.value = entry.name;
  fillForm({
    provider: entry.provider,
    model: entry.model,
    base_url: entry.base_url,
    thinking: (entry as { thinking?: 'enabled' | 'disabled' }).thinking,
    reasoning_effort: (entry as { reasoning_effort?: 'low' | 'high' | 'max' })
      .reasoning_effort,
  });
  // 提示 key 需本机补填（远端只回了 key_set 布尔）
  if (!entry.key_set) {
    // 远端自己也没配 key——原样导入也无妨（用户会看到同样的 key 缺失态）
  }
}

// Provider 预配置：选择常见服务商时自动填充 base_url / model。
function applyProviderPreset(value: string | number | (string | number)[] | undefined) {
  const v = String(value ?? '');
  provider.value = v;
  if (v === 'deepseek') {
    baseUrl.value = 'https://api.deepseek.com/anthropic';
    model.value = 'deepseek-v4-flash';
    thinking.value = 'enabled';
    reasoning.value = 'max';
  } else if (v === 'openai') {
    baseUrl.value = 'https://api.openai.com/v1';
    model.value = 'gpt-4o';
    thinking.value = 'disabled';
    reasoning.value = 'low';
  } else if (v === 'kimi') {
    baseUrl.value = 'https://api.kimi.com/coding';
    model.value = 'k3';
    thinking.value = 'enabled';
    reasoning.value = 'high';
  } else if (v === 'opencode-go') {
    // OpenCode Go（订阅）：默认走 Chat Completions 形态；
    // 想接 Claude Haiku / Qwen 这类只提供 Messages 的模型时，把地址改成
    // 同前缀下的 /anthropic（后端按结尾自动切客户端）。
    baseUrl.value = 'https://opencode.ai/inference/go/openai/v1';
    model.value = 'kimi-k3';
    thinking.value = 'enabled';
    reasoning.value = 'max';
  } else if (v === 'opencode') {
    baseUrl.value = 'https://opencode.ai/inference/openai/v1';
    model.value = 'kimi-k3';
    thinking.value = 'enabled';
    reasoning.value = 'max';
  } else if (v === 'openai-chatgpt') {
    // base_url 清空（Core 忽略它）；key 也清空——这条通道不用 api_key，
    // 留着上一家 provider 的 key 只会让人以为它生效了。
    baseUrl.value = '';
    model.value = 'gpt-5-codex';
    thinking.value = 'enabled';
    reasoning.value = 'max';
  }
  // third-party：保留手动输入的 base_url / model，仅切换 provider 名。
}

// ── ChatGPT 订阅登录（2026-11）──────────────────────────────────────
//
// 登录由 Core 发起（它必须自己绑 1455 收回调），面板只负责：拉状态、显示
// URL、在用户点「登录」时发一条命令。**不在浏览器侧做 OAuth**——那会拿到
// 一份只在这台浏览器里有效的令牌，而真正要用的进程在 Core 那边。

const chatgptLogin = computed(() => state.chatgptLogin);
const chatgptStatus = computed(() => state.chatgptLogin.status);
/** 当前表单在编辑 ChatGPT 订阅类供应商。 */
const isChatGptProvider = computed(() => provider.value === 'openai-chatgpt');

function startChatGptLogin() {
  // 命令无载荷：线格式是裸字符串。写成 `{ StartChatGptLogin: {} }` 会让
  // Core 反序列化失败并**静默丢帧**（ProDocRoots 踩过同一个坑）。
  sendCommand('StartChatGptLogin');
}

function cancelChatGptLogin() {
  sendCommand('CancelChatGptLogin');
}

function requestChatGptStatus() {
  sendCommand('RequestChatGptStatus');
}

/**
 * 局域网访问时该在本机跑的那条 SSH 隧道命令。
 *
 * 用 `location.hostname` 而不是写死 localhost：用户从局域网访问面板时，
 * 那个 hostname 就是他实际能连到 Core 机器的地址，直接填进示例最不容易出错。
 */
const lanTunnelHint = computed(() => {
  const host =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : '<core-host>';
  return `ssh -N -L 1455:127.0.0.1:1455 ${host}`;
});

/** 打开授权 URL（新标签页）。 */
function openChatGptAuthUrl() {
  const url = chatgptLogin.value.url;
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** 复制授权 URL：远程部署时用户要把链接拷到自己的浏览器。 */
async function copyChatGptAuthUrl() {
  const url = chatgptLogin.value.url;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    pushToast(state, '授权链接已复制', 'success');
  } catch {
    pushToast(state, '复制失败，请手动选中链接', 'error');
  }
}

// 进入设置页拉一次状态；切到该 provider 时再拉一次（用户可能刚在别处登录）。
onMounted(() => {
  requestChatGptStatus();
});
watch(isChatGptProvider, (chatgpt) => {
  if (chatgpt) requestChatGptStatus();
});

// 当前 provider 不在下拉选项中时（如旧配置 anthropic/ollama），保留为额外选项。
const providerSelectOptions = computed(() => {
  const options = [
    { label: 'DeepSeek', value: 'deepseek' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Kimi For Coding', value: 'kimi' },
    { label: 'OpenCode Go（订阅）', value: 'opencode-go' },
    { label: 'OpenCode Zen（按量）', value: 'opencode' },
    { label: 'ChatGPT 订阅（Plus/Pro）', value: 'openai-chatgpt' },
    { label: '第三方（OpenAI 兼容）', value: 'third-party' },
  ];
  const known = [
    'deepseek',
    'openai',
    'kimi',
    'opencode-go',
    'opencode',
    'openai-chatgpt',
    'third-party',
  ];
  const current = provider.value;
  if (current && !known.includes(current)) {
    options.push({ label: `${current}（现有配置）`, value: current });
  }
  return options;
});

const providerSelectValue = computed(() =>
  providerSelectOptions.value.some((o) => o.value === provider.value)
    ? provider.value
    : 'third-party',
);

/** 概览视角的测试结果（读 store 缓存，常驻显示） */
function testResultOf(name: string) {
  return state.apiTests[name] ?? null;
}

/** 表单视角的测试结果：仅显示本次展开后测试过的（防旧结果） */
function formResultOf() {
  const name = formTarget.value;
  if (!formTested.value[name]) return null;
  return state.apiTests[name] ?? null;
}

function runTest(name: string) {
  // 加载态互斥：一次只能测试一个目标
  if (testing.value !== null && testing.value !== name) return;
  testing.value = name;
  if (formMode.value !== 'none') formTested.value[name] = true;
  sendCommand({ TestApi: { name } });
}

// 测试结果到达（ApiTestResult）→ 解除加载态。
// 跟踪当前目标的结果字段：reducer 原地深变异（引用不变），deep 或按字段跟踪才能触发。
watch(
  () => (testing.value !== null ? state.apiTests[testing.value] : undefined),
  (val) => {
    if (val) testing.value = null;
  },
);

/** 查余额中的目标（'' = 默认配置；否则 profile 名）；null = 空闲 */
const balanceLoading = ref<string | null>(null);

/** 该配置是否走 DeepSeek 官方端点（决定是否展示余额入口） */
function isDeepSeekTarget(provider: string | undefined, baseUrl: string | undefined): boolean {
  return provider === 'deepseek' || (baseUrl ?? '').includes('deepseek.com');
}

// ── 余额 / 用量图表（近 7 天；`ApiMetrics` 事件）──
// 数据来源：Core 本地积累（余额按周期快照 + 每次 LLM 调用的 token 用量）。
// 挂载时拉全量、每 5 分钟自动刷新；手动查余额成功后刷新该目标（新快照即入图）。

/** 指标加载态（刷新按钮用） */
const metricsLoading = ref(false);

function fetchMetrics(name = '') {
  metricsLoading.value = true;
  sendPending({ QueryApiMetrics: { name } }, 'api:metrics');
}

// 指标数据到达（reducer 逐目标覆盖）→ 清除加载态。
watch(
  () => state.apiMetrics,
  () => {
    metricsLoading.value = false;
  },
  { deep: true },
);

let metricsRefreshTimer: number | null = null;
onMounted(() => {
  fetchMetrics('');
  metricsRefreshTimer = window.setInterval(() => fetchMetrics(''), 5 * 60 * 1000);
});
onUnmounted(() => {
  if (metricsRefreshTimer !== null) {
    window.clearInterval(metricsRefreshTimer);
    metricsRefreshTimer = null;
  }
});

// 连接建立（含断线重连）时刷新一次：首挂载的握手期请求走全局暂存队列，
// 重连恢复走这里（与 ShellList 等面板同一模式）。
watch(
  () => state.connected,
  (connected) => {
    if (connected) fetchMetrics('');
  },
);

/** 币种（优先最近快照，其次手动查询结果；缺省 CNY） */
function currencyOf(name: string): string {
  return (
    latestBalance(state.apiMetrics[name])?.currency || state.apiBalances[name]?.currency || 'CNY'
  );
}

/** 余额展示文本：手动查询结果优先；否则最近快照；都无 = 空 */
function balanceText(name: string): string {
  const b = state.apiBalances[name];
  if (b) {
    if (!b.ok) return b.message;
    return formatMoney(Number(b.total) || 0, b.currency);
  }
  const snap = latestBalance(state.apiMetrics[name]);
  return snap ? formatMoney(snap.total, snap.currency || 'CNY') : '';
}

/** 余额状态：ok = 有值（查询结果或快照）；fail = 失败（展示错误文本样式） */
function balanceState(name: string): 'ok' | 'fail' | '' {
  const b = state.apiBalances[name];
  if (b) return b.ok ? 'ok' : 'fail';
  return latestBalance(state.apiMetrics[name]) ? 'ok' : '';
}

/** 余额行 tooltip：查询消息优先，否则快照时间 */
function balanceTitle(name: string): string {
  const b = state.apiBalances[name];
  if (b?.message) return b.message;
  const snap = latestBalance(state.apiMetrics[name]);
  return snap ? `快照 ${formatTsLabel(snap.ts_ms)}` : '';
}

/** 充值 / 赠送分账行（有数据才显示） */
function balanceSubText(name: string): string {
  const b = state.apiBalances[name];
  const snap = latestBalance(state.apiMetrics[name]);
  const granted = b?.granted ?? (snap ? String(snap.granted) : undefined);
  const topped = b?.topped_up ?? (snap ? String(snap.topped_up) : undefined);
  if (granted === undefined && topped === undefined) return '';
  const currency = currencyOf(name);
  return `充值 ${formatMoney(Number(topped) || 0, currency)} · 赠送 ${formatMoney(Number(granted) || 0, currency)}`;
}

function queryBalance(name: string) {
  // 加载态互斥：一次只能查询一个目标
  if (balanceLoading.value !== null && balanceLoading.value !== name) return;
  balanceLoading.value = name;
  sendCommand({ QueryApiBalance: { name } });
}

// 余额结果到达 → 解除加载态；成功则刷新该目标指标（新快照即时进图）。
watch(
  () => (balanceLoading.value !== null ? state.apiBalances[balanceLoading.value] : undefined),
  (val) => {
    if (val) {
      const name = balanceLoading.value;
      balanceLoading.value = null;
      if (val.ok && name !== null) fetchMetrics(name);
    }
  },
);

// ── 卡片小图 ──

/** 该 profile 是否有可展示的图表数据（余额 ≥ 2 点或有用量） */
function hasCardCharts(name: string): boolean {
  const entry = state.apiMetrics[name];
  if (!entry) return false;
  return (entry.balance?.length ?? 0) > 1 || (entry.usage?.length ?? 0) > 0;
}

/** 卡片余额 series（无数据 = 空数组） */
function cardBalanceSeries(name: string): MetricsSeries[] {
  const entry = state.apiMetrics[name];
  if (!entry) return [];
  const data = balanceSeries(entry);
  return data.length > 1 ? [{ name: '余额', data }] : [];
}

/** 卡片用量 series（无数据 = 空数组） */
function cardUsageSeries(name: string): MetricsSeries[] {
  const entry = state.apiMetrics[name];
  if (!entry) return [];
  const data = usageSeries(entry);
  return data.length > 0 ? [{ name: '用量', data }] : [];
}

/** 用量行标题：近 7 天 tokens 总量 + 估算费用 */
function usageLabel(name: string): string {
  const entry = state.apiMetrics[name];
  if (!entry) return '用量 · 近 7 天';
  const totals = entryTotals(entry);
  const cost = totals.cost != null ? ` · 约 ${formatMoney(totals.cost, totals.currency)}` : '';
  return `用量 · 近 7 天 ${formatTokens(totals.tokens)} tokens${cost}`;
}

/** 余额小图 tooltip 格式化（闭包按 profile 缓存，币种实时解析） */
const balanceFmtCache = new Map<string, (value: number) => string>();
function balanceFmtFor(name: string): (value: number) => string {
  let fmt = balanceFmtCache.get(name);
  if (!fmt) {
    fmt = (value: number) => formatMoney(value, currencyOf(name));
    balanceFmtCache.set(name, fmt);
  }
  return fmt;
}

/** 用量 tooltip 格式化（K/M 缩写） */
function tokenFmt(value: number): string {
  return formatTokens(value);
}

// ── 总览对比图（近 7 天；多 profile，公共时间桶轴）──

const metricsEntries = computed(() => Object.values(state.apiMetrics));
const overviewBalance = computed(() => alignBalanceSeries(metricsEntries.value));
const overviewUsage = computed(() => alignUsageSeries(metricsEntries.value));
const overviewEmpty = computed(
  () => overviewBalance.value.length === 0 && overviewUsage.value.length === 0,
);

/** 总览余额 tooltip：series 名 = profile 名（空名显示为「默认」） */
function overviewBalanceFmt(value: number, seriesName: string): string {
  const key = seriesName === '默认' ? '' : seriesName;
  return formatMoney(value, currencyOf(key));
}

/** 近 7 天估算费用摘要（有可估算用量才显示） */
const costSummary = computed(() => {
  const parts: string[] = [];
  for (const entry of metricsEntries.value) {
    const totals = entryTotals(entry);
    if (totals.tokens > 0 && totals.cost != null) {
      parts.push(`${entry.name || '默认'} 约 ${formatMoney(totals.cost, totals.currency)}`);
    }
  }
  return parts.length > 0
    ? `近 7 天估算费用：${parts.join(' · ')}（按 [agent.pricing] 定价估算；缓存命中按命中价计，未配置命中价的模型按未命中价）`
    : '';
});

/** 保存：编辑模式存回 profile（改名则两步提交）；添加模式以名称为准新建/覆盖 */
function sendUpdate(name: string, fields: ReturnType<typeof currentFormPayload>) {
  sendCommand({
    UpdateApiConfig: {
      name,
      provider: fields.provider,
      model: fields.model,
      base_url: fields.base_url,
      api_key: fields.api_key,
      thinking: fields.thinking,
      reasoning_effort: fields.reasoning_effort,
    },
  });
}

function saveForm() {
  if (formMode.value === 'add') {
    const name = profileName.value.trim();
    if (!name) return;
    sendUpdate(name, currentFormPayload());
    apiKey.value = '';
    // 保存成功（core 回推 ApiConfigUpdated）后由下方 watch 收起表单
    return;
  }
  if (formMode.value !== 'edit') return;

  const from = editingProfile.value ?? '';
  const to = editNameTrimmed.value;
  if (!to) return;
  if (to === from) {
    // 未改名：原单步保存语义。
    sendUpdate(from, currentFormPayload());
    apiKey.value = '';
    return;
  }

  // 改名：两步提交（2026-10）——先 RenameApi，确认成功后才按新名补发
  // UpdateApiConfig。绝不能一步按新名 upsert：改名失败会复制出一份新
  // profile（正是旧 UI 禁用名称框要规避的问题）。
  pendingRename.value = { from, to };
  pendingFields = currentFormPayload();
  renameError.value = '';
  sendCommand({ RenameApi: { from, to } });
  // 确认到达前锁定保存按钮；失败/无响应由超时兜底还原。
  if (renameTimer) clearTimeout(renameTimer);
  renameTimer = setTimeout(() => {
    if (pendingRename.value) {
      renameError.value = '改名未确认（超时）——请重试或检查 Core 日志';
      clearRenamePending();
    }
  }, 10000);
}

// 保存回播（ApiConfigUpdated 重建 state.api 引用）→ 收起表单回到概览。
// 改名进行中跳过：等待 profiles 侧确认（否则任何回播都会把表单提前收起）。
watch(api, () => {
  if (formMode.value === 'none') return;
  if (pendingRename.value) return;
  closeForm();
});

// profiles 列表变化：
// 1) 改名确认：出现新名 → 视为成功（补发字段保存或收起）；
// 2) 编辑中的 profile 被删除（DeleteApi 立即生效）→ 收起表单。
watch(
  () => api.value?.profiles,
  (val) => {
    if (formMode.value !== 'edit' || !val) return;
    const pending = pendingRename.value;
    if (pending && val.some((p) => p.name === pending.to)) {
      // 改名成功：更新表单目标，必要时按新名补发字段保存。
      const fields = pendingFields;
      clearRenamePending();
      editingProfile.value = pending.to;
      editName.value = pending.to;
      if (fieldsChangedSinceOpen() && fields) {
        sendUpdate(pending.to, fields);
        apiKey.value = '';
      } else {
        closeForm();
      }
      return;
    }
    if (
      editingProfile.value &&
      !val.some((p) => p.name === editingProfile.value)
    ) {
      // 改名窗口内旧名消失是正常中间态（等上面的成功判定/超时兜底）。
      if (pending) return;
      closeForm();
    }
  },
);
</script>

<template>
  <div class="settings-form api-settings-page">
    <!-- 编辑表单（仅展开态；插入在列表上方） -->
    <div v-if="formMode !== 'none'" class="api-form-section">
      <div class="api-form-title-row">
        <h3 class="api-form-title">{{ formTitle }}</h3>
        <NeumorphismTag v-if="formMode === 'edit'" variant="warning" size="small">
          编辑中
        </NeumorphismTag>
        <NeumorphismButton size="small" variant="glass" @click="closeForm">
          收起
        </NeumorphismButton>
      </div>

      <label>快速模板</label>
      <div class="template-grid">
        <button
          v-for="t in TEMPLATES"
          :key="t.key"
          class="template-item"
          :title="t.hint"
          @click="applyTemplate(t)"
        >
          <span class="template-name">{{ t.label }}</span>
          <span class="template-hint">{{ t.hint }}</span>
        </button>
      </div>

      <template v-if="formMode === 'edit'">
        <label>Profile 名称</label>
        <NeumorphismInput v-model="editName" placeholder="Profile 名称（可修改，保存时原子改名）" />
        <div v-if="editNameError" class="muted field-hint">{{ editNameError }}</div>
        <div v-else-if="pendingRename" class="muted field-hint">
          正在改名「{{ pendingRename.from }}」→「{{ pendingRename.to }}」…
        </div>
      </template>
      <template v-else>
        <label>Profile 名称</label>
        <NeumorphismInput v-model="profileName" placeholder="新服务商名称（必填）" />
      </template>

      <label>Provider</label>
      <NeumorphismSelect
        :model-value="providerSelectValue"
        :options="providerSelectOptions"
        @change="applyProviderPreset"
      />
      <!-- ChatGPT 订阅：登录入口就在选 provider 的地方（2026-11）。
           用户的诉求原话是"登录要在设置里创建供应商时触发"——所以它出现在
           provider 选择的紧下方，而不是另开一个设置页。 -->
      <div v-if="isChatGptProvider" class="chatgpt-login">
        <div class="chatgpt-login__head">
          <PanelIcon name="lock" size="xs" tone="muted" />
          <span class="chatgpt-login__title">ChatGPT 订阅登录</span>
          <NeumorphismTag v-if="chatgptStatus?.logged_in" size="small" variant="success">
            已登录
          </NeumorphismTag>
          <NeumorphismTag v-else size="small" variant="default">未登录</NeumorphismTag>
        </div>

        <div v-if="chatgptStatus?.logged_in" class="chatgpt-login__body">
          <div class="chatgpt-login__email">{{ chatgptStatus.email || '（未回报邮箱）' }}</div>
          <div class="muted field-hint">
            用 Plus/Pro 订阅额度，不单独计 API 费。Key 留空即可——凭据是登录态。
            <span v-if="!chatgptStatus.refreshable">（无 refresh_token：过期后需重新登录）</span>
          </div>
          <NeumorphismButton size="small" variant="glass" @click="startChatGptLogin">
            重新登录
          </NeumorphismButton>
        </div>

        <div v-else class="chatgpt-login__body">
          <div class="muted field-hint">
            点「登录」后 Core 会生成授权链接；在**任意**浏览器打开它即可，
            回调会打到 Core 那台的 1455 端口。
          </div>
          <NeumorphismButton
            size="small"
            variant="raised"
            :loading="chatgptLogin.pending"
            @click="startChatGptLogin"
          >
            {{ chatgptLogin.pending ? '等待授权…' : '登录 ChatGPT' }}
          </NeumorphismButton>
        </div>

        <!-- 授权链接：Core 回推后显示。用户可能需要在另一台机器的浏览器打开
             （远程 Core 场景），所以给复制按钮而不是只做「打开」。 -->
        <div v-if="chatgptLogin.url" class="chatgpt-login__url">
          <div class="chatgpt-login__url-head">
            <span>在浏览器打开这个链接完成授权</span>
            <span class="muted">{{ chatgptLogin.redirectUri }}</span>
          </div>
          <div class="chatgpt-login__url-row">
            <code class="chatgpt-login__url-text">{{ chatgptLogin.url }}</code>
            <NeumorphismButton size="small" variant="glass" @click="copyChatGptAuthUrl">
              复制
            </NeumorphismButton>
            <NeumorphismButton size="small" variant="glass" @click="openChatGptAuthUrl">
              打开
            </NeumorphismButton>
          </div>
          <!-- 局域网访问的关键提醒（2026-11）：
               `redirect_uri` 固定是 http://localhost:1455，而 **localhost 指
               浏览器所在的那台机器**。从别的机器打开面板时，跳转会打到那台
               机器自己的 1455，Core 收不到——用户看到"无法访问此网站"却完全
               看不出为什么。这段提示是唯一能在界面上说清这件事的地方。 -->
          <div class="chatgpt-login__lan muted">
            登录由 Core 接收回调（固定 <code>localhost:1455</code>）。
            如果在**另一台机器**上打开这个链接，跳转会打到那台机器自己的
            1455、Core 收不到。在浏览器那台机器上先开隧道：
            <code>{{ lanTunnelHint }}</code>
          </div>
          <NeumorphismButton size="small" variant="glass" @click="cancelChatGptLogin">
            取消登录
          </NeumorphismButton>
        </div>

        <div v-if="chatgptLogin.error" class="chatgpt-login__error">
          {{ chatgptLogin.error }}
        </div>
      </div>

      <label>Model</label>
      <NeumorphismInput
        v-model="model"
        :placeholder="
          provider === 'third-party'
            ? '中转站模型名（如 gpt-4o / claude-sonnet-4）'
            : 'deepseek-v4-flash'
        "
      />
      <label>Base URL</label>
      <NeumorphismInput
        v-model="baseUrl"
        :placeholder="
          provider === 'third-party'
            ? 'https://你的网关/v1（OpenAI 兼容，如 one-api / new-api）'
            : 'https://api.deepseek.com/anthropic'
        "
      />
      <div v-if="provider === 'third-party'" class="muted field-hint">
        第三方服务需为 OpenAI 兼容接口；若网关提供 /anthropic 端点也会自动识别。
      </div>
      <label>API Key {{ api?.api_key_set ? '（已设置，留空保持不变）' : '（未设置）' }}</label>
      <NeumorphismInput
        v-model="apiKey"
        type="password"
        :placeholder="api?.api_key_set ? '••••••••' : '输入 API Key'"
      />
      <div class="form-row">
        <div>
          <label>思考模式</label>
          <NeumorphismSelect v-model="thinking" :options="THINKING_OPTIONS" />
        </div>
        <div>
          <label>推理强度</label>
          <NeumorphismSelect v-model="reasoning" :options="REASONING_OPTIONS" />
        </div>
      </div>
      <div class="form-actions">
        <NeumorphismButton
          variant="glass"
          :loading="testing === formTarget"
          :disabled="testing !== null && testing !== formTarget"
          @click="runTest(formTarget)"
        >
          测试连接
        </NeumorphismButton>
        <NeumorphismButton
          variant="primary"
          :disabled="saveDisabled"
          @click="saveForm"
        >
          {{ saveLabel }}
        </NeumorphismButton>
        <NeumorphismButton variant="glass" @click="closeForm">取消</NeumorphismButton>
      </div>
      <div v-if="renameError" class="api-test-result fail">
        <span class="api-test-badge">
          <PanelIcon name="close" size="xs" tone="err" />
          改名失败
        </span>
        <span class="api-test-message">{{ renameError }}</span>
      </div>
      <div
        v-if="formResultOf()"
        class="api-test-result"
        :class="formResultOf()!.ok ? 'ok' : 'fail'"
      >
        <span class="api-test-badge">
          <PanelIcon
            :name="formResultOf()!.ok ? 'check' : 'close'"
            size="xs"
            :tone="formResultOf()!.ok ? 'ok' : 'err'"
          />
          {{ formResultOf()!.ok ? '连通' : '失败' }}
        </span>
        <span class="api-test-message">{{ formResultOf()!.message }}</span>
        <span class="api-test-latency">{{ formResultOf()!.latencyMs }}ms</span>
      </div>
    </div>

    <hr />

    <!-- 余额与用量总览（近 7 天；多 profile 对比） -->
    <div v-if="formMode === 'none' && (api?.profiles?.length ?? 0) > 0" class="api-metrics">
      <div class="api-metrics__head">
        <h3>余额与用量（近 7 天）</h3>
        <NeumorphismButton
          size="small"
          variant="glass"
          :loading="metricsLoading"
          @click="fetchMetrics('')"
        >
          刷新
        </NeumorphismButton>
      </div>
      <div v-if="overviewEmpty" class="muted api-metrics__hint">
        数据积累中：Core 每 10 分钟采样一次余额；token 用量随对话自动记录（约 5 分钟自动刷新）。
      </div>
      <template v-else>
        <div class="api-metrics__charts">
          <div v-if="overviewBalance.length" class="api-metrics__chart">
            <div class="api-metrics__chart-title">余额</div>
            <NeumorphismChartLine
              :series="overviewBalance"
              :height="220"
              curve="smooth"
              :area="true"
              :show-axis="true"
              :show-grid="true"
              :show-points="false"
              :show-legend="true"
              :animate="false"
              :value-formatter="overviewBalanceFmt"
            />
          </div>
          <div v-if="overviewUsage.length" class="api-metrics__chart">
            <div class="api-metrics__chart-title">用量（tokens / 小时）</div>
            <NeumorphismChartLine
              :series="overviewUsage"
              :height="220"
              curve="smooth"
              :area="true"
              :show-axis="true"
              :show-grid="true"
              :show-points="false"
              :show-legend="true"
              :animate="false"
              :value-formatter="tokenFmt"
            />
          </div>
        </div>
        <div v-if="costSummary" class="muted api-metrics__cost">{{ costSummary }}</div>
      </template>
    </div>

    <h3>API Profiles</h3>
    <div v-if="!api?.profiles || api.profiles.length === 0" class="muted">（暂无 profile）</div>
    <div class="profile-grid">
      <NeumorphismCard
        v-for="profile in api?.profiles"
        :key="profile.name"
        :elevation="2"
        :radius="24"
        hoverable="bulge"
        no-padding
        class="profile-card"
        :class="{ 'profile-card--editing': formMode === 'edit' && editingProfile === profile.name }"
      >
        <template #header>
          <div class="profile-card__head">
            <span class="profile-card__name" :title="profile.name">{{ profile.name }}</span>
            <NeumorphismTag
              v-if="formMode === 'edit' && editingProfile === profile.name"
              variant="warning"
              size="small"
            >
              编辑中
            </NeumorphismTag>
          </div>
        </template>

        <div class="profile-card__body">
          <div class="profile-card__line" :title="`${profile.provider} / ${profile.model}`">
            {{ profile.provider }} / {{ profile.model }}
          </div>
          <div class="profile-card__url" :title="profile.base_url">{{ profile.base_url }}</div>
          <div class="profile-card__key">
            key
            <PanelIcon v-if="profile.api_key_set" name="check" size="xs" tone="ok" />
            <span v-else>（未设置）</span>
            · 思考 {{ profile.thinking === 'enabled' ? '启用' : '禁用' }}
            · 推理 {{ profile.reasoning_effort }}
          </div>
        </div>

        <template #footer>
          <div class="profile-card__foot">
            <!-- DeepSeek：余额查询与展示（金额 + 分账行左、按钮右） -->
            <div
              v-if="isDeepSeekTarget(profile.provider, profile.base_url)"
              class="profile-card__balance"
            >
              <div class="profile-card__balance-col">
                <span
                  class="profile-card__balance-amount"
                  :class="balanceState(profile.name)"
                  :title="balanceTitle(profile.name)"
                >
                  {{ balanceState(profile.name) ? balanceText(profile.name) : '余额未查询' }}
                </span>
                <span v-if="balanceSubText(profile.name)" class="profile-card__balance-sub">
                  {{ balanceSubText(profile.name) }}
                </span>
              </div>
              <NeumorphismButton
                size="small"
                variant="glass"
                :loading="balanceLoading === profile.name"
                :disabled="balanceLoading !== null && balanceLoading !== profile.name"
                @click="queryBalance(profile.name)"
              >
                查余额
              </NeumorphismButton>
            </div>

            <!-- 余额 / 用量小图（近 7 天；Core 本地积累，有数据才显示） -->
            <div v-if="hasCardCharts(profile.name)" class="profile-card__charts">
              <div v-if="cardBalanceSeries(profile.name).length" class="profile-card__chart">
                <span class="profile-card__chart-label">余额 · 近 7 天</span>
                <NeumorphismChartLine
                  :series="cardBalanceSeries(profile.name)"
                  :height="56"
                  curve="smooth"
                  :area="true"
                  :show-axis="false"
                  :show-grid="false"
                  :show-points="false"
                  :show-legend="false"
                  :animate="false"
                  :value-formatter="balanceFmtFor(profile.name)"
                />
              </div>
              <div v-if="cardUsageSeries(profile.name).length" class="profile-card__chart">
                <span class="profile-card__chart-label">{{ usageLabel(profile.name) }}</span>
                <NeumorphismChartLine
                  :series="cardUsageSeries(profile.name)"
                  :height="56"
                  curve="smooth"
                  :area="true"
                  :show-axis="false"
                  :show-grid="false"
                  :show-points="false"
                  :show-legend="false"
                  :animate="false"
                  :value-formatter="tokenFmt"
                />
              </div>
            </div>

            <!-- 操作行：三按钮等宽网格 -->
            <div class="profile-card__actions">
              <NeumorphismButton
                size="small"
                variant="glass"
                :loading="testing === profile.name"
                :disabled="testing !== null && testing !== profile.name"
                @click="runTest(profile.name)"
              >
                测试
              </NeumorphismButton>
          <NeumorphismButton size="small" variant="glass" @click="openEdit(profile)">
                编辑
              </NeumorphismButton>
              <NeumorphismButton
                size="small"
                variant="glass"
                @click="sendCommand({ DeleteApi: { name: profile.name } })"
              >
                删除
              </NeumorphismButton>
            </div>

            <span
              v-if="testResultOf(profile.name)"
              class="profile-test"
              :class="testResultOf(profile.name)!.ok ? 'ok' : 'fail'"
            >
              <PanelIcon
                :name="testResultOf(profile.name)!.ok ? 'check' : 'close'"
                size="xs"
                :tone="testResultOf(profile.name)!.ok ? 'ok' : 'err'"
              />
              {{ testResultOf(profile.name)!.latencyMs }}ms
              <span class="profile-test-msg" :title="testResultOf(profile.name)!.message">
                {{ testResultOf(profile.name)!.message }}
              </span>
              <ChatCopyButton
                v-if="!testResultOf(profile.name)!.ok"
                class="profile-test-copy"
                :text="testResultOf(profile.name)!.message"
              />
            </span>
          </div>
        </template>
      </NeumorphismCard>
    </div>

    <!-- 联邦分布式供应商共享（2026-10）：从节点导入 -->
    <div v-if="formMode === 'none' && federatedPeers.length" class="api-remote-import">
      <div class="api-remote-import__row">
        <NeumorphismSelect
          v-model="importPeer"
          :options="federatedPeers.map((p) => ({ label: p, value: p }))"
          placeholder="选择联邦节点…"
          size="small"
        />
        <NeumorphismButton
          variant="glass"
          size="small"
          :disabled="!importPeer || remoteLoading"
          @click="queryRemoteProfiles"
        >
          {{ remoteLoading ? '查询中…' : '查询供应商' }}
        </NeumorphismButton>
      </div>
      <div v-if="remotePool?.error" class="api-remote-import__error muted">
        {{ remotePool.error }}
      </div>
      <div
        v-for="entry in remotePool?.profiles ?? []"
        :key="entry.name"
        class="api-remote-entry"
      >
        <span class="api-remote-entry__name">{{ entry.name }}</span>
        <span class="muted">{{ entry.provider }} / {{ entry.model }}</span>
        <span v-if="!entry.key_set" class="api-remote-entry__warn" title="远端未配置 key">
          <PanelIcon name="warning" size="xs" tone="warn" />
          无 key
        </span>
        <NeumorphismButton variant="glass" size="small" @click="importFromRemote(entry)">
          导入
        </NeumorphismButton>
      </div>
      <div
        v-if="remotePool && !remotePool.error && !(remotePool.profiles ?? []).length"
        class="muted"
      >
        （远端无自定义 profile；活跃默认：{{ remotePool.active?.provider ?? '—' }} /
        {{ remotePool.active?.model ?? '—' }}）
      </div>
    </div>

    <!-- 添加 API 服务商（概览态常驻；表单展开时隐藏） -->
    <div v-if="formMode === 'none'" class="profile-add-row">
      <NeumorphismButton variant="primary" @click="openAdd">+ 添加 API 服务商</NeumorphismButton>
    </div>
  </div>
</template>

<style scoped>
/* 页面宽度（2026-10 布局优化）：此前硬限 720px——1920 视口下详情面板可用
   1714px，闲置 58%。现跟随容器满宽，仅对超宽屏设 1600px 上限（避免 4K 下
   单行拉得过长反而难读）。 */
.api-settings-page {
  width: 100%;
  /* 上限 1920：≤1920 视口时基本满宽（详情面板内容宽 ≈1682，仅留边距）；
     更宽的屏（2560/4K）停在 1920，避免单行文本过长反而难读。 */
  max-width: 1920px;
}
/* 编辑表单（展开态） */
.api-form-section {
  border: 1px solid color-mix(in srgb, var(--panel-accent) 50%, transparent);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--panel-accent) 4%, transparent);
}
.api-form-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
}
.api-form-title {
  margin: 0;
  font-size: 14px;
  color: var(--nm-text-primary);
}
/* 添加入口 */
.profile-add-row {
  margin-top: 12px;
  display: flex;
}
/* Profiles 卡片网格（卡片本体 = ui-frame NeumorphismCard，槽位结构） */
.profile-grid {
  /* 卡片最小宽 240 → 340：1920 视口（内容宽 1682）自动 4 列 × 413px——
     实测 5 列（330px）会把 key 行与 sparkline 挤成多行，卡高 363 > 4 列的 284，
     整页反而更长。340 是「列数 × 单卡高度」的最优点；2560 宽屏自动升到 5 列。
     grid-auto-rows: 1fr 让同一行的卡片等高。 */
  display: grid;
  /* 同上：`min(340px, 100%)` 让极窄屏（320）也不会把卡片撑出容器。 */
  grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr));
  grid-auto-rows: 1fr;
  gap: 14px;
  margin-top: 10px;
}
/* 等高卡片（2026-10）：grid-auto-rows: 1fr 只保证同行等高，卡内需 flex 撑满，
   否则内容少的卡（无余额查询）下方留白不均。 */
/* ChatGPT 订阅登录块（2026-11）：出现在 provider 选择正下方 */
.chatgpt-login {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--nm-surface-color);
  border: 1px solid var(--nm-border-subtle);
}
.chatgpt-login__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chatgpt-login__title {
  font-size: 13px;
  font-weight: 600;
  flex: 1 1 auto;
}
.chatgpt-login__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.chatgpt-login__email {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}
.chatgpt-login__url {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--nm-border-subtle);
}
.chatgpt-login__url-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  justify-content: space-between;
}
.chatgpt-login__url-row {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}
/* URL 很长（含 PKCE challenge）：等宽 + 允许断行，不然会把卡片撑破 */
.chatgpt-login__url-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 11px;
  line-height: 1.5;
  word-break: break-all;
  max-height: 84px;
  overflow-y: auto;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--nm-surface-raised);
}
/* 局域网访问提醒：小一号、灰一点，但必须常显——这条提示缺失时用户只会
   看到浏览器的"无法访问此网站"，完全无法联想到回调落点问题。 */
.chatgpt-login__lan {
  font-size: 11px;
  line-height: 1.6;
}
.chatgpt-login__lan code {
  font-size: 11px;
  word-break: break-all;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--nm-surface-raised);
}

.chatgpt-login__error {
  font-size: 12px;
  color: var(--panel-err);
  white-space: pre-wrap;
  word-break: break-word;
}

.profile-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}
.profile-card > :deep(.nm-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
/* 编辑中：主色高亮（保留 nm-card 自身阴影） */
.profile-card--editing {
  outline: 1px solid var(--nm-primary-color);
}
/* header 槽：名称 + 编辑中标签 */
.profile-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 10px 14px 8px;
}
.profile-card__name {
  font-weight: 600;
  font-size: 13px;
  color: var(--nm-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* body 槽：供应商 / 地址 / 状态摘要 */
.profile-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 14px 10px;
  min-height: 62px;
}
.profile-card__line {
  font-size: 12px;
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-card__url {
  font-size: 11px;
  font-family: var(--nm-font-mono, monospace);
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-card__key {
  font-size: 11px;
  color: var(--nm-text-secondary);
}
/* footer 槽：余额行 + 操作行（统一纵向节奏） */
.profile-card__foot {
  /* 宽卡时「余额行 | 操作行」并排（各占一半），窄卡自动堆叠；
     操作行与余额行最小宽 200/180px，低于此值折行。 */
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px 12px;
}
.profile-card__foot > .profile-card__balance,
.profile-card__foot > .profile-card__actions {
  /* 220px 断点：多列布局（卡宽 ≈390 → 内容 362）时仍上下堆叠，
     单列宽卡（≥约 500px）才并排——避免小屏把两段挤在一起。 */
  flex: 1 1 220px;
  min-width: 0;
}
/* 余额行：金额列左（占满余宽、超长省略），按钮右固定 */
.profile-card__balance {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}
/* 金额列：主金额 + 分账行（充值 / 赠送） */
.profile-card__balance-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.profile-card__balance-amount {
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--nm-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-card__balance-amount.ok {
  color: var(--panel-ok);
}
.profile-card__balance-amount.fail {
  color: var(--panel-err);
  font-size: 11px;
  font-weight: 400;
}
/* 分账行：充值 / 赠送（小字、次要色） */
.profile-card__balance-sub {
  font-size: 10px;
  color: var(--nm-text-secondary);
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-card__balance .nm-button,
.profile-card__balance button {
  flex: 0 0 auto;
}
/* 卡片小图区：余额 / 用量 sparkline（近 7 天） */
.profile-card__charts {
  /* 宽卡时两张 sparkline 并排（自动按 150px 下限折行）——320px 卡单列、
     宽屏 5 列卡内也能横向铺满，不再空着右半边。 */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px 10px;
  padding-top: 2px;
}
.profile-card__chart {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.profile-card__chart-label {
  font-size: 10px;
  color: var(--nm-text-secondary);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 操作行：三按钮等宽网格（排版整齐，不随文本长度抖动） */
.profile-card__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.profile-card__actions > * {
  width: 100%;
}
/* 测试结果中的复制按钮（失败时附带的复制入口） */
.api-summary-result-copy,
.profile-test-copy {
  flex: 0 0 auto;
}
/* 摘要卡余额行 */
.api-summary-balance {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.api-summary-balance__amount {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.api-summary-balance.ok .api-summary-balance__amount {
  color: var(--panel-ok);
}
.api-summary-balance.fail .api-summary-balance__amount {
  color: var(--panel-err);
  font-size: 11px;
  font-weight: 400;
}
.api-remote-import {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--panel-hover);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.api-remote-import__row { display: flex; gap: 8px; align-items: center; }
.api-remote-import__row > *:first-child { flex: 1; }
.api-remote-import__error { font-size: 12px; }
.api-remote-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.api-remote-entry__name { font-weight: 600; }
.api-remote-entry__warn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--panel-warn, #9a6700);
  font-size: 12px;
}
/* 余额与用量总览（近 7 天；多 profile 对比） */
.api-metrics {
  margin: 4px 0 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.api-metrics__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.api-metrics__head h3 {
  margin: 0;
}
.api-metrics__hint {
  font-size: 12px;
}
.api-metrics__charts {
  /* 宽屏两张并排（各约占一半），窄屏自动堆叠。
     最小宽用 `min(420px, 100%)` 而不是裸 420px：裸值在 375px 屏上会让每个
     轨道仍占 420px（`auto-fit` 只影响列数，不会缩到比 min 更窄）——整个
     网格宽出容器 61px，图表得横向滑才看得全（2026-11 移动端体检实测：
     `.api-metrics__chart w=420`，detail 面板 scrollWidth 432 > client 359）。 */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr));
  gap: 14px;
}
.api-metrics__chart {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.api-metrics__chart-title {
  font-size: 12px;
  color: var(--nm-text-secondary);
}
.api-metrics__cost {
  font-size: 12px;
}
</style>
