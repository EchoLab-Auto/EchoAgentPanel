//! 全局确认对话框契约（2026-10 审计修复配套）：`confirmDialog()` 的
//! Promise 语义（确认 true / 取消 false）与危险样式类。
//!
//! 背景：11 处 window.confirm 已替换为 `src/confirm.ts` 服务 +
//! `components/ConfirmDialog.vue`（App 根挂载一次）。本测试锁定：
//! - 打开后 Modal 展示消息与标题（真实 teleport 到 body）；
//! - 确认/取消按钮分别 resolve(true)/resolve(false)，结算后状态清空；
//! - danger 选项把确认按钮标记为错误色类。

import { describe, it, expect, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ConfirmDialog from '../ConfirmDialog.vue';
import { confirmActive, confirmDialog } from '../../confirm';

function findButton(text: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  );
  if (!button) throw new Error(`button not found: ${text}`);
  return button as HTMLButtonElement;
}

describe('ConfirmDialog 全局确认', () => {
  const wrappers: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    while (wrappers.length) wrappers.pop()!.unmount();
    document.body.innerHTML = '';
  });

  it('确认 → resolve(true)，状态清空；消息与标题上屏', async () => {
    const wrapper = mount(ConfirmDialog, { attachTo: document.body });
    wrappers.push(wrapper);

    const result = confirmDialog('删除智能体「alix」？此操作不可恢复。', {
      title: '删除智能体',
      danger: true,
      confirmText: '删除',
    });
    await flushPromises();

    expect(confirmActive().value?.message).toContain('alix');
    expect(document.body.textContent).toContain('删除智能体');
    const confirmBtn = findButton('删除');
    expect(confirmBtn.className).toContain('confirm-dialog__confirm--danger');

    confirmBtn.click();
    await flushPromises();
    await expect(result).resolves.toBe(true);
    expect(confirmActive().value).toBeNull();
  });

  it('取消 → resolve(false)', async () => {
    const wrapper = mount(ConfirmDialog, { attachTo: document.body });
    wrappers.push(wrapper);

    const result = confirmDialog('归档当前会话历史？');
    await flushPromises();
    findButton('取消').click();
    await flushPromises();
    await expect(result).resolves.toBe(false);
    expect(confirmActive().value).toBeNull();
  });

  it('并发：新确认请求到达时，未结算的旧请求按取消结算（不悬挂）', async () => {
    const wrapper = mount(ConfirmDialog, { attachTo: document.body });
    wrappers.push(wrapper);

    const first = confirmDialog('第一问');
    const second = confirmDialog('第二问');
    await flushPromises();
    expect(confirmActive().value?.message).toBe('第二问');
    await expect(first).resolves.toBe(false);

    findButton('确定').click();
    await flushPromises();
    await expect(second).resolves.toBe(true);
  });
});
