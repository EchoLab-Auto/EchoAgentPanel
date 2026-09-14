//! 工作区通道规则（激活 = 进入项目对话，2026-09-14）。
//!
//! 契约：Core 的 active 标记是单一事实来源；面板「本地当前对话」= active
//! 投影；切换器 Local 分组双向绑定（选通道 = 激活、选默认 = 取消激活）。

import { describe, it, expect } from 'vitest';
import {
  LOCAL_DEFAULT_SESSION,
  localSessionProjection,
  workspaceChannelSessionId,
  workspaceIdOfChannel,
  workspacePickIntent,
} from '../workspace';

describe('工作区通道 id 与投影', () => {
  it('通道 id 构造/解析往返', () => {
    const id = workspaceChannelSessionId('echo-agent');
    expect(id).toBe('local:workspace:echo-agent:local_user');
    expect(workspaceIdOfChannel(id)).toBe('echo-agent');
  });

  it('非通道会话不进投影解析', () => {
    expect(workspaceIdOfChannel('local:tui::local_user')).toBeNull();
    expect(workspaceIdOfChannel('qq:dm::42')).toBeNull();
    expect(workspaceIdOfChannel('local:workspace::local_user')).toBeNull();
  });

  it('投影：active 空 → 默认会话；active=W → W 通道', () => {
    expect(localSessionProjection(null)).toBe(LOCAL_DEFAULT_SESSION);
    expect(localSessionProjection('echo-agent')).toBe('local:workspace:echo-agent:local_user');
  });
});

describe('切换器点选意图（双向绑定）', () => {
  it('选通道 = 激活（未激活或未同步都发）', () => {
    const id = workspaceChannelSessionId('docs');
    expect(workspacePickIntent(id, 'core', true)).toEqual({ kind: 'activate', workspaceId: 'docs' });
    expect(workspacePickIntent(id, null, true)).toEqual({ kind: 'activate', workspaceId: 'docs' });
    expect(workspacePickIntent(id, null, false)).toEqual({ kind: 'activate', workspaceId: 'docs' });
  });

  it('选已激活通道（快照已同步）不重发', () => {
    const id = workspaceChannelSessionId('docs');
    expect(workspacePickIntent(id, 'docs', true)).toEqual({ kind: 'none' });
  });

  it('选默认会话 = 取消激活（仅当已知存在激活）', () => {
    expect(workspacePickIntent(LOCAL_DEFAULT_SESSION, 'docs', true)).toEqual({
      kind: 'deactivate',
    });
    // 未激活 / 快照未知：不猜，不发命令
    expect(workspacePickIntent(LOCAL_DEFAULT_SESSION, null, true)).toEqual({ kind: 'none' });
    expect(workspacePickIntent(LOCAL_DEFAULT_SESSION, 'docs', false)).toEqual({ kind: 'none' });
  });

  it('QQ/global 会话点选不触发激活语义', () => {
    expect(workspacePickIntent('qq:dm::42', 'docs', true)).toEqual({ kind: 'none' });
    expect(workspacePickIntent('global', 'docs', true)).toEqual({ kind: 'none' });
  });
});
