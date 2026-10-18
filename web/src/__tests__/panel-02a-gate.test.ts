//! 02a §7.3 门禁自检（固化三条 grep）：「Panel 阶段 1：协议与状态层」的
//! G1 判定——03b 组件重接线的前置依赖。三条门禁：
//!   1. `grep -n "case 'InstanceState'" web/src/state.ts` 非空；
//!   2. `grep -n "InvokeInstanceOp" web/src/protocol.ts` 非空；
//!   3. `grep -rn "instanceUiByKey" web/src/state.ts web/src/instanceOps.ts` 命中。
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(here, '..', name), 'utf-8');

const stateSrc = read('state.ts');
const protocolSrc = read('protocol.ts');
const instanceOpsSrc = read('instanceOps.ts');

describe('02a §7.3 门禁（Panel 阶段 1）', () => {
  it("门禁 1：state.ts 有 InstanceState 处理臂（case 'InstanceState'）", () => {
    expect(stateSrc).toContain("case 'InstanceState'");
    // 配对臂同在（结果 → Promise resolve；G1 依赖整对落地）。
    expect(stateSrc).toContain("case 'InstanceOpResult'");
  });

  it('门禁 2：protocol.ts 定义 InvokeInstanceOp / InstanceOpResult / InstanceState', () => {
    expect(protocolSrc).toContain('InvokeInstanceOp');
    expect(protocolSrc).toContain('InstanceOpResult');
    expect(protocolSrc).toContain('InstanceState');
  });

  it('门禁 3：instanceUiByKey 落在 state.ts / instanceOps.ts', () => {
    expect(stateSrc).toContain('instanceUiByKey');
    expect(instanceOpsSrc).toContain('instanceUiByKey');
  });
});
