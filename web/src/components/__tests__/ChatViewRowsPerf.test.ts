//! 工作行重渲染范围（2026-10 性能契约）：**一次流式 delta 只该惊动它自己那一行**。
//!
//! 背景：用户报「工作行多了之后就会很卡」。头号成因不是 DOM 数量，而是每次
//! delta 都让窗口里**每一行**重渲染——`messageRows` 每次求值都新建每个组的
//! `items` 数组，于是所有 `WorkRunGroup` 的 props 引用都变了。实测（100 组 ×
//! 5 chip、窗口 200 条 → 渲染 34 组）：10 次 delta 触发子组件 update **340 次**
//! （34 组 × 10 次，等于全量重渲染）。
//!
//! 修复：行外壳按成员引用复用（`ChatView` 的 `rowCache`），配合模板 `v-memo`。
//!
//! 本文件独立成文件（而非并入 ChatView.test.ts）：计数器是模块级的，同文件里
//! 前面用例未卸载的组件树也会重渲染，会把计数污染成噪声。

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ChatView from '../ChatView.vue';
import { state } from '../../store';
import type { DisplayMessage } from '../../state';

vi.mock('../../connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../connection')>();
  return { ...actual, sendCommand: vi.fn(() => true) };
});

const SESSION = 'local:tui::rows-perf';

/** 渲染次数（引用不变时 Vue 不会进入 render 函数）。 */
let workRenders = 0;

const WorkProbe = defineComponent({
  name: 'WorkRunGroup',
  props: ['items'],
  setup(props) {
    return () => {
      workRenders += 1;
      return h('div', { class: 'stub-work' }, String((props.items as unknown[]).length));
    };
  },
});

const MessageStub = defineComponent({
  name: 'MessageItem',
  props: ['message'],
  setup(props) {
    return () => h('div', { class: 'stub-item' }, String((props.message as { content?: string })?.content ?? ''));
  },
});

function seed(groups: number, chips = 5) {
  const trunk: DisplayMessage[] = [];
  let n = 0;
  for (let g = 0; g < groups; g += 1) {
    for (let c = 0; c < chips; c += 1) {
      n += 1;
      trunk.push({
        key: `t${n}`,
        role: 'tool',
        content: '',
        time: 1000 + n,
        sessionId: SESSION,
        tool: { name: 'bash', input: '{"command":"ls"}', output: 'ok', status: 'succeeded' },
      } as DisplayMessage);
    }
    n += 1;
    trunk.push({ key: `a${n}`, role: 'backend', content: `第${g}段正文`, time: 1000 + n, sessionId: SESSION });
  }
  return trunk;
}

function mountView() {
  return mount(ChatView, {
    props: { sessionId: SESSION },
    global: { stubs: { WorkRunGroup: WorkProbe, MessageItem: MessageStub } },
  });
}

beforeEach(() => {
  workRenders = 0;
  state.trunk = [];
  state.sessionHistory = {};
});

describe('工作行重渲染范围（性能契约）', () => {
  it('正文 delta 不再让任一工作行重渲染', async () => {
    state.trunk = seed(60);
    const wrapper = mountView();
    await nextTick();
    expect(wrapper.findAll('.stub-work').length).toBeGreaterThan(20);

    workRenders = 0;
    for (let i = 0; i < 5; i += 1) {
      state.trunk[state.trunk.length - 1]!.content += 'x';
      await nextTick();
    }
    // 修复前：34 组 × 5 = 170 次；修复后：0
    expect(workRenders).toBe(0);
    wrapper.unmount();
  });

  it('工具输出 delta 只更新它所在的那一组', async () => {
    state.trunk = seed(60);
    const wrapper = mountView();
    await nextTick();

    workRenders = 0;
    for (let i = 0; i < 5; i += 1) {
      const arr = state.trunk;
      const idx = arr.map((m) => m.role).lastIndexOf('tool');
      arr[idx]!.tool!.output += 'y';
      await nextTick();
    }
    // 一次 delta → 一次（它自己那一组），而不是窗口里所有组
    expect(workRenders).toBeLessThanOrEqual(5);
    wrapper.unmount();
  });

  it('行对象引用恒等：流式 delta 后，没变化的行还是同一个对象（v-memo 的前提）', async () => {
    state.trunk = seed(30, 2);
    const wrapper = mountView();
    await nextTick();
    type Row = { kind: string; key?: string; items?: { key: string }[]; message?: { id: string } };
    const rowsOf = () => (wrapper.vm as unknown as { messageRows: Row[] }).messageRows;

    const before = rowsOf();
    expect(before.length).toBeGreaterThan(10);
    // 末尾是一条正文消息：改它不影响任何工作行
    state.trunk[state.trunk.length - 1]!.content += 'z';
    await nextTick();
    const after = rowsOf();

    // 除最后一行（被改的那条正文）外，逐行必须是**同一个对象**
    const tail = after.length - 1;
    for (let i = 0; i < tail; i += 1) {
      expect(after[i], `row#${i} 应保持引用恒等`).toBe(before[i]);
    }
    // 被改的那一行确实换了对象（否则 v-memo 会吞掉更新）
    expect(after[tail]).not.toBe(before[tail]);
    wrapper.unmount();
  });
});
