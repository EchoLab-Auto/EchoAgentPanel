//! bind 点分路径解析 + `$value` 载荷构造（03a §1.5 / §1.6）。
//!
//! 纯函数、从不抛异常；段名 `__proto__` / `constructor` / `prototype`
//! 直接返回 undefined（防原型链读取）。不支持数组下标/通配/表达式（v1）。

const PROTO_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** 段为 `[A-Za-z0-9_]+` 的点分路径。 */
const BIND_PATH_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

/** action/fetch method 形状（03a §3.3-3：保守字符集；渲染器不维护白名单）。 */
const METHOD_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

export function isValidBindPath(path: unknown): path is string {
  return typeof path === 'string' && BIND_PATH_RE.test(path);
}

export function isValidMethod(method: unknown): method is string {
  return typeof method === 'string' && METHOD_RE.test(method);
}

/**
 * 逐段下钻；遇 null/undefined/非对象或原型链段名立即返回 undefined。
 * `resolveBind({gate:{mode:'allowlist'}}, 'gate.mode') === 'allowlist'`。
 */
export function resolveBind(state: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  let current: unknown = state;
  for (const segment of path.split('.')) {
    if (PROTO_SEGMENTS.has(segment)) return undefined;
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = deepClone(item);
    return out as T;
  }
  return value;
}

/** 递归替换：值严格等于 `"$value"` 的叶子换成当前值（`"x $value"` 不插值）。 */
function substitute(node: unknown, value: unknown): unknown {
  if (node === '$value') return deepClone(value);
  if (Array.isArray(node)) return node.map((item) => substitute(item, value));
  if (isPlainObject(node)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(node)) out[key] = substitute(item, value);
    return out;
  }
  return node;
}

/** arg 中是否含 `$value` 叶子（button 无当前值，出现时替换成 null 并告警，03a §2.7）。 */
export function containsValuePlaceholder(arg: unknown): boolean {
  if (arg === '$value') return true;
  if (Array.isArray(arg)) return arg.some(containsValuePlaceholder);
  if (isPlainObject(arg)) return Object.values(arg).some(containsValuePlaceholder);
  return false;
}

/**
 * `action → InvokeInstanceOp.payload`（03a §1.6）：
 *
 * - `arg` 缺省 → `fallback()`（节点默认载荷；如 button `{}`、list_editor `{value: 新列表}`）；
 * - `arg === '$value'` → 当前值整体；值为平面对象时深拷贝之，否则包为 `{ value }`；
 * - `arg` 为对象 → 深拷贝后递归替换 `$value` 叶子，其余原样；
 * - 其他标量 → 原样作为 payload（不推荐；parse 期已发 `bad_field`）。
 *
 * 原 `arg` 永不被修改（深拷贝语义）。
 */
export function buildPayload(
  action: { arg?: unknown },
  value: unknown,
  fallback: () => Record<string, unknown>,
): Record<string, unknown> {
  const arg = action.arg;
  if (arg === undefined) return fallback();
  if (arg === '$value') {
    return isPlainObject(value) ? deepClone(value) : { value: deepClone(value) };
  }
  if (isPlainObject(arg)) return substitute(arg, value) as Record<string, unknown>;
  return arg as Record<string, unknown>;
}
