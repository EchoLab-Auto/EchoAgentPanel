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
0 处提及。随后 workspace（8 个 state 字段 + 3 个 reducer 臂）与 subagent
（`state.tasks` + `TasksPanel` + 按工具名匹配的 `tool-kinds`）也在 2026-11-22
迁出。迁移做对之后，同一套插槽同时服务四个模块，谁也没资格要求壳为它加分支。

### 两条实践约定（迁移踩出来的）

1. **问句归壳、答案归模块**。壳里有些通用机制天然要知道模块的状态（回合收尾
   要不要把工具行收尾、工具行显示什么标签与图标、重连要不要清缓存、上游移除
   要不要回收）。做法是**加通用钩子**（`sessionBusy` / `toolPresentation` /
   `onCoreRemoved`），而不是让壳读某个模块的字段——后者一旦写下去，模块再也
   搬不走。
2. **模块投影要自己解决响应式**。搬出壳的 `reactive` `AppState` 后，普通对象
   的赋值不会触发重算。约定做法：模块维护一个结构版本号 `ref`（如
   `workspaceRevision` / `storeRevision`），**每个**读投影的 computed 都读它
   一次——只让上层 computed 读会踩 Vue 的短路（布尔没变 → 下游不重算，数据
   换了也白换）。

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
  entries: [{
    id: 'manage', label: '示例', icon: 'folder',
    when: ({ teamId }) => Boolean(teamId),
    prefetch: ({ teamId }) => { /* 可选：预热业务数据 */ },
    // 可选：右上角数字徽标（壳只渲染数字，含义由扩展决定）
    badge: ({ sessionId }) => 0,
  }],
  hooks: {
    setup(context) { /* 安装响应式 watcher */ },
    teamLanding(teamId) { return null; },
    beforeSessionPick(sessionId, context) {},
    sessionPresentation(session) { return null; },
    canConfigureSessionApi(session) { return false; },
    acceptEvent(event) { return true; },
    // 壳的"通用问句"：答案由扩展给，壳因此不必持有模块状态
    sessionBusy(core, sessionId, kind) { return false; },
    toolPresentation({ name, input }) { return null; },
    // 生命周期：取消 / 上游回收
    cancelSessionWork(core, sessionId) {},
    onCoreRemoved(core) {},
  },
}));
```

扩展 id 会成为 UI 命名空间，例如 `extension:example.module:manage`。扩展复用 Panel
的 Vue、ui-frame、弹层互斥、卡片拖动/折叠和布局持久化；数据请求与业务能力门控由
扩展自己负责。


## 数据通路与门控

扩展自己解决数据，但**通路只有两条**，选错的表现是「界面永远停在加载」：

| 通路 | 方向 | 适合 | 回执 |
| --- | --- | --- | --- |
| `ModuleEvent` | 模块 → Panel 广播 | 状态变化、增量投影、通知 | 无请求方 |
| `InvokeModuleOp` | Panel → Core → 模块 | 取权威快照、按需查询 | **必回** `ModuleInvokeResult` |

```ts
// 请求-应答：命令发出后一定有一条 ModuleInvokeResult（ok:false 也回）。
// 多上游部署要显式给 core：InvokeModuleOp 的 team_id 在 payload 里，
// 路由层只看命令体顶层，解析不出归属会拒发或落到当前区域。
sendCommand({ InvokeModuleOp: { module: 'example.module', method: 'snapshot', payload: { team_id } } }, core);
// 在 hooks.acceptEvent 里拦结果，自己投影（壳不持有模块状态）
acceptEvent(event) {
  if ('ModuleInvokeResult' in event) { /* applySnapshot(event.ModuleInvokeResult.data) */ }
  return true;
}
```

**注意**：模块对普通命令返回的 `Ok(value)` 会被 Core 丢弃（`apply_command` 只把
`Err` 转成错误事件）。要送达界面的内容必须走 `Emit`（`ModuleEvent`）或
`InvokeModuleOp` 的返回值，别指望"处理命令时 return 数据"。

### 门控三问

入口 `when` 的判据三个语义不同，混用会出现「入口可见但点不动」：

| 判据 | 回答的问题 | 数据来源 | 坑 |
| --- | --- | --- | --- |
| `moduleMounted(state, id)` | 这台部署**有**这个模块吗 | Core 的 `ModulesList` | 只反映挂载，不反映「界面是否编入产物」 |
| `teamModuleEnabled(team, id)` | 这个**人格**允许用吗 | 人格白名单 | 空名单 = 不限制 |
| `teamToolAvailable(team, tool)` | 这个**工具**可用吗 | 人格白名单 | 空名单同样不限制，**没装模块也可能 true** |

推荐写法是「挂载 **且** 人格允许」：

```ts
when: ({ team }) => !!team && moduleMounted(state, 'example.module') && teamModuleEnabled(team, 'example.module'),
```

只判 `teamToolAvailable` 的后果是：没装模块的部署上也会显示入口，点了没有任何反应。

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
