import { useEffect, useState } from 'react';
import type { ApiConfig } from '../state';
import type { BackendCommand } from '../protocol';

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

export function SettingsModal({
  api,
  sendCommand,
  onClose,
}: {
  api: ApiConfig | null;
  sendCommand: (command: BackendCommand) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState(api?.provider ?? '');
  const [model, setModel] = useState(api?.model ?? '');
  const [baseUrl, setBaseUrl] = useState(api?.base_url ?? '');
  const [apiKey, setApiKey] = useState('');
  const [thinking, setThinking] = useState(api?.thinking ?? 'enabled');
  const [reasoning, setReasoning] = useState(api?.reasoning_effort ?? 'max');
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (api) {
      setProvider(api.provider);
      setModel(api.model);
      setBaseUrl(api.base_url);
      setThinking(api.thinking);
      setReasoning(api.reasoning_effort);
    }
  }, [api]);

  const applyTemplate = (t: ApiTemplate) => {
    setProvider(t.provider);
    setModel(t.model);
    setBaseUrl(t.base_url);
    setThinking(t.thinking);
    setReasoning(t.reasoning);
  };

  // Provider 预配置：选择常见服务商时自动填充 base_url / model。
  const applyProviderPreset = (value: string) => {
    setProvider(value);
    if (value === 'deepseek') {
      setBaseUrl('https://api.deepseek.com/anthropic');
      setModel('deepseek-v4-flash');
      setThinking('enabled');
      setReasoning('max');
    } else if (value === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4o');
      setThinking('disabled');
      setReasoning('low');
    }
    // third-party：保留手动输入的 base_url / model，仅切换 provider 名。
  };

  // 当前 provider 不在下拉选项中时（如旧配置 anthropic/ollama），保留为额外选项。
  const providerOptions = ['deepseek', 'openai', 'third-party'];
  const currentProvider = api?.provider ?? '';
  if (currentProvider && !providerOptions.includes(currentProvider)) {
    providerOptions.push(currentProvider);
  }

  const saveTopLevel = (asProfile: boolean) => {
    sendCommand({
      UpdateApiConfig: {
        name: asProfile ? profileName.trim() : '',
        provider,
        model,
        base_url: baseUrl,
        api_key: apiKey,
        thinking: thinking as 'enabled' | 'disabled',
        reasoning_effort: reasoning as 'low' | 'high' | 'max',
      },
    });
    setApiKey('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>API 设置</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body settings-form">
          <label>快速模板</label>
          <div className="template-grid">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                className="template-item"
                onClick={() => applyTemplate(t)}
                title={t.hint}
              >
                <span className="template-name">{t.label}</span>
                <span className="template-hint">{t.hint}</span>
              </button>
            ))}
          </div>

          <label>Provider</label>
          <select
            value={providerOptions.includes(provider) ? provider : 'third-party'}
            onChange={(e) => applyProviderPreset(e.target.value)}
          >
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
            <option value="third-party">第三方（OpenAI 兼容）</option>
            {currentProvider && !providerOptions.slice(0, 3).includes(currentProvider) && (
              <option value={currentProvider}>{currentProvider}（现有配置）</option>
            )}
          </select>
          <label>Model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-v4-flash" />
          <label>Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={
              provider === 'third-party'
                ? 'https://你的网关/v1（OpenAI 兼容，如 one-api / new-api）'
                : 'https://api.deepseek.com/anthropic'
            }
          />
          {provider === 'third-party' && (
            <div className="muted field-hint">第三方服务需为 OpenAI 兼容接口；若网关提供 /anthropic 端点也会自动识别。</div>
          )}
          <label>API Key {api?.api_key_set ? '（已设置，留空保持不变）' : '（未设置）'}</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={api?.api_key_set ? '••••••••' : '输入 API Key'}
          />
          <div className="form-row">
            <div>
              <label>思考模式</label>
              <select value={thinking} onChange={(e) => setThinking(e.target.value as 'enabled' | 'disabled')}>
                <option value="enabled">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
            <div>
              <label>推理强度</label>
              <select value={reasoning} onChange={(e) => setReasoning(e.target.value as "low" | "high" | "max")}>
                <option value="low">low</option>
                <option value="high">high</option>
                <option value="max">max</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={() => saveTopLevel(false)}>保存为默认</button>
          </div>

          <hr />
          <h3>API Profiles</h3>
          {(!api?.profiles || api.profiles.length === 0) && <div className="muted">（暂无 profile）</div>}
          {api?.profiles.map((profile) => (
            <div key={profile.name} className="profile-item">
              <span className="profile-name">
                {profile.name}
                {api.active_api === profile.name && <span className="profile-active">激活</span>}
              </span>
              <span className="muted">
                {profile.provider} / {profile.model}
                {profile.api_key_set ? ' · key ✓' : ' · 无 key'}
              </span>
              <span className="profile-actions">
                <button onClick={() => sendCommand({ SwitchApi: { name: profile.name } })}>切换</button>
                <button onClick={() => sendCommand({ DeleteApi: { name: profile.name } })}>删除</button>
              </span>
            </div>
          ))}
          <div className="form-row profile-new">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="新 profile 名称"
            />
            <button disabled={!profileName.trim()} onClick={() => saveTopLevel(true)}>
              保存为新 profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
