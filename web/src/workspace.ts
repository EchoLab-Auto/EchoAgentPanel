import type { WorkspaceDirectoryEntry } from './protocol';
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

/** 工作区 W 的本地通道会话 id。 */
export function workspaceChannelSessionId(workspaceId: string): string {
  return `local:workspace:${workspaceId}:local_user`;
}

/** 从会话 id 解析工作区 id（非工作区通道 → null）。 */
export function workspaceIdOfChannel(sessionId: string): string | null {
  const match = /^local:workspace:([^:]+):local_user$/.exec(sessionId);
  return match ? match[1] : null;
}

/** 本地会话投影：active → 当前应处的本地会话 id。 */
export function localSessionProjection(active: string | null): string {
  return active ? workspaceChannelSessionId(active) : LOCAL_DEFAULT_SESSION;
}

/** 会话切换器点选一行的激活意图。 */
export type WorkspacePickIntent =
  | { kind: 'activate'; workspaceId: string }
  | { kind: 'deactivate' }
  | { kind: 'none' };

/**
 * 点选意图（Local 分组双向绑定规则）。
 *
 * @param sessionId 被点选的会话 id
 * @param active    Core 已知的激活工作区（state.workspaceActive）
 * @param synced    该快照是否属于当前团队（state.workspaceTeamId === 当前 team）
 * @param knownWorkspaceIds 已知工作区 id 列表（快照已知时传入）——已删除
 *   工作区的残留通道（历史保留）仅查看、不发激活（否则 Core 报
 *   「工作区会话 X 不存在」）；undefined/null = 不校验（快照未就绪）。
 */
export function workspacePickIntent(
  sessionId: string,
  active: string | null,
  synced: boolean,
  knownWorkspaceIds?: string[] | null,
): WorkspacePickIntent {
  const workspaceId = workspaceIdOfChannel(sessionId);
  if (workspaceId) {
    // 残留通道（已删除工作区）：仅查看（不发激活）。
    if (synced && knownWorkspaceIds && !knownWorkspaceIds.includes(workspaceId)) {
      return { kind: 'none' };
    }
    // 选通道 = 激活对应工作区（已是激活态且快照已同步 → 无需重发）。
    if (!synced || active !== workspaceId) {
      return { kind: 'activate', workspaceId };
    }
    return { kind: 'none' };
  }
  // 选默认本地会话 = 取消激活（仅当已知存在激活时发；快照未知不猜）。
  if (sessionId === LOCAL_DEFAULT_SESSION && synced && active) {
    return { kind: 'deactivate' };
  }
  return { kind: 'none' };
}
