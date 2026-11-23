//! `panelFetch` 的令牌播种契约（2026-11 修）。
//!
//! 背景：首次带 `?token=xxx` 打开面板时，模块级/挂载期的第一个 HTTP
//! （实测是 `/api/upstreams`）早于 WS 连接——播种原本只发生在
//! `startConnection()` 里，于是首个请求不带 Authorization 头，服务端回 401。
//! 界面表现是"上游列表空着"，看着像坏页面。
//!
//! 锁的行为：`panelFetch` 自己负责播种（幂等），**不依赖**连接是否已建立。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const calls: Array<{ url: string; auth: string | null }> = [];

function stubFetch() {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url, auth: headers.get('Authorization') });
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  });
}

describe('panelFetch 令牌播种', () => {
  beforeEach(() => {
    vi.resetModules();
    calls.length = 0;
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('URL 带 ?token= 时，第一次请求就带 Bearer 头（不等连接建立）', async () => {
    window.history.replaceState(null, '', '/?token=seeded-token');
    const { panelFetch } = await import('../connection');

    await panelFetch('/api/upstreams');

    expect(calls).toHaveLength(1);
    expect(calls[0].auth).toBe('Bearer seeded-token');
  });

  it('播种后令牌落进 localStorage，URL 里的明文被擦掉', async () => {
    window.history.replaceState(null, '', '/?token=seeded-token');
    const { panelFetch } = await import('../connection');

    await panelFetch('/api/upstreams');

    expect(localStorage.getItem('echo-panel-token')).toBe('seeded-token');
    expect(window.location.search).not.toContain('token=');
  });

  it('已有令牌时后续请求继续带同一个头', async () => {
    localStorage.setItem('echo-panel-token', 'stored-token');
    const { panelFetch } = await import('../connection');

    await panelFetch('/api/security');
    await panelFetch('/api/security');

    expect(calls.map((c) => c.auth)).toEqual(['Bearer stored-token', 'Bearer stored-token']);
  });

  it('没有令牌时不加认证头（未设令牌的部署照旧可用）', async () => {
    const { panelFetch } = await import('../connection');

    await panelFetch('/api/panel-identity');

    expect(calls[0].auth).toBeNull();
  });
  it('localStorage 读取抛异常时仍可匿名请求，不阻断面板加载', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const { panelFetch } = await import('../connection');

    await expect(panelFetch('/api/upstreams')).resolves.toBeDefined();

    expect(calls).toHaveLength(1);
    expect(calls[0].auth).toBeNull();
    getItem.mockRestore();
  });

  it('localStorage 写入抛异常时仍使用 URL 令牌建链', async () => {
    window.history.replaceState(null, '', '/?token=ephemeral-token');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const { panelFetch } = await import('../connection');

    await panelFetch('/api/upstreams');

    expect(calls[0].auth).toBe('Bearer ephemeral-token');
    setItem.mockRestore();
  });
});
