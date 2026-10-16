//! 适配器统一操作通道（02a §5.2）：`InvokeAdapterOp` 的请求-响应配对服务层。
//!
//! 背景：线协议 `AdapterOpResult` 无请求 id（00 §一）——按
//! `adapter-op:${scopedKey(core, adapter)}:${method}` 键配对（02a §1-D1）。
//! 同键 FIFO 串行（第二个请求等第一个 settle 才发出）；业务失败也
//! resolve（`{result:null,error}`），超时/拒发/离线 reject（03a §4.2）。
//!
//! 状态说明：队列/Promise/订阅表都是普通 Map/Set（不进 Vue 响应式）；
//! 唯一响应式数据在 state.ts（adapterUiByKey）与 pending.ts（加载态三态）。

import { state } from './store';
import { sendCommand } from './connection';
import {
  PENDING_TIMEOUT_AFTER_MS,
  dropPendingOfCore,
  settlePending,
  trackRequest,
} from './pending';
import { scopedKey } from './keys';
import type { AdapterOpMethod, BackendCommand } from './protocol';

/** 一次操作的结算结果（业务失败也 resolve；error=null 表示成功）。 */
export interface AdapterOpOutcome {
  result: unknown;
  error: string | null;
}

/** 配对键：`adapter-op:${scopedKey(core, adapter)}:${method}`（02a §5.2；D1）。 */
export function adapterOpKey(
  core: string | null,
  adapter: string,
  method: AdapterOpMethod,
): string {
  return `adapter-op:${scopedKey(core, adapter)}:${method}`;
}

interface OpHandle {
  key: string;
  core: string | null;
  adapter: string;
  method: AdapterOpMethod;
  payload: Record<string, unknown>;
  resolve: (outcome: AdapterOpOutcome) => void;
  reject: (error: Error) => void;
  /** 超时定时器（已发出后才设置；排队期为 undefined）。 */
  timer?: number;
  /** 已结算（resolve/reject/drop）——防重入。 */
  done: boolean;
}

/** 在途操作（键 → 句柄；同键串行的队头）。 */
const inflight = new Map<string, OpHandle>();
/** 同键排队（FIFO；仅当该键有在途操作时非空）。 */
const waiting = new Map<string, OpHandle[]>();
/** core → 其未结算句柄集合（在途 + 排队；断线清理用）。 */
const handlesByCore = new Map<string, Set<OpHandle>>();
/** `onCoreDropped` 订阅者。 */
const droppedSubscribers = new Set<(core: string) => void>();

/** 从各结构摘除句柄（幂等；不触碰 Promise 状态）。 */
function clearHandle(h: OpHandle): void {
  if (inflight.get(h.key) === h) inflight.delete(h.key);
  const queue = waiting.get(h.key);
  if (queue) {
    const index = queue.indexOf(h);
    if (index >= 0) queue.splice(index, 1);
    if (!queue.length) waiting.delete(h.key);
  }
  if (h.core != null) {
    const set = handlesByCore.get(h.core);
    if (set) {
      set.delete(h);
      if (!set.size) handlesByCore.delete(h.core);
    }
  }
  if (h.timer !== undefined) {
    window.clearTimeout(h.timer);
    h.timer = undefined;
  }
}

/** 启动同键 FIFO 的下一个排队者（队头 settle 后调用）。 */
function pump(key: string): void {
  if (inflight.has(key)) return;
  const queue = waiting.get(key);
  if (!queue) return;
  while (queue.length && queue[0].done) queue.shift(); // 防御：已被清理的残留
  if (!queue.length) {
    waiting.delete(key);
    return;
  }
  const next = queue.shift()!;
  if (!queue.length) waiting.delete(key);
  startNow(next);
}

/** 发送一次操作（trackRequest + sendCommand）；拒发立即 reject、不登记 pending。 */
function startNow(h: OpHandle): void {
  if (h.done) return;
  const command: BackendCommand = {
    InvokeAdapterOp: { adapter: h.adapter, method: h.method, payload: h.payload },
  };
  // sendCommand 自带防误投守卫（多上游解析不出目标）与未连接拒发；返回 false
  // ⇒ 未发送、未排队——立即 reject（文案沿用 sendCommand toast，02a §5.2-2）。
  const sent = sendCommand(command, h.core ?? undefined);
  if (!sent) {
    const ambiguous = h.core == null && state.knownCores.size > 1;
    rejectHandle(
      h,
      new Error(
        ambiguous
          ? '尚未选择 agent（无法确定运行区域），命令未发送'
          : '未连接到 Core，命令未发送',
      ),
    );
    return;
  }
  // 已发出（或握手期已排队）：登记加载跟踪 + 在途句柄。
  trackRequest(h.key, command, h.core);
  inflight.set(h.key, h);
  h.timer = window.setTimeout(() => {
    h.timer = undefined;
    // 超时：reject Promise；pending 条目的 timeout 态**保留**（组件可重试/
    // 卸载 release；重试 trackRequest 覆盖，02a §5.2-3）。
    rejectHandle(h, new Error('操作超时，请重试'));
  }, PENDING_TIMEOUT_AFTER_MS);
}

/** 结算：resolve + 出队（同键下一个排队者放行）。 */
function resolveHandle(h: OpHandle, outcome: AdapterOpOutcome): void {
  if (h.done) return;
  h.done = true;
  clearHandle(h);
  h.resolve(outcome);
  pump(h.key);
}

/** 失败：reject + 出队。 */
function rejectHandle(h: OpHandle, error: Error): void {
  if (h.done) return;
  h.done = true;
  clearHandle(h);
  h.reject(error);
  pump(h.key);
}

/**
 * 发起一次适配器操作（02a §5.2；02b A1 签名）。
 *
 * 恒显式传 `core`（多上游 meta.core）；`core=null` 为单上游裸命令——
 * 多上游下 `sendCommand` 会拒发（解析不出目标）。业务失败也 **resolve**
 * （`{result, error}`）；超时（20s）/拒发/离线 **reject**（`Error`）。
 */
export function invokeAdapterOp(
  core: string | null,
  adapter: string,
  method: AdapterOpMethod,
  payload: Record<string, unknown> = {},
): Promise<AdapterOpOutcome> {
  const key = adapterOpKey(core, adapter, method);
  return new Promise<AdapterOpOutcome>((resolve, reject) => {
    const handle: OpHandle = {
      key,
      core,
      adapter,
      method,
      payload,
      resolve,
      reject,
      done: false,
    };
    if (core != null) {
      let set = handlesByCore.get(core);
      if (!set) handlesByCore.set(core, (set = new Set()));
      set.add(handle);
    }
    // 同键 FIFO 串行：第二个请求等第一个 settle 才 trackRequest + sendCommand。
    if (inflight.has(key)) {
      const queue = waiting.get(key);
      if (queue) queue.push(handle);
      else waiting.set(key, [handle]);
      return;
    }
    startNow(handle);
  });
}

/**
 * 结果配对（state.ts 的 `AdapterOpResult` 臂调用）：resolve 同键在途
 * Promise 并按精确键销账（`settlePending`）；无命中的迟到结果静默丢弃
 * （无线协议无请求 id 的已知限制，02a §1-D1）。
 */
export function settleAdapterOp(
  key: string,
  outcome: { result?: unknown; error?: string | null },
): void {
  const h = inflight.get(key);
  if (!h) return;
  settlePending(key);
  resolveHandle(h, { result: outcome.result ?? null, error: outcome.error ?? null });
}

/** 清 `state.adapterUiByKey` 中该 core 前缀的文档（断线清理第 ① 步）。 */
function clearAdapterUiOfCore(core: string): void {
  // 字段在 02a S5 加入 AppState；此处窄断言兼容（字段就位后改直连访问）。
  const ui = (state as { adapterUiByKey?: Record<string, unknown> }).adapterUiByKey;
  if (!ui) return;
  const prefix = `${core}\u0000`;
  for (const key of Object.keys(ui)) {
    if (key.startsWith(prefix)) delete ui[key];
  }
}

/**
 * 上游 core 离线/移除的通道清理（02a §5.4：四联动作）：
 * ① 清该 core 前缀的 `adapterUiByKey` 文档；
 * ② `dropPendingOfCore(core)` 清加载态登记；
 * ③ reject 该 core 在途/排队的 Promise（`'核心已离线，操作已取消'`）；
 * ④ 通知 `onCoreDropped` 订阅者（UI 侧缓存清理，回应 02b A3）。
 */
export function dropCoreAdapterChannel(core: string): void {
  clearAdapterUiOfCore(core);
  dropPendingOfCore(core);
  const handles = [...(handlesByCore.get(core) ?? [])];
  // 先全部摘除再拒绝：避免出队逻辑把待清理句柄误发出去。
  for (const h of handles) {
    h.done = true;
    clearHandle(h);
  }
  const error = new Error('核心已离线，操作已取消');
  const keys = new Set<string>();
  for (const h of handles) {
    keys.add(h.key);
    h.reject(error);
  }
  for (const key of keys) pump(key);
  for (const fn of [...droppedSubscribers]) fn(core);
}

/** 订阅上游 core 离线/移除（返回退订函数；订阅/退订均幂等）。 */
export function onCoreDropped(fn: (core: string) => void): () => void {
  droppedSubscribers.add(fn);
  return () => {
    droppedSubscribers.delete(fn);
  };
}
