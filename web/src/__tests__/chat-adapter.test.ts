import { describe, expect, it } from 'vitest';
import { compactForDisplay } from '../chat-adapter';

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
