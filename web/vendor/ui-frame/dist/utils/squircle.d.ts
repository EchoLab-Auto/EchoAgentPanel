/**
 * 超椭圆（squircle）轮廓 —— `NeumorphismCard` 的 `squircle` 能力与「贴合设备屏幕角」
 * 场景共用的几何内核。
 *
 * ## 为什么需要它
 *
 * CSS `border-radius` 只能画**圆弧**。而 iPhone 之类的设备屏幕角是超椭圆
 * （`x^n + y^n = R^n`，连续曲率）：拿圆弧去贴它，无论半径取多少都会在 45° 附近
 * 错位（实测最优半径仍有 2.3px 的间隙波动，肉眼读作「不平行」）。
 * `corner-shape: superellipse()` 能直接画，但 Safari 至今不支持。
 *
 * 所以统一走 `clip-path: path()`：本模块算出折线，交给 CSS 裁剪。
 *
 * ## 两个层次
 *
 * 1. **等半径超椭圆**（`squirclePoints` / `squircleClipPath`）—— 四个角同族、
 *    同半径。这是卡片 `squircle` prop 用的形态，也是绝大多数设计诉求。
 * 2. **偏移曲线**（`sampleCornerOffset`）—— 屏幕角超椭圆沿法线内缩 `inset`
 *    后的曲线。用于「元件下角与设备屏角等间隙平行」：这是一种物理对齐，
 *    **不能**用同族超椭圆近似（半径取 R−inset 实测偏差 2.65px）。
 *
 * 每角采样点数 `steps` 影响折线精度：28 段时折线与理论曲线的最大偏差 < 0.05px。
 */
/** 折线上的一个点（屏幕坐标系，y 向下） */
export type SquirclePoint = readonly [number, number];
/**
 * 超椭圆参数式 `x = r·cos(t)^(2/n)` 里的指数。
 *
 * `x^n + y^n = r^n` 的参数化是 `(r·cos^(2/n) t, r·sin^(2/n) t)`。指数下限钳到 2
 * （n < 2 是"凹"的星形，不是圆角语义），避免误传导致形状崩坏。
 */
export declare function squirclePower(exponent?: number): number;
/**
 * 单角超椭圆的采样点（供内部与「逐角组装」使用）。
 *
 * 以角顶点 `(cx, cy)` 为基准，弧的圆心落在 `(cx + sx·rx, cy + sy·ry)`；
 * `t` 从 0 到 π/2 依次给出「从一条边切出」到「从另一条边切入」：
 * - TL (sx=+1, sy=+1)：(0, ry) → (rx, 0)
 * - TR (sx=−1, sy=+1)：(w, ry) → (w−rx, 0)
 * - BR (sx=−1, sy=−1)：(w, h−ry) → (w−rx, h)
 * - BL (sx=+1, sy=−1)：(0, h−ry) → (rx, h)
 *
 * 注意 TR / BL 的方向与顺时针绕行相反，组装闭合轮廓时需 `.reverse()`。
 */
export declare function superellipseCorner(cx: number, cy: number, rx: number, ry: number, sx: 1 | -1, sy: 1 | -1, exponent?: number, steps?: number): SquirclePoint[];
/** 等半径超椭圆的选项 */
export interface SquircleOptions {
    /** 盒宽（px） */
    width: number;
    /** 盒高（px） */
    height: number;
    /**
     * 角半径（px）。与 `border-radius` 同义：取「跨度」而不是等效圆弧半径 ——
     * 这是超椭圆自己的量纲，和 `border-radius` 的圆弧半径不是一回事（同一根角，
     * 等效圆弧约为跨度的 0.827 倍）。
     */
    radius: number;
    /** 超椭圆指数；默认 2.5（iOS 屏角实测 2.42~2.54） */
    exponent?: number;
    /** 每角采样段数；默认 28 */
    steps?: number;
}
/**
 * 闭合的超椭圆轮廓（顺时针，原点在盒左上角）。
 *
 * 半径会被钳制到 `min(radius, width/2, height/2)` —— 否则相邻两角的弧会重叠、
 * 折线自交（与 `border-radius` 的规范收敛行为一致）。
 */
export declare function squirclePoints(options: SquircleOptions): SquirclePoint[];
/** 点集 → SVG path data（`M…L…Z`，闭合） */
export declare function pointsToPathData(points: readonly SquirclePoint[], precision?: number): string;
/** 点集 → CSS `path()` 函数值（可直接赋给 `clip-path`） */
export declare function pointsToClipPath(points: readonly SquirclePoint[], precision?: number): string;
/** 等半径超椭圆的 `clip-path` 值（卡片 `squircle` prop 的最��产物） */
export declare function squircleClipPath(options: SquircleOptions): string;
/**
 * 设备屏幕角超椭圆（半径 `screenRadius`、指数 `exponent`）沿法线内缩 `inset`
 * 后的曲线 —— 「元件角与屏幕角等间隙平行」的正确形状。
 *
 * 返回**屏幕坐标系**下的点（角在原点、y 向上），`t` 从 0 到 π/2：
 * 起点落在屏幕左边 `(inset, ≈R)`，终点落在屏幕底边 `(≈R, inset)`。
 *
 * 为什么不换成「半径 R−inset 的同族超椭圆」：那是**内切**而不是**偏移**，
 * 实测角部偏差 2.65px（在 45° 附近最明显）。本函数对屏幕弧采样后逐点沿法线
 * 内移，误差 < 0.1px。
 */
export declare function sampleCornerOffset(screenRadius: number, inset: number, exponent?: number, steps?: number): SquirclePoint[];
