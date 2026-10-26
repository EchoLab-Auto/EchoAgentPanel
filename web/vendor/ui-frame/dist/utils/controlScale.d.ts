/**
 * 控件尺度引擎 —— 让 `size` 收数字（px），而不是只能在三档之间跳。
 *
 * ## 为什么需要「插值」而不是「一个数乘倍率」
 *
 * 三档锚点不是等比的：按钮高度 32 / 44 / 56（比例 1 : 1.375 : 1.75），
 * 而字号 13 / 14 / 16（1 : 1.077 : 1.231）。用「相对 medium 的倍率」统一缩放，
 * 会让 `size="small"` 与 `:size="32"` 渲染不一致 —— 同一个几何量有两套结果，
 * 那比档位本身更糟。
 *
 * 所以这里按**三个锚点做分段线性插值**：
 * - 落在锚点上 → 与该档逐像素一致（`small` ≡ `sm` 锚点）
 * - 落在两锚之间 → 在相邻锚点之间线性过渡
 * - 超出两端 → 取端点值（不外推：`size="400"` 不该得到 40px 字号）
 *
 * ## 数据结构
 *
 * 每个组件声明一份 `ControlScaleSpec`：
 * - `primary`：数字 `size` 的语义（主几何量，如按钮取 min-height、头像取直径）
 * - `metrics`：派生指标 → 三锚点 px + 目标 CSS 变量名
 *
 * 组件把 `resolveControlScale()` 的结果当内联样式挂到根节点，样式侧用
 * `var(--nm-xxx)` 消费。这样：
 * - 数字路径与档位路径**互不干扰**（档位 class 一行未改）
 * - 值仍是 CSS 变量，消费方依然能在样式表里覆盖
 *
 * 漂移防护：`src/utils/controlScale.test.ts` 会解析 `styles/tokens.scss`，
 * 逐个核对这里的锚点与 token 的实际取值，改 token 忘了改锚点会直接红。
 */
export type ScaleStep = 'sm' | 'md' | 'lg';
/** 三锚点 px 值 */
export interface ScaleAnchor {
    sm: number;
    md: number;
    lg: number;
}
export interface ControlScaleSpec {
    /**
     * 主几何量（数字 `size` 的语义）的三锚点。
     *
     * 只用于插值定位：给定数字后先在这条轴上找位置，再把所有 `metrics` 按同一
     * 位置插值。例如 Button 的主几何量是 min-height（32/44/56）。
     */
    primary: ScaleAnchor;
    /**
     * 主几何量对应的 CSS 变量名。
     *
     * 它**原样下发**调用方给的值，不参与夹取：`size` 的语义就是这个几何量，
     * 传 28 就该是 28px。派生量（字号、内距…）才按锚点区间夹取——否则
     * `:size="28"` 会得到「高度 32px + 字号 13px」这种自相矛盾的结果。
     */
    primaryVar: string;
    /** 派生指标：CSS 变量名 → 三锚点 px（不含主几何量，见 `primaryVar`） */
    metrics: Record<string, ScaleAnchor>;
}
/**
 * 在「三锚点」上做分段线性插值。
 *
 * @param anchor 三档 px
 * @param pos 位置 —— 0 = sm、1 = md、2 = lg（可由主几何量换算得到）
 */
export declare function interpolateAnchor(anchor: ScaleAnchor, pos: number): number;
/**
 * 把主几何量（px）换成三锚点轴上的位置。
 *
 * 用主几何量所在的区间定位；超出两端夹到 0 / 2（不外推，见文件头注释）。
 */
export declare function positionOf(primary: ScaleAnchor, value: number): number;
/**
 * 求解一份尺度：返回可直接挂到 `:style` 的 CSS 变量对象。
 *
 * @example
 * resolveControlScale(BUTTON_SCALE, 40)
 * // → { '--nm-button-height': '40px', '--nm-button-font-size': '13.7px', … }
 */
export declare function resolveControlScale(spec: ControlScaleSpec, value: number): Record<string, string>;
/**
 * 归一数字 `size`：非有限数 / 非正数一律回落到默认值。
 *
 * 0 尺寸会让控件消失、负值让 padding 变负，这类「配置算错」不该变成玄学布局。
 */
export declare function normalizeNumericSize(value: unknown, fallback: number): number;
