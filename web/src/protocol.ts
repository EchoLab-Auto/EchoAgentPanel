//! 管理面协议的 TypeScript 类型。
//!
//! ## 真值在哪
//!
//! **Core**：`agent-module-management/src/protocol/` 的 serde 类型。
//! 同目录的 `protocol.generated.ts` 是它们的生成结果
//! （`echo-agent-core dump-protocol-ts`）——**不要手改那个文件**，改 Core 的
//! Rust 后重跑 `npm run sync-protocol`。
//!
//! 本文件保留 **Panel 独有**的部分 + 线格式的编解码函数：
//!
//! | 类型 | 为什么 Panel 侧还要定义 |
//! |---|---|
//! | `ChecklistState` / `RemoteApiProfileEntry` | Core 侧是 `serde_json::Value`（不定形），Panel 需要具体形状才能渲染 |
//! | `FederationStatus` / `FederationDirectory` | Core 侧是事件变体内的内联字段，提取成命名类型便于复用 |
//! | `ShellTerminalEntry` | 纯 Panel UI 状态（终端行），Core 不发 |
//! | `InstanceOpMethod` | 平台方法名的拼写便利（**待迁移**：应改由模块描述符声明） |
//! | `CompactionPhase` | Core 在 `echo-session`，跨 crate 未纳入生成；两端靠注释对齐 |
//! | `WorkspaceDirectoryEntry` | 生成的 `WorkspaceDirectory` 的历史别名（Panel 内延用旧名） |
//!
//! 改协议的正确顺序：**改 Core 的 Rust → 重跑 `npm run sync-protocol` → 回来改这里的消费代码**。

export * from './protocol.generated';

// ── 多 core 场景的归属标记（Panel 侧增强）────────────────────────────────
//
// **为什么不在 Core 的类型里**：`core` 不是线格式字段——它是 Panel 同时连接
// 多个 Core 时，给每条事件/实体打的「这条来自哪个上游」标记，由 Panel 的
// proxy 层在收到帧时注入（`evtCore()` 读的就是它）。
//
// 生成物（`protocol.generated.ts`）忠实反映 Core 的序列化形状，所以没有这个
// 字段。这里用**本地导出覆盖 `export *` 的同名类型**（TS 规则：显式导出优先
// 于星号导出），把 Panel 的增强补上，而不是在每个使用点写交叉类型。
// 注：`export *` 只影响本模块的**外部**接口，不把名字引进本文件作用域。
// 所以本文件内要用的生成类型必须显式 import。
import type {
  BackendCommand,
  BackendEvent,
  FederatedNodeInfo,
  FederationPeerInfo,
  WsMessage,
  SessionInfo as GeneratedSessionInfo,
  ShellSessionInfo as GeneratedShellSessionInfo,
  TeamInfo as GeneratedTeamInfo,
} from './protocol.generated';

/** 给来自某个上游 Core 的实体补 `core` 归属。 */
export type WithCore<T> = T & { core?: string | null };

export type ShellSessionInfo = WithCore<GeneratedShellSessionInfo>;
export type TeamInfo = WithCore<GeneratedTeamInfo>;
export type SessionInfo = WithCore<GeneratedSessionInfo>;

//! TS 镜像 echo-protocol 的线格式（serde 外部标签枚举 + WsMessage 信封）。
//!
//! Core 的 `WsMessage` 序列化为 `{"type":"command|event","payload":{...}}`；
//! `BackendCommand` / `BackendEvent` 是外部标签枚举（变体名即标签）。


/** 联邦状态快照（`FederationStatus` 事件）。 */
export interface FederationStatus {
  enabled: boolean;
  node_id: string;
  node_name?: string | null;
  listen: string;
  peers: FederationPeerInfo[];
  /** 本节点是否接受**联邦级 Panel 身份**（P1，2026-11；旧 Core 缺失 =
   *  不支持，按未开放展示）。 */
  panel_ready?: boolean;
  /** 授予 Panel 身份的级别：off / readonly / operate / admin。 */
  panel_access?: string;
}


/** 联邦节点目录（`RequestFederationDirectory` 响应；P2 自动发现）。
 *
 *  只含**直接邻居**：拓扑由 Panel 汇总多个节点的目录得到（联邦不做 gossip）。
 *  Panel 拿到后逐个用 Panel 身份密钥试连，成功即纳入聚合视图。 */
export interface FederationDirectory {
  node_id: string;
  node_name?: string | null;
  listen?: string;
  panel_ready?: boolean;
  panel_access?: string;
  nodes: FederatedNodeInfo[];
}


/** 实例管理方法名（02a §4.1；Panel 侧防拼写便利类型，不要求 core 同步）。
 *  与 00 §四 的 12 个 custom method + `get_state`（D2 首屏路径）对齐。 */
export type InstanceOpMethod =
  | 'set_gate_mode'
  | 'get_gate_mode'
  | 'update_allowlist'
  | 'update_denylist'
  | 'get_filter_config'
  | 'set_owner'
  | 'get_owner'
  | 'login_status'
  | 'login_qrcode'
  | 'get_groups'
  | 'get_friends'
  | 'instance_info'
  | 'get_state';


/** 工作区目录条目（线格式 untagged，2026-10）：
 * - 本机目录 = 纯字符串绝对路径；
 * - 跨机目录 = `{ path, node }`（node = 联邦节点名）。
 * 消费一律经 `workspace.ts` 的规范化助手（directoryPath / directoryNode）。 */
export type WorkspaceDirectoryEntry = string | { path: string; node?: string | null };











/** 单条命令在终端中的条目（回显 + 流式输出） */
export interface ShellTerminalEntry {
  seq: number;
  command: string;
  status: 'running' | 'done' | 'failed' | 'timeout';
  output: string;
  elapsed_ms?: number;
}











export interface ChecklistState {
  lists: Array<{
    name: string;
    done: number;
    total: number;
    items: Array<{ text: string; done: boolean }>;
  }>;
}

// ── BackendCommand（外部标签枚举）──────────────────────────────────────────

export interface RemoteApiProfileEntry {
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  key_set?: boolean;
}

export type CompactionPhase =
  | 'preview'
  | 'archive'
  | 'summarize'
  | 'apply'
  | 'done'
  | 'failed';

/** 终态：面板据此停止转圈（`apply` 之后还有 `done`，不能提前收）。 */
export function isCompactionTerminal(phase: CompactionPhase): boolean {
  return phase === 'done' || phase === 'failed';
}

export function serializeCommand(command: BackendCommand): string {
  return JSON.stringify({ type: 'command', payload: command });
}

export function parseEvent(text: string): BackendEvent | null {
  try {
    const parsed = JSON.parse(text) as WsMessage;
    if (parsed && parsed.type === 'event' && parsed.payload) {
      return parsed.payload;
    }
  } catch {
    // ignore malformed frames
  }
  return null;
}
