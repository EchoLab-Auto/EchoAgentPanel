//! 应用壳顶栏契约：顶栏 = 品牌 + 三视图导航 + 全屏 + 主题开关。
//!
//! 背景：顶栏早期在中间展示 LLM 模型名，2026-09-11 移除；同日再移除忙碌
//! 徽标（`忙碌 ×N`）——运行态在会话卡忙碌点、活动浮条呈现。「任务」菜单
//! 已移除：任务入口并入聊天入口行弹层（只对应当前 agent 的当前会话）。
//! 2026-09-23：连接状态（原顶栏中段）迁入右侧边栏「连接状态」卡——面板级
//! 信息与业务导航分离，顶栏中段不再有状态点。2026-10-07（XR 巨幕模式）：
//! 新增「全屏」按钮（头显浏览器里一键铺满视野）。本测试锁定顶栏文案集合，
//! 防止模型名/全局忙碌计数/全局任务入口/连接状态回流到顶栏。

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

vi.mock('../connection', () => ({
  startConnection: vi.fn(),
  sendCommand: vi.fn(),
  // App 拉时间线走统一入口 `requestTimeline`（2026-10 分页：全量带窗口上限、
  // 增量原样请求）。mock 必须与真实导出对齐，否则调用处变成 undefined。
  requestTimeline: vi.fn(),
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
        ShellPanel: Stub,
        BranchModal: Stub,
        ThemeToggleButton: Stub,
      },
    },
  });
}

describe('App 顶栏', () => {
  it('顶栏只有品牌 + 导航（连接状态已迁右侧栏卡片，无模型/供应商/忙碌徽标）', () => {
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
    // 品牌 + 导航
    expect(headerText).toContain('EchoAgent Panel');
    for (const label of ['聊天', '设置']) {
      expect(headerText).toContain(label);
    }
    // XR 巨幕模式：全屏按钮常驻顶栏（非全屏态文案「全屏」）
    expect(headerText).toContain('全屏');
    // 连接状态已迁右侧栏「连接状态」卡：顶栏不再出现状态文案
    expect(headerText).not.toContain('已连接');
    expect(headerText).not.toContain('连接中');
    // 模型名/供应商不得出现在顶栏
    expect(headerText).not.toMatch(/model|模型|deepseek|openai|anthropic|claude|kimi|gpt/i);
    // 任务/Shell 视图已分别并入入口行与右侧边栏：顶栏无全局入口
    expect(headerText).not.toContain('任务');
    expect(headerText).not.toContain('Shell');
    // 忙碌徽标已移除：顶栏不出现 忙碌/×N，且不含任何 nm-tag
    expect(headerText).not.toContain('忙碌');
    expect(header.find('.nm-tag').exists()).toBe(false);
    state.activities = {};
  });
});
