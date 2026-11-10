//! 压缩前历史（2026-11）：Core 把归档前缀接进同一条消息流，面板只做入口。
//!
//! ## 设计要点
//!
//! 压缩把被替换的前缀事件**从日志里摘掉**，换成一条 `Compaction` 事件
//! （摘要 + 归档路径）——那段历史在投影、时间线、面板里都永久消失，只剩
//! `archives/` 那份快照。
//!
//! 展开不放在前端做：边界是**事件级**的（`replaced_count` 按会话数事件，
//! 一次工具调用 + 结果 = 2 事件 = 1 行），而且压缩链可达 6 层。前端拿消息数
//! 去切会切歪，还要自己处理递归与去重。所以面板只发 `expand_depth`，Core
//! 把归档前缀派生后**拼在同一份历史前面**返回——面板因此看到的是一条连续的
//! 上下文：同一滚动区、同一套行模型、同一个「加载更早」。
//!
//! 本文件锁定：协议透传、reducer 的展开状态、默认折叠、以及"不误把归档当成
//! 实时快照"（那会让合并逻辑吞掉窗口条目）。

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reduce } from '../state';
import { toDisplayMessage } from '../state_domains/timeline';
import { toChatMessage } from '../chat-adapter';

const here = dirname(fileURLToPath(import.meta.url));
const src = (...parts: string[]) => readFileSync(join(here, '..', ...parts), 'utf-8');

function freshState() {
  return {
    activeRegion: null,
    sessionHistory: {},
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

describe('压缩前历史：协议透传', () => {
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

describe('压缩前历史：reducer', () => {
  it('SessionHistory 落到 sessionHistory，并保留展开状态', () => {
    const state = freshState();
    const next = reduce(state, {
      SessionHistory: {
        team_id: 'EchoCode',
        session_id: 's',
        messages: [COMPACTION_LINE],
        total: 1,
        truncated: false,
        max_seq: 12,
        has_older: true,
        older_unavailable: false,
      },
    } as never);
    const hist = (
      next as unknown as {
        sessionHistory: Record<
          string,
          { messages: unknown[]; hasOlder: boolean; olderUnavailable: boolean; baseSeq: number }
        >;
      }
    ).sessionHistory;
    const key = Object.keys(hist)[0]!;
    expect(hist[key]!.messages).toHaveLength(1);
    expect(hist[key]!.hasOlder).toBe(true);
    expect(hist[key]!.olderUnavailable).toBe(false);
    // 水位线来自 max_seq：合并窗口增量靠它判"快照已覆盖"。
    expect(hist[key]!.baseSeq).toBe(12);
  });

  it('归档被轮转清理时标 older_unavailable（面板据此禁用展开）', () => {
    const state = freshState();
    const next = reduce(state, {
      SessionHistory: {
        team_id: 'EchoCode',
        session_id: 's',
        messages: [COMPACTION_LINE],
        total: 1,
        truncated: false,
        has_older: false,
        older_unavailable: true,
      },
    } as never);
    const hist = (next as unknown as { sessionHistory: Record<string, { olderUnavailable: boolean; hasOlder: boolean }> })
      .sessionHistory;
    const entry = hist[Object.keys(hist)[0]!]!;
    expect(entry.olderUnavailable).toBe(true);
    // 读不到就别再给"继续展开"——否则用户点了只吃一个错误。
    expect(entry.hasOlder).toBe(false);
  });

  it('缺省的 has_older / older_unavailable 解为 false（旧 Core 仍可用）', () => {
    const state = freshState();
    const next = reduce(state, {
      SessionHistory: {
        team_id: null,
        session_id: 's',
        messages: [],
        total: 0,
        truncated: false,
      },
    } as never);
    const hist = (next as unknown as { sessionHistory: Record<string, { hasOlder: boolean; olderUnavailable: boolean }> })
      .sessionHistory;
    const entry = hist[Object.keys(hist)[0]!]!;
    expect(entry.hasOlder).toBe(false);
    expect(entry.olderUnavailable).toBe(false);
  });
});

describe('压缩前历史：面板只做入口', () => {
  const chatView = src('components', 'ChatView.vue');
  const messageItem = src('components', 'MessageItem.vue');

  it('请求带 expand_depth（展开层数），不是把归档单独拉出来拼', () => {
    expect(chatView).toContain('expand_depth');
    expect(chatView).not.toContain('RequestSessionArchiveHistory');
    expect(chatView).not.toContain('RequestSessionArchives');
  });

  it('默认折叠：层数从 0 起，按会话记忆', () => {
    expect(chatView).toContain('const archiveDepth = ref(0)');
    expect(chatView).toContain('storedArchiveDepth');
    expect(chatView).toContain('persistArchiveDepth');
  });

  it('分隔行上给「展开 / 收起」，归档已清理时禁用并说明', () => {
    expect(messageItem).toContain("emit('expand-archive')");
    expect(messageItem).toContain("emit('collapse-archive')");
    expect(messageItem).toContain('更早的归档已清理');
    expect(messageItem).toContain('展开压缩前的历史');
  });

  it('展开后把视线落到压缩边界（否则新内容���渲染窗口之外）', () => {
    expect(chatView).toContain('focusArchiveBoundary');
    expect(chatView).toContain('data-archive-boundary');
    expect(chatView).toContain('renderWindow.value = needed');
  });

  it('展开用的是同一条历史（没有再开一份只读快照的存储）', () => {
    // 旧实现把归档回放单独存进 state.sessionArchives —— 那会让面板自己拼边界，
    // 而且没有水位线语义，容易与实时合并打架。现在只有 sessionHistory。
    expect(chatView).not.toContain('sessionArchives');
    const state = src('state.ts');
    expect(state).not.toContain('sessionArchives');
    expect(state).not.toContain('sessionArchiveList');
  });
});
