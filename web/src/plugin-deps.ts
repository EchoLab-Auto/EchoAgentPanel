//! 插件依赖树：把 `PluginInfo` 的 `required_services` / `provides_services`
//! 转成 `ProDocFlowGraph`（ui-frame 原生画布可直接渲染的图模型）。
//!
//! 图的方向是**「被依赖 → 依赖方」**（从左到右 = 从提供者到消费者），
//! 与 mermaid 的 `A --> B`（A 被 B 依赖）一致，所以读法是：
//! 左边的插件先挂载，右边的插件依赖它提供的服务。
//!
//! 服务键不是节点——它是**边上的标签**。节点只有插件（加上一个虚拟的
//! 「宿主服务表」根节点，承载"不是任何插件提供"的宿主接缝）。
//! 这样树里每层都是插件，不会出现"插件 → 服务 → 插件"的双层锯齿。

import type { PluginInfo } from './protocol';
import type { ProDocFlowGraph, ProDocFlowNode, ProDocFlowEdge } from '@echolab-auto/ui-frame/doc';

/** 宿主服务表（虚拟根节点 id）：承载"不是任何插件提供"的宿主接缝。 */
export const HOST_NODE_ID = '__host__';

/** 宿主接缝的显示名（依赖树上根节点的标签）。 */
const HOST_LABEL = '宿主服务表';

/** 服务键的短名（`echo-agent.host.shell` → `host.shell`），让边标签可读。 */
function shortKey(key: string): string {
  return key.replace(/^echo-agent\./, '');
}

/** 节点 id 必须匹配 `[A-Za-z_][\w-]*`（prodoc-flow 的词法）。 */
function nodeIdOf(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

/**
 * 构建插件依赖图。
 *
 * 布局策略：
 * - 根节点是「宿主服务表」，所有"不被任何插件提供"的宿主接缝从它出发；
 * - 提供服务的插件（`provides_services` 非空）成为中间节点；
 * - 每个插件的 `required_services` 决定它的入边来自谁：
 *   - 若某个其他插件 `provides_services` 含该键 → 从那个插件连过来；
 *   - 否则 → 从「宿主服务表」连过来（宿主在装配期注册的接缝）。
 *
 * 方向统一为 LR（左 = 先挂载/被依赖，右 = 后挂载/依赖方）。
 */
export function buildPluginDependencyGraph(plugins: PluginInfo[]): ProDocFlowGraph {
  const nodes: ProDocFlowNode[] = [];
  const edges: ProDocFlowEdge[] = [];
  const seenEdge = new Set<string>();

  // 键 → 提供者插件 id（后声明覆盖先声明，与 Ctx::provide 的 fail-closed 一致：
  // 实际运行中同键不会被允许重复提供，所以这里不存在歧义）。
  const providerByKey = new Map<string, string>();
  for (const p of plugins) {
    for (const key of p.provides_services ?? []) {
      providerByKey.set(key, p.id);
    }
  }

  const hasHostDeps = plugins.some((p) =>
    (p.required_services ?? []).some((key) => !providerByKey.has(key)),
  );

  if (hasHostDeps) {
    nodes.push({ id: nodeIdOf(HOST_NODE_ID), label: HOST_LABEL, shape: 'stadium' });
  }

  for (const p of plugins) {
    const nodeId = nodeIdOf(p.id);
    // 禁用/装配失败的插件用菱形标出（与"启用"矩形区分），但不影响拓扑。
    const shape = p.enabled ? 'rect' : 'diamond';
    nodes.push({ id: nodeId, label: p.name || p.id, shape });

    for (const key of p.required_services ?? []) {
      const providerId = providerByKey.get(key);
      const fromId = providerId ? nodeIdOf(providerId) : nodeIdOf(HOST_NODE_ID);
      const toId = nodeId;
      const label = shortKey(key);
      const edgeKey = `${fromId}→${toId}→${label}`;
      if (seenEdge.has(edgeKey)) continue;
      seenEdge.add(edgeKey);
      edges.push({ from: fromId, to: toId, label });
    }
  }

  // 没有任何依赖边的插件也要出现在图里（孤立节点），否则"装了哪些插件"
  // 在树上会漏掉那些纯策略/纯身份插件（它们只声明存在性，不消费服务）。
  return { direction: 'LR', nodes, edges, errors: [] };
}
