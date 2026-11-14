//! 会话级 API 覆盖：由 Core 下发，Panel 只读。
//!
//! ## 历史（这段测试替换掉了一份 localStorage 缓存测试）
//!
//! 曾经的真实缺口：Core 只给**工作区通道**持久化会话级覆盖，
//! `local:tui:` / QQ / shell 这些通道的覆盖只活在 `session_providers` 内存里。
//! 于是刷新页面后 Panel 读不到它（唯一携带会话覆盖的事件 `WorkspaceSessions`
//! 只描述工作区对话），徽标回落成 persona 值，而 Core 其实仍在按覆盖路由。
//!
//! Panel 当时的补偿是把这类覆盖记进 localStorage、连上 Core 时重放。它解决了
//! 第一个缺口，但引入了**第二份真相**：两个浏览器同时开，A 设 deepseek、B 拿
//! 旧缓存回放 kimi——Core 的路由只可能是其中一个，而 B 的重放会覆盖 A 的选择。
//!
//! 现在 Core 持久化全部通道的覆盖并随 `SessionApiOverrides` 事件下发，与路由
//! 依据同源。本测试锁定 Panel 侧的三条消费契约。

import { beforeEach, describe, expect, it } from 'vitest';

import { initialState, reduce } from '../state';
import type { AppState } from '../state';
import type { BackendEvent } from '../protocol';

const TUI = 'local:tui::local_user';
const WORKSPACE = 'local:workspace:echo-agent/v:local_user';

function overridesEvent(
  overrides: { session_id: string; profile: string }[],
  team_id: string | null = 'alice',
): BackendEvent {
  return { SessionApiOverrides: { team_id, overrides } } as BackendEvent;
}

let state: AppState;

beforeEach(() => {
  state = initialState();
  state.activeTeamId = 'alice';
});

describe('SessionApiOverrides 事件', () => {
  it('覆盖所有通道（不只工作区）：TUI 会话的选择也能显示', () => {
    state = reduce(
      state,
      overridesEvent([
        { session_id: TUI, profile: 'deepseek' },
        { session_id: WORKSPACE, profile: 'kimi' },
      ]),
    );

    expect(state.sessionApiOverrides[TUI]).toBe('deepseek');
    expect(state.sessionApiOverrides[WORKSPACE]).toBe('kimi');
  });

  it('整体替换而不是合并：某会话不再出现 = 它已经没有覆盖', () => {
    state = reduce(state, overridesEvent([{ session_id: TUI, profile: 'deepseek' }]));
    expect(state.sessionApiOverrides[TUI]).toBe('deepseek');

    // 用户在别处清除（或 Core 重启后该条未恢复）：不再出现在快照里
    state = reduce(state, overridesEvent([]));
    expect(
      state.sessionApiOverrides[TUI],
      '合并会让已清除的条目永远留在前端',
    ).toBeUndefined();
  });

  it('Core 回推覆盖乐观值（用户刚点的选择以 Core 为准）', () => {
    // 选择器点选后本地先改（避免等一个往返）
    state.sessionApiOverrides[TUI] = 'kimi';
    // Core 说实际生效的是 deepseek（例如 profile 构建失败后回落到上一个）
    state = reduce(state, overridesEvent([{ session_id: TUI, profile: 'deepseek' }]));
    expect(state.sessionApiOverrides[TUI]).toBe('deepseek');
  });

  it('其他 agent 的覆盖不串显', () => {
    state = reduce(
      state,
      overridesEvent([{ session_id: TUI, profile: 'deepseek' }], '别人'),
    );
    expect(state.sessionApiOverrides[TUI]).toBeUndefined();
  });

  it('旧 Core 帧（team_id 缺省）放行', () => {
    state = reduce(state, overridesEvent([{ session_id: TUI, profile: 'deepseek' }], null));
    expect(state.sessionApiOverrides[TUI]).toBe('deepseek');
  });

  it('空 profile 的条目被忽略（空 = 无覆盖，不该出现在表里）', () => {
    state = reduce(state, overridesEvent([{ session_id: TUI, profile: '' }]));
    expect(state.sessionApiOverrides[TUI]).toBeUndefined();
  });
});

describe('WorkspaceSessions 不再推导覆盖', () => {
  it('对话文档里的 api_profile 不写进 sessionApiOverrides（单一作者）', () => {
    // 文档里有 api_profile，但 Core 的路由状态里没有它 → 不应显示
    state = reduce(state, {
      WorkspaceSessions: {
        team_id: 'alice',
        sessions: [
          {
            id: 'ws',
            name: 'ws',
            description: '',
            directories: [],
            conversations: [
              { id: 'main', name: '主对话', legacy: true, api_profile: '陈旧的值' },
            ],
            last_conversation: null,
          },
        ],
        active: 'ws',
        active_conversation: 'main',
      },
    } as BackendEvent);

    expect(
      state.sessionApiOverrides[WORKSPACE],
      '两处都写会让同一个键有两个作者：清除覆盖时这里仍从陈旧文档推导出旧值',
    ).toBeUndefined();
  });
});
