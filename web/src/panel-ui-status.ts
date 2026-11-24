//! 运行期 UI 扩展的加载状态（响应式，供设置页/诊断展示）。
//!
//! ## 为什么要有它能看见
//!
//! 运行期加载的固有代价是**失败变晚**：构建期错误在 `npm run build` 就报，
//! 运行期错误只出现在某个用户的浏览器控制台里。而新路径最典型的故障是
//! "面板看起来正常，只是某个模块的入口没了"——2026-11 那次的形状完全一样
//! （模块在 Core 里挂着、界面上什么都没有、构建与启动都不报错）。
//!
//! 所以加载结果必须有一处**人能看到**的地方。这里只是数据；渲染在设置页
//! （`SettingsView` 的「面板 UI 扩展」小节）。

import { ref } from 'vue';

/** 一份 UI 贡献（与 Core 的 `echo_defs::panel_ui::PanelUiContribution` 一致）。 */
export interface PanelUiContribution {
  /** 扩展 id（与 `registerPanelExtension` 里的一致）。 */
  id: string;
  /** 展示名。 */
  name: string;
  /** bundle 的站点相对路径（如 `panel-extensions/echo-agent.workspace/index.js`）。 */
  bundle: string;
  /** 该模块构建时用的 SDK 版本。 */
  sdk_version: string;
}

/**
 * 一次加载的整体阶段。
 *
 * | 值 | 含义 | 用户该做什么 |
 * |---|---|---|
 * | `idle` | 还没开始（连接未就绪） | 等 |
 * | `ready` | 全部加载成功 | 无 |
 * | `partial` | 部分成功（详见 `failed`） | 看该模块的构建产物 |
 * | `failed` | 全部失败 | 同上 |
 * | `version-mismatch` | SDK 版本不符，整批拒绝 | 重建面板与模块 |
 * | `unavailable` | 这个部署没有运行期扩展（Core 没装服务 / 嵌入式） | 无 |
 */
export type PanelUiPhase =
  | 'idle'
  | 'ready'
  | 'partial'
  | 'failed'
  | 'version-mismatch'
  | 'unavailable';

export interface PanelUiStatus {
  phase: PanelUiPhase;
  /** 面板自己的 SDK 版本（握手用的那个）。 */
  sdk: string;
  /** 已成功加载的扩展 id。 */
  loaded: string[];
  /** 失败条目与原因（每条一句可读原因，已带 URL）。 */
  failed: Array<{ id: string; reason: string }>;
  /** 整体原因（版本不符 / 服务不可用时为一句话）。 */
  reason: string;
}

/** 当前状态（单例）。 */
export const panelUiStatus = ref<PanelUiStatus>({
  phase: 'idle',
  sdk: '',
  loaded: [],
  failed: [],
  reason: '',
});

/** 写入状态（`extension-loader` 用；其它地方只读）。 */
export function setPanelUiStatus(next: PanelUiStatus): void {
  panelUiStatus.value = next;
}

/**
 * 一句话概括当前状态（设置页主文案；空串 = 不需要显示）。
 *
 * 文案要能直接指导动作：`ready` 什么都不说，其余每种都说"该做什么"。
 */
export function panelUiSummary(status: PanelUiStatus = panelUiStatus.value): string {
  switch (status.phase) {
    case 'ready':
      return '';
    case 'idle':
      return '正在等待连接…';
    case 'partial':
      return `${status.loaded.length} 个已加载，${status.failed.length} 个失败（见下）`;
    case 'failed':
      return `全部 ${status.failed.length} 个扩展加载失败（见下）`;
    case 'version-mismatch':
      return status.reason;
    case 'unavailable':
      return '本部署未提供运行期 UI 扩展（Core 无清单服务）';
  }
}
