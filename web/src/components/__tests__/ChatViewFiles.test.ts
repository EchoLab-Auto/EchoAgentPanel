//! 输入区拖入文件的契约（2026-11）。
//!
//! 三件事必须成立，缺一个用户就会看到"文件没了"：
//!
//! 1. **分流**：图片继续走 `images`（多模态载荷），其它文件走 `files`
//!    （只落盘成路径）。混在一起 Core 只能靠嗅探猜类型。
//! 2. **超限必须报告**：静默跳过一个 100 MB 的视频 = 用户以为发成功了。
//! 3. **发送后清空**：不清空会让同一份 base64 在下一轮重复上传。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('../../connection', () => {
  const sendCommand = vi.fn();
  return {
    sendCommand,
    sendPending: vi.fn((command: unknown) => sendCommand(command as never)),
  };
});

import ChatView from '../ChatView.vue';
import { state } from '../../store';

/** 构造一个 File。jsdom 的 FileReader 支持 readAsDataURL。 */
function makeFile(name: string, content: string, type = 'text/plain'): File {
  return new File([content], name, { type });
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

/**
 * 等附件条出现期望数量的行。
 *
 * 不用固定 `setTimeout(0)`：FileReader 的 `onload` 排在宏任务队列里，
 * 0ms 定时器不保证在它之后——固定延时写小了会随机失败，写大了拖慢全套。
 */
async function waitForRows(
  wrapper: ReturnType<typeof mountChat>,
  selector: string,
  count: number,
): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await wrapper.vm.$nextTick();
    if (wrapper.findAll(selector).length === count) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(
    `timed out waiting for ${count} "${selector}" rows (got ${wrapper.findAll(selector).length})`,
  );
}

/** 触发一次 drop（DataTransfer 在 jsdom 里要自己造）。 */
async function dropFiles(wrapper: ReturnType<typeof mountChat>, files: File[]) {
  const composer = wrapper.find('.chat-composer-float');
  const dataTransfer = {
    types: ['Files'],
    files,
    dropEffect: 'none',
  };
  await composer.trigger('drop', { dataTransfer });
}

describe('ChatView 拖入文件', () => {
  beforeEach(() => {
    state.trunk = [];
    state.tasks = [];
    state.activities = {};
    state.shellSessions = [];
    state.teams = [];
    state.activeTeamId = null;
    state.activeRegion = null;
    state.toasts = [];
    state.connected = true;
  });

  it('非图片文件进入附件条（显示名字与体积），不混进图片', async () => {
    const wrapper = mountChat();
    await dropFiles(wrapper, [makeFile('report.pdf', 'hello world')]);
    await waitForRows(wrapper, '.chat-view__file', 1);

    const rows = wrapper.findAll('.chat-view__file');
    expect(rows.length).toBe(1);
    expect(rows[0].find('.chat-view__file-name').text()).toBe('report.pdf');
    expect(rows[0].find('.chat-view__file-size').text()).toBe('11 B');
    // 图片区不该出现任何东西
    expect(wrapper.findAll('.chat-view__attach').length).toBe(0);
  });

  it('图片不进文件条（分流的核心断言）', async () => {
    // jsdom 没有 canvas，`fileToDataUrl` 的解码/压缩必然失败并被吞掉——
    // 所以这里只断言**分流**：图片不会被塞进 `files`。图片预览本身由
    // ChatViewImages 那组用例以「直接 seed state」的方式覆盖（绕开 canvas）。
    const wrapper = mountChat();
    const file = new File(['not-really-a-png'], 'a.png', { type: 'image/png' });
    await dropFiles(wrapper, [file]);
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.chat-view__file').length).toBe(0);
  });

  it('超限文件被拒并弹出错误提示（不静默丢弃）', async () => {
    const wrapper = mountChat();
    const huge = makeFile('huge.bin', 'x');
    // 只改 size，不真的分配 21 MB。
    Object.defineProperty(huge, 'size', { value: 21 * 1024 * 1024 });
    await dropFiles(wrapper, [huge]);
    // 拒绝路径不读文件，但 addFiles 仍是 async：等 toast 出现即可。
    for (let i = 0; i < 50 && state.toasts.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.chat-view__file').length).toBe(0);
    expect(state.toasts.length).toBe(1);
    expect(state.toasts[0]!.kind).toBe('error');
    expect(state.toasts[0]!.text).toContain('huge.bin');
    expect(state.toasts[0]!.text).toContain('20 MB');
  });

  it('移除按钮删掉对应附件，不影响其它文件', async () => {
    const wrapper = mountChat();
    await dropFiles(wrapper, [makeFile('a.txt', 'a'), makeFile('b.txt', 'bb')]);
    await waitForRows(wrapper, '.chat-view__file', 2);

    await wrapper.findAll('.chat-view__file-remove')[0]!.trigger('click');
    await wrapper.vm.$nextTick();

    const rows = wrapper.findAll('.chat-view__file');
    expect(rows.length).toBe(1);
    expect(rows[0].find('.chat-view__file-name').text()).toBe('b.txt');
  });

  it('发送时带上 files，并在发送后清空明细', async () => {
    const wrapper = mountChat();
    await dropFiles(wrapper, [makeFile('notes.md', '# hi')]);
    await waitForRows(wrapper, '.chat-view__file', 1);

    const composer = wrapper.findComponent({ name: 'ChatComposer' });
    composer.vm.$emit('send', '看这个');
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted('send');
    expect(emitted).toBeTruthy();
    const [, images, files] = emitted![0] as [string, string[], { name: string; data: string }[]];
    expect(images).toEqual([]);
    expect(files.length).toBe(1);
    expect(files[0]!.name).toBe('notes.md');
    // base64 不带 `data:` 前缀（协议两种都收，省掉是白省的）。
    expect(files[0]!.data).toBe(btoa('# hi'));

    // 发送后必须清空：不清空下一轮会重复上传同一份字节。
    expect(wrapper.findAll('.chat-view__file').length).toBe(0);
  });
});

describe('ChatView 已发送文件回显', () => {
  beforeEach(() => {
    state.toasts = [];
    state.tasks = [];
    state.activities = {};
    state.shellSessions = [];
    state.teams = [];
    state.activeTeamId = null;
    state.activeRegion = null;
    state.connected = true;
  });

  it('已落盘的文件在气泡里显示名字与体积', async () => {
    state.trunk = [
      {
        key: 'm1',
        role: 'user',
        content: '帮我看看',
        time: 1700000000,
        sessionId: 'local:tui::local_user',
        files: [{ name: 'report.pdf', path: '/home/u/.local/share/x/report.pdf', size: 2048 }],
      },
    ] as typeof state.trunk;
    const wrapper = mountChat();
    await wrapper.vm.$nextTick();

    const rows = wrapper.findAll('.chat-view__sent-file');
    expect(rows.length).toBe(1);
    expect(rows[0]!.find('.chat-view__sent-file-name').text()).toBe('report.pdf');
    expect(rows[0]!.find('.chat-view__sent-file-size').text()).toBe('2.0 KB');
    // 路径进 title：用户想确认"到底存哪了"时能看到。
    expect(rows[0]!.attributes('title')).toContain('report.pdf');
  });

  it('落盘失败的文件标出来（而不是静默消失）', async () => {
    state.trunk = [
      {
        key: 'm1',
        role: 'user',
        content: '发了个大文件',
        time: 1700000000,
        sessionId: 'local:tui::local_user',
        files: [{ name: 'huge.bin', size: 0, error: 'file too large' }],
      },
    ] as typeof state.trunk;
    const wrapper = mountChat();
    await wrapper.vm.$nextTick();

    const row = wrapper.find('.chat-view__sent-file');
    expect(row.classes()).toContain('chat-view__sent-file--failed');
    expect(row.find('.chat-view__sent-file-size').text()).toBe('file too large');
  });
});
