//! 描述符解析（03a §1.1 / §3）：版本分支、节点白名单过滤、字段校验。
//!
//! 纯函数、**不抛异常**；产出 `{ panels, warnings }` 供渲染器 memo 化
//! （`computed` 依赖 descriptor 引用；引用不变不重复解析/发 warning）。

import { isValidBindPath, isValidMethod } from './bind';
import {
  NODE_TYPES,
  type ParsedDescriptor,
  type SelectOptionItem,
  type UiAction,
  type UiFetch,
  type UiNode,
  type UiNodeType,
  type UiPanel,
  type UiWarning,
  type UiWarningCode,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

interface ParseCtx {
  warn: (code: UiWarningCode, detail: string) => void;
  /** 同一 descriptor 同 type 的 unknown_node 只发一次（03a §3.2）。 */
  unknownNodeTypes: Set<string>;
  /** 节点定位（warning detail 用）。 */
  where: string;
}

/** action 字段：`{method, arg?}`；method 形状非法 → 无 action + unknown_action（03a §3.3-3）。 */
function parseAction(raw: unknown, ctx: ParseCtx): UiAction | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw) || !isValidMethod(raw.method)) {
    const method = isRecord(raw) ? raw.method : undefined;
    ctx.warn(
      'unknown_action',
      `${ctx.where}：action.method 形状非法（${JSON.stringify(method ?? null)}），按无 action 处理`,
    );
    return undefined;
  }
  return raw.arg === undefined
    ? { method: raw.method }
    : { method: raw.method, arg: raw.arg };
}

/** fetch 字段（image）：method 形状 + result_key 非空字符串（03a §3.2）。 */
function parseFetch(raw: unknown, ctx: ParseCtx): UiFetch | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw) || !isValidMethod(raw.method)) {
    ctx.warn('unknown_action', `${ctx.where}：fetch.method 形状非法，按无 fetch 处理`);
    return undefined;
  }
  if (typeof raw.result_key !== 'string' || !raw.result_key) {
    ctx.warn('bad_field', `${ctx.where}：fetch.result_key 须为非空字符串，按无 fetch 处理`);
    return undefined;
  }
  return { method: raw.method, result_key: raw.result_key };
}

/** bind 字段：非法路径（空串/非法字符）→ bad_field + 按无 bind 处理（03a §1.5）。 */
function parseBind(raw: unknown, ctx: ParseCtx): string | undefined {
  if (raw === undefined) return undefined;
  if (!isValidBindPath(raw)) {
    ctx.warn('bad_field', `${ctx.where}：bind 路径非法（${JSON.stringify(raw)}），按无 bind 处理`);
    return undefined;
  }
  return raw;
}

/** select options：字符串数组或对象形态 {value,label?,hint?}（01a §3.1）；非法项过滤。 */
function parseOptions(raw: unknown, ctx: ParseCtx): SelectOptionItem[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    ctx.warn('bad_field', `${ctx.where}：options 须为数组，按空选项处理`);
    return [];
  }
  const out: SelectOptionItem[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item) {
      out.push({ value: item });
    } else if (isRecord(item) && typeof item.value === 'string' && item.value) {
      const option: SelectOptionItem = { value: item.value };
      const label = str(item.label);
      const hint = str(item.hint);
      if (label) option.label = label;
      if (hint) option.hint = hint;
      out.push(option);
    }
    // 非法项静默过滤（03a §2.4）
  }
  return out;
}

function parseNode(rawNode: unknown, ctx: ParseCtx): UiNode | null {
  if (!isRecord(rawNode)) {
    ctx.warn('bad_field', `${ctx.where}：节点不是对象，已跳过`);
    return null;
  }
  const type = rawNode.type;
  if (typeof type !== 'string' || !(NODE_TYPES as readonly string[]).includes(type)) {
    const name = typeof type === 'string' ? type : '(缺 type)';
    if (!ctx.unknownNodeTypes.has(name)) {
      ctx.unknownNodeTypes.add(name);
      ctx.warn('unknown_node', `未知节点类型 ${name}，已忽略`);
    }
    return null; // 未知节点静默跳过（00 §二 冻结语义）
  }
  const kind = type as UiNodeType;
  const nodeCtx: ParseCtx = { ...ctx, where: `${ctx.where}(${kind})` };
  const label = str(rawNode.label);
  const hint = str(rawNode.hint);
  const bind = parseBind(rawNode.bind, nodeCtx);
  const base = { label, bind, hint };

  switch (kind) {
    case 'status': {
      if (rawNode.action !== undefined) {
        nodeCtx.warn('bad_field', `${nodeCtx.where}：status 不定义 action，已忽略`);
      }
      return { type: 'status', ...base };
    }
    case 'text': {
      return {
        type: 'text',
        ...base,
        editable: rawNode.editable === true,
        action: parseAction(rawNode.action, nodeCtx),
      };
    }
    case 'link': {
      if (rawNode.action !== undefined) {
        nodeCtx.warn('bad_field', `${nodeCtx.where}：link 不定义 action，已忽略`);
      }
      return { type: 'link', ...base };
    }
    case 'select': {
      return {
        type: 'select',
        ...base,
        options: parseOptions(rawNode.options, nodeCtx),
        action: parseAction(rawNode.action, nodeCtx),
      };
    }
    case 'list_editor': {
      return { type: 'list_editor', ...base, action: parseAction(rawNode.action, nodeCtx) };
    }
    case 'image': {
      if (rawNode.bind !== undefined) {
        nodeCtx.warn('bad_field', `${nodeCtx.where}：image 不使用 bind（只用 fetch），已忽略`);
      }
      if (rawNode.action !== undefined) {
        nodeCtx.warn('bad_field', `${nodeCtx.where}：image 不定义 action，已忽略`);
      }
      const fetch = parseFetch(rawNode.fetch, nodeCtx);
      if (!fetch) {
        nodeCtx.warn('bad_field', `${nodeCtx.where}：image 缺少合法 fetch，节点跳过`);
        return null;
      }
      let clear_when: string | undefined;
      if (rawNode.clear_when !== undefined) {
        if (isValidBindPath(rawNode.clear_when)) clear_when = rawNode.clear_when;
        else nodeCtx.warn('bad_field', `${nodeCtx.where}：clear_when 路径非法，已忽略`);
      }
      return { type: 'image', label, hint, fetch, clear_when };
    }
    case 'button': {
      const action = parseAction(rawNode.action, nodeCtx);
      if (!action) {
        nodeCtx.warn('bad_field', `${nodeCtx.where}：button 无合法 action，不渲染`);
        return null;
      }
      const confirm = str(rawNode.confirm);
      return { type: 'button', label, hint, action, ...(confirm ? { confirm } : {}) };
    }
  }
}

/**
 * `parseDescriptor(raw)`：版本分支（03a §3.1）+ 结构容错（§3.2）。
 * `raw == null` → 空描述符、无 warning（03a §1.2：渲染空）。
 */
export function parseDescriptor(raw: unknown): ParsedDescriptor {
  const warnings: UiWarning[] = [];
  const warn: ParseCtx['warn'] = (code, detail) => warnings.push({ code, detail });
  const base = { version: 1, newerVersion: false, invalid: false, panels: [] as UiPanel[], warnings };

  if (raw === null || raw === undefined) return base;
  if (!isRecord(raw)) {
    warn('unknown_version', '描述符不是对象，按无效处理');
    return { ...base, invalid: true };
  }

  const v = raw.version;
  let version: number;
  let newerVersion = false;
  if (typeof v === 'number' && Number.isFinite(v)) {
    version = v;
    if (v < 1) {
      warn('unknown_version', `描述符版本 ${v} 非法（< 1）`);
      return { ...base, version, invalid: true };
    }
    if (v > 1) {
      newerVersion = true; // 按 v1 尽力解析（03a §3.1）
      warn('unknown_version', `描述符版本 v${v} 高于渲染器支持的 v1，按 v1 尽力解析`);
    }
  } else {
    version = 1;
    warn(
      'unknown_version',
      v === undefined ? '描述符缺少 version，按 v1 解析' : `version 非数字（${String(v)}），按 v1 解析`,
    );
  }

  // parseV1（v2 解析器留位；v2 约定为 v1 超集，03a §3.1）
  const panels: UiPanel[] = [];
  const unknownNodeTypes = new Set<string>();
  const seenIds = new Set<string>();
  const rawPanels = Array.isArray(raw.panels) ? raw.panels : [];
  rawPanels.forEach((rawPanel, index) => {
    const panel = isRecord(rawPanel) ? rawPanel : {};
    let id = str(panel.id) ?? `panel-${index}`;
    if (seenIds.has(id)) id = `${id}-${index}`; // id 重复 → 后者加后缀（§3.2）
    seenIds.add(id);
    const nodes: UiNode[] = [];
    const rawNodes = Array.isArray(panel.nodes) ? panel.nodes : [];
    rawNodes.forEach((rawNode, nodeIndex) => {
      const node = parseNode(rawNode, {
        warn,
        unknownNodeTypes,
        where: `${id}#${nodeIndex}`,
      });
      if (node) nodes.push(node);
    });
    panels.push({ id, title: str(panel.title), nodes });
  });

  return { version, newerVersion, invalid: false, panels, warnings };
}
