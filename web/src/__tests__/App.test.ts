//! 应用壳顶栏契约：顶栏 = 品牌 + 连接状态 + 两视图导航 + 主题开关。
//!
//! 背景：顶栏早期在中间展示 LLM 模型名，2026-09-11 移除；同日再移除忙碌
//! 徽标（`忙碌 ×N`）——运行态在会话卡忙碌点、活动浮条呈现。「任务」菜单
//! 已移除：任务入口并入聊天入口行弹层（只对应当前 agent 的当前会话）。本测试
//! 锁定顶栏文案集合，防止模型名/全局忙碌计数/全局任务入口回流到顶栏。

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

vi.mock('../connection', () => ({
  startConnection: vi.fn(),
  sendCommand: vi.fn(),
}));

import App from '../App.vue';
import { state } from '../store';

const Stub = defineComponent({ name: 'Stub', setup: () => () => h('div', { class: 'stub' }) });

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        ChatView: Stub,
        PanelSidebar: Stub,
        TasksPanel: Stub,
        SettingsView: Stub,
        BranchModal: Stub,
        SudoModal: Stub,
        ThemeToggleButton: Stub,
      },
    },
  });
}

describe('App 顶栏', () => {
  it('顶栏只有品牌 + 连接状态 + 导航（无模型/供应商/忙碌徽标）', () => {
    state.connected = true;
    // 造一个"忙碌"的会话：顶栏不应因此出现徽标
    state.activities = {
      s1: {
        phase: 'thinking',
        detail: null,
        startedAt: Date.now(),
        toolsCompleted: 0,
        subagentsCompleted: 0,
        promptTokens: 0,
        completionTokens: 0,
      },
    };
    const wrapper = mountApp();
    const header = wrapper.find('.nm-layout__header');
    expect(header.exists()).toBe(true);
    const headerText = header.text();
    // 品牌 + 连接态 + 导航
    expect(headerText).toContain('EchoAgent Panel');
    expect(headerText).toContain('已连接');
    for (const label of ['聊天', '设置']) {
      expect(headerText).toContain(label);
    }
    // 模型名/供应商不得出现在顶栏
    expect(headerText).not.toMatch(/model|模型|deepseek|openai|anthropic|claude|kimi|gpt/i);
    // 任务/Shell 视图已并入右侧边栏卡片：顶栏不再出现全局入口
    expect(headerText).not.toContain('任务');
    expect(headerText).not.toContain('Shell');
    // 忙碌徽标已移除：顶栏不出现 忙碌/×N，且不含任何 nm-tag
    expect(headerText).not.toContain('忙碌');
    expect(header.find('.nm-tag').exists()).toBe(false);
    state.activities = {};
  });
});
