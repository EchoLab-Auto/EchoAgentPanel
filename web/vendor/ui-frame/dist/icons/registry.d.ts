/**
 * 图标注册表（24 基准 viewBox，线框单色）。
 *
 * **单一事实源**：所有内置组件的控件图标 + 消费方可复用的语义图标都在这里
 * 定义，组件不得再各自内联 `<path>`（见 `document/develop/design-philosophy.md`
 * §8「图标体系」，以及防回归脚本 `scripts/check-icons.mjs`）。
 *
 * 约定：
 * - `viewBox` 恒为 `0 0 24 24`；描边由渲染组件统一注入（`currentColor`）
 * - `paths` 只描述几何，不含 fill/stroke —— 需要实心填充的几何用 `filled: true`
 *   显式声明（`filled` 图标不再参与 stroke，颜色仍取 `currentColor`）
 * - 每个语义只表达一个概念；不得把文字/emoji 塞进图标
 */
/** 单条图标定义。 */
export interface IconDefinition {
    /** `d` 属性序列（按顺序渲染为 `<path>`）。 */
    paths: string[];
    /** 实心图标：`fill: currentColor` + `stroke: none`（默认线框）。 */
    filled?: boolean;
}
/**
 * 语义名 → 几何。命名沿用 `kebab-case`，与 Tabler / Lucide 的语义对齐，
 * 便于后续接入外部图标集时逐条替换。
 */
export declare const ICON_REGISTRY: {
    'chevron-down': {
        paths: string[];
    };
    'chevron-up': {
        paths: string[];
    };
    'chevron-left': {
        paths: string[];
    };
    'chevron-right': {
        paths: string[];
    };
    'arrow-left': {
        paths: string[];
    };
    'arrow-right': {
        paths: string[];
    };
    'arrow-up': {
        paths: string[];
    };
    'arrow-down': {
        paths: string[];
    };
    home: {
        paths: string[];
    };
    external: {
        paths: string[];
    };
    check: {
        paths: string[];
    };
    close: {
        paths: string[];
    };
    warning: {
        paths: string[];
    };
    info: {
        paths: string[];
    };
    dot: {
        paths: string[];
        filled: true;
    };
    lock: {
        paths: string[];
    };
    unlock: {
        paths: string[];
    };
    'check-square': {
        paths: string[];
    };
    square: {
        paths: string[];
    };
    minus: {
        paths: string[];
    };
    folder: {
        paths: string[];
    };
    'folder-open': {
        paths: string[];
    };
    file: {
        paths: string[];
    };
    link: {
        paths: string[];
    };
    cloud: {
        paths: string[];
    };
    gear: {
        paths: string[];
    };
    refresh: {
        paths: string[];
    };
    plus: {
        paths: string[];
    };
    search: {
        paths: string[];
    };
    trash: {
        paths: string[];
    };
    copy: {
        paths: string[];
    };
    pin: {
        paths: string[];
    };
    grip: {
        paths: string[];
        filled: true;
    };
    more: {
        paths: string[];
        filled: true;
    };
    drag: {
        paths: string[];
    };
    table: {
        paths: string[];
    };
    list: {
        paths: string[];
    };
    chart: {
        paths: string[];
    };
    calendar: {
        paths: string[];
    };
    clock: {
        paths: string[];
    };
    user: {
        paths: string[];
    };
    users: {
        paths: string[];
    };
    upload: {
        paths: string[];
    };
    download: {
        paths: string[];
    };
    image: {
        paths: string[];
    };
    eye: {
        paths: string[];
    };
    language: {
        paths: string[];
    };
    sun: {
        paths: string[];
    };
    moon: {
        paths: string[];
    };
    monitor: {
        paths: string[];
    };
    spinner: {
        paths: string[];
    };
    star: {
        paths: string[];
    };
    'chevrons-left': {
        paths: string[];
    };
    'chevrons-right': {
        paths: string[];
    };
    'circle-close': {
        paths: string[];
    };
    'circle-info': {
        paths: string[];
    };
    'zoom-in': {
        paths: string[];
    };
    'zoom-out': {
        paths: string[];
    };
    'arrows-out': {
        paths: string[];
    };
    inbox: {
        paths: string[];
    };
    maximize: {
        paths: string[];
    };
    minimize: {
        paths: string[];
    };
    guide: {
        paths: string[];
    };
    changelog: {
        paths: string[];
    };
    faq: {
        paths: string[];
    };
    example: {
        paths: string[];
    };
    install: {
        paths: string[];
    };
    config: {
        paths: string[];
    };
    plug: {
        paths: string[];
    };
    pencil: {
        paths: string[];
    };
    save: {
        paths: string[];
    };
    book: {
        paths: string[];
    };
    'file-text': {
        paths: string[];
    };
    map: {
        paths: string[];
    };
    clipboard: {
        paths: string[];
    };
    split: {
        paths: string[];
    };
    message: {
        paths: string[];
    };
    network: {
        paths: string[];
    };
    sparkle: {
        paths: string[];
    };
};
/** 语义名联合类型（由注册表推导，新增条目自动进入类型）。 */
export type IconName = keyof typeof ICON_REGISTRY;
/** 全部语义名（运行时集合，供校验与文档生成）。 */
export declare const ICON_NAMES: IconName[];
/** 尺寸档位 → px（对齐 `--nm-icon-size-*`，Design Philosophy §8）。 */
export declare const ICON_SIZE_PX: {
    readonly xs: 12;
    readonly sm: 14;
    readonly md: 16;
    readonly lg: 18;
    readonly xl: 20;
    readonly '2xl': 24;
    readonly '3xl': 32;
};
export type IconSize = keyof typeof ICON_SIZE_PX;
/** 合法显示尺寸（§8 枚举档；数字入参须落在此集合）。 */
export declare const ICON_SIZE_ALLOWED: Set<12 | 14 | 16 | 18 | 20 | 24 | 32>;
/**
 * 线宽档位（§8 六档语义）：
 * - `2` 标准（绝大多数 14–23px 显示）
 * - `2.5` 微图标补偿（≤12px）/ 转圈
 * - `3` 勾选标记（语义强调）
 * - `1.5` 大图标轻描（≥24px）
 * - `1` / `0.5` 图表细线（数据可视化豁免）
 */
export declare const ICON_STROKE_ALLOWED: Set<number>;
/** 按显示尺寸取缺省线宽（§8）：≤12 → 2.5；≥24 → 1.5；其余 2。 */
export declare function defaultStrokeWidth(px: number): number;
