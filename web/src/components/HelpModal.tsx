const FEATURES: Array<[string, string]> = [
  ['聊天', '与 Agent 对话；支持会话切换、取消任务、复制与折叠消息'],
  ['QQ', '适配器管理：登录状态、门控模式、白名单/黑名单、群与好友选择'],
  ['任务', '后台任务 / 并行任务 / Subagent / 临时回复分支的实时进度与取消'],
  ['清单', 'Checklist 工具创建的待办清单查看'],
  ['上下文', 'trunk 上下文分块可视化：token 占用、系统提示词分块、历史聚合'],
  ['系统提示词', '查看与修改系统提示词插件文本'],
  ['日志', '查看 Core / Panel 运行日志（自动刷新）'],
  ['设置', 'API 配置：Provider 下拉（deepseek/openai/third-party）、快速模板、Profiles'],
  ['临时分支', '长任务执行期间在侧边栏单开标签实时查看，结束后以折叠合并块归档'],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>帮助</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="muted">
            面板通过 WebSocket 直连 EchoAgentCore management 服务。所有管理功能都在界面上完成：
          </p>
          <table className="help-table">
            <thead>
              <tr><th>功能</th><th>说明</th></tr>
            </thead>
            <tbody>
              {FEATURES.map(([feature, description]) => (
                <tr key={feature}>
                  <td><strong>{feature}</strong></td>
                  <td>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            提示：斜杠命令（/api、/context 等）属于 TUI 前端命令，在 Panel 聊天框输入不会生效；
            请使用顶部对应的功能按钮。
          </p>
        </div>
      </div>
    </div>
  );
}
