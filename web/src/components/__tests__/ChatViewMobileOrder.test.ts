//! 移动端（窄屏）行序守卫（2026-10）。
//!
//! 背景：用户报「算法研究2 的会话区内容显示顺序出了很大的问题」，根因是
//! 「派生历史 ⊕ ���时行」的合并身份（`(role, time)`）在两侧时间口径不同时
//! 落空（详见 `state.ts::coveredByContent` 与 `session-merge-order.test.ts`）。
//! 修复落在 `sessionMessagesFor` 这条**与视口无关**的纯函数里，因此移动端
//! 自动继承——但"自动继承"必须被钉住，否则将来有人给移动端另开一条渲染
//! 路径（历史包袱不少：卡片抽屉 / 全宽弹层 / 软键盘位移）时不会有人发现。
//!
//! 本文件锁三件事：
//!   ① 375 宽（`isMobile`）下渲染出的行序 = 合并函数给出的行序（不掺私货）；
//!   ② 同一条回答不会因为"移动端"而多出一行（重复与视口无关）；
//!   ③ 消息列表的排布方向恒为 column（DOM 顺序 = 视觉顺序的前提；一旦有人
//!      给窄屏加 `column-reverse`，"最新在下"就反了，测试立刻红）。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state, dispatch } from '../../store';
import type { DisplayMessage } from '../../state';

vi.mock('../../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true) };
});

const MessageItemStub = defineComponent({
  name: 'MessageItem',
  props: ['message'],
  setup(props) {
    return () =>
      h('div', { class: 'stub-item' }, String((props.message as { content?: string })?.content ?? ''));
  },
});
const ChatComposerStub = defineComponent({
  name: 'ChatComposer',
  props: ['modelValue', 'disabled', 'cancelable', 'placeholder'],
  emits: ['update:modelValue', 'send', 'cancel'],
  setup() {
    return () => h('div', { class: 'stub-composer' });
  },
});

const TEAM = 'EchoCode';
const SID = 'local:workspace:systemx/base:local_user';
const T0 = 1792880000;

/** 长文本：≥ `CONTENT_IDENTITY_MIN_CHARS` 才具备"可作身份"的语义（见 state.ts）。 */
const LONG_A =
  '已继续完成检查。300 轮实验、独立加载评估和多种子复评都已完成，GPU 当前空闲，训练日志里没有任何异常退出或 OOM 记录。';
const LONG_B =
  '收到。后续审查进一步确认了几个重要点：WM 确实在同一批 2048 个窗口上连续更新 10 次，而不是每轮重新采样。';

function hist(kind: string, content: string, time: number, extra: Record<string, unknown> = {}) {
  return { kind, content, session_id: SID, time, seq: 0, ord: 0, ...extra };
}

function live(role: DisplayMessage['role'], content: string, time: number): DisplayMessage {
  return { key: `l-${role}-${time}`, role, content, time, sessionId: SID };
}

/** 灌一份"两侧时间口径不一致"的会话（线上故障的形状）。 */
function seed() {
  state.activeRegion = null;
  state.activeTeamId = TEAM;
  state.trunk = [];
  state.trunkTeamId = null;
  state.teamTimelines = {};
  state.sessionHistory = {};
  state.timelineHasMore = {};
  dispatch(
    {
      SessionHistory: {
        team_id: TEAM,
        session_id: SID,
        messages: [
          hist('user', '检查一下好了吗？请你继续。', T0),
          hist('tool', 'bash', T0 + 10, {
            tool: { name: 'bash', input: 'ls', output: 'ok', status: 'succeeded', tool_call_id: 'c1' },
          }),
          // 派生：carry-forward（= 工具开始时刻）
          hist('backend', LONG_A, T0 + 10),
          hist('backend', LONG_B, T0 + 20),
        ],
        total: 4,
        truncated: false,
        max_seq: 16,
      },
    } as never,
    null,
  );
  // 实时副本：到达时刻（偏 2251 秒 = 线上实测偏差）
  state.trunk = [live('backend', LONG_A, T0 + 10 + 2251), live('backend', LONG_B, T0 + 20 + 2251)];
}

function mountAt(width: number) {
  const original = window.innerWidth;
  (window as unknown as { innerWidth: number }).innerWidth = width;
  const wrapper = mount(ChatView, {
    props: { sessionId: SID, activeTeamId: TEAM },
    global: { stubs: { MessageItem: MessageItemStub, ChatComposer: ChatComposerStub } },
  });
  return { wrapper, restore: () => { (window as unknown as { innerWidth: number }).innerWidth = original; } };
}

/** 读出渲染行的"身份序列"（work 组记 chip 数，消息记角色+正文）。 */
function renderedSequence(wrapper: ReturnType<typeof mount>): string[] {
  const list = wrapper.find('.chat-view__list').element as HTMLElement;
  const out: string[] = [];
  for (const el of Array.from(list.children)) {
    if (!(el as HTMLElement).classList.contains('chat-view__item')) continue;
    const chips = el.querySelectorAll('.work-run-group__chip').length;
    if (chips) {
      out.push(`work[${chips}]`);
      continue;
    }
    const text = (el.querySelector('.stub-item')?.textContent ?? '').trim();
    out.push(text || '(空)');
  }
  return out;
}

describe('移动端行序（2026-10 顺序错乱修复的窄屏守卫）', () => {
  const original = window.innerWidth;
  beforeEach(() => seed());
  afterEach(() => { (window as unknown as { innerWidth: number }).innerWidth = original; });

  it('375 宽与 1600 宽渲染出完全相同的行序（移动端没有独立渲染路径）', async () => {
    const desktop = mountAt(1600);
    await nextTick();
    const desktopSeq = renderedSequence(desktop.wrapper);
    desktop.wrapper.unmount();
    desktop.restore();

    const mobile = mountAt(375);
    await nextTick();
    const mobileSeq = renderedSequence(mobile.wrapper);
    mobile.wrapper.unmount();
    mobile.restore();

    expect(mobileSeq).toEqual(desktopSeq);
  });

  it('375 宽下同一条回答不会多出一行（重复与视口无关）', async () => {
    const { wrapper, restore } = mountAt(375);
    await nextTick();
    const seq = renderedSequence(wrapper);
    expect(seq.filter((s) => s === LONG_A).length).toBe(1);
    expect(seq.filter((s) => s === LONG_B).length).toBe(1);
    // 顺序也必须是时序：用户 → 工具组 → 回答 A → 回答 B
    expect(seq).toEqual(['检查一下好了吗？请你继续。', 'work[1]', LONG_A, LONG_B]);
    wrapper.unmount();
    restore();
  });

  it('消息列表排布方向恒为 column：DOM 顺序就是视觉顺序（禁 column-reverse）', async () => {
    const raw = require('fs').readFileSync(
      require('path').resolve(__dirname, '../ChatView.vue'),
      'utf-8',
    );
    const styleBlock: string = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
    const stripped = styleBlock.replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = stripped.match(/\.chat-view__list\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    expect(rule).toMatch(/flex-direction:\s*column\s*;/);
    // 窄屏段不得改写排布方向（否则"最新在下"会反过来）
    const mobileBlock = stripped.slice(stripped.indexOf('@media (max-width: 767.98px)'));
    expect(mobileBlock).not.toMatch(/column-reverse/);
    // 整个组件里也不该出现（行序靠 DOM，不靠 CSS order）
    expect(stripped).not.toMatch(/\.chat-view__item[^{]*\{[^}]*\border:/);
  });
});
