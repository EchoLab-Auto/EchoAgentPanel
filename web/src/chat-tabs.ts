//! 会话消息区的多标签页（2026-11）。
//!
//! ## 为什么是"标签 + 单值切换"而不是多实例并列
//!
//! 整个壳是单值模型：`App.vue` 的 `activeSessionId` / `activeTeamId` /
//! `activeRegion` 各只有一个，命令路由、事件过滤、右侧栏卡片全部按这组值
//! 解析。并列渲染多个 `ChatView` 需要把 `useChatScroll`、草稿、`entryOverlay`
//! （模块级单值）、`railSessionId` 全部改成 per-tab，任何一处漏改就是"两个
//! 标签互相串消息/串滚动"。标签在这里承担的是**快捷入口 + 记忆**：一个标签
//! 就是一个 `(core, team, session)` 目标，点它就切过去，切换仍走 App 的
//! 唯一写入口（`selectSession` / `applyActiveTeam`）。
//!
//! ## 目标身份是三元组，不是 session id
//!
//! `local:tui::local_user` 这种 id 在**每个 core、每个人格**下都存在。只按
//! session id 记标签，切 core 后会切到"另一个 core 的同名会话"——那正是
//! 2026-10 串台事故的形状。所以身份键 = `core\0team\0session`。

import { ref } from 'vue';
import { state } from './store';
import { readTabOnly, writeTabOnly } from './tab-prefs';

/** 一个标签指向的会话目标。 */
export interface ChatTab {
  /** 身份键（`core\0team\0session`）。 */
  id: string;
  core: string | null;
  teamId: string | null;
  sessionId: string;
}

/** 存储键（严格 per-tab：新开浏览器标签不应继承别人的标签组）。 */
const STORAGE_KEY = 'echo-panel-chat-tabs';

/**
 * 标签上限。
 *
 * 入口行的按钮已经会横向滚动，标签条同样会——但超过 8 个之后"记住去向"
 * 的收益迅速让位于"找不到东西"的成本，所以到顶时**挤掉最久未激活**的那个
 * （不是关掉最左边：用户关注意图，不关注先后）。
 */
export const MAX_CHAT_TABS = 8;

/** 当前窗口的标签组（左到右即使用顺序，新标签追加在末尾）。 */
export const chatTabs = ref<ChatTab[]>([]);

/** 当前激活的标签（`null` = 当前会话还没进标签组，例如刚加载）。 */
export const activeChatTabId = ref<string | null>(null);

/** 三元组 → 身份键。 */
export function chatTabId(
  core: string | null | undefined,
  teamId: string | null | undefined,
  sessionId: string,
): string {
  return `${core ?? ''}\u0000${teamId ?? ''}\u0000${sessionId}`;
}

function persist(): void {
  try {
    writeTabOnly(STORAGE_KEY, JSON.stringify(chatTabs.value));
  } catch {
    // 配额/隐私模式：标签组退化为纯内存，不影响功能
  }
}

/** 已加载标志：`ensureChatTabsLoaded` 幂等（多个 ChatView 实例/热更新共用）。 */
let loaded = false;

/** 幂等加载（ChatView 装配期调用；重复调用不重复解析存储）。 */
export function ensureChatTabsLoaded(): void {
  if (loaded) return;
  loaded = true;
  loadChatTabs();
}

/** 从 sessionStorage 还原（刷新后保持标签组；坏数据静默丢弃）。 */
export function loadChatTabs(): void {
  const raw = readTabOnly(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    const seen = new Set<string>();
    const restored: ChatTab[] = [];
    for (const item of parsed) {
      const tab = item as Partial<ChatTab>;
      if (typeof tab?.sessionId !== 'string' || !tab.sessionId) continue;
      const id =
        typeof tab.id === 'string' && tab.id
          ? tab.id
          : chatTabId(tab.core ?? null, tab.teamId ?? null, tab.sessionId);
      if (seen.has(id)) continue;
      seen.add(id);
      restored.push({
        id,
        core: typeof tab.core === 'string' ? tab.core : null,
        teamId: typeof tab.teamId === 'string' ? tab.teamId : null,
        sessionId: tab.sessionId,
      });
      if (restored.length >= MAX_CHAT_TABS) break;
    }
    chatTabs.value = restored;
  } catch {
    chatTabs.value = [];
  }
}

/**
 * 确保 `(core, team, session)` 在标签组里并设为激活。
 *
 * 由 ChatView 的 watch 调用：**任何**到达某会话的路径（会话切换器、工作区
 * 激活、通知跳转、刷新恢复）都会得到一个标签，用户不必先"打开标签页"。
 */
export function syncActiveTab(
  core: string | null | undefined,
  teamId: string | null | undefined,
  sessionId: string,
): void {
  if (!sessionId || sessionId === 'global') {
    activeChatTabId.value = null;
    return;
  }
  const resolvedCore = core ?? null;
  const resolvedTeam = teamId ?? null;
  // 引导期归属未知（TeamsList / 会话列表还没到），随后被校正为具体值；也可能
  // 反过来（某个事件不带 core 壳）。两种情况都不该留下"看起来一模一样"的两个
  // 标签，所以只要**同一会话**且其中一条的归属未定，就合并到已知的那条。
  //
  // 两条都已知但不同（同名会话跨 core/team）是合法的两个目标，必须都留着。
  const twin = chatTabs.value.find((tab) => {
    if (tab.sessionId !== sessionId) return false;
    // 已确定的字段必须一致：两个**已知但不同**的 core/team 是不同目标
    // （同名会话跨节点/跨人格），必须各留一个标签。
    if (tab.core !== null && resolvedCore !== null && tab.core !== resolvedCore) return false;
    if (tab.teamId !== null && resolvedTeam !== null && tab.teamId !== resolvedTeam) return false;
    // 其余情况：要么完全同目标，要么某侧归属还没定（引导期 / 事件不带 core 壳）
    // ——都按同一个会话合并。
    return true;
  });

  if (twin) {
    // 已知值胜出：不把已经校正过的归属退回 null。
    twin.core = resolvedCore ?? twin.core;
    twin.teamId = resolvedTeam ?? twin.teamId;
    twin.id = chatTabId(twin.core, twin.teamId, twin.sessionId);
    activeChatTabId.value = twin.id;
    // 合并可能让两条撞成同一个 id：去重（保留先出现的）。
    const seen = new Set<string>();
    chatTabs.value = chatTabs.value.filter((tab) => {
      if (seen.has(tab.id)) return false;
      seen.add(tab.id);
      return true;
    });
    persist();
    return;
  }

  const id = chatTabId(resolvedCore, resolvedTeam, sessionId);
  activeChatTabId.value = id;
  chatTabs.value = [
    ...chatTabs.value,
    { id, core: resolvedCore, teamId: resolvedTeam, sessionId },
  ];
  if (chatTabs.value.length > MAX_CHAT_TABS) {
    // 挤掉最久未激活的**非当前**标签（当前一定留）。
    const victim = chatTabs.value.find((tab) => tab.id !== id);
    if (victim) chatTabs.value = chatTabs.value.filter((tab) => tab.id !== victim.id);
  }
  persist();
}

/** 按 id 找标签（调用方需要它的 (core, team, session) 才能切换）。 */
export function findChatTab(id: string): ChatTab | null {
  return chatTabs.value.find((tab) => tab.id === id) ?? null;
}

/**
 * 关闭标签；返回"该切到哪个"（`null` = 不需要切换 / 关的不是当前标签）。
 *
 * 关掉当前标签时的落点：右邻 → 左邻 → 空。返回空串表示**标签组已空**，
 * 调用方保持当前会话不变（不要因为关标签把用户踢到另一个会话）。
 */
export function closeChatTab(id: string): ChatTab | null {
  const index = chatTabs.value.findIndex((tab) => tab.id === id);
  if (index < 0) return null;
  const wasActive = activeChatTabId.value === id;
  chatTabs.value = chatTabs.value.filter((tab) => tab.id !== id);
  persist();
  if (!wasActive) return null;
  const next = chatTabs.value[index] ?? chatTabs.value[index - 1] ?? null;
  activeChatTabId.value = next?.id ?? null;
  return next;
}

/**
 * 会话 id 的"人话"短形（会话列表还没到达 / 会话已删时的兜底）。
 *
 * 会话 id 的骨架是 `<platform>:<scope>:<channel>:<user>`：
 * - `local:workspace:echo-agent/v:local_user` → `echo-agent/v`（工作区/对话）；
 * - `local:tui::local_user` → `本地会话`（TUI 通道没有 channel，整串只有噪声）；
 * - `qq:group:123456` → `123456`（群名通常由 `group_name` 提供，走到这里说明没有）。
 *
 * 整串显示在 220px 的标签上只会变成 `local:workspace:echo-a…`——既认不出是
 * 哪个会话，又占满宽度，所以宁可给一个短形。
 */
function shortSessionLabel(sessionId: string): string {
  const parts = sessionId.split(':');
  if (parts.length <= 1) return sessionId;
  const [platform, scope] = parts;
  if (platform === 'local') {
    if (scope === 'tui') return '本地会话';
    const channel = parts.slice(2, Math.max(2, parts.length - 1)).join(':');
    return channel || parts[1] || '本地会话';
  }
  const rest = parts.slice(scope ? 2 : 1).join(':');
  return rest || sessionId;
}

/** 标签显示名：优先会话昵称/群名，其次会话 id 的短形（与会话切换器同源）。 */
export function chatTabLabel(tab: ChatTab): string {
  const candidates = state.sessions.filter(
    (item) =>
      item.id === tab.sessionId && (item.team_id ?? null) === (tab.teamId ?? null),
  );
  const session =
    candidates.find((item) => (item.core ?? null) === (tab.core ?? null)) ??
    candidates[0] ??
    null;
  // 找不到会话（Core 还没推列表 / 已删除）也用短形——整串在标签上只会被省略号截断。
  const titled = session ? session.group_name || session.nickname : '';
  return titled || shortSessionLabel(tab.sessionId);
}

/**
 * 标签副标题的人格部分（同名会话跨 team/core 时靠它区分）。
 *
 * 单独拆出来是为了窄屏：手机上只显示人格名、隐藏节点名——两个人格都有
 * `local:tui::local_user` 这类会话 id 时，全部显示「本地会话」就等于没有标签
 * 名（用户看到的是一排一模一样的按钮）。
 */
export function chatTabTeam(tab: ChatTab): string {
  const team =
    state.teams.find(
      (item) => item.id === tab.teamId && (item.core ?? null) === (tab.core ?? null),
    ) ?? state.teams.find((item) => item.id === tab.teamId);
  return team?.name?.trim() || tab.teamId || '—';
}

/** 标签副标题的节点部分（无名 = 空串：单上游时节点名没有信息量）。 */
export function chatTabCore(tab: ChatTab): string {
  return tab.core ?? '';
}

/** 标签副标题（人格 · 节点）；`title` 与桌面态展示共用。 */
export function chatTabHint(tab: ChatTab): string {
  const team = chatTabTeam(tab);
  const core = chatTabCore(tab);
  return core ? `${team} · ${core}` : team;
}

/** 测试/登出：清空标签组（不写存储，避免测试之间互相污染）。 */
export function resetChatTabs(): void {
  chatTabs.value = [];
  activeChatTabId.value = null;
  loaded = false;
}
