//! QQ 面板过渡视图层（02b §0/§3）：读类结果覆盖层 + 状态文档 → 现组件模板投影。
//!
//! 背景（适配器泛化）：读类方法（`get_groups` / `get_friends` / `get_filter_config`
//! / `get_owner` / `login_status`）的结果只经 `AdapterOpResult.result` 返回；其中
//! groups / friends 在状态文档（00 §三）中根本没有对应字段，filter / owner / login
//! 的状态文档又只在写方法后回推。本模块把读结果存入模块级覆盖层 `readOverlay`，
//! `toQqView` 将其与 `state.adapterUiByKey` 的状态文档合并成现模板形状。
//!
//! 覆盖层有效性（02b §0）：每条记录保存**到达时**的文档引用（`docRef`）；filter /
//! owner / login 仅在 `docRef` 与当前文档引用一致时采用——新 `AdapterState` 到达
//! （整文档替换 ⇒ 引用变化）即自动让旧读结果失效，无需 watcher。groups / friends
//! 不在状态文档中，始终取覆盖层。
//!
//! 本模块为迁移过渡件（03b S6 随 QqPanel / QqLoginSection 一起删除）。

import { reactive } from 'vue';
import { scopedKey } from '../../keys';
import { state } from '../../store';
import type { GateMode } from '../../protocol';

/** 状态文档（00 §三；Panel 不校验形状，取值处容错）。 */
export interface QqDoc {
  instance?: {
    persona?: string | null;
    container?: string | null;
    webui_url?: string | null;
    onebot_url?: string | null;
    bind_address?: string | null;
  } | null;
  running?: boolean;
  online?: boolean;
  self_id?: string | null;
  gate?: {
    mode?: unknown;
    allowlist_users?: unknown;
    allowlist_groups?: unknown;
    denylist_users?: unknown;
    denylist_groups?: unknown;
  } | null;
  owner?: unknown;
}

/** 覆盖层的一条记录：读结果片段 + 到达时的文档引用（02b §3）。 */
export interface QqReadOverlay {
  /** 到达时 `state.adapterUiByKey[key]` 的引用（null = 当时无文档）。 */
  docRef: unknown;
  /** `get_filter_config` 四表（原始形状；投影时 Number 化）。 */
  filter?: {
    allowlist_users: unknown;
    allowlist_groups: unknown;
    denylist_users: unknown;
    denylist_groups: unknown;
  };
  /** `get_owner` → `owner_qq`。 */
  owner?: number;
  /** `get_groups`（原始 `[{id,name}]`；投影时转 `[number,string]`）。 */
  groups?: Array<{ id?: unknown; name?: unknown }>;
  /** `get_friends`（同上）。 */
  friends?: Array<{ id?: unknown; name?: unknown }>;
  /** `login_status` → `{online, user_id}`。 */
  login?: { online: boolean; user_id: string | null };
}

/** 读结果覆盖层：(core,adapter) 复合键（`scopedKey`）→ 记录。 */
export const readOverlay = reactive<Record<string, QqReadOverlay>>({});

/** 一条读结果的写入器（对 result 做形状守卫，不抛异常；02b §3）。 */
export type ReadApply = (ov: QqReadOverlay, result: Record<string, unknown>) => void;

/** 读类方法名（`READS` 表键；02b §1.2）。 */
export type ReadMethod =
  | 'get_groups'
  | 'get_friends'
  | 'get_filter_config'
  | 'get_owner'
  | 'login_status';

/** `login_status` 结果 → 覆盖层（QqPanel 刷新与 QqLoginSection.requestStatus 共用）。 */
export const applyLoginStatus: ReadApply = (ov, r) => {
  if (typeof r.online !== 'boolean') return; // 缺键/类型不符：不写（静默）
  ov.login = { online: r.online, user_id: r.user_id == null ? null : String(r.user_id) };
};

const applyGroups: ReadApply = (ov, r) => {
  if (Array.isArray(r.groups)) ov.groups = r.groups as QqReadOverlay['groups'];
};

const applyFriends: ReadApply = (ov, r) => {
  if (Array.isArray(r.friends)) ov.friends = r.friends as QqReadOverlay['friends'];
};

const applyFilter: ReadApply = (ov, r) => {
  // 四表齐备才写（缺键 = 不写，静默；02b §3 结果校验）。
  if (
    !Array.isArray(r.allowlist_users) ||
    !Array.isArray(r.allowlist_groups) ||
    !Array.isArray(r.denylist_users) ||
    !Array.isArray(r.denylist_groups)
  ) {
    return;
  }
  ov.filter = {
    allowlist_users: r.allowlist_users,
    allowlist_groups: r.allowlist_groups,
    denylist_users: r.denylist_users,
    denylist_groups: r.denylist_groups,
  };
};

const applyOwner: ReadApply = (ov, r) => {
  if (r.owner_qq == null) return; // 缺键：不写（静默）
  const owner = Number(r.owner_qq);
  if (!Number.isNaN(owner)) ov.owner = owner;
};

/** 读类操作表：`[method, 覆盖层写入]`（QqPanel refreshLists 逐条发起；02b §1.2）。 */
export const READS: ReadonlyArray<[ReadMethod, ReadApply]> = [
  ['get_groups', applyGroups],
  ['get_friends', applyFriends],
  ['get_filter_config', applyFilter],
  ['get_owner', applyOwner],
  ['login_status', applyLoginStatus],
];

/**
 * 读结果 → 覆盖层（02b §3）：按 (core,adapter) 键**合并**写入；`docRef` 记
 * **到达时**的文档引用（后续 AdapterState 整文档替换即失配 ⇒ 覆盖值让位最新
 * 文档）。result 非对象时不写；键/形状守卫在各 `ReadApply` 内（静默）。
 */
export function applyRead(key: string, apply: ReadApply, result: unknown): void {
  if (typeof result !== 'object' || result === null) return; // 形状守卫：非对象不写
  const next: QqReadOverlay = { ...(readOverlay[key] ?? { docRef: null }) };
  next.docRef = state.adapterUiByKey[key] ?? null;
  apply(next, result as Record<string, unknown>);
  readOverlay[key] = next;
}

/** 上游 core 离线/移除：清该 core 前缀的覆盖层（`onCoreDropped` 钩子；02a §5.4）。 */
export function dropReadOverlayOfCore(core: string): void {
  const prefix = `${core}\u0000`;
  for (const key of Object.keys(readOverlay)) {
    if (key.startsWith(prefix)) delete readOverlay[key];
  }
}

/** 按实例名读取当前运行区域的状态文档（container/webui 回退链用；缺省 null）。 */
export function docOf(name: string): QqDoc | null {
  return (state.adapterUiByKey[scopedKey(state.activeRegion, name)] as QqDoc | undefined) ?? null;
}

/** 现模板消费的视图形状（QqPanel/QqLoginSection 投影；02b §1.1）。 */
export interface QqView {
  filter: {
    allowlist_users: number[];
    allowlist_groups: number[];
    denylist_users: number[];
    denylist_groups: number[];
  };
  gateMode: GateMode;
  owner: number;
  groups: Array<[number, string]>;
  friends: Array<[number, string]>;
  /** 登录态（QqLoginSection 消费）：无文档且无读结果时为 undefined（回落 AdapterStatus）。 */
  online?: boolean;
  selfId?: string | null;
}

/** string/number → number[]；不可解析（NaN）的元素丢弃（02b §3 结果校验）。 */
function numList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const item of raw) {
    if (item == null) continue;
    const n = Number(item);
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

/** `[{id,name}]` → `[[number,string]]`；id 不可解析的条目丢弃。 */
function numPairs(raw: unknown): Array<[number, string]> {
  if (!Array.isArray(raw)) return [];
  const out: Array<[number, string]> = [];
  for (const item of raw) {
    const pair = item as { id?: unknown; name?: unknown } | null;
    if (pair?.id == null) continue;
    const id = Number(pair.id);
    if (Number.isNaN(id)) continue;
    out.push([id, typeof pair.name === 'string' ? pair.name : String(pair.name ?? '')]);
  }
  return out;
}

/** 门控模式：仅接受值域内三值，其余回落 `none`（容错）。 */
function gateModeOf(gate: QqDoc['gate']): GateMode {
  const mode = gate?.mode;
  return mode === 'allowlist' || mode === 'denylist' ? mode : 'none';
}

/**
 * 状态文档 + 覆盖层 → 现模板用的视图（02b §1.1 投影表）。
 *
 * `docRaw` = `state.adapterUiByKey[key] ?? null`；`ov` = `readOverlay[key]`。
 * filter / owner / login 只在覆盖层与当前文档同代（docRef 匹配）时采用；
 * groups / friends 不在状态文档中，始终取覆盖层。
 */
export function toQqView(docRaw: unknown, ov: QqReadOverlay | undefined): QqView {
  const doc = (typeof docRaw === 'object' && docRaw !== null ? docRaw : null) as QqDoc | null;
  const fresh = (ov?.docRef ?? null) === doc;
  const gate = doc?.gate ?? null;
  const filterSource = fresh ? ov?.filter : undefined;
  const pick = (fromOverlay: unknown, fromDoc: unknown): number[] =>
    numList(fromOverlay ?? fromDoc);
  const owner =
    fresh && ov?.owner != null ? ov.owner : typeof doc?.owner === 'number' ? doc.owner : 0;
  const login = fresh ? ov?.login : undefined;
  const hasDoc = doc !== null;
  return {
    filter: {
      allowlist_users: pick(filterSource?.allowlist_users, gate?.allowlist_users),
      allowlist_groups: pick(filterSource?.allowlist_groups, gate?.allowlist_groups),
      denylist_users: pick(filterSource?.denylist_users, gate?.denylist_users),
      denylist_groups: pick(filterSource?.denylist_groups, gate?.denylist_groups),
    },
    gateMode: gateModeOf(gate),
    owner,
    groups: numPairs(ov?.groups),
    friends: numPairs(ov?.friends),
    // 无 doc 且无 ov.login ⇒ undefined（QqLoginSection 回落 AdapterStatus；02b §2.1）。
    online: login ? login.online : hasDoc ? doc?.online === true : undefined,
    selfId: login
      ? login.user_id
      : hasDoc
        ? doc?.self_id == null
          ? null
          : String(doc.self_id)
        : undefined,
  };
}
