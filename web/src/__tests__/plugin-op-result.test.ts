// 插件操作回执（`PluginOpResult`）：成功与失败分开渲染。
//
// 背景：此前 `TogglePlugin` / `RestartPlugin` 的成功与失败都走
// `Error { session_id: null, message }`——面板只能靠文案猜哪条是"成功"、
// 哪条是"真错误"，于是「已启用」和「启用失败」在 UI 上是同一种提示。
// 结构化回执把 ok 变成字段，toast 的 kind 直接由它决定。

import { describe, expect, it, beforeEach } from 'vitest';
import { initialState, reduce } from '../state';
import type { AppState } from '../state';

function event(payload: { id: string; op: string; ok: boolean; message: string }) {
  return { PluginOpResult: payload } as never;
}

describe('PluginOpResult → toast', () => {
  let state: AppState;
  beforeEach(() => {
    state = initialState();
    state.toasts = [];
  });

  it('成功 → success toast', () => {
    reduce(state, event({ id: 'example-ext', op: 'restart', ok: true, message: 'example-ext 已重启' }));
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].kind).toBe('success');
    expect(state.toasts[0].text).toContain('已重启');
  });

  it('失败 → error toast（与成功可区分）', () => {
    reduce(
      state,
      event({
        id: 'example-ext',
        op: 'enable',
        ok: false,
        message: 'example-ext start failed: handshake timeout',
      }),
    );
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].kind).toBe('error');
    expect(state.toasts[0].text).toContain('handshake timeout');
  });

  it('不改动插件清单（状态以随后的 PluginsList 为准）', () => {
    state.plugins = [];
    reduce(state, event({ id: 'x', op: 'disable', ok: true, message: 'x 已停止' }));
    expect(state.plugins).toHaveLength(0);
  });
});
