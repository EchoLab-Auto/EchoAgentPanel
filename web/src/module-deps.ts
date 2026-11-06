//! 模块依赖图：仅由 fabric-arch 的服务键关系生成，不写死模块拓扑。
//!
//! 视图组织：
//! - 全部模块都作为节点；无依赖模块按类别排成独立节点列；
//! - 有依赖关系的模块仍由 ui-frame 按服务键自动分层。
//! - 节点标签是「名称 · 短 ID」，不依赖具体模块名称也能辨认；
//! - 边只承担服务键标签，方向始终是提供者 → 消费者。

import type { ModuleInfo } from './protocol';
import type { ProDocFlowGraph, ProDocFlowNode, ProDocFlowEdge } from '@echolab-auto/ui-frame/doc';

export interface ModuleDependencyModel {
  graph: ProDocFlowGraph;
  /** 没有依赖边的模块，用于辅助展示；它们也包含在主图中。 */
  isolated: ModuleInfo[];
  /** 依赖关系的数量，供空状态与说明使用。 */
  edgeCount: number;
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
 * required/provides 键后，节点层级、连线及孤立节点归属都会自动更新。
 */
export function buildModuleDependencyModel(modules: ModuleInfo[]): ModuleDependencyModel {
  const nodes: ProDocFlowNode[] = [];
  const edges: ProDocFlowEdge[] = [];
  const seenEdge = new Set<string>();
  const providerByKey = new Map<string, string>();

  for (const module of modules) {
    for (const key of module.provides_services ?? []) {
      providerByKey.set(key, module.id);
    }
  }

  const connectedIds = new Set<string>();
  // 先登记所有节点：无依赖模块不能被过���掉；稳定排序保证依赖变化之外的
  // 布局不发生无意义漂移。
  for (const module of [...modules].sort(compareModule)) {
    nodes.push({
      id: nodeIdOf(module.id),
      label: `${module.name || shortModuleId(module.id)} · ${shortModuleId(module.id)}`,
      shape: 'rect',
    });
  }
  for (const module of [...modules].sort(compareModule)) {
    const toId = nodeIdOf(module.id);

    for (const key of module.required_services ?? []) {
      // 宿主能力只参与模块挂载，不属于「模块之间」的依赖图。
      const providerId = providerByKey.get(key);
      if (!providerId) continue;
      const fromId = nodeIdOf(providerId);
      const label = shortKey(key);
      const edgeKey = `${fromId}→${toId}→${label}`;
      if (seenEdge.has(edgeKey)) continue;
      seenEdge.add(edgeKey);
      edges.push({ from: fromId, to: toId, label });
      connectedIds.add(fromId).add(toId);
    }

    // 孤立节点已经在上方登记；有依赖的节点也保留同一标签。
  }

  const connectedModules = new Set(
    modules.filter((module) => connectedIds.has(nodeIdOf(module.id))).map((module) => module.id),
  );
  const isolated = modules.filter((module) => !connectedModules.has(module.id));

  return {
    graph: { direction: 'LR', nodes, edges, errors: [] },
    isolated,
    edgeCount: edges.length,
  };
}

/** 兼容旧调用方；新视图应使用 buildModuleDependencyModel。 */
export function buildModuleDependencyGraph(modules: ModuleInfo[]): ProDocFlowGraph {
  return buildModuleDependencyModel(modules).graph;
}
