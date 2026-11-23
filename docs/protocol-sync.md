# 管理面协议：由 Core 生成，Panel 只消费

## 一句话

`web/src/protocol.generated.ts` 是**生成物**。真值在 Core 的 Rust 类型
（当前在 `source/modules/echo-protocol/`；早期基线位于 `agent-module-management`）。改协议 = 改 Rust，然后重跑同步。

```bash
npm run sync-protocol             # 重新生成（本地开发）
CORE_SOURCE=/path npm run sync-protocol   # 显式指定 Core 源码
npm run check-protocol            # 只校验；没有 Core 源码时警告放行（独立构建）
npm run check-protocol:strict     # 严格校验；正式 CI 用，缺源/来源无效/生成不符都失败
```

Core 源码位置默认取 `~/.local/share/echo-agent-core/source`；也可用
`CORE_SOURCE` 或 `--core-source` 显式指定。

## 为什么不再手写

改造前 `web/src/protocol.ts` 是 1116 行的手工镜像：73 个命令变体、55 个事件
变体、约 30 个载荷结构，逐个字段抄自 Core。三种漂移**都不报错**：

| 漂移形态 | 症状 |
|---|---|
| Core 加事件、Panel 没加 | `switch` 落到 `default`，静默忽略 |
| Core 改字段名 | `JSON.parse` 得到 `undefined`，渲染成空 |
| Core 改语义（文案/阈值） | 同一份数据刷新前后不一致 |

第三种真实发生过：定时消息文案，Core 是 `定时任务触发 · 截 120`，Panel 是
`⏰ 定时器触发 · 截 160`——刷新一下，同一句话换了措辞。前两种连痕迹都没有。

现在生成物与 Core 逐字一致，`build` 前置校验让"忘了同步"变成构建失败。

## CI 严格校验

正式 CI 有一个独立的 `protocol` job：只借 Core 的 `dump-protocol-ts` 生成器，
**不把协议定义搬进 Panel**。它做四件事：

1. 从 `web/package.json` 的 `protocolCore` 读 Core 仓库与固定提交；
2. 用 `actions/checkout` 按这个**完整提交**浅取公开仓
   `EchoLab-Auto/EchoAgentCore`；
3. 用独立的 `CORE_TARGET_DIR` 构建生成器（不碰 Core 自己的 `target/`）；
4. 跑 `npm run check-protocol:strict`，再跑
   `npm run test:protocol-sync`（脚本自身的行为测试，不需要真实 Core）。

绑定记录长这样：

```json
"protocolCore": {
  "repository": "EchoLab-Auto/EchoAgentCore",
  "commit": "d67ceb12b72b316cfda72c19dd7ff77aced4cec9",
  "generatedSha256": "bbab13dbb65b1286a7396c545d58cf20e346a1b7f64381aa1b7cc7d13fc4f982"
}
```

| 字段 | 含义 |
|---|---|
| `repository` | Core 仓库（`owner/repo`；必须对 CI 匿名可读） |
| `commit` | **生成/核对当前 `protocol.generated.ts` 的 Core 提交**，不是"最新 main" |
| `generatedSha256` | 生成物字节的 sha256，防止手改生成物或只更新一半 |

`commit` 必须是公开仓里长期可达的提交（例如 main 上的提交），不要用 PR
分支的临时提交：CI 按这个 SHA 浅取，取不到就失败。

严格模式逐项要求：
- 来源是 git 工作树根目录，HEAD 是完整 40 位提交；
- HEAD 等于 `protocolCore.commit`（或工作流用 `CORE_REF` 显式提供的完整提交）；
- Core 已跟踪文件没有未提交修改（否则生成结果不对应任何提交）；
- `dump-protocol-ts` 输出与提交的 `protocol.generated.ts` 逐字一致；
- 生成物 sha256 等于 `protocolCore.generatedSha256`。

任何一条不满足都退出 1。反过来，**不要用本地未推送的 Core 提交当 CI 基线**：
CI 取不到它，严格模式会直接失败。更新协议时按下面的清单把公开提交写进
`package.json`。

> 公开仓当前可直接匿名读取。如果以后 Core 转为私有，需要在 workflow 里给
> checkout 配只读 token；`protocolCore.repository` 本身不放凭据。
>
> workflow 把 Core 仓库固定为 `EchoLab-Auto/EchoAgentCore`，并核对
> `protocolCore.repository` 与它一致——换仓库要同时改 CI 和 package.json。
## 严格模式与本地模式的区别

| 场景 | `check-protocol`（本地） | `check-protocol:strict`（CI） |
|---|---|---|
| 没有 Core 源码 | 警告后放行（Panel 可独立构建） | 失败 |
| 显式 `CORE_SOURCE` 无效 | 失败 | 失败 |
| Core 不是 git 工作树 | 警告，继续比对生成物 | 失败 |
| Core HEAD 与绑定记录不同 | 警告，按当前源码继续 | 失败 |
| Core 工作树有未提交修改 | 警告，继续 | 失败 |
| 生成物与 Core 输出不一致 | 失败 | 失败 |
| 生成物哈希与绑定记录不符 | 警告，生成物一致则放行 | 失败 |

本地模式的宽容是为了保留"Panel 无 Core 源码也能独立构建"；正式 CI 的
`protocol` job 必须走严格模式，否则这道闸等于放假。

## Panel 侧还剩什么手写

`web/src/protocol.ts`（约 190 行）只剩两类：

**1. Core 表达不了、由 Panel 具象化的类型**

| 类型 | 为什么 |
|---|---|
| `ChecklistState` / `RemoteApiProfileEntry` | Core 侧是 `serde_json::Value`（不定形），Panel 需要具体形状才能渲染 |
| `FederationStatus` / `FederationDirectory` | Core 侧是事件变体内的内联字段，提取成命名类型便于复用 |
| `ShellTerminalEntry` | 纯 Panel UI 状态（终端行），Core 不发 |
| `WorkspaceDirectoryEntry` | 生成的 `WorkspaceDirectory` 的历史别名 |

**2. 多 Core 归属标记**

`core` 字段不是线格式——Panel 同时连多个 Core 时，proxy 层在收到帧时注入
"这条来自哪个上游"。生成物忠实反映 Core 的形状，所以没有它；`protocol.ts`
用 `WithCore<T>` 在本地覆盖导出的同名类型（TS 规则：显式导出优先于星号导出）。

**3. 线格式编解码函数**：`serializeCommand` / `parseEvent`（Panel 自己的实现）。

## 几个生成约定（踩过坑，别改）

| 约定 | 原因 |
|---|---|
| `large_int = "number"` 而非 ts-rs 默认的 `bigint` | 这些字段走 JSON，`JSON.parse` 只产出 `number`。标 `bigint` 会逼调用方写无意义的转换，且类型与运行期值不符 |
| `JsonValue = unknown` 而非递归 JSON union | Core 对这些字段不约束形状；递归 union 还会让 `reactive()` 的深度实例化爆栈（TS2589） |
| `#[serde(default)]` 的非 Option 字段在 TS 里是**必填** | 序列化总会输出它们。测试构造 fixture 时要用工厂函数补齐，别为了过类型检查塞假数据 |
| 单元变体生成为字符串字面量 | `"RequestSkillsList"` 而不是 `{ "RequestSkillsList": null }`——对应 serde 的单元变体形态 |

## 独立构建与 Cargo target 隔离

Panel 可以脱离 Core 仓库单独构建：没有 Core 源码时 `npm run check-protocol`
（`build` 的前置）只警告、不阻断（生成物已提交）。正式 CI 的 `protocol` job
会提供 Core 源码并跑严格模式，两者不冲突。

生成默认使用独立 target：

```bash
# 默认：~/.cache/echo-agent-panel/protocol-target
CORE_TARGET_DIR=/path/to/target npm run sync-protocol
```

**不要**默认指向 Core 仓库的 `target/`：Core 自己也在跑 `cargo test/clippy`
（本地或另一个 CI 任务），共用 target 会在 Cargo 文件锁上排队，甚至互相覆盖
增量产物。只有在确认没有其它 Cargo 进程时才建议复用现有缓存。

## 新增协议类型的清单

1. 在 Core 的 `source/modules/echo-protocol/` 里加类型（带 serde derive）
2. 若类型要出现在线格式里，确认它已有 `#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]`
3. 在 `echo-protocol/src/ts_bindings.rs` 的 `declarations()` 清单里加一行
   （ts-rs 不做传递闭包；漏了会缺声明，`tsc` 报错——Core 侧有测试钉住根类型）
4. `npm run sync-protocol`
5. 把输出里的 `commit` / `generatedSha256` 写进 `web/package.json` 的
   `protocolCore`（提交必须是公开远端可达的，不能是本地未推送提交）
6. `npm run check-protocol:strict`（本地用 `CORE_SOURCE` 指向刚生成用的 Core）
7. 改 Panel 的消费代码
