//! 协议镜像一致性守护（2026-10 巡检）：state.ts 的 reduce 处理的每个
//! 事件名，必须在 protocol.ts 的 `BackendEvent` 联合类型中有定义。
//!
//! 背景：protocol.ts 是 Core `echo-protocol` 线格式的**手工镜像**（Panel
//! 与 Core 跨仓库，无法编译期共享类型）。历史上出现过 reduce 处理了某
//! 事件（`as unknown as` 强转绕过类型系统），但 union 里没定义的情况
//! （ActiveTurnsSnapshot / FederationStatus / FederationInvite /
//! SelfUpdateStatus 四个曾缺失）——Core 改字段、Panel 零编译期报错。
//!
//! 本测试把「reduce case ⊆ BackendEvent 变体」变成显式不变量：新增事件
//! 处理时若忘同步 protocol.ts，测试立刻失败并指明缺失的名字。
//!
//! 另一侧（union 有定义但 reduce 不处理）不强制——事件可能由其他模块
//! （connection/pending）消费，未处理是合法的。
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const protocolSrc = readFileSync(join(here, '..', 'protocol.ts'), 'utf-8');
const stateSrc = readFileSync(join(here, '..', 'state.ts'), 'utf-8');

/** 提取 `export type BackendEvent = ...` 段。 */
function backendEventSegment(): string {
  const start = protocolSrc.indexOf('export type BackendEvent =');
  expect(start, 'protocol.ts must declare BackendEvent').toBeGreaterThanOrEqual(0);
  const end = protocolSrc.indexOf('export type ', start + 10);
  return protocolSrc.slice(start, end > 0 ? end : undefined);
}

/** BackendEvent 联合类型的变体名集合。 */
function eventVariantNames(): Set<string> {
  const seg = backendEventSegment();
  // 匹配 `| { Name: ...` / `| {\n  Name: ...` / `| { Name { ...`
  const names = [...seg.matchAll(/\|\s*\{\s*(\w+)\s*[:{]/g)].map((m) => m[1]);
  return new Set(names);
}

/** reduce 的 case 名集合（state.ts 的 switch）。 */
function reduceCaseNames(): Set<string> {
  return new Set([...stateSrc.matchAll(/case '(\w+)':/g)].map((m) => m[1]));
}

describe('协议镜像一致性（protocol.ts 手工镜像 echo-protocol）', () => {
  it('reduce 的每个 case 都在 BackendEvent 联合类型中定义', () => {
    const variants = eventVariantNames();
    const cases = reduceCaseNames();
    expect(variants.size, 'BackendEvent 变体提取失败（解析假设被破坏？）').toBeGreaterThan(30);

    const missing = [...cases].filter((name) => !variants.has(name));
    expect(
      missing,
      `以下事件被 reduce 处理但未在 protocol.ts 的 BackendEvent 中定义：` +
        `${missing.join(', ')}——请补齐联合类型（参考 Core 的 echo-protocol/src/event.rs）`,
    ).toEqual([]);
  });

  it('union 变体数量为基线快照（新增事件时必须同步更新此数字）', () => {
    // 此断言是"提醒器"：Core 加事件/自己补定义后，这里失败提醒你确认
    // 变体集合是有意变更，而不是漏同步。数字随协议演进更新。
    const variants = eventVariantNames();
    expect(variants.size).toBe(57);
  });

  it('ChecklistUpdated 携带 team_id（同一 core 多 persona 隔离，2026-10）', () => {
    const seg = backendEventSegment();
    const m = seg.match(/ChecklistUpdated:\s*\{([^}]*)\}/);
    expect(m, 'ChecklistUpdated 定义缺失').toBeTruthy();
    expect(m![1]).toContain('team_id');
  });
});
