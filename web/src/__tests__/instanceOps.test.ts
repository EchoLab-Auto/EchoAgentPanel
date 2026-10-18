//! instanceOps（02a §5.2 / S4）：键格式、同键 FIFO、超时/拒发 reject、
//! dropCoreInstanceChannel 四联动作、onCoreDropped 订阅退订。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { state } from '../store';
import { PENDING_TIMEOUT_AFTER_MS, usePending } from '../pending';

vi.mock('../connection', () => ({ sendCommand: vi.fn(() => true) }));

import { sendCommand } from '../connection';
import {
  instanceOpKey,
  dropCoreInstanceChannel,
  invokeInstanceOp,
  onCoreDropped,
  settleInstanceOp,
} from '../instanceOps';

const sendCommandMock = vi.mocked(sendCommand);

/** S5 前 `instanceUiByKey` 尚未加入 AppState：窄断言读写（字段就位后仍兼容）。 */
function instanceUi(): Record<string, unknown> {
  const s = state as { instanceUiByKey?: Record<string, unknown> };
  if (!s.instanceUiByKey) s.instanceUiByKey = {};
  return s.instanceUiByKey;
}

describe('instanceOps：键格式 / FIFO / 结算（02a §5.2，S4）', () => {
  beforeEach(() => {
    sendCommandMock.mockReset();
    sendCommandMock.mockReturnValue(true);
    state.knownCores = new Set();
    state.activeRegion = null;
    state.activeTeamId = null;
    state.sessions = [];
    state.teams = [];
    instanceUi();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('instanceOpKey：多上游带 scopedKey，单上游退化为裸实例名', () => {
    expect(instanceOpKey('core-a', 'qq', 'get_state')).toBe('instance-op:core-a\u0000qq:get_state');
    expect(instanceOpKey(null, 'qq', 'get_state')).toBe('instance-op:qq:get_state');
  });

  it('invokeInstanceOp：trackRequest + sendCommand（显式 core 信封）；settleInstanceOp resolve', async () => {
    vi.useFakeTimers();
    const key = instanceOpKey('core-a', 'qq', 'get_state');
    const p = invokeInstanceOp('core-a', 'qq', 'get_state');

    expect(sendCommandMock).toHaveBeenCalledTimes(1);
    const [cmd, target] = sendCommandMock.mock.calls[0];
    expect(target).toBe('core-a');
    expect(cmd).toEqual({ InvokeInstanceOp: { instance: 'qq', method: 'get_state', payload: {} } });

    // 加载态已登记（组件可经 usePending(key) 拿骨架/慢/超时三态）。
    vi.advanceTimersByTime(150);
    expect(usePending(key).phase.value).toBe('pending');

    settleInstanceOp(key, { result: { online: true }, error: null });
    vi.advanceTimersByTime(400);
    expect(usePending(key).phase.value).toBe('idle'); // 显式销账
    await expect(p).resolves.toEqual({ result: { online: true }, error: null });
  });

  it('业务失败也 resolve（{result:null, error}），未显示即清登记', async () => {
    vi.useFakeTimers();
    const key = instanceOpKey('core-a', 'qq', 'update_allowlist');
    const p = invokeInstanceOp('core-a', 'qq', 'update_allowlist', { user_ids: [], group_ids: [] });
    settleInstanceOp(key, { result: null, error: '实例未找到' });
    await expect(p).resolves.toEqual({ result: null, error: '实例未找到' });
    expect(usePending(key).phase.value).toBe('idle');
  });

  it('同键 FIFO：第二个请求等第一个 settle 才发送；不同键互不阻塞', async () => {
    const key = instanceOpKey('core-a', 'qq', 'get_groups');
    const p1 = invokeInstanceOp('core-a', 'qq', 'get_groups');
    const p2 = invokeInstanceOp('core-a', 'qq', 'get_groups');
    const other = invokeInstanceOp('core-a', 'qq', 'get_friends'); // 不同键：不排队
    expect(sendCommandMock).toHaveBeenCalledTimes(2);

    settleInstanceOp(key, { result: [], error: null });
    await expect(p1).resolves.toEqual({ result: [], error: null });
    expect(sendCommandMock).toHaveBeenCalledTimes(3); // 出队后第二个才发送
    settleInstanceOp(key, { result: ['a'], error: null });
    await expect(p2).resolves.toEqual({ result: ['a'], error: null });

    settleInstanceOp(instanceOpKey('core-a', 'qq', 'get_friends'), { result: [], error: null });
    await expect(other).resolves.toEqual({ result: [], error: null });
  });

  it('超时：20s reject（文案），pending 保留 timeout 态', async () => {
    vi.useFakeTimers();
    const key = instanceOpKey('core-a', 'qq', 'login_status');
    const p = invokeInstanceOp('core-a', 'qq', 'login_status');

    vi.advanceTimersByTime(PENDING_TIMEOUT_AFTER_MS);
    await expect(p).rejects.toThrow('操作超时，请重试');
    expect(usePending(key).phase.value).toBe('timeout'); // 条目保留（重试覆盖/卸载释放）
  });

  it('超时后同键队列继续放行（第二个请求不会被无限卡住）', async () => {
    vi.useFakeTimers();
    const key = instanceOpKey('core-a', 'qq', 'get_owner');
    const p1 = invokeInstanceOp('core-a', 'qq', 'get_owner');
    const p2 = invokeInstanceOp('core-a', 'qq', 'get_owner');
    expect(sendCommandMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PENDING_TIMEOUT_AFTER_MS);
    await expect(p1).rejects.toThrow('操作超时，请重试');
    expect(sendCommandMock).toHaveBeenCalledTimes(2); // p2 出队发送

    settleInstanceOp(key, { result: 42, error: null });
    await expect(p2).resolves.toEqual({ result: 42, error: null });
  });

  it('拒发：sendCommand 返回 false → reject（未连接文案）且不残留 pending', async () => {
    sendCommandMock.mockReturnValue(false);
    const key = instanceOpKey('core-a', 'qq', 'instance_info');
    const p = invokeInstanceOp('core-a', 'qq', 'instance_info');
    await expect(p).rejects.toThrow('未连接到 Core，命令未发送');

    vi.useFakeTimers();
    vi.advanceTimersByTime(PENDING_TIMEOUT_AFTER_MS);
    expect(usePending(key).phase.value).toBe('idle'); // 未登记
  });

  it('拒发：多上游未选目标 → reject（尚未选择 agent 文案）', async () => {
    sendCommandMock.mockReturnValue(false);
    state.knownCores = new Set(['core-a', 'core-b']);
    const p = invokeInstanceOp(null, 'qq', 'login_status');
    await expect(p).rejects.toThrow('尚未选择 agent（无法确定运行区域），命令未发送');
  });

  it('dropCoreInstanceChannel：四联动作（UI 文档 + pending + 在途 Promise + 通知）', async () => {
    const ui = instanceUi();
    ui['core-a\u0000qq'] = { online: true };
    ui['core-b\u0000qq'] = { online: false };

    const dropped = vi.fn();
    const unsubscribe = onCoreDropped(dropped);

    const keyA = instanceOpKey('core-a', 'qq', 'get_state');
    const keyB = instanceOpKey('core-b', 'qq', 'get_state');
    const pA1 = invokeInstanceOp('core-a', 'qq', 'get_state'); // 在途
    const pA2 = invokeInstanceOp('core-a', 'qq', 'get_state'); // 同键排队
    const pB = invokeInstanceOp('core-b', 'qq', 'get_state'); // 另一 core 在途
    expect(sendCommandMock).toHaveBeenCalledTimes(2); // pA2 未发送

    // 先挂断言再触发清理：避免 pA2 的 rejection 在两段 await 之间被判为
    // unhandled rejection。
    const rejectedA1 = expect(pA1).rejects.toThrow('核心已离线，操作已取消');
    const rejectedA2 = expect(pA2).rejects.toThrow('核心已离线，操作已取消');
    dropCoreInstanceChannel('core-a');

    await rejectedA1;
    await rejectedA2;
    expect(sendCommandMock).toHaveBeenCalledTimes(2); // 排队的 pA2 未被误发
    expect(ui['core-a\u0000qq']).toBeUndefined(); // ① UI 文档按前缀清理
    expect(ui['core-b\u0000qq']).toEqual({ online: false }); // 别的 core 不动
    expect(usePending(keyA).phase.value).toBe('idle'); // ② pending 清理
    expect(dropped).toHaveBeenCalledTimes(1); // ④ 通知
    expect(dropped).toHaveBeenCalledWith('core-a');

    // pB 不受影响；迟到结果静默丢弃（无在途时不抛错）。
    settleInstanceOp(keyB, { result: 1, error: null });
    await expect(pB).resolves.toEqual({ result: 1, error: null });
    expect(() => settleInstanceOp(keyB, { result: null, error: null })).not.toThrow();

    // 退订后不再通知；重复 drop 幂等。
    unsubscribe();
    dropCoreInstanceChannel('core-a');
    expect(dropped).toHaveBeenCalledTimes(1);
  });
});
