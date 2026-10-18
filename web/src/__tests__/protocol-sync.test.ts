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
//!
//! 2026-10 扩展两条同族守护：
//!   1. 命令侧：联邦 4 条命令（Save/DeleteFederationPeer、
//!      RequestFederationStatus/Invite）曾在联合中缺失、靠双重断言绕过
//!      ——补齐后立「命令名在联合中有定义」快照；
//!   2. 归零棘轮：生产代码不得再出现 `as unknown as BackendCommand`
//!      双重断言（类型系统沉默 = Core 改字段零编译期报错）。
//!      确需绕过时把命令名加进 ALLOWED_BYPASS 并写明理由。
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { serializeCommand } from '../protocol';

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
    // 54 → 56（2026-10 流式输出：+AgentContentDelta / AgentReasoningDelta）
    // → 58（2026-10 实例泛化 02a：+InstanceOpResult / InstanceState）
    // → 51（2026-10 泛化阶段 2：Panel 删除 7 个迁移期 QQ 变体——GroupList /
    //   QqFilterConfig / QqGateMode / QqOwner / QqLoginStatus / QqQrcode /
    //   FriendList；Core 侧同批直接删除，两端镜像一致）。
    // → 52（2026-10 会话历史通道：+SessionHistory——共享显示窗口 FIFO 淘汰
    //   后按会话派生完整历史，`RequestSessionHistory` → `SessionHistory`）。
    const variants = eventVariantNames();
    expect(variants.size).toBe(52);
  });

  it('实例泛化事件的名字与 Core 逐字一致（去适配器化后）', () => {
    // 双端契约：变体名与字段名必须与 `echo-protocol/src/event.rs` 逐字一致。
    // 2026-10 的教训：Core 把 `Adapter*` 改成 `Instance*` 时只给了**字段级** alias，
    // 变体名没有 alias —— Panel 还发旧名时 Core 整帧静默丢弃（无日志、无 toast）。
    const seg = backendEventSegment();
    for (const name of ['InstanceList', 'InstanceState', 'InstanceOpResult', 'InstanceStateChanged']) {
      expect(seg, `事件联合类型缺 ${name}`).toContain(`${name}:`);
    }
    for (const stale of ['AdapterList:', 'AdapterState:', 'AdapterOpResult:', 'AdapterStateChanged:']) {
      expect(seg, `事件联合类型仍含旧名 ${stale}`).not.toContain(stale);
    }
    const m = seg.match(/InstanceStateChanged:\s*\{([^}]*)\}/);
    expect(m, 'InstanceStateChanged 定义缺失').toBeTruthy();
    expect(m![1]).toContain('instance_name');
  });

  it('ChecklistUpdated 携带 team_id（同一 core 多 persona 隔离，2026-10）', () => {
    const seg = backendEventSegment();
    const m = seg.match(/ChecklistUpdated:\s*\{([^}]*)\}/);
    expect(m, 'ChecklistUpdated 定义缺失').toBeTruthy();
    expect(m![1]).toContain('team_id');
  });

  it('会话历史事件在联合类型中定义（2026-10 会话历史通道）', () => {
    expect(backendEventSegment()).toContain('SessionHistory');
  });
});

describe('命令侧镜像与归零棘轮（2026-10）', () => {
  /** 提取 `export type BackendCommand = ...;` 段。 */
  function commandSegment(): string {
    const start = protocolSrc.indexOf('export type BackendCommand =');
    expect(start, 'protocol.ts must declare BackendCommand').toBeGreaterThanOrEqual(0);
    const end = protocolSrc.indexOf('export type ', start + 10);
    return protocolSrc.slice(start, end > 0 ? end : undefined);
  }

  it('联邦 4 条命令均在 BackendCommand 联合中定义（防再漂移）', () => {
    // 这 4 条曾缺失、靠 `as unknown as` 绕过（FederationSettings.vue 8 处
    // + connection.ts 1 处均依赖它们）。改名/删除前先想清楚绕过方案。
    const seg = commandSegment();
    for (const name of [
      'SaveFederationPeer',
      'DeleteFederationPeer',
      'RequestFederationStatus',
      'RequestFederationInvite',
    ]) {
      expect(seg.includes(name), `BackendCommand 缺少联邦命令 ${name}`).toBe(true);
    }
  });

  it('unit 命令按字符串形态序列化（与 Core serde 实测兼容）', () => {
    // Core `BackendCommand` 是默认外部标签 serde：unit 变体的标准线格式
    // 是纯字符串（`{"payload":"RequestFederationStatus"}`）。Panel 与 Core
    // 双端各有一条形态测试钉住该契约（Core 侧见 management.rs 测试）。
    expect(serializeCommand('RequestFederationStatus')).toBe(
      '{"type":"command","payload":"RequestFederationStatus"}',
    );
    expect(serializeCommand({ DeleteFederationPeer: { name: 'x' } })).toBe(
      '{"type":"command","payload":{"DeleteFederationPeer":{"name":"x"}}}',
    );
  });

  it('实例泛化命令的名字与 Core 逐字一致（去适配器化后）', () => {
    // 双端契约：与 `echo-protocol/src/command.rs` 的变体名逐字一致。
    const seg = commandSegment();
    for (const name of [
      'StartInstance', 'StopInstance', 'RestartInstance', 'RequestInstanceStatus',
      'StartAllInstances', 'StopAllInstances', 'InvokeInstanceOp',
    ]) {
      expect(seg, `命令联合类型缺 ${name}`).toContain(name);
    }
    for (const stale of ['StartAdapter', 'StopAdapter', 'RestartAdapter',
                         'RequestAdapterStatus', 'StartAllAdapters', 'StopAllAdapters',
                         'InvokeAdapterOp']) {
      expect(seg, `命令联合类型仍含旧名 ${stale}`).not.toContain(stale);
    }
    expect(serializeCommand({ StartInstance: { name: 'qq' } })).toBe(
      '{"type":"command","payload":{"StartInstance":{"name":"qq"}}}',
    );
  });

  it('RenameApi 线格式与 Core serde 契约一致（2026-10 改名能力）', () => {
    // 双端契约：Core 侧 `rename_api_serde_contract`（echo-protocol
    // command.rs）钉住同一串；字段名 from/to 在两侧必须逐字一致。
    expect(serializeCommand({ RenameApi: { from: 'kimi', to: 'k3' } })).toBe(
      '{"type":"command","payload":{"RenameApi":{"from":"kimi","to":"k3"}}}',
    );
  });

  it('InvokeInstanceOp 线格式与 Core serde 契约一致（02a §4.1）', () => {
    // 双端契约：`{ instance, method, payload }` 逐字一致（core command.rs）。
    expect(
      serializeCommand({ InvokeInstanceOp: { instance: 'qq', method: 'get_state', payload: {} } }),
    ).toBe(
      '{"type":"command","payload":{"InvokeInstanceOp":{"instance":"qq","method":"get_state","payload":{}}}}',
    );
  });

  it('生产代码无双重断言绕过 BackendCommand（归零棘轮）', () => {
    // 只降不升：新增绕过必须先把命令类型补进 protocol.ts；确无可能时
    // 在此登记命令名与理由（目前为空——4 条联邦命令已全部转正）。
    const ALLOWED_BYPASS: Record<string, string> = {};
    const PATTERN = 'as unknown as BackendCommand';
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
          const text = readFileSync(full, 'utf-8');
          if (text.includes(PATTERN)) hits.push(full.slice(join(here, '..').length + 1));
        }
      }
    };
    walk(join(here, '..'));
    const unexpected = hits.filter((f) => !(f in ALLOWED_BYPASS));
    expect(
      unexpected,
      `以下文件以双重断言绕过 BackendCommand 类型系统（禁止）：${unexpected.join(', ')}——` +
        '请先为所用命令在 protocol.ts 联合中补类型；确需绕过请登记 ALLOWED_BYPASS 并写明理由',
    ).toEqual([]);
  });
});
