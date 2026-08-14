const COMMANDS: Array<[string, string, string]> = [
  ['/api key <key>', '设置 API Key（仅内存，重启后需重新设置直到持久化修复生效）', 'API'],
  ['/api model <model>', '切换模型（持久化）', 'API'],
  ['/api provider <provider>', '切换 provider（持久化）', 'API'],
  ['/api base_url <url>', '设置 Base URL', 'API'],
  ['/api profile save <name>', '保存当前配置为新 profile', 'API'],
  ['/api profile switch <name>', '切换到指定 profile', 'API'],
  ['/api profile delete <name>', '删除 profile', 'API'],
  ['/api system_prompt <text>', '设置 System Prompt（持久化）', 'API'],
  ['/adapters [start|stop|restart] <name>', '管理适配器', '适配器'],
  ['/qq setting', 'QQ 门控 / 白名单 / 黑名单 / 管理员', 'QQ'],
  ['/context', '查看当前 trunk 上下文快照', '上下文'],
  ['/timeline', '请求持久化时间线', '上下文'],
  ['/help', '显示本帮助', '其他'],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>帮助与命令</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="muted">
            面板通过 WebSocket 直连 EchoAgentCore management 服务。sudo 授权、API 设置、
            QQ 管理都在界面上完成；下列斜杠命令可直接在聊天输入框使用。
          </p>
          <table className="help-table">
            <thead>
              <tr><th>命令</th><th>说明</th></tr>
            </thead>
            <tbody>
              {COMMANDS.map(([command, description]) => (
                <tr key={command}>
                  <td><code>{command}</code></td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
