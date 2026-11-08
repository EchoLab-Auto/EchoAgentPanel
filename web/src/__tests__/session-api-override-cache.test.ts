//! 非工作区会话的 API 覆盖：**刷新后还在**（2026-11 用户报障）。
//!
//! 现场：在「当前会话」卡片里把本地会话（`local:tui:` 通道）的 API 换成别的
//! profile，刷新页面就回到 persona 值。原因不是选择没生效，而是：
//!
//! - Core 只给**工作区对话**持久化覆盖（`persist_session_api_profile` 对非
//!   `local:workspace:` 通道直接 return，覆盖只留在 `session_providers` 内存）；
//! - Panel 唯一能读到会话覆盖的事件是 `WorkspaceSessions`（只描述工作区对话），
//!   所以刷新后徽标只能回落 persona 值——而 Core 其实仍在按覆盖路由。
//!
//! 修法（本测试锁定）：Panel 把这类覆盖记进 localStorage，连上 Core 时重放。
//! 工作区对话**不记**——那边真值在对话 JSON 里，记第二份会让"别处清除"复活。

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cachedSessionApiOverrides,
  readSessionApiCache,
  rememberSessionApiOverride,
  replaySessionApiOverrides,
  resetReplayGuard,
} from '../session-api';
import type { AppState } from '../state';

const CORE = 'core';
const TEAM = 'alice';
const TUI = 'local:tui::local_user';
const WORKSPACE = 'local:workspace:echo-agent/v:local_user';

function freshState(profiles = ['kimi', 'deepseek']): AppState {
  return {
    sessionApiOverrides: {},
    api: {
      profiles: profiles.map((name) => ({ name, provider: 'p', model: 'm' })),
    },
  } as unknown as AppState;
}

beforeEach(() => {
  localStorage.clear();
  resetReplayGuard();
});

describe('会话级 API 覆盖的 Panel 侧记忆', () => {
  it('非工作区会话选择后写进缓存，并按 (core, team) 分槽', () => {
    rememberSessionApiOverride(CORE, TEAM, TUI, 'deepseek');

    expect(cachedSessionApiOverrides(CORE, TEAM)).toEqual({ [TUI]: 'deepseek' });
    // 同名会话 id 在每个 core 上都存在——槽位必须分开，不能串味
    expect(cachedSessionApiOverrides('其他core', TEAM)).toEqual({});
    expect(cachedSessionApiOverrides(CORE, '其他team')).toEqual({});
  });

  it('选回「跟随 persona」（空值）会删掉缓存条目', () => {
    rememberSessionApiOverride(CORE, TEAM, TUI, 'deepseek');
    rememberSessionApiOverride(CORE, TEAM, TUI, null);

    expect(cachedSessionApiOverrides(CORE, TEAM)).toEqual({});
  });

  it('工作区对话不写缓存：真值在对话 JSON，第二份会让"别处清除"复活', () => {
    rememberSessionApiOverride(CORE, TEAM, WORKSPACE, 'deepseek');

    expect(cachedSessionApiOverrides(CORE, TEAM)).toEqual({});
  });

  it('缓存坏数据不炸（隐私模式/旧格式一律当空）', () => {
    localStorage.setItem('echo-panel:session-api-overrides', '{不是 JSON');
    expect(readSessionApiCache()).toEqual({});

    localStorage.setItem('echo-panel:session-api-overrides', '[1,2,3]');
    expect(readSessionApiCache()).toEqual({});
  });
});

describe('重连时重放缓存', () => {
  it('刷新后把覆盖装回 state 并重发 SetSessionApi', () => {
    rememberSessionApiOverride(CORE, TEAM, TUI, 'deepseek');

    // 刷新 = state 清空 + 重放标记清零（连接建立时做的事）
    const state = freshState();
    resetReplayGuard();
    const send = vi.fn();

    const sent = replaySessionApiOverrides(state, CORE, TEAM, send);

    expect(sent).toBe(1);
    // ① 徽标要立刻显示用户选的值（Core 回推的是 persona 快照，会把徽标改回去）
    expect(state.sessionApiOverrides[TUI]).toBe('deepseek');
    // ② 命令必须带显式归属：没有默认人格，team_id 不能缺
    expect(send).toHaveBeenCalledWith({
      SetSessionApi: { team_id: TEAM, session_id: TUI, profile: 'deepseek' },
    });
  });

  it('同一槽位只重放一次（重连风暴不重复发命令）', () => {
    rememberSessionApiOverride(CORE, TEAM, TUI, 'deepseek');
    const send = vi.fn();

    replaySessionApiOverrides(freshState(), CORE, TEAM, send);
    replaySessionApiOverrides(freshState(), CORE, TEAM, send);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('profile 已从供应商池消失：丢弃缓存、不发命令（避免每次连接弹错误）', () => {
    rememberSessionApiOverride(CORE, TEAM, TUI, '被删掉的 profile');

    const send = vi.fn();
    const state = freshState(['kimi']);

    expect(replaySessionApiOverrides(state, CORE, TEAM, send)).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(state.sessionApiOverrides[TUI]).toBeUndefined();
    expect(cachedSessionApiOverrides(CORE, TEAM)).toEqual({});
  });

  it('没有归属人格时不重放（命令会被 Core 拒），也不消耗重放标记', () => {
    rememberSessionApiOverride(CORE, null, TUI, 'deepseek');
    const send = vi.fn();

    expect(replaySessionApiOverrides(freshState(), CORE, null, send)).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
