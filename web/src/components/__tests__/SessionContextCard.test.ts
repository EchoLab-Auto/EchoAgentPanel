//! 会话摘要卡：展示口径、会话作用域与快照刷新时机。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

vi.mock('../../connection', () => ({ sendCommand: vi.fn() }));

import SessionContextCard from '../SessionContextCard.vue';
import { sendCommand } from '../../connection';
import { railSessionId } from '../../rail-cards';
import { sessionScopedKey } from '../../keys';
import { state } from '../../store';
import type { SessionInfo } from '../../protocol';

let wrapper: VueWrapper | null = null;

function session(id: string, nickname: string, core: string | null = null): SessionInfo {
  return {
    id,
    core,
    team_id: 'alix',
    platform: 'local',
    scope: 'tui',
    user_id: 'local_user',
    nickname,
    group_name: null,
    last_active: 1,
    last_message: '',
  };
}

function snapshot(total: number, limit: number, prompt = 0) {
  return {
    messages: [],
    blocks: [
      { key: 'base', kind: 'base', label: '基础', content: '', chars: 0, tokens: prompt },
      { key: 'history', kind: 'history', label: '历史', content: '', chars: 0, tokens: total },
    ],
    total_tokens: total,
    limit_tokens: limit,
  };
}

beforeEach(() => {
  vi.mocked(sendCommand).mockClear();
  railSessionId.value = 'session-a';
  state.teams = [{ id: 'alix', name: 'Alix' } as never];
  state.activeTeamId = 'alix';
  state.activeRegion = null;
  state.sessions = [session('session-a', '本地对话')];
  state.contexts = {};
  state.activities = {};
  state.connected = true;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('SessionContextCard', () => {
  it('显示当前会话名、提示词与历史合计占用及容量上限', async () => {
    state.contexts[sessionScopedKey(null, 'alix', 'session-a')] = snapshot(2500, 10_000, 1500);
    wrapper = mount(SessionContextCard, { props: { teamId: 'alix' } });
    await nextTick();

    expect(wrapper.get('.session-context__name').text()).toBe('本地对话');
    expect(wrapper.get('.session-context__meter-head').text()).toContain('40%');
    expect(wrapper.get('.session-context__usage').text()).toContain('4K / 10K');
    expect(sendCommand).toHaveBeenCalledWith({
      RequestContext: { team_id: 'alix', session_id: 'session-a' },
    });
  });

  it('切换会话时拉取新快照，不回显上一个会话的容量', async () => {
    state.contexts[sessionScopedKey(null, 'alix', 'session-a')] = snapshot(100, 1000);
    state.sessions.push(session('session-b', '工作区 / base'));
    wrapper = mount(SessionContextCard, { props: { teamId: 'alix' } });
    railSessionId.value = 'session-b';
    await nextTick();

    expect(wrapper.get('.session-context__name').text()).toBe('工作区 / base');
    expect(wrapper.find('.session-context__usage').exists()).toBe(false);
    expect(wrapper.text()).toContain('正在读取上下文');
    expect(sendCommand).toHaveBeenLastCalledWith({
      RequestContext: { team_id: 'alix', session_id: 'session-b' },
    });

    state.contexts[sessionScopedKey(null, 'alix', 'session-b')] = snapshot(20, 1000);
    await nextTick();
    expect(wrapper.get('.session-context__usage').text()).toContain('20 / 1K');
    expect(wrapper.get('.session-context__meter-head').text()).toContain('2%');
  });

  it('一轮回答结束时刷新快照，不建立轮询', async () => {
    wrapper = mount(SessionContextCard, { props: { teamId: 'alix' } });
    expect(sendCommand).toHaveBeenCalledTimes(1);
    const key = sessionScopedKey(null, 'alix', 'session-a');
    state.activities[key] = {
      phase: 'thinking',
      detail: null,
      startedAt: Date.now(),
      toolsCompleted: 0,
      subagentsCompleted: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
    await nextTick();
    state.activities[key].phase = 'completed';
    await nextTick();
    expect(sendCommand).toHaveBeenCalledTimes(2);
  });
});
