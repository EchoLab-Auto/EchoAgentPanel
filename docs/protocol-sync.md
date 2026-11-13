# 管理面协议：由 Core 生成，Panel 只消费

## 一句话

`web/src/protocol.generated.ts` 是**生成物**。真值在 Core 的 Rust 类型
（`agent-module-management/src/protocol/`）。改协议 = 改 Rust，然后重跑同步。

```bash
npm run sync-protocol     # 重新生成
npm run check-protocol    # 只校验（build 的前置，不一致直接拒绝构建）
```

Core 源码位置默认取 `~/.local/share/echo-agent-core/source`，也可显式指定：

```bash
CORE_SOURCE=/path/to/EchoAgentCore npm run sync-protocol
```

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

## 独立构建

Panel 可以脱离 Core 仓库单独构建：没有 Core 源码时 `check-protocol` 只警告、
不阻断（生成物已提交）。CI 里应确保 Core 可访问，否则这道闸等于放假。

## 新增协议类型的清单

1. 在 Core 的 `agent-module-management/src/protocol/` 里加类型（带 serde derive）
2. 若类型要出现在线格式里，确认它已有 `#[cfg_attr(feature = "ts-bindings", derive(ts_rs::TS))]`
3. 在 `protocol/mod.rs` 的 `ts_bindings::declarations()` 清单里加一行
   （ts-rs 不做传递闭包；漏了会缺声明，`tsc` 报错——Core 侧有测试钉住根类型）
4. `npm run sync-protocol`
5. 改 Panel 的消费代码
