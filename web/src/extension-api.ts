//! Panel 前端扩展 SDK。
//!
//! 这是模块包唯一允许依赖的壳入口。新增导出必须保持向后兼容；业务模块
//! 不得 import `../src/**`，以免把私有实现变成偶然 API。

export { state, dispatch } from './store';
export { initialState, reduce, type AppState } from './state';
export { sendCommand, sendPending } from './connection';
export { parseEvent, serializeCommand } from './protocol';
export { isPending, releasePending, trackRequest, usePending } from './pending';
export { confirmDialog } from './confirm';
export { scopedKey, sessionKey, teamKey } from './keys';
export { currentTeam, teamModuleEnabled, teamToolAvailable } from './capabilities';
export { entryOverlay, setEntryOverlay, toggleEntryOverlay } from './overlays';
export { federatedPeerLabel, remoteDirectoryLabel } from './federation-names';
export {
  definePanelExtension,
  registerPanelExtension,
  overlayId,
  type PanelAppContext,
  type PanelEntryAction,
  type PanelExtension,
  type PanelExtensionHooks,
  type PanelOverlay,
  type PanelRailCard,
  type PanelSlotContext,
} from './extensions/registry';
export type * from './protocol';
