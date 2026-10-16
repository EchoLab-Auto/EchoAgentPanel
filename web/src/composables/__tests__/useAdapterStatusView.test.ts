//! useAdapterStatusView 契约（03b S1）：状态文案 / 状态点的判定优先级。
//! ConnectionStatusCard 与 AdapterPanel 共用同一计算——这里钉住三态与
//! 优先级（未运行压过 connected），防止两处呈现漂移。
import { describe, it, expect } from 'vitest';
import { adapterStatusView } from '../useAdapterStatusView';
import type { AdapterStatus } from '../../protocol';

function adapter(over: Partial<AdapterStatus> = {}): AdapterStatus {
  return {
    name: 'qq',
    display_name: 'QQ',
    connected: false,
    running: false,
    self_id: null,
    bind_address: '0.0.0.0:3131',
    started_at: null,
    ...over,
  };
}

describe('adapterStatusView 状态文案与状态点', () => {
  it('未运行：已停止 / offline（无论连接位）', () => {
    expect(adapterStatusView(adapter({ running: false, connected: false }))).toEqual({
      stateText: '已停止',
      dot: 'offline',
    });
    // 优先级：未运行压过 connected（停止中的残留连接位不显示「已连接」）
    expect(adapterStatusView(adapter({ running: false, connected: true }))).toEqual({
      stateText: '已停止',
      dot: 'offline',
    });
  });

  it('运行且连接：已连接 / online', () => {
    expect(adapterStatusView(adapter({ running: true, connected: true }))).toEqual({
      stateText: '已连接',
      dot: 'online',
    });
  });

  it('运行未连接：等待连接 / connecting', () => {
    expect(adapterStatusView(adapter({ running: true, connected: false }))).toEqual({
      stateText: '等待连接',
      dot: 'connecting',
    });
  });
});
