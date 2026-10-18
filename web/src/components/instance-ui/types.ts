//! 实例 UI 描述符类型（03a §1.1；00 §二 冻结的 7 类节点）。
//!
//! 渲染器只消费「已解析好的描述符对象」（A1），不关心载体；
//! 扩展字段白名单（01a §3.1 写入 v1）：select `options` 对象形态
//! `{value,label,hint}`、image `clear_when`、text `editable`、button
//! `confirm`。已否决的 `arg_key` / `labels` 不实现。

/** v1 冻结的节点类型。 */
export const NODE_TYPES = [
  'status',
  'text',
  'link',
  'select',
  'list_editor',
  'image',
  'button',
] as const;
export type UiNodeType = (typeof NODE_TYPES)[number];

/** 动作声明：`$value` 为节点当前值占位（arg 可嵌套对象，03a §1.6）。 */
export interface UiAction {
  method: string;
  arg?: unknown;
}

/** 拉取声明（image）：调 method，从 result[result_key] 取 base64 PNG。 */
export interface UiFetch {
  method: string;
  result_key: string;
}

/** select 选项（01a §3.1：对象形态 {value,label?,hint?}；字符串形态解析时已归一）。 */
export interface SelectOptionItem {
  value: string;
  label?: string;
  hint?: string;
}

interface UiNodeBase {
  type: UiNodeType;
  label?: string;
  /** 状态文档点分路径（00 §三）。 */
  bind?: string;
  /** 可选说明文字。 */
  hint?: string;
}

export interface StatusNodeDef extends UiNodeBase {
  type: 'status';
}

export interface TextNodeDef extends UiNodeBase {
  type: 'text';
  /** 扩展字段（01a §3.1）：可编辑 + 保存按钮（须同时带合法 action）。 */
  editable?: boolean;
  action?: UiAction;
}

export interface LinkNodeDef extends UiNodeBase {
  type: 'link';
}

export interface SelectNodeDef extends UiNodeBase {
  type: 'select';
  options: SelectOptionItem[];
  action?: UiAction;
}

export interface ListEditorNodeDef extends UiNodeBase {
  type: 'list_editor';
  action?: UiAction;
}

export interface ImageNodeDef extends UiNodeBase {
  type: 'image';
  fetch: UiFetch;
  /** 扩展字段（01a §3.1）：bind 路径，值为真时清除已拉取的图。 */
  clear_when?: string;
}

export interface ButtonNodeDef extends UiNodeBase {
  type: 'button';
  action: UiAction;
  /** 扩展字段（01a §3.1）：点击先弹确认框（危险操作）。 */
  confirm?: string;
}

export type UiNode =
  | StatusNodeDef
  | TextNodeDef
  | LinkNodeDef
  | SelectNodeDef
  | ListEditorNodeDef
  | ImageNodeDef
  | ButtonNodeDef;

export interface UiPanel {
  id: string;
  title?: string;
  nodes: UiNode[];
}

export type UiWarningCode = 'unknown_node' | 'unknown_version' | 'bad_field' | 'unknown_action';
export interface UiWarning {
  code: UiWarningCode;
  detail: string;
}

/** parseDescriptor 产出（03a §1.1；不抛异常）。 */
export interface ParsedDescriptor {
  /** 归一后的版本号（缺省/非数字按 1）。 */
  version: number;
  /** version > 1：按 v1 尽力解析，面板顶部提示升级（03a §3.1）。 */
  newerVersion: boolean;
  /** version < 1：非法描述符，不渲染任何 panel（03a §3.1）。 */
  invalid: boolean;
  panels: UiPanel[];
  warnings: UiWarning[];
}

/** 实例元信息（03a §1.2；来自 InstanceStatus）。 */
export interface InstanceUiMeta {
  /** 显式目标 core（多上游路由；02a §5.3 D4 允许 null = 单上游裸命令）。 */
  core: string | null;
  instance: string;
  displayName?: string;
  running: boolean;
  connected: boolean;
}
