//! 清单快照的版本判定与投影写入（2026-11 清单可靠化）。
//!
//! ## 线契约（Core 侧）
//!
//! | 事件 | 语义 |
//! |---|---|
//! | `ChecklistUpdated { team_id?, session_id, state }` | 单会话权威状态（也可能来自旧 Core，无版本字段） |
//! | `ChecklistsSnapshot { team_id, epoch, revision, states: [{session_id, state}] }` | **整人格**权威快照；`states` 为空也是权威结果 |
//!
//! `state = { lists: [{id,name,archived,items:[{id,text,done}],done,total}],
//! epoch: UUID, revision: u64 }`。`epoch`/`revision` 是**文件级**（per-persona
//! store，不是每会话一份）：`epoch` 在 reset 时换 UUID，`revision` 每次成功
//! 修改 +1，且 **reset 不重置** revision。
//!
//! ## 为什么需要版本判定
//!
//! 面板会同时从多条路径拿到清单（bootstrap 的 `RequestState` 推送、显式
//! `RequestChecklists` 的 full、实时 `ChecklistUpdated`），它们**必然乱序**
//! （重连补发 / 并发请求 / 网络抖动）。没有版本判据时，一条晚到的旧事件会把
//! 面板回滚到几秒前——用户看到勾选"弹回去"。
//!
//! 判据（见 [`acceptsChecklistVersion`]，与 Core 的 `ChecklistsSnapshot`
//! 文档逐条对齐）：
//! - revision 跨 reset / 重载**单调递增**；epoch 在 reset 时换 UUID，**不与
//!   revision 比大小**——判新旧只看 revision 数字；
//! - **更低 revision 的 full 永远不得覆盖更高 revision 的 live 投影，即使
//!   epoch 不同**（否则一条晚到的旧 full 会把刚勾选的清单回滚）；
//! - 旧式状态（旧 Core，无 epoch/revision）：不得覆盖已版本化的投影；
//! - 真正换库/重置（revision 归零）只能靠**重连时清基线**收敛：见
//!   [`resetChecklistSyncForReconnect`]——Core 重启/换档后 Panel 主动把旧
//!   投影标脏，等 bootstrap full 重建权威版本，绝不让低 revision 事件自行回滚。
//!
//! ## full 快照不能覆盖"采集后到达的" live 更新
//!
//! full 是"某个时刻"的权威结果，但响应可能比 live 事件晚到。因此：
//! - 条目按会话版本判据合并（更高 revision 的 live 状态保留）；
//! - 快照里**没有**的会话才清（`states` 为空 = 清掉该人格全部投影）；
//! - 清理时保留 revision 高于快照 revision 的投影——那是快照采集之后才到达
//!   的新数据（全 persona watermark，见 [`ChecklistWatermark`]）。空 `states`
//!   也带 envelope 的 `epoch`/`revision`，同样按 revision 精确判断，
//!   不需要额外"请求基线"猜采集时刻。
//!
//! 本模块只处理**状态**（纯函数 + 原地写 `AppState`）。何时发请求在
//! `checklist-requests.ts`；能力探测结果由 reducer 记进
//! `state.checklistCapability`。

import type {
  AppState,
  ChecklistEntry,
  ChecklistProjectionVersion,
  ChecklistSource,
  ChecklistWatermark,
} from '../state';
import { checklistKey, teamKey } from '../keys';

/** 线格式里的版本字段（旧 Core 两者都缺 → null）。 */
export interface ChecklistVersionInfo {
  epoch: string | null;
  revision: number | null;
}

/** 从任意 `state` 载荷解析版本；缺字段 / 形状不对 → null（旧式）。 */
export function checklistVersionOf(rawState: unknown): ChecklistVersionInfo {
  const value = rawState as { epoch?: unknown; revision?: unknown } | null | undefined;
  const epoch = typeof value?.epoch === 'string' && value.epoch ? value.epoch : null;
  const revision =
    typeof value?.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0
      ? value.revision
      : null;
  return { epoch, revision };
}

/** 只有 epoch + revision 同时合法才是可排序的新协议状态。 */
export function hasChecklistVersion(version: ChecklistVersionInfo): boolean {
  return version.revision != null && version.epoch != null;
}

/** Core 能力表键：单上游 core=null 用空串（与 `scopedKey` 的退化口径一致）。 */
export function checklistCoreKey(core: string | null | undefined): string {
  return core ?? '';
}

/** 该 core 是否已确认支持权威清单快照（收到过 `ChecklistsSnapshot` /
 * 带完整版本的状态）。**未确认时绝不发 `RequestChecklists`**。 */
export function checklistCoreAuthoritative(
  state: AppState,
  core: string | null | undefined,
): boolean {
  return state.checklistCapability[checklistCoreKey(core)] === true;
}

/** 记下"这个 core 支持权威快照"（首个合法 full / 完整版本事件）。 */
export function noteChecklistCapability(state: AppState, core: string | null | undefined): void {
  state.checklistCapability[checklistCoreKey(core)] = true;
}

/** 最低限度的状态形状：缺 lists 的坏帧不能映射成权威空清单。 */
function isChecklistStatePayload(rawState: unknown): boolean {
  return (
    rawState != null &&
    typeof rawState === 'object' &&
    Array.isArray((rawState as { lists?: unknown }).lists)
  );
}

/**
 * 版本判据：`incoming` 是否可以覆盖 `current`。
 *
 * revision 跨 reset 单调；同 revision 却换 epoch 是冲突帧，不允许 full
 * 后到后来裁定。真正换库由重连清基线后重新建立权威坐标。 */
export function acceptsChecklistVersion(
  current: ChecklistVersionInfo | undefined,
  incoming: ChecklistVersionInfo,
  _full: boolean,
): boolean {
  if (!current) return true;
  if (current.revision == null) return true;
  // 未确认能力前的旧式事件不能覆盖已有版本；合法 full 在进入本函数前已校验。
  if (incoming.revision == null) return false;
  if (incoming.revision > current.revision) return true;
  if (incoming.revision < current.revision) return false;
  if (current.epoch && incoming.epoch && current.epoch !== incoming.epoch) return false;
  return true;
}

/** 把一条 state 载荷映射成 Panel 的清单条目（保留 id / archived，供稳定行键与归档展示）。 */
function toEntries(source: ChecklistSource, rawState: unknown): ChecklistEntry[] {
  const rawLists = (rawState as { lists?: unknown } | null | undefined)?.lists;
  if (!Array.isArray(rawLists)) return [];
  const out: ChecklistEntry[] = [];
  for (const rawList of rawLists) {
    if (!rawList || typeof rawList !== 'object') continue;
    const list = rawList as Record<string, unknown>;
    if (!Array.isArray(list.items)) continue;
    const items: ChecklistEntry['items'] = [];
    for (const rawItem of list.items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      if (typeof item.text !== 'string') continue;
      items.push({
        id: typeof item.id === 'string' ? item.id : undefined,
        text: item.text,
        done: item.done === true,
      });
    }
    out.push({
      id: typeof list.id === 'string' ? list.id : undefined,
      name: typeof list.name === 'string' ? list.name : '',
      archived: list.archived === true,
      items,
      done: items.filter((item) => item.done).length,
      total: items.length,
      source,
    });
  }
  return out;
}

/** 写投影 + 版本（**唯一**写入点：读侧永远有版本可判）。 */
function writeProjection(
  state: AppState,
  key: string,
  source: ChecklistSource,
  rawState: unknown,
  version: ChecklistVersionInfo,
  authoritative: boolean,
): void {
  state.checklists[key] = toEntries(source, rawState);
  state.checklistVersions[key] = {
    core: source.core,
    teamId: source.teamId,
    sessionId: source.sessionId,
    epoch: version.epoch,
    revision: version.revision,
    authoritative,
  };
}

/** 更新人格级水位（`revision` 只增；`snapshot*` 记最近一次权威 full）。 */
function bumpWatermark(
  state: AppState,
  core: string | null,
  teamId: string | null,
  version: ChecklistVersionInfo,
  full: boolean,
): void {
  const key = teamKey(core, teamId);
  const prev = state.checklistWatermarks[key];
  const revisions: number[] = [];
  if (prev?.revision != null) revisions.push(prev.revision);
  if (version.revision != null) revisions.push(version.revision);
  const next: ChecklistWatermark = {
    core: core ?? null,
    teamId: teamId ?? null,
    epoch: version.epoch ?? prev?.epoch ?? null,
    revision: revisions.length ? Math.max(...revisions) : null,
    snapshotRevision: full
      ? (version.revision ?? prev?.snapshotRevision ?? null)
      : (prev?.snapshotRevision ?? null),
    snapshotAt: full ? Date.now() : (prev?.snapshotAt ?? null),
  };
  state.checklistWatermarks[key] = next;
}

/**
 * 应用一条 `ChecklistUpdated`（单会话）。返回是否接受（被旧版本拒绝时 false）。
 * 旧 Core 的无版本状态可展示，但始终标为未同步。
 *
 * 重连后已有水位但尚未收到新 full 时，replay/live 只更新未同步展示，不推进
 * 水位。否则旧连接的高 revision 会重新建立基线，挡住新库的 bootstrap full。 */
export function applyChecklistUpdated(
  state: AppState,
  core: string | null,
  teamId: string | null,
  sessionId: string,
  rawState: unknown,
): boolean {
  if (!isChecklistStatePayload(rawState)) return false;
  const version = checklistVersionOf(rawState);
  const key = checklistKey(core, teamId, sessionId);
  const current = state.checklistVersions[key];
  const watermark = state.checklistWatermarks[teamKey(core, teamId)];
  const reconnectPending =
    watermark != null &&
    watermark.snapshotAt == null &&
    watermark.revision == null &&
    watermark.epoch == null &&
    watermark.snapshotRevision == null;
  const epochRebased =
    reconnectPending &&
    current?.epoch != null &&
    version.epoch != null &&
    current.epoch !== version.epoch;
  const versioned = hasChecklistVersion(version);
  // full 已删除的会话没有 current，但仍受人格水位保护：否则一条采集前
  // 发出的旧 live 会在 full 之后把会话复活。新 Core 上也不再接受混进来的
  // 无版本旧式事件；真正旧 Core 没有任何水位，仍按原兼容路径展示。
  if (!current && watermark && !reconnectPending) {
    if (!versioned) return false;
    if (watermark.revision != null && version.revision! < watermark.revision) return false;
  }
  if (!epochRebased && !acceptsChecklistVersion(current, version, false)) return false;
  writeProjection(
    state,
    key,
    { core, teamId, sessionId },
    rawState,
    version,
    versioned && !reconnectPending,
  );
  if (versioned) {
    noteChecklistCapability(state, core);
    if (!reconnectPending) bumpWatermark(state, core, teamId, version, false);
  }
  return true;
}

function samePersona(
  version: ChecklistProjectionVersion,
  core: string | null,
  teamId: string | null,
): boolean {
  return (version.core ?? null) === (core ?? null) && (version.teamId ?? null) === (teamId ?? null);
}

/**
 * 应用整人格权威 full。坏 full 整体拒绝，不能把缺字段解释成权威空。
 * 低 revision full 不覆盖更高 live、不刷新 snapshotAt，但仍可清理不高于
 * 自身版本且确认缺席的旧投影。重连待首份 full 时允许换 epoch 重新定基。 */
export function applyChecklistsSnapshot(
  state: AppState,
  core: string | null,
  teamId: string,
  snapshot: ChecklistVersionInfo,
  states: ReadonlyArray<{ session_id?: unknown; state?: unknown }> | null | undefined,
): void {
  if (!hasChecklistVersion(snapshot) || !Array.isArray(states)) return;
  const snapshotRevision = snapshot.revision!;
  const previous = state.checklistWatermarks[teamKey(core, teamId)];
  const reconnectPending =
    previous != null &&
    previous.snapshotAt == null &&
    previous.revision == null &&
    previous.epoch == null &&
    previous.snapshotRevision == null;
  const staleEnvelope =
    !reconnectPending && previous?.revision != null && snapshotRevision < previous.revision;
  if (
    !reconnectPending &&
    previous &&
    previous.revision === snapshotRevision &&
    previous.epoch &&
    previous.epoch !== snapshot.epoch
  ) {
    return;
  }
  for (const entry of states) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.session_id !== 'string' ||
      !entry.session_id ||
      !isChecklistStatePayload(entry.state)
    ) {
      return;
    }
  }

  noteChecklistCapability(state, core);
  const seen = new Set<string>();
  for (const entry of states) {
    const sessionId = entry.session_id as string;
    const rawState = entry.state;
    seen.add(sessionId);
    const key = checklistKey(core, teamId, sessionId);
    const current = state.checklistVersions[key];
    const epochRebased =
      reconnectPending && current?.epoch != null && current.epoch !== snapshot.epoch;
    if (!epochRebased && !acceptsChecklistVersion(current, snapshot, true)) continue;
    writeProjection(state, key, { core, teamId, sessionId }, rawState, snapshot, true);
  }

  for (const [key, version] of Object.entries(state.checklistVersions)) {
    if (!samePersona(version, core, teamId) || seen.has(version.sessionId)) continue;
    const oldEpoch = reconnectPending && version.epoch != null && version.epoch !== snapshot.epoch;
    if (!oldEpoch && version.revision != null && version.revision > snapshotRevision) continue;
    delete state.checklists[key];
    delete state.checklistVersions[key];
  }

  if (!staleEnvelope) bumpWatermark(state, core, teamId, snapshot, true);
}
/**
 * 新连接 = 新基线：旧投影保留展示但标脏，等权威 full 重建版本和能力。
 * Panel 主 WS 重连清全部；多 Core 中某个上游独立重连只清该 Core。
 */
function clearChecklistBaseline(
  state: AppState,
  matches: (core: string | null) => boolean,
): void {
  for (const version of Object.values(state.checklistVersions)) {
    if (!matches(version.core ?? null)) continue;
    version.revision = null;
    version.epoch = null;
    version.authoritative = false;
  }
  for (const watermark of Object.values(state.checklistWatermarks)) {
    if (!matches(watermark.core ?? null)) continue;
    watermark.revision = null;
    watermark.epoch = null;
    watermark.snapshotRevision = null;
    watermark.snapshotAt = null;
  }
}

/** 某个上游 Core 恢复 online：只允许这一份投影重定基，不影响其他 Core。 */
export function resetChecklistSyncForCore(state: AppState, core: string | null): void {
  clearChecklistBaseline(state, (candidate) => candidate === (core ?? null));
  delete state.checklistCapability[checklistCoreKey(core)];
}

/** Panel 自己的 WebSocket 重连：所有上游都等新连接快照确认。 */
export function resetChecklistSyncForReconnect(state: AppState): void {
  clearChecklistBaseline(state, () => true);
  state.checklistCapability = {};
}

/**
 * 该会话的清单是否权威（可显示"已同步"）。
 *
 * - Core 能力未确认（旧 Core）→ false（UI 标"未同步"）；
 * - 该会话有权威投影（full / 带版本事件）→ true；
 * - 该人格收到过权威 full 且快照里没有该会话 → true（权威地"没有清单"）。
 */
export function checklistSessionSynced(
  state: AppState,
  core: string | null,
  teamId: string | null,
  sessionId: string,
): boolean {
  if (!checklistCoreAuthoritative(state, core)) return false;
  const version = state.checklistVersions[checklistKey(core, teamId, sessionId)];
  if (version) return version.authoritative;
  const watermark = state.checklistWatermarks[teamKey(core, teamId)];
  return watermark?.snapshotAt != null;
}

/** 单条清单条目的同步状态（global 聚合视图逐条判断用）。 */
export function checklistEntrySynced(state: AppState, entry: ChecklistEntry): boolean {
  const source = entry.source;
  if (!source) return false;
  return checklistSessionSynced(state, source.core, source.teamId, source.sessionId);
}

/**
 * 当前视图的"未同步"判定（UI 标记用）：
 * - Core 能力未确认（旧 Core / 还没收到首个权威快照）→ 未同步；
 * - 作用域里只要还有旧式（非权威）投影 → 未同步。
 *
 * 只影响展示（面板的"未同步"标签），不影响数据；调用方传当前视图的条目
 * （会话视图 = 该会话，global = 该 core 的聚合）。
 */
export function checklistScopeUnsynced(
  state: AppState,
  core: string | null,
  entries: readonly ChecklistEntry[],
): boolean {
  if (!checklistCoreAuthoritative(state, core)) return true;
  return entries.some((entry) => !checklistEntrySynced(state, entry));
}

/** global 空视图也必须等当前 Core 每个运行人格的 full；不能因 entries=[]
 * 就把"还没拉取"显示成"已同步"。 */
export function checklistRegionUnsynced(
  state: AppState,
  core: string | null,
  entries: readonly ChecklistEntry[],
): boolean {
  if (checklistScopeUnsynced(state, core, entries)) return true;
  return state.teams.some((team) => {
    if (!team.running) return false;
    if (core != null && (team.core ?? null) !== core) return false;
    return state.checklistWatermarks[teamKey(core, team.id)]?.snapshotAt == null;
  });
}
