//! 渲染器 → 节点组件的注入上下文（03a §1.1 建议文件表之外的实现细节：
//! 节点需要的 state/禁用态/命令总线/warning 通道统一经 provide/inject，
//! 避免七层 prop 透传）。

import type { ComputedRef, InjectionKey } from 'vue';
import type { InstanceOpBus } from './useInstanceOp';
import type { UiWarningCode } from './types';

export interface InstanceUiContext {
  /** 状态文档（null = 尚未收到 InstanceState，03a §2.0 null 态）。 */
  state: ComputedRef<Record<string, unknown> | null>;
  /** 通用禁用态：`props.disabled || !meta.running`（03a §2.0）。 */
  disabled: ComputedRef<boolean>;
  /** 实例运行中（image 节点：running → false 清图，03a §4.3-4）。 */
  running: ComputedRef<boolean>;
  /** 命令总线（per-renderer 实例）。 */
  bus: InstanceOpBus;
  /** 运行期诊断 warning（parse 期 warning 由渲染器直接 emit）。 */
  warn: (code: UiWarningCode, detail: string) => void;
}

export const ADAPTER_UI_CONTEXT: InjectionKey<InstanceUiContext> = Symbol('instance-ui-context');
