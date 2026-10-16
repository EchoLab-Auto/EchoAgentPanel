//! bind.test.ts（03a §5.1）：点分路径解析 / `$value` 载荷构造。

import { describe, expect, it } from 'vitest';
import { buildPayload, containsValuePlaceholder, resolveBind } from '../bind';

describe('resolveBind（03a §1.5）', () => {
  it('基本下钻', () => {
    expect(resolveBind({ gate: { mode: 'allowlist' } }, 'gate.mode')).toBe('allowlist');
    expect(resolveBind({ online: true }, 'online')).toBe(true);
    expect(resolveBind({ instance: { webui_url: 'https://x' } }, 'instance.webui_url')).toBe('https://x');
  });

  it('缺段 / 中间段为 null / 标量：undefined 且不抛', () => {
    const state = { gate: { mode: 'none' }, owner: 10001, nil: null };
    expect(resolveBind(state, 'gate.miss.deep')).toBeUndefined();
    expect(resolveBind(state, 'nil.x')).toBeUndefined();
    expect(resolveBind(state, 'owner.x')).toBeUndefined();
    expect(resolveBind(null, 'gate.mode')).toBeUndefined();
    expect(resolveBind(undefined, 'online')).toBeUndefined();
    expect(resolveBind(state, '')).toBeUndefined();
    expect(resolveBind(state, undefined)).toBeUndefined();
  });

  it('原型链防护：__proto__ / constructor / prototype → undefined', () => {
    const state = { gate: { mode: 'allowlist' } };
    expect(resolveBind(state, '__proto__.x')).toBeUndefined();
    expect(resolveBind(state, 'constructor')).toBeUndefined();
    expect(resolveBind(state, 'gate.prototype')).toBeUndefined();
    expect(resolveBind(state, 'gate.__proto__')).toBeUndefined();
  });
});

describe('buildPayload（03a §1.6）', () => {
  const noop = () => ({ fallback: true });

  it('arg 缺省 → 节点默认载荷（fallback）', () => {
    expect(buildPayload({}, 'v', noop)).toEqual({ fallback: true });
    expect(buildPayload({}, undefined, () => ({}))).toEqual({});
  });

  it('arg = "$value" + 标量 → { value: v }；+ 数组 → { value: [...] }', () => {
    expect(buildPayload({ arg: '$value' }, 'allowlist', noop)).toEqual({ value: 'allowlist' });
    expect(buildPayload({ arg: '$value' }, ['1', '2'], noop)).toEqual({ value: ['1', '2'] });
    expect(buildPayload({ arg: '$value' }, null, noop)).toEqual({ value: null });
  });

  it('arg = "$value" + 平面对象 → 该对象深拷贝', () => {
    const value = { a: 1, nested: { b: 2 } };
    const payload = buildPayload({ arg: '$value' }, value, noop);
    expect(payload).toEqual(value);
    expect(payload).not.toBe(value);
  });

  it('arg 对象：$value 叶子替换、其余原样；嵌套深替换；原 arg 不被修改', () => {
    const arg = { mode: '$value', keep: 1, nested: { list: '$value', tag: 'x $value' } };
    const snapshot = JSON.parse(JSON.stringify(arg));
    const payload = buildPayload({ arg }, 'denylist', noop);
    expect(payload).toEqual({
      mode: 'denylist',
      keep: 1,
      nested: { list: 'denylist', tag: 'x $value' },
    });
    expect(arg).toEqual(snapshot); // 深拷贝语义
  });

  it('"x $value" 不插值', () => {
    expect(buildPayload({ arg: { text: 'x $value' } }, 'v', noop)).toEqual({ text: 'x $value' });
  });

  it('button 语义：$value 叶子替换为 null', () => {
    expect(buildPayload({ arg: { target: '$value' } }, null, () => ({}))).toEqual({ target: null });
  });

  it('arg 为其他标量：原样作为 payload', () => {
    expect(buildPayload({ arg: 42 }, 'v', noop)).toBe(42);
  });

  it('containsValuePlaceholder', () => {
    expect(containsValuePlaceholder(undefined)).toBe(false);
    expect(containsValuePlaceholder({})).toBe(false);
    expect(containsValuePlaceholder({ a: 'x $value' })).toBe(false);
    expect(containsValuePlaceholder('$value')).toBe(true);
    expect(containsValuePlaceholder({ a: ['x', { b: '$value' }] })).toBe(true);
  });
});
