//! 压缩前归档回放（2026-11）：Core 侧清单/回读 + Panel 侧入口与渲染。
//!
//! ## 为什么需要这层
//!
//! 压缩做的不是"给日志加个标记"：它把被替换的前缀事件**从日志里摘掉**，
//! 换成一条 `Compaction` 事件（摘要 + 归档路径）。于是"压缩前到底聊了什么"
//! 在投影、显示时间线、面板里都永久消失——只有 `archives/` 那份快照还留着。
//! 用户要回看，只能靠它。
//!
//! 本文件锁定三件事：
//! 1. reducer：清单与回放分别落到 `sessionArchiveList` / `sessionArchives`，
//!    且回放**不进** `sessionHistory`（否则会被实时合并当成"最新快照"认领）；
//! 2. 提示行：`TimelineMessage.archive` 透传到 `DisplayMessage` 与
//!    `ChatMessage`（少了它就没有入口）；
//! 3. 归档清理：归档只保留最近 20 份，提示行却是永久的——清单里没有的名字
//!    要显示"已清理"而不是让人点了才吃错误。

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reduce } from '../state';
import { toDisplayMessage } from '../state_domains/timeline';
import { toChatMessage } from '../chat-adapter';
import { archiveKey, checklistKey } from '../keys';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...parts: string[]) => readFileSync(join(here, '..', ...parts), 'utf-8');

function freshState() {
  return {
    activeRegion: null,
    sessionHistory: {},
    sessionArchives: {},
    sessionArchiveList: {},
    trunk: [],
  } as never;
}

const COMPACTION_LINE = {
  kind: 'system',
  content: '上下文已压缩 · 替换 376 条事件（原件已归档，可查看压缩前的历史）',
  session_id: 'local:tui::local_user',
  time: 1700000000,
  seq: 12,
  ord: 7,
  archive: 'echo-sessions-EchoCode-20261109-022842-820-precompact.json',
};

describe('压缩前归档：协议透传', () => {
  it('TimelineMessage.archive → DisplayMessage.archive', () => {
    const display = toDisplayMessage(COMPACTION_LINE as never);
    expect(display.archive).toBe('echo-sessions-EchoCode-20261109-022842-820-precompact.json');
  });

  it('DisplayMessage.archive → ChatMessage.archive（少了它就没有入口）', () => {
    const chat = toChatMessage(toDisplayMessage(COMPACTION_LINE as never));
    expect(chat.archive).toBe('echo-sessions-EchoCode-20261109-022842-820-precompact.json');
  });

  it('没有 archive 的普通条目不带该字段（不留空串）', () => {
    const display = toDisplayMessage({
      kind: 'user',
      content: 'hi',
      session_id: 's',
      time: 1,
      seq: 1,
      ord: 1,
    } as never);
    expect(display.archive).toBeUndefined();
  });
});

describe('压缩前归档：reducer', () => {
  it('SessionArchives 按 (core, team) 落表，并按时间倒序', () => {
    const state = freshState();
    const next = reduce(state, {
      SessionArchives: {
        team_id: 'EchoCode',
        archives: [
          { name: 'a-old.json', created_at: 100, size: 10, reason: 'precompact' },
          { name: 'b-new.json', created_at: 300, size: 20, reason: '' },
        ],
      },
    } as never);
    const list = (next as { sessionArchiveList: Record<string, { name: string }[]> })
      .sessionArchiveList;
    expect(list['EchoCode']!.map((entry) => entry.name)).toEqual(['b-new.json', 'a-old.json']);
  });

  it('SessionArchiveHistory 落到 sessionArchives，**不**写 sessionHistory', () => {
    const state = freshState();
    const next = reduce(state, {
      SessionArchiveHistory: {
        team_id: 'EchoCode',
        session_id: 'local:tui::local_user',
        archive: 'x-precompact.json',
        messages: [COMPACTION_LINE, { ...COMPACTION_LINE, seq: 13, ord: 8, kind: 'user', content: '早前的问题' }],
        total: 2,
        truncated: false,
      },
    } as never);
    const typed = next as unknown as {
      sessionArchives: Record<string, { archive: string; messages: unknown[] }>;
      sessionHistory: Record<string, unknown>;
    };
    const key = archiveKey(null, 'EchoCode', 'x-precompact.json');
    expect(typed.sessionArchives[key]!.archive).toBe('x-precompact.json');
    expect(typed.sessionArchives[key]!.messages).toHaveLength(2);
    // 关键：归档不进实时历史槽——它没有 baseSeq 水位线，进去会被合并逻辑
    // 当成"最新快照"去认领窗口条目，把实时消息吞掉。
    expect(
      typed.sessionHistory[checklistKey(null, 'EchoCode', 'local:tui::local_user')],
    ).toBeUndefined();
  });

  it('读取失败的归档也留一条记录（带 error，面板据此显示原因）', () => {
    const state = freshState();
    const next = reduce(state, {
      SessionArchiveHistory: {
        team_id: 'EchoCode',
        session_id: 's',
        archive: 'gone.json',
        messages: [],
        total: 0,
        truncated: false,
        error: '该归档已被清理（archives 只保留最近 20 份）',
      },
    } as never);
    const typed = next as unknown as {
      sessionArchives: Record<string, { error: string | null; messages: unknown[] }>;
    };
    const entry = typed.sessionArchives[archiveKey(null, 'EchoCode', 'gone.json')]!;
    expect(entry.error).toContain('已被清理');
    expect(entry.messages).toEqual([]);
  });
});

describe('压缩前归档：面板入口', () => {
  const messageItem = src('components', 'MessageItem.vue');
  const chatView = src('components', 'ChatView.vue');

  it('提示行上的按钮只在带 archive 时出现（不是每条 system 行都有）', () => {
    expect(messageItem).toContain('v-if="archiveName"');
    expect(messageItem).toContain('@click="emit(\'open-archive\', archiveName)"');
  });

  it('归档已被清理时按钮禁用并改名（不让用户点了才吃错误）', () => {
    expect(messageItem).toContain("props.archiveAvailable === false ? '归档已清理' : '查看压缩前的历史'");
    expect(messageItem).toContain(':disabled="props.archiveAvailable === false"');
  });

  it('ChatView 回读走 RequestSessionArchiveHistory，且带归档名', () => {
    expect(chatView).toContain('RequestSessionArchiveHistory');
    expect(chatView).toContain('archive,');
    // 只读快照：横幅 + 「回到当前」，不做"加载更早"（归档不参与分页）
    expect(chatView).toContain('chat-view__archive-bar');
    expect(chatView).toContain('回到当前');
  });

  it('归档清单按人格拉取（判断"还在不在"的前提）', () => {
    expect(chatView).toContain('RequestSessionArchives');
    expect(chatView).toContain('archiveAvailability');
  });
});
