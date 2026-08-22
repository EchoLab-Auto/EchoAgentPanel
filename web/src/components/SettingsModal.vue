<script setup lang="ts">
//! API 设置弹窗：快速模板、Provider 表单、Profiles 管理（新建/编辑/切换/删除）。

import { computed, ref, watch } from 'vue';
import {
  NeumorphismButton,
  NeumorphismInput,
  NeumorphismModal,
  NeumorphismSelect,
  NeumorphismTag,
} from '@echolab-auto/ui-frame';
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

// 预配置模板：选中后自动填充表单字段，只需填 API Key 即可保存。
const TEMPLATES: ApiTemplate[] = [
  {
    key: 'deepseek-anthropic',
    label: 'DeepSeek（Anthropic 兼容）',
    provider: 'deepseek',
    base_url: 'https://api.deepseek.com/anthropic',
    model: 'deepseek-v4-flash',
    thinking: 'enabled',
    reasoning: 'max',
    hint: '支持思考模式与推理强度',
  },
  {
    key: 'deepseek-openai',
    label: 'DeepSeek（OpenAI 兼容）',
    provider: 'deepseek',
    base_url: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    thinking: 'enabled',
    reasoning: 'max',
    hint: 'OpenAI 格式端点',
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

const visible = defineModel<boolean>({ required: true });

const api = computed(() => state.api);

const provider = ref('');
const model = ref('');
const baseUrl = ref('');
const apiKey = ref('');
const thinking = ref<'enabled' | 'disabled'>('enabled');
const reasoning = ref<'low' | 'high' | 'max'>('max');
const profileName = ref('');
/** 正在编辑的 profile 名；null = 默认配置模式（顶部表单） */
const editingProfile = ref<string | null>(null);
/** 测试中的目标（空 = 默认配置；否则 profile 名） */
const testing = ref<string | null>(null);
/** 测试结果缓存（name → 结果），运行时覆盖 state.apiTests 便于显示 */
const testResults = ref<Record<string, { ok: boolean; message: string; latencyMs: number }>>({});

// 打开弹窗时清空旧测试结果
watch(visible, (open) => {
  if (open) {
    testResults.value = {};
  }
});

function testResultOf(name: string) {
  return testResults.value[name] ?? state.apiTests[name] ?? null;
}

async function runTest(name: string) {
  testing.value = name;
  try {
    sendCommand({ TestApi: { name } });
  } catch {
    testing.value = null;
  }
}

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

function initFromApi() {
  const current = api.value;
  if (!current) return;
  fillForm(current);
  profileName.value = '';
  editingProfile.value = null;
  apiKey.value = '';
}

// 打开时与 api 更新（含保存后的回播）时重置表单 —— 与 React 版 useEffect([api]) 对齐。
watch([visible, api], ([open]) => {
  if (open) initFromApi();
});

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
  }
  // third-party：保留手动输入的 base_url / model，仅切换 provider 名。
}

// 当前 provider 不在下拉选项中时（如旧配置 anthropic/ollama），保留为额外选项。
const providerSelectOptions = computed(() => {
  const options = [
    { label: 'DeepSeek', value: 'deepseek' },
    { label: 'OpenAI', value: 'openai' },
    { label: '第三方（OpenAI 兼容）', value: 'third-party' },
  ];
  const current = provider.value;
  if (current && !['deepseek', 'openai', 'third-party'].includes(current)) {
    options.push({ label: `${current}（现有配置）`, value: current });
  }
  return options;
});

const providerSelectValue = computed(() =>
  providerSelectOptions.value.some((o) => o.value === provider.value)
    ? provider.value
    : 'third-party',
);

/** 表单标题：默认模式显示"默认配置"，编辑模式显示 profile 名 */
const formTitle = computed(() =>
  editingProfile.value ? `编辑 Profile · ${editingProfile.value}` : '默认配置',
);

/** 顶部保存按钮文案 */
const saveDefaultLabel = computed(() =>
  editingProfile.value ? `保存到 ${editingProfile.value}` : '保存为默认',
);

/** 点击"编辑"：填充表单为该 profile 并进入编辑模式 */
function editProfile(profile: ApiProfile) {
  editingProfile.value = profile.name;
  fillForm(profile);
  apiKey.value = '';
}

/** 退出编辑模式，恢复默认表单 */
function cancelEdit() {
  editingProfile.value = null;
  initFromApi();
}

/** 保存顶部表单：编辑模式 → 存回 profile；默认模式 → 存为默认 */
function saveTopLevel() {
  sendCommand({
    UpdateApiConfig: {
      name: editingProfile.value ?? '',
      provider: provider.value,
      model: model.value,
      base_url: baseUrl.value,
      api_key: apiKey.value,
      thinking: thinking.value,
      reasoning_effort: reasoning.value,
    },
  });
  apiKey.value = '';
  // 保存后若为编辑模式，保持编辑状态（表单继续可见），api 回播会刷新数据。
}

/** 保存为（新的）profile：无论当前是否编辑中，都以 profileName 为准新建/覆盖 */
function saveAsNewProfile() {
  const name = profileName.value.trim();
  if (!name) return;
  editingProfile.value = null;
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
  profileName.value = '';
}
</script>

<template>
  <NeumorphismModal
    v-model="visible"
    title="API 设置"
    size="large"
    :footer="false"
    :mask-closable="false"
    @keydown.esc.stop
  >
    <div class="settings-form">
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

      <!-- 表单标题 + 编辑模式指示 -->
      <div class="form-title-row">
        <h3 class="form-title">{{ formTitle }}</h3>
        <NeumorphismTag v-if="editingProfile" variant="warning" size="small">
          编辑中
        </NeumorphismTag>
        <NeumorphismButton
          v-if="editingProfile"
          size="small"
          variant="flat"
          @click="cancelEdit"
        >
          取消编辑
        </NeumorphismButton>
      </div>

      <label>Provider</label>
      <NeumorphismSelect
        :model-value="providerSelectValue"
        :options="providerSelectOptions"
        @change="applyProviderPreset"
      />
      <label>Model</label>
      <NeumorphismInput v-model="model" placeholder="deepseek-v4-flash" />
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
          variant="flat"
          :loading="testing === (editingProfile ?? '')"
          :disabled="testing !== null && testing !== (editingProfile ?? '')"
          @click="runTest(editingProfile ?? '')"
        >
          测试连接
        </NeumorphismButton>
        <NeumorphismButton variant="primary" @click="saveTopLevel">
          {{ saveDefaultLabel }}
        </NeumorphismButton>
      </div>
      <div v-if="testResultOf(editingProfile ?? '')" class="api-test-result" :class="testResultOf(editingProfile ?? '')!.ok ? 'ok' : 'fail'">
        <span class="api-test-badge">{{ testResultOf(editingProfile ?? '')!.ok ? '✓ 连通' : '✗ 失败' }}</span>
        <span class="api-test-message">{{ testResultOf(editingProfile ?? '')!.message }}</span>
        <span class="api-test-latency">{{ testResultOf(editingProfile ?? '')!.latencyMs }}ms</span>
      </div>

      <hr />
      <h3>API Profiles</h3>
      <div v-if="!api?.profiles || api.profiles.length === 0" class="muted">（暂无 profile）</div>
      <div
        v-for="profile in api?.profiles"
        :key="profile.name"
        class="profile-item"
        :class="{ 'profile-item--editing': editingProfile === profile.name }"
      >
        <span class="profile-name">
          {{ profile.name }}
          <NeumorphismTag v-if="api?.active_api === profile.name" variant="success" size="small">
            激活
          </NeumorphismTag>
          <NeumorphismTag v-if="editingProfile === profile.name" variant="warning" size="small">
            编辑中
          </NeumorphismTag>
        </span>
        <span class="muted">
          {{ profile.provider }} / {{ profile.model }}{{ profile.api_key_set ? ' · key ✓' : ' · 无 key' }}
        </span>
        <span class="profile-actions">
          <NeumorphismButton
            size="small"
            variant="flat"
            :loading="testing === profile.name"
            :disabled="testing !== null && testing !== profile.name"
            @click="runTest(profile.name)"
          >
            测试
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            @click="editProfile(profile)"
          >
            编辑
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            @click="sendCommand({ SwitchApi: { name: profile.name } })"
          >
            切换
          </NeumorphismButton>
          <NeumorphismButton
            size="small"
            variant="flat"
            @click="sendCommand({ DeleteApi: { name: profile.name } })"
          >
            删除
          </NeumorphismButton>
        </span>
        <span
          v-if="testResultOf(profile.name)"
          class="profile-test"
          :class="testResultOf(profile.name)!.ok ? 'ok' : 'fail'"
        >
          {{ testResultOf(profile.name)!.ok ? '✓' : '✗' }}
          {{ testResultOf(profile.name)!.latencyMs }}ms
          <span class="profile-test-msg">{{ testResultOf(profile.name)!.message }}</span>
        </span>
      </div>
      <div class="form-row profile-new">
        <NeumorphismInput v-model="profileName" placeholder="新 profile 名称" />
        <NeumorphismButton
          size="small"
          :disabled="!profileName.trim()"
          @click="saveAsNewProfile"
        >
          保存为新 profile
        </NeumorphismButton>
      </div>
    </div>
  </NeumorphismModal>
</template>

<style scoped>
.form-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 2px;
}
.form-title {
  margin: 0;
  font-size: 14px;
  color: var(--nm-text-primary);
}
.profile-item--editing {
  outline: 1px solid var(--nm-primary-color);
  border-radius: 6px;
  padding-left: 6px;
  background: color-mix(in srgb, var(--nm-primary-color) 8%, transparent);
}
</style>
