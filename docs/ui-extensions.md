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

Panel 壳不内置业务模块 UI。扩展是**独立构建的 ES bundle**，由模块自己
`npm run build` 产出，模块 `mount` 时向 Core 登记，Panel 启动后运行期 `import()`。
（2026-11 之前是构建期注入：改一行 UI 要重建整个面板，忘了配环境变量就静默
变纯壳。那种静默失效是这次改造的直接原因。）

```text
panel-ui/
├── index.ts            # registerPanelExtension(...) 的入口
├── components/...
├── package.json        # npm run build → dist/index.js
├── vite.config.ts      # externalize 共享模块 + 内联 CSS
└── vitest.config.ts    # 可选：跑组件测试时需要它（见「测试」）
```

`index.ts` 里不要 `import 'x.css'`：浏览器原生 ES 模块不支持，样式必须内联进 JS
（`vite.config.ts` 里的 `inlineCss` 插件干的就是这件事，`cssCodeSplit: false` 配合
使用）。产物是**纯 JS**，动态 `import()` 一个文件即可。

条目由 Core 侧登记，形状与 `echo_defs::panel_ui::PanelUiContribution` 一致：

```json
{ "id": "echo-agent.example",
  "name": "示例",
  "bundle": "panel-extensions/echo-agent.example/index.js",
  "sdk_version": "1" }
```

三条硬约束（全部由 Core 在登记时校验）：

| 约束 | 为什么 |
|---|---|
| `bundle` 必须是**站点相对路径**，不得含协议 / 前导 `/` / `..` | 否则一个被投毒的模块描述就能让面板加载任意远程脚本 |
| 产物文件名**固定**（不带 hash） | 面板按固定路径 `import()`，名字一变所有已构建的扩展立刻失联 |
| `sdk_version` 必填且加载前逐字比对 | UI 在运行期加载，API 用错不会在构建期报错，只会在用户浏览器里崩 |

`index.ts` 使用公开 SDK（**约定**：不要穿透引用 Panel 私有路径。这不是构建期强制
——扩展是独立 vite 构建，没人看得见 Panel 的源码树，穿透会一路构建成功、到浏览器
里才失败）：

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
    // 可选：右上角数字徽标（壳只渲染数字，含义由扩展决定）
    badge: ({ sessionId }) => 0,
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
    // 壳的"通用问句"：答案由扩展给，壳因此不必持有模块状态
    sessionBusy(core, sessionId, kind) { return false; },
    toolPresentation({ name, input }) { return null; },
    // 生命周期：取消 / 上游回收
    cancelSessionWork(core, sessionId) {},
    onCoreRemoved(core) {},
  },
}));
```

`mainViews` 是第四个插槽（顶栏可切换的一级视图，与「聊天 / 设置 / Shell」同级）。比
`overlays` 多 `icon` / `hint?` / `when?`：`{ id, label, icon, hint?, component, when? }`。
完整签名见 `web/src/extensions/registry.ts` 的 `PanelMainView`。

扩展 id 会成为 UI 命名空间，但**三个插槽前缀不同**：overlays 与 railCards 是
`extension:<id>:<itemId>`，mainViews 是 `ext:<id>:<viewId>`。扩展复用 Panel 的 Vue、
ui-frame、弹层互斥、卡片拖动/折叠和布局持久化；数据请求与业务能力门控由扩展自己
负责。


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
| `moduleMounted(state, id)` | 这台部署**有**这个模块吗 | Core 的 `ModulesList` | 只反映挂载，不反映 bundle 是否部署到静态目录 |
| `teamModuleEnabled(team, id)` | 这个**人格**允许用吗 | 人格白名单 | 空名单 = 不限制 |
| `teamToolAvailable(team, tool)` | 这个**工具**可用吗 | 人格白名单 | 空名单同样不限制，**没装模块也可能 true** |

推荐写法是「挂载 **且** 人格允许」：

```ts
when: ({ team }) => !!team && moduleMounted(state, 'example.module') && teamModuleEnabled(team, 'example.module'),
```

只判 `teamToolAvailable` 的后果是：没装模块的部署上也会显示入口，点了没有任何反应。

## 部署

Panel 本身不再需要任何扩展参数：

```bash
scripts/install.sh --scope system     # 纯 Panel；模块界面由各自的产物提供
```

模块一侧两步（以工作区模块为例）：

```bash
cd panel-ui && npm install && npm run build        # → dist/index.js
mkdir -p <static_dir>/panel-extensions/echo-agent.workspace
cp -a dist/. <static_dir>/panel-extensions/echo-agent.workspace/
```

`<static_dir>` 是 Panel 配置里的 `static_dir`（默认
`<prefix>/libexec/echo-agent-panel/web`）。**这个目录由模块拥有**：Panel 的
`install.sh` / `update.sh` 在替换静态目录时会原样保留 `panel-extensions/`
（否则一次面板更新就会把所有模块界面删掉，而 Core 日志里毫无异常）。

注册与加载的完整链路见 Core 仓 `document/modules/panel-service.md`。

## 本地验证

```bash
cd web
npm run build     # 壳 + 共享 chunk（assets/panel-*.js）+ import map
npm test

# 注：扩展自己的测试在各自模块仓
cd /path/to/module/panel-ui && npm run build && npm test
```

构建产物里可以直接核对三件事：

- `dist/index.html` 有 `<script type="importmap">`，**12 条**（真值在
  `web/panel-shared.entries.json`）：6 条指向 `assets/panel-*`（`panel-vue.js`、
  `panel-sdk.js`、`panel-components/` 下 4 个组件），6 条指向 `assets/ui-frame/`
  （4 个组件 + 根入口 + `doc`）；
- 那些 `panel-*.js` / `ui-frame/*.js` 都是**固定文件名**（不带 hash）——扩展按裸
  标识符引用它们，名字一变全部失联；
- 它们里**没有** CSS import（浏览器原生 ES 模块不支持，样式已内联进 JS）。

## 测试

模块自己的扩展要跑单测时，需要**面板源码**：`state` / `sendCommand` 这些运行时值
以及 ui-frame 组件都在面板仓里（`web/vendor/ui-frame` 是全站唯一那份源码）。所以
模块 `panel-ui/vitest.config.ts` 要 alias 过去：

```ts
const PANEL_SOURCE =
  process.env.PANEL_SOURCE ?? path.resolve(here, '../../../.local/share/echo-agent-panel/source');
```

两个踩过的坑：

- **路径算错的表现极具误导性**：上跳层级少一级会得到 `<home>/src/.local/...`（一个
  永远不存在的路径），而报错是每个测试文件一句 "Failed to resolve import
  `@echo-agent/panel`"——看不出是路径问题。配置里应当先 `existsSync` 检查
  `<PANEL_SOURCE>/web/src/extension-api.ts`，缺了就直接抛「找不到面板源码：<路径>」。
- **`vitest` 自带一份 `vite`**：它与 `package.json` 里的 vite 大版本不一致时，
  `.ts` 形式的 vitest 配置可能整份不生效（alias 全部失效，症状同上）。模块仓应把
  vitest 对齐到与面板同大版本。

## 裸标识符是封闭清单

扩展产物里保留 `import ... from 'vue'` 是对的：浏览器拿裸标识符去上表那张 import
map 里查。但它是**封闭**的——表里没有的名字，浏览器报 "Failed to resolve module
specifier"，而构建阶段**不会**报错。

壳里有 42 个 `.vue`，能被扩展引用的只有 8 个：

| 裸标识符 | 说明 |
|---|---|
| `vue` | 唯一实例（两份 vue = 两套响应式系统） |
| `@echo-agent/panel` | 单例：`state` / `dispatch` / `sendCommand` / 注册表 |
| `@echo-agent/panel/components/{LoadHint,PanelIcon,PanelSidebar,SessionSwitcher}` | 壳的公开组件 |
| `@echolab-auto/ui-frame`、`@echolab-auto/ui-frame/doc` | ui-frame 根入口 |
| `@echolab-auto/ui-frame/components/{NeumorphismButton,NeumorphismSelect,NeumorphismSpinner,NeumorphismTag}` | ui-frame 公开组件 |

要加新的共享模块（新增导出、要暴露第 9 个组件）：改
`web/panel-shared.entries.json` → 重建面板 → **同时**升 `sdkVersion` 并同步
Core 仓 `echo-defs::panel_ui::PANEL_UI_SDK_VERSION`，否则老扩展会在新面板上白屏而
没有任何提示。只在自己模块的 `vite.config.ts` 里加一行 externalize 不解决任何
问题——那只是把裸标识符留在产物里，浏览器照样查不到。

其余一切（包括所有工具库、其余壳组件、业务类型）都必须打进扩展自己的产物。

运行期状态在设置页「面板 UI 扩展」小节可见（加载了几个、哪个失败、为什么）。
