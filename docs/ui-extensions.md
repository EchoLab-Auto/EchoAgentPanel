# Panel UI 扩展

## 边界原则（先读这一节）

**Panel 只提供"布置 UI 的接口"，供模块调用；Panel 的概念空间里没有外部模块的
具体实现。**

这句话可以从两侧读，两边都是硬约束：

| 侧 | 含义 | 判据 |
| --- | --- | --- |
| Panel 提供什么 | **插槽与机制**：入口按钮位、覆盖层外壳、主区视图、边栏卡片、事件钩子、命令发送、身份上下文（`teamId` / `sessionId` / `core`） | 新增一个模块只改模块仓，不改 Panel 源码 |
| Panel 不提供什么 | **任何模块的业务实现**：不 import 模块的数据类型、不写模块的 reducer、不按模块名或工具名特判、不内置模块的面板组件 | 壳里 `grep` 不到该模块的任何标识符 |

三条推论（写代码时按它们判对错）：

1. **不认识名字**：壳不出现 `checklist` / `workspace` / `prodoc` 之类模块 id、
   工具名或事件名。业务词汇只出现在模块自己的扩展里；壳只搬运不解释。
2. **不占内存槽**：模块的投影（清单列表、文档树…）不进 `AppState`。壳的状态只
   描述"壳自己"（连接、时间线、选择），模块状态住在模块的扩展里。
   ——派生的通用键（如 `sessionScopedKey`）可以留在壳，它是**机制**不是业务。
3. **不拆扩展的能力**：模块要读数据就用通用通道（`InvokeModuleOp` 发命令 +
   `ModuleEvent` / `ModuleInvokeResult` 收应答），要写界面就用扩展插槽。壳不
   为某个模块新开一条专用命令或专用事件——那会让"模块可插拔"退化成"壳里加分支"。

历史注脚（为什么要写这一节）：清单（`echo-agent.checklist`）曾经是反例——壳里
有 427 行投影 + 105 行命令封装 + 89 行组件 + reducer 分支 + 入口按钮 + 类型定义，
约 900 行只服务一个模块。它在 2026-11-21 迁进模块自己的 `panel-ui/`，壳里现在
0 处提及。迁移做对之后，同一套插槽同时服务 workspace / prodoc / checklist 三个
模块，谁也没资格要求壳为它加分支。

## 扩展包

Panel 壳不内置业务模块 UI。扩展在**构建期显式**组合，没有远程脚本下载或运行时
执行未知代码的隐式入口。未配置扩展时，构建产物只包含 Panel 壳与内置管理界面。

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
