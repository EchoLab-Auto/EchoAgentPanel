import { useEffect, useState } from 'react';
import type { ApiConfig } from '../state';
import type { BackendCommand } from '../protocol';

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
          <label>Provider</label>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="deepseek / anthropic / openai" />
          <label>Model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-v4-flash" />
          <label>Base URL</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/anthropic" />
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
