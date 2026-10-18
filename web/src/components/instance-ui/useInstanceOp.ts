//! 命令流 composable（03a §2.0 / §4.2；语义复用 02a §5.3 约定表）。
//!
//! - 渲染器层并发约束：同 nodeKey 不并发（在途再触发被忽略）；
//!   同 `(core, instance, method)` 额外串行化——第二个请求排队等第一个
//!   settle 才调 `invokeInstanceOp`（其内部同键 FIFO 之外的双保险，
//!   call_id 方案下无害，03a §4.2）。
//! - 配对/超时/断线语义完全由服务层承担（02a §5.3）：业务失败 resolve
//!   `{result, error}`；超时（20s '操作超时，请重试'）/拒发/离线 reject(Error)。
//! - 卸载安全：组件卸载后 settle 不再写响应式态（04a §4.3-2 丢弃语义）。

import { onUnmounted, reactive } from 'vue';
import { invokeInstanceOp, type InstanceOpOutcome } from '../../instanceOps';
import type { InstanceOpMethod } from '../../protocol';

export interface OpEmitPayload {
  method: string;
  payload: unknown;
  nodeKey: string;
}

export interface OpResultEmitPayload {
  method: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  nodeKey: string;
}

/** 渲染器提供给节点组件的命令总线（per-renderer 实例，03a §4.3-1 天然归属）。 */
export interface InstanceOpBus {
  /** 同 nodeKey 在途时返回 null（忽略）；否则排队发送并等结果。 */
  run(nodeKey: string, method: string, payload: Record<string, unknown>): Promise<InstanceOpOutcome | null>;
  isPending(nodeKey: string): boolean;
  errorOf(nodeKey: string): string | null;
  clearError(nodeKey: string): void;
}

/** 同 (core,instance,method) 串行链（模块级；跨 renderer 实例也串行，与配对键粒度一致）。 */
const methodChains = new Map<string, Promise<unknown>>();

function enqueueMethod<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = methodChains.get(key) ?? Promise.resolve();
  const run = prev.then(task, task);
  methodChains.set(key, run);
  void run
    .catch(() => {})
    .finally(() => {
      if (methodChains.get(key) === run) methodChains.delete(key);
    });
  return run;
}

/**
 * 创建命令总线（在 InstanceUiRenderer setup 中调用一次，provide 给节点）。
 *
 * `meta()` 取当前路由目标（显式 core，03a §4.2）；`emit` 旁路通知
 * （`op` 每次发送前、`op-result` 每次结算后，不影响发送）。
 */
export function useInstanceOp(
  meta: () => { core: string | null; instance: string },
  emit?: {
    op?: (payload: OpEmitPayload) => void;
    opResult?: (payload: OpResultEmitPayload) => void;
  },
): InstanceOpBus {
  const pendingMap = reactive<Record<string, boolean>>({});
  const errorMap = reactive<Record<string, string | null>>({});
  let alive = true;
  onUnmounted(() => {
    alive = false;
  });

  async function run(
    nodeKey: string,
    method: string,
    payload: Record<string, unknown>,
  ): Promise<InstanceOpOutcome | null> {
    if (pendingMap[nodeKey]) return null; // 同 nodeKey 不并发（03a §2.0）
    pendingMap[nodeKey] = true;
    errorMap[nodeKey] = null;
    emit?.op?.({ method, payload, nodeKey });
    const { core, instance } = meta();
    const chainKey = `${core ?? ''}${instance}:${method}`;
    try {
      const outcome = await enqueueMethod(chainKey, () =>
        // 渲染器不维护 method 白名单（03a §3.3-1）：任意合法形状照发。
        invokeInstanceOp(core, instance, method as InstanceOpMethod, payload),
      );
      if (alive) errorMap[nodeKey] = outcome.error; // 成功清错，失败记录
      emit?.opResult?.({
        method,
        ok: outcome.error == null,
        result: outcome.result ?? undefined,
        error: outcome.error ?? undefined,
        nodeKey,
      });
      return outcome;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (alive) errorMap[nodeKey] = message;
      emit?.opResult?.({ method, ok: false, error: message, nodeKey });
      return null;
    } finally {
      if (alive) pendingMap[nodeKey] = false;
    }
  }

  return {
    run,
    isPending: (nodeKey) => pendingMap[nodeKey] === true,
    errorOf: (nodeKey) => errorMap[nodeKey] ?? null,
    clearError: (nodeKey) => {
      errorMap[nodeKey] = null;
    },
  };
}
