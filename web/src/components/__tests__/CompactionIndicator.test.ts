//! 顶栏压缩/归档进度指示器（`CompactionIndicator.vue`）。
//!
//! 背景：压缩是全人格操作，Core 逐会话调 LLM 生成摘要，实测要跑几分钟。唯一
//! 的详细视图「上下文」是个**覆盖层** —— 用户点完「压缩」关掉面板回去聊天，
//! 就再也没有任何迹象显示"还在跑"，与"点了没反应 / 是不是卡死"完全一样。
//!
//! 契约：
//! - 没有进行中的操作 → 整个组件不渲染（顶栏不留空壳）；
//! - 有 → 显示阶段 + 人格 + 百分比 + 进度条；
//! - 多个并行 → `×N` 聚合（聚合百分比是假数据，不显示）；
//! - 点击 → 打开「上下文」面板（详细视图在那里）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import CompactionIndicator from '../CompactionIndicator.vue';
import { state } from '../../store';
import { entryOverlay } from '../../overlays';
import type { CompactionRun } from '../../state';

let wrapper: VueWrapper | null = null;

function run(over: Partial<CompactionRun> = {}): CompactionRun {
  return {
    phase: 'summarize',
    done: 3,
    total: 7,
    sessions: 7,
    message: '正在生成摘要…',
    at: Date.now(),
    ...over,
  };
}

function mountIndicator() {
  wrapper = mount(CompactionIndicator);
  return wrapper;
}

beforeEach(() => {
  state.compactions = {};
  state.teams = [{ id: 'alix', name: 'Alix' } as never];
  entryOverlay.value = null;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('CompactionIndicator · 无进行中操作', () => {
  it('不渲染任何东西（顶栏不该常驻空壳）', () => {
    expect(mountIndicator().find('.compaction-chip').exists()).toBe(false);
  });

  it('只有终态记录：仍不渲染（终态由上下文面板负责展示）', () => {
    state.compactions['core-a\u0000alix'] = run({ phase: 'done' });
    expect(mountIndicator().find('.compaction-chip').exists()).toBe(false);
  });
});

describe('CompactionIndicator · 单个进行中', () => {
  it('显示阶段、人格名与百分比', () => {
    state.compactions['core-a\u0000alix'] = run({ done: 3, total: 7 });
    const chip = mountIndicator().find('.compaction-chip');
    expect(chip.exists()).toBe(true);
    expect(chip.text()).toContain('生成摘要');
    expect(chip.text()).toContain('Alix');
    expect(chip.text()).toContain('43%');
  });

  it('人格名取 `state.teams` 的 name；取不到时退回 id（不显示空白）', () => {
    state.teams = [];
    state.compactions['core-a\u0000ghost'] = run();
    expect(mountIndicator().find('.compaction-chip').text()).toContain('ghost');
  });

  it('长度不确定的阶段不写百分比（写「0%」看起来像没动）', () => {
    state.compactions['core-a\u0000alix'] = run({ phase: 'preview', done: 0, total: 0 });
    const chip = mountIndicator().find('.compaction-chip');
    expect(chip.text()).toContain('准备');
    expect(chip.text()).not.toContain('%');
  });

  it('title 里带上上游与计数（多 Core 下同名人格可能同时在两台机器跑）', () => {
    state.regions = { 'core-a': { id: 'node-a', name: 'evence-4090-24' } } as never;
    state.compactions['core-a\u0000alix'] = run({ done: 3, total: 7 });
    const title = mountIndicator().find('.compaction-chip').attributes('title') ?? '';
    expect(title).toContain('Alix @ core-a');
    expect(title).toContain('3/7 组');
    expect(title).toContain('43%');
  });
});

describe('CompactionIndicator · 多个并行', () => {
  it('聚合成 ×N，且不显示聚合百分比（那是假数据）', () => {
    state.compactions['core-a\u0000alix'] = run({ at: Date.now() - 2_000 });
    state.compactions['core-b\u0000echo'] = run({ at: Date.now() - 1_000 });
    const chip = mountIndicator().find('.compaction-chip');
    expect(chip.text()).toContain('×2');
    expect(chip.text()).not.toContain('%');
  });

  it('title 列出每一个（人名 + 上游 + 阶段 + 计数）', () => {
    state.teams = [
      { id: 'alix', name: 'Alix' } as never,
      { id: 'echo', name: 'Echo' } as never,
    ];
    state.compactions['core-a\u0000alix'] = run({ at: Date.now() - 2_000 });
    state.compactions['core-b\u0000echo'] = run({ at: Date.now() - 1_000 });
    const title = mountIndicator().find('.compaction-chip').attributes('title') ?? '';
    expect(title).toContain('Alix @ core-a');
    expect(title).toContain('Echo @ core-b');
  });
});

describe('CompactionIndicator · 点击', () => {
  it('点击打开「上下文」面板（进度详细视图在那里）', async () => {
    state.compactions['core-a\u0000alix'] = run();
    const chip = mountIndicator().find('.compaction-chip');
    await chip.trigger('click');
    expect(entryOverlay.value).toBe('context');
  });

  it('已打开时再点关闭（与入口行按钮同一套 toggle 语义）', async () => {
    state.compactions['core-a\u0000alix'] = run();
    entryOverlay.value = 'context';
    const chip = mountIndicator().find('.compaction-chip');
    await chip.trigger('click');
    expect(entryOverlay.value).toBeNull();
  });
});
