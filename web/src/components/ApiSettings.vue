<script setup lang="ts">
//! API 设置页（设置视图的工作区面板）：概览视图（Profiles 列表）+
//! 按需展开的编辑表单（点击「编辑」/「添加 API 服务商」时出现，保存/收起后回到概览）。
//! 由设置视图整页渲染（原为 SettingsModal 弹窗）；样式类复用 styles.css 全局定义。
//!
//! 2026-09-14：「默认」标记与「设为默认」按钮已移除（默认提供商功能去除）——
//! profiles 只是可供 persona 引用的供应商池，不再有"哪个是默认"的概念。

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCard,
  NeumorphismChartLine,
  NeumorphismInput,
  NeumorphismSelect,
  NeumorphismTag,
} from '@echolab-auto/ui-frame';
import { ChatCopyButton } from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
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
    hint: 'Kimi Code 订阅（Anthropic 兼容）；Key 在 www.kimi.com/code/console 创建',
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
/** 正在编辑的 profile 名（仅 edit 模式） */
const editingProfile = ref<string | null>(null);
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

/** 表单测试的目标：编辑模式 = 该 profile；添加模式 = 默认配置 */
const formTarget = computed(() => (formMode.value === 'edit' ? (editingProfile.value ?? '') : ''));

const formTitle = computed(() =>
  formMode.value === 'edit' ? `编辑 Profile · ${editingProfile.value}` : '新增 API 服务商',
);

const saveLabel = computed(() =>
  formMode.value === 'edit' ? `保存到 ${editingProfile.value}` : '保存',
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
  profileName.value = '';
  fillForm(profile);
  apiKey.value = '';
  resetFormResults();
}

function openAdd() {
  formMode.value = 'add';
  editingProfile.value = null;
  profileName.value = '';
  // 添加模式：空表单，Provider 默认第三方（OpenAI 兼容），快速模板可一键填充
  provider.value = 'third-party';
  model.value = '';
  baseUrl.value = '';
  thinking.value = 'enabled';
  reasoning.value = 'max';
  apiKey.value = '';
  resetFormResults();
}

function closeForm() {
  formMode.value = 'none';
  editingProfile.value = null;
  profileName.value = '';
  apiKey.value = '';
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
  }
  // third-party：保留手动输入的 base_url / model，仅切换 provider 名。
}

// 当前 provider 不在下拉选项中时（如旧配置 anthropic/ollama），保留为额外选项。
const providerSelectOptions = computed(() => {
  const options = [
    { label: 'DeepSeek', value: 'deepseek' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Kimi For Coding', value: 'kimi' },
    { label: '第三方（OpenAI 兼容）', value: 'third-party' },
  ];
  const current = provider.value;
  if (current && !['deepseek', 'openai', 'kimi', 'third-party'].includes(current)) {
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
    ? `近 7 天估算费用：${parts.join(' · ')}（按 [agent.pricing] 定价估算，未计缓存优惠）`
    : '';
});

/** 保存：编辑模式存回 profile；添加模式以名称为准新建/覆盖 */
function saveForm() {
  const name =
    formMode.value === 'edit' ? (editingProfile.value ?? '') : profileName.value.trim();
  if (formMode.value === 'add' && !name) return;
  sendCommand({
    UpdateApiConfig: {
      name,
      provider: provider.value,
      model: model.value,
      base_url: baseUrl.value,
      api_key: apiKey.value,
      thinking: thinking.value,
      reasoning_effort: reasoning.value,
    },
  });
  apiKey.value = '';
  // 保存成功（core 回推 ApiConfigUpdated）后由下方 watch 收起表单
}

// 保存回播（ApiConfigUpdated 重建 state.api 引用）→ 收起表单回到概览
watch(api, () => {
  if (formMode.value !== 'none') closeForm();
});

// 编辑中的 profile 被删除（DeleteApi 立即生效）→ 收起表单
watch(
  () => api.value?.profiles,
  (val) => {
    if (
      formMode.value === 'edit' &&
      editingProfile.value &&
      val &&
      !val.some((p) => p.name === editingProfile.value)
    ) {
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
        <NeumorphismInput :model-value="editingProfile ?? ''" disabled />
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
          :disabled="formMode === 'add' && !profileName.trim()"
          @click="saveForm"
        >
          {{ saveLabel }}
        </NeumorphismButton>
        <NeumorphismButton variant="glass" @click="closeForm">取消</NeumorphismButton>
      </div>
      <div
        v-if="formResultOf()"
        class="api-test-result"
        :class="formResultOf()!.ok ? 'ok' : 'fail'"
      >
        <span class="api-test-badge">{{ formResultOf()!.ok ? '✓ 连通' : '✗ 失败' }}</span>
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
              :height="170"
              curve="smooth"
              :area="true"
              :show-axis="false"
              :show-grid="false"
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
              :height="170"
              curve="smooth"
              :area="true"
              :show-axis="false"
              :show-grid="false"
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
        radius="large"
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
            {{ profile.api_key_set ? 'key ✓' : '无 key' }}
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
              {{ testResultOf(profile.name)!.ok ? '✓' : '✗' }}
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
          ⚠ 无 key
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
.api-settings-page {
  max-width: 720px;
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 10px;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px;
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
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.api-remote-entry__warn { color: var(--panel-warn, #9a6700); font-size: 12px; }
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
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
