/**
 * 图标模块入口（子路径 `@echolab-auto/ui-frame/icons`）。
 *
 * 只导出注册表与常量，**不含** Vue 组件——消费方若要渲染成 SVG，用
 * `NeumorphismIcon`（从主入口或 `components/NeumorphismIcon` 取），
 * 或按 `path d` 自行渲染。
 */
export { ICON_REGISTRY, ICON_NAMES, ICON_SIZE_PX, ICON_SIZE_ALLOWED, ICON_STROKE_ALLOWED, defaultStrokeWidth, } from './registry';
export type { IconDefinition, IconName, IconSize } from './registry';
