//! 全局确认对话框服务（2026-10 审计修复：替换 window.confirm/alert）。
//!
//! 背景：设置/上下文/工作区面板共 11 处 `window.confirm/alert`——阻塞式
//! 原生弹窗、样式不可控、与主题脱节（暗色下白框刺眼）。本模块提供与
//! 库 `NeumorphismModal` 渲染的全局确认框：`confirmDialog()` 返回
//! `Promise<boolean>`，调用点保持 `if (!(await confirmDialog(...)))` 的
//! 同步式写法；对话框组件（`components/ConfirmDialog.vue`）在 App 根挂载
//! 一次，任意组件可调用（纯模块级状态，不受组件树/teleport 影响）。
//!
//! 并发语义：同一时间只展示一个确认框；若旧框未结算又发起新框，旧框按
//! "取消"（false）结算，避免调用方悬挂。

import { ref } from 'vue';

/** 确认框选项。 */
export interface ConfirmOptions {
  /** 标题（缺省「确认操作」）。 */
  title?: string;
  /** 确认按钮文案（缺省「确定」）。 */
  confirmText?: string;
  /** 取消按钮文案（缺省「取消」）。 */
  cancelText?: string;
  /** 危险操作（删除等）：确认按钮用错误色。 */
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  message: string;
}

const active = ref<ConfirmRequest | null>(null);
let resolver: ((ok: boolean) => void) | null = null;

/**
 * 打开确认框；用户「确定」resolve(true)，「取消」/遮罩/关闭 resolve(false)。
 */
export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (resolver) {
    const previous = resolver;
    resolver = null;
    previous(false);
  }
  active.value = { message, ...options };
  return new Promise<boolean>((resolve) => {
    resolver = resolve;
  });
}

/** 当前确认请求（供 ConfirmDialog 渲染；null = 未打开）。 */
export function confirmActive() {
  return active;
}

/** 结算当前确认框（确认对话框组件内部使用）。 */
export function settleConfirm(ok: boolean): void {
  const pending = resolver;
  resolver = null;
  active.value = null;
  pending?.(ok);
}
