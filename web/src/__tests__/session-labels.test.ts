//! sessionLabelsFor 契约（03b §4.3 S2）：labels → display_name 回退 →
//! 平台缺省文案的回退链，以及多实例同平台时的取值优先级。
import { describe, it, expect, beforeEach } from 'vitest';
import { sessionLabelsFor } from '../session-labels';
import type { InstanceStatus } from '../protocol';
import { state } from '../store';

function instance(over: Partial<InstanceStatus> = {}): InstanceStatus {
  return {
    name: 'qq',
    display_name: 'QQ（alix）',
    connected: true,
    running: true,
    self_id: '10001',
    bind_address: '0.0.0.0:3131',
    started_at: null,
    persona: 'alix',
    platform: 'qq',
    ...over,
  };
}

describe('sessionLabelsFor 平台会话标签', () => {
  beforeEach(() => {
    state.instances = [];
  });

  it('有 session_labels：直接取插件文案', () => {
    state.instances = [
      instance({ session_labels: { dm: 'QQ 私聊', group: 'QQ 群' } }),
    ];
    expect(sessionLabelsFor('qq')).toEqual({ dm: 'QQ 私聊', group: 'QQ 群' });
  });

  it('无 labels：回退 <display_name> 私聊 / 群聊', () => {
    state.instances = [instance({ display_name: '', name: 'qq' })];
    expect(sessionLabelsFor('qq')).toEqual({ dm: 'qq 私聊', group: 'qq 群聊' });
  });

  it('labels 部分缺失：逐键回退', () => {
    state.instances = [instance({ session_labels: { dm: '电报私聊' } })];
    expect(sessionLabelsFor('qq')).toEqual({ dm: '电报私聊', group: 'QQ（alix） 群聊' });
  });

  it('整个 platform 无匹配实例：回退「私聊 / 群聊」', () => {
    state.instances = [instance({ platform: 'telegram' })];
    expect(sessionLabelsFor('qq')).toEqual({ dm: '私聊', group: '群聊' });
  });

  it('多实例同平台：优先取带 labels 的条目', () => {
    state.instances = [
      instance({ name: 'qq', display_name: 'QQ（alix）' }),
      instance({
        name: 'qq-2',
        display_name: 'QQ（alix-2）',
        session_labels: { dm: 'QQ 小号私聊', group: 'QQ 小号群' },
      }),
    ];
    expect(sessionLabelsFor('qq')).toEqual({ dm: 'QQ 小号私聊', group: 'QQ 小号群' });
  });
});
