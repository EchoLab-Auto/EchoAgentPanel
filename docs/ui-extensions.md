# Panel UI 扩展

Panel 壳不内置业务模块 UI。扩展在**构建期显式**组合，没有远程脚本下载或运行时
执行未知代码的隐式入口。未配置扩展时，构建产物只包含 Panel 壳与内置管理界面。

## 扩展包

```text
my-extension/
├── panel-extension.json
├── index.ts
└── components/...
```

`panel-extension.json`：

```json
{ "id": "example.module", "entry": "index.ts" }
```

`index.ts` 使用公开 SDK（禁止穿透引用 Panel 私有路径）：

```ts
import { definePanelExtension, registerPanelExtension } from '@echo-agent/panel';
import ExamplePanel from './components/ExamplePanel.vue';

registerPanelExtension(definePanelExtension({
  id: 'example.module',
  railCardSlots: ['summary'],
  entries: [{
    id: 'manage', label: '示例', icon: 'folder',
    when: ({ teamId }) => Boolean(teamId),
    prefetch: ({ teamId }) => { /* 可选：预热业务数据 */ },
  }],
  overlays: [{ id: 'manage', label: '示例管理', component: ExamplePanel }],
  railCards(teamId) { /* 返回动态卡片、门控、标题、计数 */ return []; },
  hooks: {
    setup(context) { /* 安装响应式 watcher */ },
    teamLanding(teamId) { return null; },
    beforeSessionPick(sessionId, context) {},
    sessionPresentation(session) { return null; },
    canConfigureSessionApi(session) { return false; },
    acceptEvent(event) { return true; },
  },
}));
```

扩展 id 会成为 UI 命名空间，例如 `extension:example.module:manage`。扩展复用 Panel
的 Vue、ui-frame、弹层互斥、卡片拖动/折叠和布局持久化；数据请求与业务能力门控由
扩展自己负责。

## 安装与更新

```bash
# 纯 Panel（默认）
scripts/install.sh --scope system

# 显式加入扩展；参数可重复
scripts/install.sh --scope system --ui-extension /path/to/my-extension

# 清空之前保存的扩展，恢复纯 Panel
scripts/install.sh --scope system --no-ui-extensions
```

也可在构建前设置冒号分隔的 `PANEL_UI_EXTENSIONS=/path/a:/path/b`。安装器把列表保存到
`$XDG_STATE_HOME/echo-agent-panel/ui-extensions`，后续 `scripts/update.sh` 保留同一组成。
扩展目录必须存在且包含 manifest；依赖与类型由 Panel 构建统一检查。

## 本地验证

```bash
cd web
npm run build
npm test

PANEL_UI_EXTENSIONS=/path/to/crate-workspace/panel-ui npm run build
PANEL_UI_EXTENSIONS=/path/to/crate-workspace/panel-ui npm test
```

第二种模式会同时类型检查并运行扩展包内的测试。
