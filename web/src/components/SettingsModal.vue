<script setup lang="ts">
//! API 设置弹窗：快速模板、Provider 表单、Profiles 管理。

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

function initFromApi() {
  const current = api.value;
  if (!current) return;
  provider.value = current.provider;
  model.value = current.model;
  baseUrl.value = current.base_url;
  thinking.value = current.thinking;
  reasoning.value = current.reasoning_effort;
}

// 打开时与 api 更新（含保存后的回播）时重置表单 —— 与 React 版 useEffect([api]) 对齐。
watch([visible, api], ([open]) => {
  if (open) initFromApi();
});

function applyTemplate(t: ApiTemplate) {
  provider.value = t.provider;
  model.value = t.model;
  baseUrl.value = t.base_url;
  thinking.value = t.thinking;
  reasoning.value = t.reasoning;
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
  const current = api.value?.provider ?? '';
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

function saveTopLevel(asProfile: boolean) {
  sendCommand({
    UpdateApiConfig: {
      name: asProfile ? profileName.value.trim() : '',
      provider: provider.value,
      model: model.value,
      base_url: baseUrl.value,
      api_key: apiKey.value,
      thinking: thinking.value,
      reasoning_effort: reasoning.value,
    },
  });
  apiKey.value = '';
}
</script>

<template>
  <NeumorphismModal v-model="visible" title="API 设置" size="large" :footer="false">
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
        <NeumorphismButton variant="primary" @click="saveTopLevel(false)">保存为默认</NeumorphismButton>
      </div>

      <hr />
      <h3>API Profiles</h3>
      <div v-if="!api?.profiles || api.profiles.length === 0" class="muted">（暂无 profile）</div>
      <div v-for="profile in api?.profiles" :key="profile.name" class="profile-item">
        <span class="profile-name">
          {{ profile.name }}
          <NeumorphismTag v-if="api?.active_api === profile.name" variant="success" size="small">
            激活
          </NeumorphismTag>
        </span>
        <span class="muted">
          {{ profile.provider }} / {{ profile.model }}{{ profile.api_key_set ? ' · key ✓' : ' · 无 key' }}
        </span>
        <span class="profile-actions">
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
      </div>
      <div class="form-row profile-new">
        <NeumorphismInput v-model="profileName" placeholder="新 profile 名称" />
        <NeumorphismButton
          size="small"
          :disabled="!profileName.trim()"
          @click="saveTopLevel(true)"
        >
          保存为新 profile
        </NeumorphismButton>
      </div>
    </div>
  </NeumorphismModal>
</template>
