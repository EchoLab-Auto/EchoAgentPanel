//! 02a §7.3 门禁自检（固化三条 grep）：「Panel 阶段 1：协议与状态层」的
//! G1 判定——03b 组件重接线的前置依赖。三条门禁：
//!   1. `grep -n "case 'AdapterState'" web/src/state.ts` 非空；
//!   2. `grep -n "InvokeAdapterOp" web/src/protocol.ts` 非空；
//!   3. `grep -rn "adapterUiByKey" web/src/state.ts web/src/adapterOps.ts` 命中。
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(here, '..', name), 'utf-8');

const stateSrc = read('state.ts');
const protocolSrc = read('protocol.ts');
const adapterOpsSrc = read('adapterOps.ts');

describe('02a §7.3 门禁（Panel 阶段 1）', () => {
  it("门禁 1：state.ts 有 AdapterState 处理臂（case 'AdapterState'）", () => {
    expect(stateSrc).toContain("case 'AdapterState'");
    // 配对臂同在（结果 → Promise resolve；G1 依赖整对落地）。
    expect(stateSrc).toContain("case 'AdapterOpResult'");
  });

  it('门禁 2：protocol.ts 定义 InvokeAdapterOp / AdapterOpResult / AdapterState', () => {
    expect(protocolSrc).toContain('InvokeAdapterOp');
    expect(protocolSrc).toContain('AdapterOpResult');
    expect(protocolSrc).toContain('AdapterState');
  });

  it('门禁 3：adapterUiByKey 落在 state.ts / adapterOps.ts', () => {
    expect(stateSrc).toContain('adapterUiByKey');
    expect(adapterOpsSrc).toContain('adapterUiByKey');
  });
});
