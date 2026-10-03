// P2 调度器（2026-10）：least_busy / round_robin / prefer 三策略。
import { describe, expect, it, beforeEach } from 'vitest';
import { state } from '../store';
import { scheduleNode, setSchedulePolicy } from '../scheduler';

function setupFederation(peers: Array<{ name: string; online: boolean; turns: number }>) {
  state.federation = {
    enabled: true,
    node_id: 'node-local',
    node_name: null,
    listen: '',
    peers: peers.map(p => ({
      name: p.name,
      url: `ws://${p.name}:3133`,
      token_set: true,
      allow_tools: [],
      allow_subagent: true,
      require_confirm: [],
      link: p.online ? 'Online' : 'Offline',
      active_turns: p.turns,
    })),
  };
}

describe('P2 调度器', () => {
  beforeEach(() => {
    state.activities = {};
    window.localStorage.removeItem('echo-schedule-policy');
  });

  it('least_busy 选负载最低的在线节点', () => {
    setupFederation([
      { name: 'gpu-box', online: true, turns: 3 },
      { name: 'ai-station', online: true, turns: 0 },
    ]);
    setSchedulePolicy('least_busy');
    expect(scheduleNode()).toBe('ai-station');
  });

  it('least_busy 本机负载最低时回 null（本机）', () => {
    setupFederation([{ name: 'gpu-box', online: true, turns: 2 }]);
    setSchedulePolicy('least_busy');
    expect(scheduleNode()).toBeNull(); // 本机 0 < 2 → 本机
  });

  it('round_robin 轮转在线节点', () => {
    setupFederation([
      { name: 'gpu-box', online: true, turns: 0 },
      { name: 'ai-station', online: true, turns: 0 },
    ]);
    setSchedulePolicy('round_robin');
    const picks = [scheduleNode(), scheduleNode(), scheduleNode()];
    expect(new Set(picks.map(p => p ?? 'local')).size).toBeGreaterThan(1);
  });

  it('prefer 亲和节点在线时定向，离线时退 least_busy', () => {
    setupFederation([
      { name: 'gpu-box', online: false, turns: 0 },
      { name: 'ai-station', online: true, turns: 0 },
    ]);
    setSchedulePolicy('prefer:gpu-box');
    expect(scheduleNode()).toBe('ai-station'); // 离线 → least_busy
    setSchedulePolicy('prefer:ai-station');
    expect(scheduleNode()).toBe('ai-station'); // 在线 → 定向
  });

  it('无联邦（单节点）恒 null（本机）', () => {
    state.federation = null;
    expect(scheduleNode()).toBeNull();
  });
});
