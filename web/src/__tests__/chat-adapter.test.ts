import { beforeEach, describe, expect, it } from 'vitest';
import { compactForDisplay, formatTime, resetTimeLabelCacheForTests } from '../chat-adapter';

describe('compactForDisplay', () => {
  it('replaces attached data URI with a numbered placeholder', () => {
    const uri = `data:image/png;base64,${'A'.repeat(2048)}`;
    const content = `<backend_message_hook>{"content":"看图","images":["${uri}"]}</backend_message_hook>`;
    const compacted = compactForDisplay(content, [uri]);
    expect(compacted).toContain('[图片#1]');
    expect(compacted).not.toContain('AAAAAAAA');
    expect(compacted).toContain('"content":"看图"');
  });

  it('elides long inline payloads that arrive without an attachment list', () => {
    const compacted = compactForDisplay(`log data:image/jpeg;base64,${'B'.repeat(1024)}`);
    expect(compacted).toBe('log [图片数据已省略]');
  });

  it('keeps short fixtures and plain text untouched', () => {
    const text = 'fixture data:image/png;base64,QUJD and more';
    expect(compactForDisplay(text)).toBe(text);
    expect(compactForDisplay('hello')).toBe('hello');
  });

  it('numbers multiple images in order', () => {
    const one = `data:image/png;base64,${'A'.repeat(300)}`;
    const two = `data:image/png;base64,${'B'.repeat(300)}`;
    const compacted = compactForDisplay(`{"images":["${one}","${two}"]}`, [one, two]);
    expect(compacted.indexOf('[图片#1]')).toBeLessThan(compacted.indexOf('[图片#2]'));
  });
});

describe('formatTime memo（2026-10 P0 性能止血）', () => {
  // 背景：ChatView 的 messageRows 每次重算都给每条工作行调一次 formatTime；
  // 实测 toLocaleTimeString('zh-CN') 单次 51 µs、占 2000 行下单次流式 delta
  // 的 44%。按秒 memo 后第二次起是纯 Map 命中。锁定"值正确 + 命中同一个值"。
  beforeEach(() => resetTimeLabelCacheForTests());

  it('returns zh-CN HH:mm:ss labels', () => {
    const label = formatTime(1700000000);
    expect(label).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('same second → memoized string (identical value, no reformat)', () => {
    const first = formatTime(1700000123);
    const second = formatTime(1700000123);
    expect(second).toBe(first);
  });

  it('different seconds stay distinct', () => {
    expect(formatTime(1700000200)).not.toBe(formatTime(1700000201));
  });
});
