<script setup lang="ts">
//! API 设置页（设置视图的工作区面板）：概览视图（当前配置摘要卡 + Profiles 列表）+
//! 按需展开的编辑表单（点击「编辑」/「添加 API 服务商」时出现，保存/收起后回到概览）。
//! 由设置视图整页渲染（原为 SettingsModal 弹窗）；样式类复用 styles.css 全局定义。

import { computed, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismCard,
  NeumorphismInput,
  NeumorphismSelect,
  NeumorphismTag,
} from '@echolab-auto/ui-frame';
import { ChatCopyButton } from '@echolab-auto/ui-frame/chat';
import { state } from '../store';
import { sendCommand } from '../connection';

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

function setDefaultProfile(profile: ApiProfile) {
  sendCommand({ UpdateApiConfig: { name: '', provider: profile.provider, model: profile.model, base_url: profile.base_url, api_key: '', thinking: profile.thinking, reasoning_effort: profile.reasoning_effort } });
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

/** 余额展示文本：成功 = 币种符号 + 金额；失败 = 错误消息 */
function balanceText(name: string): string {
  const b = state.apiBalances[name];
  if (!b) return '';
  if (!b.ok) return b.message;
  const symbol = b.currency === 'CNY' ? '¥' : b.currency === 'USD' ? '$' : '';
  return `${symbol}${b.total}${b.currency && !symbol ? ' ' + b.currency : ''}`;
}

/** 余额状态：ok=成功；fail=失败（展示错误文本样式） */
function balanceState(name: string): 'ok' | 'fail' | '' {
  const b = state.apiBalances[name];
  if (!b) return '';
  return b.ok ? 'ok' : 'fail';
}

function queryBalance(name: string) {
  // 加载态互斥：一次只能查询一个目标
  if (balanceLoading.value !== null && balanceLoading.value !== name) return;
  balanceLoading.value = name;
  sendCommand({ QueryApiBalance: { name } });
}

// 余额结果到达 → 解除加载态（按目标字段跟踪，reducer 原地深变异）。
watch(
  () => (balanceLoading.value !== null ? state.apiBalances[balanceLoading.value] : undefined),
  (val) => {
    if (val) balanceLoading.value = null;
  },
);

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
            <NeumorphismTag v-if="api?.active_api === profile.name" variant="primary" size="small">默认</NeumorphismTag>
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
            <!-- DeepSeek：余额查询与展示（独占一行，金额左、按钮右） -->
            <div
              v-if="isDeepSeekTarget(profile.provider, profile.base_url)"
              class="profile-card__balance"
            >
              <span
                class="profile-card__balance-amount"
                :class="balanceState(profile.name)"
                :title="state.apiBalances[profile.name]?.message"
              >
                {{ balanceState(profile.name) ? balanceText(profile.name) : '余额未查询' }}
              </span>
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
              <NeumorphismButton v-if="api?.active_api !== profile.name" size="small" variant="glass" @click="setDefaultProfile(profile)">设为默认</NeumorphismButton>
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
/* 余额行：金额左（占满余宽、超长省略），按钮右固定 */
.profile-card__balance {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}
.profile-card__balance-amount {
  flex: 1;
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
.profile-card__balance .nm-button,
.profile-card__balance button {
  flex: 0 0 auto;
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
</style>
