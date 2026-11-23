//! 模块依赖图：仅由 fabric-arch 的服务键关系生成，不写死模块拓扑。
//!
//! 视图组织：
//! - 全部模块都作为节点；无依赖模块按类别排成独立节点列；
//! - 有依赖关系的模块仍由 ui-frame 按服务键自动分层。
//! - 节点标签是「名称 · 短 ID」，不依赖具体模块名称也能辨认；
//! - 边只承担服务键标签，方向始终是提供者 → 消费者。
//!
//! 三类键都要如实表达（此前只画了第一类，另外两类被静默丢弃）：
//!
//! | 键来自 | 图上的样子 | 语义 |
//! | --- | --- | --- |
//! | `required_services` 且某模块 `provides_services` 有它 | 实线边，标签 `key` | 硬依赖，缺了挂不上 |
//! | `optional_services` 且某模块提供 | 实线边，标签 `key?` | 软依赖，缺了照挂（`ProDocFlowEdge` 没有虚线样式，只能标签区分） |
//! | 命中不了任何模块 | 不进图，登记进 [`hostProvided`] / [`missing`] | 前者是宿主注册的接缝（`llm`、`echo-agent.host.*`），后者是真缺失 |
//!
//! 第三种为什么不能丢：丢了之后 `echo-agent.loop.single`（硬依赖 `llm`，而
//! `llm` 由组合根注册、没有模块提供）在图上是个根节点，看起来"最上游"，
//! `provider.llm` 反而挂在它下游——单看这张图会得出错误的因果。

import type { ModuleInfo } from './protocol';
import type { ProDocFlowGraph, ProDocFlowNode, ProDocFlowEdge } from '@echolab-auto/ui-frame/doc';

/** 一条「谁要某个服务键」的登记（键没有被任何模块提供时用）。 */
export interface ModuleServiceRef {
  /** 消费者模块 id（原始 id，不是图里的节点 id）。 */
  moduleId: string;
  /** 服务键。 */
  key: string;
  /** 该键是软依赖（缺失不阻止挂载）。 */
  optional: boolean;
}

export interface ModuleDependencyModel {
  graph: ProDocFlowGraph;
  /** 没有依赖边的模块，用于辅助展示；它们也包含在主图中。 */
  isolated: ModuleInfo[];
  /** 依赖关系的数量（含软依赖边），供空状态与说明使用。 */
  edgeCount: number;
  /** 其中的软依赖边条数。 */
  optionalEdgeCount: number;
  /**
   * 被多个模块同时提供的服务键。
   *
   * 框架的 `provide` 是同一键后者覆盖前者，但"谁是后者"取决于挂载顺序——
   * 图上一个都不画会丢信息，只画一个会撒谎，所以每个提供者都连边，并在这里
   * 如实列出该键的全部提供者。
   */
  multiProviderKeys: { key: string; providers: string[] }[];
  /**
   * 命中不了任何模块、但**此刻已在服务表里**的键。
   *
   * 判据：不在消费者自己的 `pending_services` 里（`pending_services` 是 Core
   * 算出的"此刻还缺"）。`llm`、`echo-agent.host.*` 这类宿主接缝都落这里——
   * 它们只参与模块挂载，不属于「模块之间」的依赖图，所以不画边，但也不能
   * 装作没有。
   */
  hostProvided: ModuleServiceRef[];
  /** 此刻确实缺失的硬依赖（Core 的 `pending_services`），正在阻塞挂载。 */
  missing: ModuleServiceRef[];
}

export function shortModuleId(id: string): string {
  return id.replace(/^echo-agent\./, '');
}

function shortKey(key: string): string {
  return key.replace(/^echo-agent\./, '');
}

function nodeIdOf(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

function compareModule(a: ModuleInfo, b: ModuleInfo): number {
  return shortModuleId(a.id).localeCompare(shortModuleId(b.id), 'en');
}

/**
 * 生成可随依赖调整自动重排的模型。
 *
 * 不维护 `loop → tools → shell` 之类的静态布局：新增、移除或修改任何
 * required/optional/provides 键后，节点层级、连线及孤立节点归属都会自动更新。
 */
export function buildModuleDependencyModel(modules: ModuleInfo[]): ModuleDependencyModel {
  const nodes: ProDocFlowNode[] = [];
  const edges: ProDocFlowEdge[] = [];
  const seenEdge = new Set<string>();
  const providersByKey = new Map<string, string[]>();

  for (const module of modules) {
    for (const key of module.provides_services ?? []) {
      const providers = providersByKey.get(key) ?? [];
      if (!providers.includes(module.id)) providers.push(module.id);
      providersByKey.set(key, providers);
    }
  }

  const connectedIds = new Set<string>();
  // 先登记所有节点：无依赖模块不能被过滤掉；稳定排序保证依赖变化之外的
  // 布局不发生无意义漂移。
  const sorted = [...modules].sort(compareModule);
  for (const module of sorted) {
    nodes.push({
      id: nodeIdOf(module.id),
      label: `${module.name || shortModuleId(module.id)} · ${shortModuleId(module.id)}`,
      shape: 'rect',
    });
  }

  const hostProvided: ModuleServiceRef[] = [];
  const missing: ModuleServiceRef[] = [];
  let optionalEdgeCount = 0;

  /** 连一条（或几条）边；没有模块提供者时登记事实而不是静默跳过。 */
  const link = (consumer: ModuleInfo, key: string, optional: boolean) => {
    const providers = providersByKey.get(key) ?? [];
    // 缺失的判据是 Core 的 `pending_services`（此刻未注册），不是"没人提供"
    // ——后者在宿主注册了同名键时同样成立，但那不是缺失。
    const pending = (consumer.pending_services ?? []).includes(key);
    if (!optional && pending) missing.push({ moduleId: consumer.id, key, optional: false });
    if (providers.length === 0) {
      if (optional || !pending) hostProvided.push({ moduleId: consumer.id, key, optional });
      return;
    }

    const toId = nodeIdOf(consumer.id);
    for (const providerId of providers) {
      const fromId = nodeIdOf(providerId);
      const label = optional ? `${shortKey(key)}?` : shortKey(key);
      const edgeKey = `${fromId}→${toId}→${label}`;
      if (seenEdge.has(edgeKey)) continue;
      seenEdge.add(edgeKey);
      edges.push({ from: fromId, to: toId, label });
      connectedIds.add(fromId).add(toId);
      if (optional) optionalEdgeCount += 1;
    }
  };

  for (const module of sorted) {
    for (const key of module.required_services ?? []) link(module, key, false);
    for (const key of module.optional_services ?? []) link(module, key, true);
  }

  const connectedModules = new Set(
    modules.filter((module) => connectedIds.has(nodeIdOf(module.id))).map((module) => module.id),
  );
  const isolated = modules.filter((module) => !connectedModules.has(module.id));

  const multiProviderKeys = [...providersByKey.entries()]
    .filter(([, providers]) => providers.length > 1)
    .map(([key, providers]) => ({ key, providers }))
    .sort((a, b) => a.key.localeCompare(b.key, 'en'));

  return {
    graph: { direction: 'LR', nodes, edges, errors: [] },
    isolated,
    edgeCount: edges.length,
    optionalEdgeCount,
    multiProviderKeys,
    hostProvided,
    missing,
  };
}

/** 兼容旧调用方；新视图应使用 buildModuleDependencyModel。 */
export function buildModuleDependencyGraph(modules: ModuleInfo[]): ProDocFlowGraph {
  return buildModuleDependencyModel(modules).graph;
}
