//! 「会话」按钮的数据入口：向**会话模块的面板服务**请求列表。
//!
//! ## 它替换了什么
//!
//! 此前 `state.sessions` 只有一个来源：Core 广播的 `SessionUpdated` 逐条累积。
//! 那条路径负责**增量**（某会话有新消息 → `last_active` 变），但没有"现在给我
//! 一份完整快照"的入口。于是进程重启后磁盘上有会话、却没有任何变更事件——
//! 面板侧边栏空着，直到用户手动动了一下工作区才自愈（2026-11 的现场）。
//!
//! 现在多一条**基线**路径：服务 `echo-agent.sessions` 的方法 `list`。广播仍
//! 在，两者分工明确：
//!
//! | 路径 | 负责 | 时机 |
//! |---|---|---|
//! | `SessionUpdated` 广播 | 增量（`last_active` / 最后一句） | 每次状态变化 |
//! | `sessions.list` 服务 | 基线（有哪些会话） | 点开按钮 / 重连 |
//!
//! ## 为什么不用 `RequestState`
//!
//! 那条命令会连带刷新 api 配置、实例清单、模块列表——面板只是想列会话，代价
//! 太大，而且它一次发 N 条事件、没有完成信号（`pending.ts` 刻意把它排除在
//! 关联表外）。

import { invokeService } from './panel-services';
import { state } from './store';
import { upsertSessionInto, type SessionInfo } from './state';

/** 服务名与方法名（跨仓契约，与 Core 侧 `agent_module_session::panel_service` 一致）。 */
export const SESSIONS_SERVICE = 'echo-agent.sessions';
export const SESSIONS_LIST_METHOD = 'list';

/** 服务回包的 `data` 形状。 */
interface SessionsListData {
  team_id?: string | null;
  sessions?: Array<SessionInfo & { core?: string | null }>;
}

/**
 * 请求一次会话列表并并入 `state.sessions`。
 *
 * `teamId` 缺省 = 跨全部人格（面板的「标签存活」判断与「当前会话」卡片要看
 * 得到别的 agent 的会话，只取当前人格会让它们误判成"会话没了"）。
 *
 * 失败**不抛**给调用方：按钮的点击路径不该因为一次读失败就弹错误并卡住——
 * 广播路径仍在，列表最终会自己长出来。但**要记一条 warn**，否则"服务没登记
 * 上"这种部署问题会完全静默（面板看上去只是"慢"）。
 */
export async function requestSessions(teamId: string | null = null): Promise<void> {
  try {
    // `targetCore` 显式传当前运行区域：服务名不含身份，多上游下靠兜底
    // 路由可能把请求发给用户没在看的那个 Core（列表就会"少一半"）。
    const core = state.activeRegion ?? null;
    const data = (await invokeService(
      SESSIONS_SERVICE,
      SESSIONS_LIST_METHOD,
      {},
      teamId,
      core,
    )) as SessionsListData | null;
    const sessions = data?.sessions ?? [];
    if (!Array.isArray(sessions)) return;
    // 多上游归属：Core 的回执不带 `core`（那是信封层的概念），而
    // `state.sessions` 的复合键需要它——A/B 两个 Core 上同名的 `local:tui`
    // 不标注就会互相覆盖。回执来自哪条连接由 `state.activeRegion` 记录
    // （上面发请求时已经取过一次）。
    for (const session of sessions) {
      upsertSessionInto(state, core ? { ...session, core } : session);
    }
  } catch (error) {
    console.warn('[panel] 会话列表服务不可用，继续依赖广播增量', error);
  }
}
