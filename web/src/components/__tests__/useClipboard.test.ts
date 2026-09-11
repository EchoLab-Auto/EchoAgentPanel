//! ui-frame useClipboard 兜底补丁契约测试（2026-09）。
//!
//! 背景：Panel 经局域网 IP（http://10.10.10.100:8080）访问时为非安全上下文，
//! navigator.clipboard 为 undefined，原实现直接返回 false → 复制按钮静默失效。
//! 补丁：Clipboard API 不可用或抛错时，回退 textarea + document.execCommand('copy')。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClipboard } from '@echolab-auto/ui-frame';

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

describe('useClipboard（非安全上下文兜底）', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('无 navigator.clipboard（非安全上下文）→ execCommand 兜底并反馈 copied', async () => {
    setClipboard(undefined);
    const execCommand = vi.fn(() => true);
    (document as unknown as { execCommand: unknown }).execCommand = execCommand;

    const { copy, copied } = useClipboard();
    const ok = await copy('hello');
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copied.value).toBe(true);
    // 临时 textarea 已清理
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });

  it('Clipboard API 可用时优先使用（安全上下文）', async () => {
    const writeText = vi.fn(async () => {});
    setClipboard({ writeText });

    const { copy, copied } = useClipboard();
    const ok = await copy('x');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('x');
    expect(copied.value).toBe(true);
  });

  it('Clipboard API 抛错（权限拒绝）→ 回退 execCommand', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('NotAllowedError');
    });
    setClipboard({ writeText });
    const execCommand = vi.fn(() => true);
    (document as unknown as { execCommand: unknown }).execCommand = execCommand;

    const { copy } = useClipboard();
    expect(await copy('y')).toBe(true);
    expect(execCommand).toHaveBeenCalled();
  });

  it('两种方式都失败 → 返回 false 且不标记 copied', async () => {
    setClipboard(undefined);
    (document as unknown as { execCommand: unknown }).execCommand = vi.fn(() => {
      throw new Error('denied');
    });

    const { copy, copied } = useClipboard();
    expect(await copy('z')).toBe(false);
    expect(copied.value).toBe(false);
  });
});
