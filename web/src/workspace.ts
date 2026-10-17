//! 工作区通道（激活 = 进入项目对话，2026-09-14）的面板侧规则。
//!
//! Core 侧单一事实来源 = workspace store 的 `active` 标记（经
//! `WorkspaceSessions` 事件回推）；面板的「本地当前对话」是它的**投影**：
//!   active 空    → 默认本地会话 `local:tui::local_user`
//!   active = W   → 工作区通道 `local:workspace:<W>:local_user`
//!
//! 会话切换器 Local 分组双向绑定：选通道 = 激活对应工作区、选默认会话 =
//! 取消激活；active 回推后仅当停留在 Local 来源会话上时跟随投影
//! （正在查看 QQ/global 会话不打扰）。
//!
//! 2026-10 多对话：一个工作区可有多条对话，各自一条独立通道会话——
//!   legacy 对话：`local:workspace:<ws>:local_user`（旧格式，现状不变）；
//!   其余对话：  `local:workspace:<ws>/<conv>:local_user`（scope_id 内嵌
//!   `<ws>/<conv>`；`/` 不与 `:` 段分隔冲突）。激活单位 = (工作区, 对话)，
//!   `WorkspaceSessions.active_conversation` 携带当前激活对话 id。

import type {
  WorkspaceConversationInfo,
  WorkspaceDirectoryEntry,
  WorkspaceSessionInfo,
} from './protocol';

export const LOCAL_DEFAULT_SESSION = 'local:tui::local_user';

// ── 工作区目录条目规范化（2026-10）──
// Core 线格式：本机目录字符串 / 跨机 `{path, node}` 表（untagged）。
// 所有 UI（chip、编辑表单、文件浏览器根）必须经这三个助手处理，
// 不得直接假设目录是字符串（会把 `{path,node}` 当字符串用而崩）。

/** 目录的绝对路径（两种形态通用）。 */
export function directoryPath(dir: WorkspaceDirectoryEntry): string {
  return typeof dir === 'string' ? dir : dir.path;
}

/** 目录的归属节点（本机 → null）。 */
export function directoryNode(dir: WorkspaceDirectoryEntry): string | null {
  if (typeof dir === 'string') return null;
  return dir.node ?? null;
}

/** 目录的显示/编辑字符串：本机 = 路径；跨机 = `node://<node>/<path>`。 */
export function directoryToInput(dir: WorkspaceDirectoryEntry): string {
  const node = directoryNode(dir);
  if (!node) return directoryPath(dir);
  return `node://${node}/${directoryPath(dir).replace(/^\/+/, '')}`;
}

/** 输入字符串是否跨机目录（`node://` 前缀）。 */
export function isRemoteDirectoryInput(input: string): boolean {
  return input.trim().startsWith('node://');
}

// ── 对话视图与通道 id（2026-10 多对话）──

/** 存量主对话 id（Core 读取期惰性补位的隐式对话）。 */
export const LEGACY_MAIN_CONVERSATION_ID = 'main';

/**
 * 对话读取视图（镜像 Core `conversations_view`）：`conversations` 缺省/空 =
 * 仅存量主对话（`{id:"main", name:"主对话", legacy:true}`，不落盘）。
 */
export function conversationsView(session: WorkspaceSessionInfo): WorkspaceConversationInfo[] {
  const list = session.conversations ?? [];
  if (list.length) return list;
  return [{ id: LEGACY_MAIN_CONVERSATION_ID, name: '主对话', legacy: true }];
}

/**
 * 对话名称 → 会话内唯一 slug id（镜像 Core `slugify_conv`）：
 * ASCII 小写字母数字 + `-`；纯数字/CJK-only 回退 `conv`；同工作区内
 * 数字后缀去重。
 */
export function conversationIdForName(name: string, existingIds: string[]): string {
  let slug = '';
  let lastDash = true; // 不以短横开头
  for (const ch of name) {
    if (/[a-z0-9]/i.test(ch)) {
      slug += ch.toLowerCase();
      lastDash = false;
    } else if (!lastDash) {
      slug += '-';
      lastDash = true;
    }
  }
  slug = slug.replace(/-+$/, '');
  if (!slug || /^[0-9]+$/.test(slug)) slug = 'conv';
  let candidate = slug;
  let n = 2;
  while (existingIds.includes(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  return candidate;
}

/**
 * 工作区通道会话 id：不带对话 / legacy 对话 = 旧格式裸 ws id；
 * 非 legacy 对话 = scope_id 内嵌 `<ws>/<conv>`。
 */
export function workspaceChannelSessionId(
  workspaceId: string,
  conversation?: WorkspaceConversationInfo | null,
): string {
  if (conversation && !conversation.legacy) {
    return `local:workspace:${workspaceId}/${conversation.id}:local_user`;
  }
  return `local:workspace:${workspaceId}:local_user`;
}

/** 工作区通道 id 的解析结果。 */
export interface WorkspaceChannelRef {
  workspaceId: string;
  /** 对话 id（裸 ws 旧格式 → null，由 Core 进 last_conversation）。 */
  conversationId: string | null;
}

/**
 * 从会话 id 解析工作区通道（非工作区通道 → null）。
 * scope_id 是 `platform:scope:scope_id:user_id` 的第三段，可能含 `/`
 * （`<ws>/<conv>`）但不含 `:`——先按 `:` 切段再对 scope_id 拆 `/`。
 */
export function parseWorkspaceChannelId(sessionId: string): WorkspaceChannelRef | null {
  const match = /^local:workspace:([^:]+):local_user$/.exec(sessionId);
  if (!match) return null;
  const scopeId = match[1];
  const slash = scopeId.indexOf('/');
  if (slash < 0) return { workspaceId: scopeId, conversationId: null };
  const workspaceId = scopeId.slice(0, slash);
  const conversationId = scopeId.slice(slash + 1);
  if (!workspaceId || !conversationId) return null;
  return { workspaceId, conversationId };
}

/** 从会话 id 解析工作区 id（legacy 与 `<ws>/<conv>` 两种形态通用；非工作区通道 → null）。 */
export function workspaceIdOfChannel(sessionId: string): string | null {
  return parseWorkspaceChannelId(sessionId)?.workspaceId ?? null;
}

/**
 * 本地会话投影：active (+ active_conversation) → 当前应处的本地会话 id。
 *
 * @param active             Core 激活的工作区 id
 * @param activeConversation Core 激活的对话 id（旧 Core 缺省 = null → 旧格式通道）
 * @param sessions           工作区快照（解析对话 legacy 标记；缺省 = 按旧格式兜底）
 */
export function localSessionProjection(
  active: string | null,
  activeConversation?: string | null,
  sessions?: WorkspaceSessionInfo[] | null,
): string {
  if (!active) return LOCAL_DEFAULT_SESSION;
  const session = sessions?.find((s) => s.id === active) ?? null;
  if (session && activeConversation) {
    const conv = conversationsView(session).find((c) => c.id === activeConversation) ?? null;
    if (conv) return workspaceChannelSessionId(active, conv);
  }
  // 快照未知但已知激活对话：按新格式乐观投影（Core 保证 id 存在）。
  if (!session && activeConversation) {
    return `local:workspace:${active}/${activeConversation}:local_user`;
  }
  return workspaceChannelSessionId(active);
}

/** 会话切换器点选一行的激活意图。 */
export type WorkspacePickIntent =
  | { kind: 'activate'; workspaceId: string; conversation: string | null }
  | { kind: 'deactivate' }
  | { kind: 'none' };

/**
 * 点选意图（Local 分组双向绑定规则）。
 *
 * @param sessionId 被点选的会话 id
 * @param active    Core 已知的激活工作区（state.workspaceActive）
 * @param activeConversation Core 已知的激活对话（state.workspaceActiveConversation）
 * @param synced    该快照是否属于当前团队（state.workspaceTeamId === 当前 team）
 * @param sessions  工作区快照（已知时传入）——已删除工作区的残留通道
 *   （历史保留）仅查看、不发激活（否则 Core 报「工作区会话 X 不存在」）；
 *   undefined/null = 不校验（快照未就绪）。同时用于把裸 ws 旧格式通道
 *   解析到对应的 legacy 对话。
 */
export function workspacePickIntent(
  sessionId: string,
  active: string | null,
  activeConversation: string | null,
  synced: boolean,
  sessions?: WorkspaceSessionInfo[] | null,
): WorkspacePickIntent {
  const ref = parseWorkspaceChannelId(sessionId);
  if (ref) {
    const { workspaceId } = ref;
    const session = sessions?.find((s) => s.id === workspaceId) ?? null;
    // 残留通道（已删除工作区）：仅查看（不发激活）。
    if (synced && sessions && !session) {
      return { kind: 'none' };
    }
    // 目标对话：通道 id 内嵌 conv → 它；裸 ws 旧格式 → 该工作区的 legacy
    // 对话（快照未知 = null，由 Core 进 last_conversation）。
    let target = ref.conversationId;
    if (!target && session) {
      // 裸 ws 旧格式通道 → 该工作区的 legacy 对话（快照已知时解析；未知
      // = null，由 Core 进 last_conversation）。conversations 缺省/空 =
      // 隐式存量主对话（Core 读取期补位 `{id:"main", legacy:true}`）。
      target = session.conversations?.find((c) => c.legacy)?.id
        ?? (session.conversations?.length ? null : 'main');
    }
    // 已是当前激活 (工作区, 对话) 且快照已同步 → 无需重发。
    if (synced && active === workspaceId) {
      const current = activeConversation ?? null;
      if (current === target) return { kind: 'none' };
      // 旧 Core / 无对话维度（active_conversation 恒 null）：选裸 ws 通道
      // 不解析 legacy 对话，直接不重发（保持 2026-09 旧行为）。
      if (current === null && ref.conversationId === null) return { kind: 'none' };
    }
    return { kind: 'activate', workspaceId, conversation: target };
  }
  // 选默认本地会话 = 取消激活（仅当已知存在激活时发；快照未知不猜）。
  if (sessionId === LOCAL_DEFAULT_SESSION && synced && active) {
    return { kind: 'deactivate' };
  }
  return { kind: 'none' };
  // 选默认本地会话 = 取消激活（仅当已知存在激活时发；快照未知不猜）。
  if (sessionId === LOCAL_DEFAULT_SESSION && synced && active) {
    return { kind: 'deactivate' };
  }
  return { kind: 'none' };
}

// ── 多窗口互不干扰（2026-10 用户反馈）────────────────────────────────────
//
// 问题：Core 的 workspace `active` 是**全局单例**（一个 Core 只有一个激活
// 工作区），而「本窗口正在看哪个会话」是**本地视图状态**。`WorkspaceSessions`
// 会广播给**所有** Panel 连接，若广播到达就无条件跟随投影，则 A 窗口点选
// 工作区会话（或选默认会话取消激活）会把其他所有窗口一起跳走——两个浏览器
// 窗口无法各看各的。
//
// 解法：把「视图跟随」的触发条件限制为**本窗口自己发起的激活**。他端广播
// 只同步 `state.workspaceActive` 等状态（工作区面板高亮、会话切换器的激活
// 标记照常更新），不改写本窗口的 activeSessionId。
//
// 代价（有意为之）：模型经 `use` 工具激活工作区时，其他窗口不会自动跳转
// ——工作区面板/会话切换器上能看到激活标记，需要时手动点选。这是「互不
// 干扰」的必然取舍：模型激活同样是一次全局状态变更，与另一个窗口点选等价。
//
// 安全网：本地停留的工作区/对话被删除后必须回退，否则视图会指向一个不再
// 存在的通道（见 [`decideOnWorkspaceBroadcast`]）。

/** 本窗口发起、尚未被回推消费的激活意图（`id === null` = 取消激活）。 */
let localActivateIntent: { id: string | null } | null = null;

/**
 * 登记「本窗口即将发起的激活」——必须在 `sendCommand(ActivateWorkspaceSession)`
 * 之前调用，否则回推可能先到（同一次同步里 Core 的广播早于本函数的旧路径）。
 *
 * 调用点：App.vue 的 `sendWorkspaceActivate`（会话切换器 / 模型落点跟随）、
 * WorkspacePanel 的「激活」切换与「点选对话」。
 */
export function noteLocalActivateIntent(id: string | null): void {
  localActivateIntent = { id };
}

/**
 * 消费意图：回推的 `active` 与本窗口意图一致 → 这是自己刚才那一下，
 * 允许跟随投影；否则（含无意图）= 他端（另一窗口 / 模型工具）发起。
 *
 * 一次性语义：无论是否匹配都清空——广播可能被规范化（如裸 ws 通道由 Core
 * 补全为 last_conversation），不能让残留意图把**下一次**他端变更误判成自己的。
 */
export function takeLocalActivateIntent(active: string | null): boolean {
  const mine = localActivateIntent !== null && localActivateIntent.id === active;
  localActivateIntent = null;
  return mine;
}

/** 测试用：清空意图（避免用例间串味）。 */
export function __resetLocalActivateIntentForTest(): void {
  localActivateIntent = null;
}

/** 广播到达后本窗口 activeSessionId 的处置。 */
export type WorkspaceBroadcastDecision =
  /** 本窗口自己的激活回推：跟随规范化投影。 */
  | { kind: 'follow'; next: string }
  /** 本地停留的通道已失效（工作区/对话被删）：回退到当前落点。 */
  | { kind: 'reset'; next: string }
  /** 他端变更：本窗口视图不动。 */
  | { kind: 'keep' };

/**
 * 决定收到 `WorkspaceSessions` 广播后本窗口要怎么处置 `activeSessionId`。
 *
 * 规则（纯函数，无副作用；调用方负责先 [`takeLocalActivateIntent`]）：
 * 1. **本窗口意图**（`hasLocalIntent`）→ 跟随投影；但当前停在 QQ/global 等
 *    非 local 会话上时不覆盖（用户刚点了别处，别抢回来）。
 * 2. **他端变更** → 默认 `keep`（不打扰）。唯二例外是本地视图指向的通道
 *    已失效：工作区被删 / 该工作区里的对话被删 → `reset` 到 `landing`。
 * 3. 当前不是工作区通道（默认本地会话 / QQ / global）→ `keep`。
 *
 * @param currentSessionId 本窗口当前 activeSessionId
 * @param active          Core 回推的激活工作区（广播到达后的值）
 * @param activeConversation Core 回推的激活对话
 * @param sessions        广播携带的工作区快照（含各工作区对话清单）
 * @param hasLocalIntent  本窗口刚发起过这次激活
 * @param landing         失效回退落点（调用方传 `localLanding(teamId)`）
 */
export function decideOnWorkspaceBroadcast(p: {
  currentSessionId: string;
  active: string | null;
  activeConversation: string | null;
  sessions: WorkspaceSessionInfo[] | null;
  hasLocalIntent: boolean;
  landing: string;
}): WorkspaceBroadcastDecision {
  const { currentSessionId, active, activeConversation, sessions, hasLocalIntent, landing } = p;
  // 1) 本窗口自己的激活：跟随投影（与 2026-09 原行为一致）。
  if (hasLocalIntent) {
    if (!currentSessionId.startsWith('local:')) return { kind: 'keep' };
    const next = localSessionProjection(active, activeConversation, sessions);
    return { kind: 'follow', next };
  }
  // 2) 他端变更：只做「本地通道是否还活着」的兜底。
  const ref = parseWorkspaceChannelId(currentSessionId);
  if (!ref) return { kind: 'keep' };
  const workspace = sessions?.find((s) => s.id === ref.workspaceId) ?? null;
  // 工作区被删（或快照尚未到达：sessions 为 null 时不猜，保持视图）。
  if (sessions && !workspace) return { kind: 'reset', next: landing };
  // 对话被删：通道 id 内嵌的 conv 已不在该工作区 → 回退。
  if (workspace && ref.conversationId) {
    const alive = conversationsView(workspace).some((c) => c.id === ref.conversationId);
    if (!alive) return { kind: 'reset', next: landing };
  }
  return { kind: 'keep' };
}
