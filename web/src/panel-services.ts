//! 面板服务调用（`InvokeService`）：按**服务名**请求，按 `request_id` 配对。
//!
//! ## 为什么不复用 `REQUEST_RESPONSES` 那张表
//!
//! 那张表是「一条命令 ↔ 一个响应事件」的一对一映射（`pending.ts`）。服务通道
//! 做不到：一个服务有多个方法，而回执事件只有一个名字
//! （`ServiceInvokeResult`）——靠事件名配对根本表达不了"这条回执是 `list` 的
//! 还是 `get` 的"。所以配对键是 `request_id`，由本模块生成、Core 原样回显。
//!
//! 顺带修掉 `InvokeModuleOp` 那边的一个坑：它的 `request_id` 是模块自己在
//! `payload` 里塞的，**失败回执里没有**（Core 只回 `data: null`），前端只能
//! 一路等到超时。协议内建的 `request_id` 在成功与失败回执里都在。
//!
//! ## 超时是兜底，不是常态
//!
//! Core 侧对每条 `InvokeService` 都**必回**一条 `ServiceInvokeResult`（服务没
//! 登记、方法没声明、服务自己失败都回显式原因）。超时只覆盖"命令根本没发出去"
//! 与"连接断了"。所以超时提示要说明这一点，别让人以为服务慢。

import { sendCommand } from './connection';

/** 服务回执的形状（与 Core 的 `BackendEvent::ServiceInvokeResult` 一致）。 */
export interface ServiceInvokeResult {
  ServiceInvokeResult: {
    service: string;
    method: string;
    request_id: string;
    ok: boolean;
    data: unknown;
    error?: string | null;
    core?: string | null;
  };
}

/** 等待中的调用。 */
interface PendingCall {
  service: string;
  method: string;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: number;
}

/**
 * 超时窗口。
 *
 * 比 `pending.ts` 的 20s 短：那条路径的等待是"视图加载态"（用户看着骨架屏，
 * 长一点无妨），这里是一次读请求——15s 还没回来说明连接有问题，早点把错误
 * 交给调用方比继续转圈有用。
 */
export const SERVICE_TIMEOUT_MS = 15_000;

const pending = new Map<string, PendingCall>();

/** 生成配对 id。用递增 + 时间戳，不依赖 `crypto.randomUUID`（老 WebView 没有）。 */
let sequence = 0;
export function newRequestId(): string {
  sequence += 1;
  return `svc-${Date.now().toString(36)}-${sequence}`;
}

/** 当前在飞的调用数（诊断 / 测试用）。 */
export function pendingServiceCalls(): number {
  return pending.size;
}

/**
 * 调用一个面板服务。
 *
 * `teamId` 给定时带上 `team_id` 载荷——服务按它过滤（会话列表用它区分人格）。
 * `targetCore` 给定时按它路由（多上游；缺省走"当前运行区域"）。
 * 返回值是回执的 `data`（形状由服务约定）；失败（`ok: false`）抛 `Error`，
 * `message` 就是 Core 给的可读原因（含"已登记的服务清单"这类线索）。
 */
export function invokeService(
  service: string,
  method: string,
  payload: Record<string, unknown> = {},
  teamId?: string | null,
  targetCore?: string | null,
): Promise<unknown> {
  const requestId = newRequestId();
  return new Promise<unknown>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      reject(
        new Error(
          `面板服务 ${service}.${method} 超时（${SERVICE_TIMEOUT_MS / 1000}s 未收到回执；` +
            `Core 侧对每条调用都必回，超时通常意味着命令没发出去或连接已断）`,
        ),
      );
    }, SERVICE_TIMEOUT_MS);
    // `targetCore` 显式给出时按它路由：服务名**不含**身份信息（不像
    // `team_id` / `session_id` 能反推归属），多上游下靠
    // `resolveTargetCore` 的"当前运行区域"兜底会把请求发给用户当前在看的那个
    // Core——通常正确，但调用方知道更准确时应该能说了算。
    const sent = sendCommand(
      {
        InvokeService: {
          service,
          method,
          payload: teamId ? { ...payload, team_id: teamId } : payload,
          request_id: requestId,
        },
      },
      targetCore ?? undefined,
    );
    if (!sent) {
      // 拒发（多上游下解析不出目标 core / 未连接）：当场失败，不登记等待。
      // 这与 `sendPending` 的"先发再登记"同一教训——登记了没人销账，用户
      // 只能等到超时，期间什么都看不到。
      window.clearTimeout(timer);
      reject(new Error(`面板服务 ${service}.${method} 未发出（连接未就绪或目标 Core 无法解析）`));
      return;
    }
    pending.set(requestId, {
      service,
      method,
      resolve: (data) => {
        window.clearTimeout(timer);
        resolve(data);
      },
      reject: (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
      timer,
    });
  });
}

/**
 * 认领一帧服务回执。
 *
 * 返回 `true` = 本帧是**本次请求**的回执并已消化（调用方不要继续送进通用
 * reducer）；`false` = 不是（别的窗口的、或已经超时放弃的调用）。
 *
 * 「别的窗口的」为什么会出现：Core 把事件广播给所有 Panel 连接，而
 * `request_id` 只在发起窗口的 pending 表里——查不到就自然丢弃。
 */
export function consumeServiceResult(event: unknown): boolean {
  const frame = event as ServiceInvokeResult | undefined;
  const result = frame?.ServiceInvokeResult;
  if (!result || typeof result.request_id !== 'string') return false;
  const call = pending.get(result.request_id);
  if (!call) return false;
  pending.delete(result.request_id);
  if (result.ok) {
    call.resolve(result.data);
  } else {
    // `error` 为空的失败回执不该出现（Core 必带原因）；仍兜一句，免得
    // 用户看到 `undefined`。
    call.reject(
      new Error(
        result.error ??
          `面板服务 ${result.service}.${result.method} 失败（Core 未给出原因）`,
      ),
    );
  }
  return true;
}

/**
 * 丢弃全部在飞调用（断连 / 切 Core 时调用）。
 *
 * 全部 reject 而不是静默清空：调用方的 `await` 会挂住，视图的加载态就永远
 * 收不掉（2026-11 工作区「看不到文件浏览器」的同款形状）。
 */
export function resetServiceCalls(reason = '连接已重置'): void {
  for (const [id, call] of pending) {
    window.clearTimeout(call.timer);
    call.reject(new Error(`面板服务 ${call.service}.${call.method} 已取消（${reason}）`));
    pending.delete(id);
  }
}
