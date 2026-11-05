import { computed, shallowRef, type Component, type Ref } from 'vue';
import type { IconName } from '@echolab-auto/ui-frame/icons';
import type { SessionInfo } from '../protocol';


export interface PanelSlotContext {
  teamId: string | null;
  sessionId: string;
  core: string | null;
}

export interface PanelAppContext {
  teamId: Ref<string | null>;
  sessionId: Ref<string>;
  core: Ref<string | null>;
  selectSession(id: string, reason?: string): void;
  setSession(id: string, reason: string): void;
  syncTeamCore(id: string | null, core: string | null): void;
}

export interface PanelEntryAction {
  /** 扩展内稳定 id；完整 overlay id 由注册表加命名空间。 */
  id: string;
  label: string;
  /** PanelIcon 的图标名。 */
  icon: IconName;
  title?: string;
  when(context: PanelSlotContext): boolean;
  /** hover/focus/touch/打开时调用，用于按需预热业务数据。 */
  prefetch?(context: PanelSlotContext): void;
}

export interface PanelOverlay {
  id: string;
  label: string;
  component: Component;
}

export interface PanelRailCard {
  id: string;
  title: string;
  count?: number;
  countTitle?: string;
  compact?: boolean;
  component: Component;
  componentProps?: Record<string, unknown>;
}

export interface PanelExtensionHooks {
  /** 在 App 建立活动 team/session ref 后执行，可安装 watcher。 */
  setup?(context: PanelAppContext): void;
  /** 用户主动切换 team 后的中立会话落点；null 表示本扩展不接管。 */
  teamLanding?(teamId: string | null): string | null;
  /** 用户点选会话前的业务副作用（不能阻止通用选择）。 */
  beforeSessionPick?(sessionId: string, context: PanelAppContext): void;
  /** 返回 false 可阻止一个业务事件进入通用 reducer。 */
  acceptEvent?(event: unknown): boolean;
  /** 为业务通道补充会话标签；返回 null 使用 Panel 的通用分组。 */
  sessionPresentation?(session: SessionInfo): { tag: string; tagTone?: 'accent' } | null;
  /** 是否支持按会话覆盖 API（仅业务通道开放此能力）。 */
  canConfigureSessionApi?(session: SessionInfo): boolean;
}

export interface PanelExtension {
  id: string;
  hooks?: PanelExtensionHooks;
  entries?: PanelEntryAction[];
  overlays?: PanelOverlay[];
  /** 扩展提供的稳定卡片槽位，用于即使用户暂无数据也保留布局。 */
  railCardSlots?: string[];
  /** 动态卡片：可用于按 team/session 计算门控、标题和计数。 */
  railCards?(teamId: string | null): PanelRailCard[];
}

const extensions = shallowRef<PanelExtension[]>([]);
const appContext = shallowRef<PanelAppContext | null>(null);

export function definePanelExtension(extension: PanelExtension): PanelExtension {
  return extension;
}

export function registerPanelExtension(extension: PanelExtension): void {
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(extension.id)) {
    throw new Error(`invalid Panel extension id: ${extension.id}`);
  }
  if (extensions.value.some((item) => item.id === extension.id)) {
    throw new Error(`duplicate Panel extension id: ${extension.id}`);
  }
  extensions.value = [...extensions.value, extension];
  // 模块在 App setup 前后加载都安全；已初始化的场景（测试/HMR）立即安装。
  if (appContext.value) installHooks(extension, appContext.value);
}

function installHooks(extension: PanelExtension, context: PanelAppContext): void {
  try {
    extension.hooks?.setup?.(context);
  } catch (error) {
    console.error(`[panel-extension:${extension.id}] setup failed`, error);
  }
}

/** 由应用壳调用一次。扩展之间使用独立命名空间，互不知道对方实现。 */
export function setupPanelExtensions(context: PanelAppContext): void {
  appContext.value = context;
  for (const extension of extensions.value) installHooks(extension, context);
}

/** 扩展注册表变化时通知布局/入口行重算。 */
export const panelExtensionsRevision = computed(() => extensions.value);

export function panelEntryActions(context: PanelSlotContext): Array<{
  extensionId: string;
  action: PanelEntryAction;
  overlayId: string;
}> {
  // 读取 shallowRef 使 computed 在注册扩展后更新。
  void extensions.value;
  const result: Array<{ extensionId: string; action: PanelEntryAction; overlayId: string }> = [];
  for (const extension of extensions.value) {
    for (const action of extension.entries ?? []) {
      if (!action.when(context)) continue;
      result.push({ extensionId: extension.id, action, overlayId: overlayId(extension.id, action.id) });
    }
  }
  return result;
}

export function panelOverlays(): Array<{
  extensionId: string;
  overlay: PanelOverlay;
  overlayId: string;
}> {
  void extensions.value;
  return extensions.value.flatMap((extension) =>
    (extension.overlays ?? []).map((overlay) => ({
      extensionId: extension.id,
      overlay,
      overlayId: overlayId(extension.id, overlay.id),
    })),
  );
}

export function panelRailCards(teamId: string | null): PanelRailCard[] {
  void extensions.value;
  return extensions.value.flatMap((extension) =>
    (extension.railCards?.(teamId) ?? []).map((card) => ({
      ...card,
      id: railCardId(extension.id, card.id),
    })),
  );
}

export function panelRailCardIds(): string[] {
  void extensions.value;
  return extensions.value.flatMap((extension) =>
    (extension.railCardSlots ?? []).map((id) => railCardId(extension.id, id)),
  );
}

export function teamLanding(teamId: string | null): string | null {
  for (const extension of extensions.value) {
    const landing = extension.hooks?.teamLanding?.(teamId);
    if (landing) return landing;
  }
  return null;
}

export function beforeSessionPick(sessionId: string): void {
  const context = appContext.value;
  if (!context) return;
  for (const extension of extensions.value) {
    try {
      extension.hooks?.beforeSessionPick?.(sessionId, context);
    } catch (error) {
      console.error(`[panel-extension:${extension.id}] beforeSessionPick failed`, error);
    }
  }
}

export function panelSessionPresentation(session: SessionInfo): { tag: string; tagTone?: 'accent' } | null {
  for (const extension of extensions.value) {
    const presentation = extension.hooks?.sessionPresentation?.(session);
    if (presentation) return presentation;
  }
  return null;
}

export function panelCanConfigureSessionApi(session: SessionInfo): boolean {
  return extensions.value.some((extension) => extension.hooks?.canConfigureSessionApi?.(session));
}

export function acceptPanelEvent(event: unknown): boolean {
  for (const extension of extensions.value) {
    try {
      if (extension.hooks?.acceptEvent?.(event) === false) return false;
    } catch (error) {
      console.error(`[panel-extension:${extension.id}] acceptEvent failed`, error);
    }
  }
  return true;
}

export function overlayId(extensionId: string, id: string): string {
  return `extension:${extensionId}:${id}`;
}

export function railCardId(extensionId: string, id: string): string {
  return `extension:${extensionId}:${id}`;
}

/** 仅供单元测试：清掉模块级注册表与 App 生命周期 watcher。 */
export function __resetPanelExtensionsForTest(): void {
  appContext.value = null;
  extensions.value = [];
}

