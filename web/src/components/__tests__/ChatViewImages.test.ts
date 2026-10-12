//! 消息图片渲染契约（2026-09-24 媒体落盘改造）。
//!
//! 元素语义（Core 侧）：
//! - `/media/<id>`：Core 落盘图的引用（同源、懒加载、内容哈希强缓存）；
//! - `data:` URI：遗留内联图（老会话/远端 URL 降级）；
//! - 空串：Core 侧"图片已省略"占位（保留数组长度以便计数展示）。
//! 面板必须：可展示项渲染 `<img loading=lazy>`，省略项渲染文字占位。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    // sendPending = 登记加载跟踪 + 发命令（生产语义）：测试等价转发，
    // 调用记录并入 sendCommand 的 mock，请求类断言无需两处查。
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

import ChatView from '../ChatView.vue';
import { state } from '../../store';

function seedWithImages(images: string[]) {
  state.trunk = [
    {
      key: 'm1',
      role: 'user',
      content: '看图',
      time: 1700000000,
      sessionId: 'local:tui::local_user',
      images,
    },
  ] as typeof state.trunk;
  state.tasks = [];
  state.activities = {};
  state.branchTabs = {};
  state.shellSessions = [];
  state.connected = true;
  state.teams = [];
  state.activeTeamId = null;
  // 默认无运行区域 → 媒体引用不带 core 提示（用例显式覆盖）。
  state.activeRegion = null;
}

function mountChat() {
  return mount(ChatView, {
    props: { sessionId: 'local:tui::local_user', activeTeamId: null },
    global: {
      stubs: {
        SessionSwitcher: true,
        AgentSwitcher: true,
        PanelSidebar: true,
        ChecklistSidebar: true,
        AgentConfigModal: true,
      },
    },
  });
}

describe('ChatView 消息图片渲染', () => {
  beforeEach(() => {
    seedWithImages([]);
  });

  it('媒体引用渲染为 img（懒加载）', () => {
    seedWithImages(['/media/abc123.png', '/media/def456.gif']);
    const wrapper = mountChat();
    const imgs = wrapper.findAll('img.chat-view__image');
    expect(imgs.length).toBe(2);
    expect(imgs[0].attributes('src')).toBe('/media/abc123.png');
    expect(imgs[1].attributes('src')).toBe('/media/def456.gif');
    expect(imgs[0].attributes('loading')).toBe('lazy');
  });

  it('省略占位（空串）渲染文字标记，且不渲染 img', () => {
    seedWithImages(['/media/abc123.png', '', '']);
    const wrapper = mountChat();
    expect(wrapper.findAll('img.chat-view__image').length).toBe(1);
    const elided = wrapper.findAll('.chat-view__image-elided');
    expect(elided.length).toBe(2);
    expect(elided[0].text()).toContain('图片已省略');
  });

  it('遗留 data URI 仍可渲染（老会话兼容）', () => {
    const legacy = 'data:image/png;base64,QUJD';
    seedWithImages([legacy]);
    const wrapper = mountChat();
    const img = wrapper.find('img.chat-view__image');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe(legacy);
  });

  it('SSH 远端 Core：媒体引用附 core 提示（后端据此优先远端拉取）', () => {
    seedWithImages(['/media/abc123.png']);
    state.activeRegion = 'cloud';
    const wrapper = mountChat();
    const img = wrapper.find('img.chat-view__image');
    expect(img.attributes('src')).toBe('/media/abc123.png?core=cloud');
  });

  it('data URI 不附 core 提示（仅媒体引用加壳）', () => {
    seedWithImages(['data:image/png;base64,QUJD']);
    state.activeRegion = 'cloud';
    const wrapper = mountChat();
    const img = wrapper.find('img.chat-view__image');
    expect(img.attributes('src')).toBe('data:image/png;base64,QUJD');
  });
});
