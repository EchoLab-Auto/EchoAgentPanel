/**
 * 输入区轮廓（"贴合设备屏幕角"）—— **Panel 特有的组合**。
 *
 * ## 几何内核在 ui-frame
 *
 * 超椭圆本身是通用图形概念（卡片组件也有 `squircle` 能力），所以参数式、单角
 * 采样、屏幕角偏移曲线、路径序列化都在 `@echolab-auto/ui-frame/utils`：
 * `squirclePower` / `superellipseCorner` / `sampleCornerOffset` /
 * `pointsToPathData` / `pointsToClipPath`。
 *
 * 本文件只保留 Panel 特有的两件事：
 * 1. **把「屏幕角偏移曲线」（下角）与「同族超椭圆」（上角）拼成一个轮廓** ——
 *    `composerOutline`；
 * 2. 闭合折线的法线内缩（1px 内轮廓时代留下的工具，测试仍在用）——
 *    `insetPolyline`。
 *
 * ## 几何模型（为什么这么拼）
 *
 * 设设备屏幕角跨度 R、输入区到屏幕左/右/底边的留白 d（三者必须相等，
 * 否则任何形状都无法让角部间隙恒定）。
 *
 * - **下角**必须等于「屏幕角超椭圆沿法线内缩 d」—— 这是一条**偏移曲线**，
 *   不是同族超椭圆（拿半径 R−d 的超椭圆去近似，实测偏差 2.65px）。
 * - **上角**没有屏幕对应物（那里屏幕边是直的），取同族超椭圆、纵向吃剩余高度，
 *   使上下两段在左/右边缘处切线都竖直 → C1 连续，看不出接缝。
 *
 * 代价是"贴角区"纵向占 R−d，输入区静止态不高，于是左右两侧没有竖直直边，
 * 端头呈椭圆状。这是完全贴合的必然结果 —— 想要可见直边只能降低贴合度
 * （调大 `--composer-inset` 或调小 R）。
 */

import {
  pointsToClipPath,
  pointsToPathData,
  sampleCornerOffset,
  squirclePower,
  superellipseCorner,
  type SquirclePoint,
} from '@echolab-auto/ui-frame/utils';

export type Point = SquirclePoint;

// 本文件内的短别名（与既有注释/测试保持同一套叫法）
const powerOf = squirclePower;
const cornerPoints = superellipseCorner;
export const screenCornerOffset = sampleCornerOffset;
export const toPathData = pointsToPathData;
export const toClipPath = pointsToClipPath;

/**
 * 沿法线把**闭合**折线整体内缩 d（顺时针绕向 → 内向法线为 (-ty, tx)）。
 *
 * 尖角处用 miter 长度补偿（d / cos(半角)），否则直角会被"削圆"——
 * 实测未补偿时 100×60 矩形内缩 6px 会错成 (3.09, 5.14) 而非 (6, 6)。
 */
export function insetPolyline(pts: Point[], d: number): Point[] {
  const n = pts.length;
  const out: Point[] = [];
  const unit = (dx: number, dy: number): Point => {
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  for (let i = 0; i < n; i += 1) {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const cur = pts[i];
    const u = unit(cur[0] - prev[0], cur[1] - prev[1]);
    const v = unit(next[0] - cur[0], next[1] - cur[1]);
    const n1x = -u[1];
    const n1y = u[0];
    const n2x = -v[1];
    const n2y = v[0];
    let mx = n1x + n2x;
    let my = n1y + n2y;
    const mlen = Math.hypot(mx, my);
    if (mlen < 1e-6) {
      // 180° 折返（理论上不会出现在闭合凸轮廓上）：退回单边法线
      out.push([cur[0] + n1x * d, cur[1] + n1y * d] as const);
      continue;
    }
    mx /= mlen;
    my /= mlen;
    const cosHalf = Math.max(0.2, mx * n1x + my * n1y);
    const scale = d / cosHalf;
    out.push([cur[0] + mx * scale, cur[1] + my * scale] as const);
  }
  return out;
}

export interface ComposerOutlineOptions {
  width: number;
  height: number;
  /** 输入区到屏幕左/右/底边的留白（三者相等才成立） */
  inset: number;
  /** 设备屏幕圆角**跨度**；0 = 直角屏（桌面 / iPhone SE） */
  screenRadius: number;
  /** 超椭圆指数：2 = 圆弧，越大越"方"；iOS 屏角实测 2.42~2.54（见 styles.css） */
  exponent?: number;
  /** 每角采样段数 */
  steps?: number;
  /**
   * 上角纵向半径的上限（省略 = 不设上限，吃掉全部剩余高度）。
   *
   * 为什么要设上限：上角取「剩余高度」是为了让左右边缘都是竖直切线（C1 连续），
   * 但剩余高度随面板变高而增长 —— 多行输入时面板从 68px 长到 170px，上角会从
   * 10px 一路长到 58px（实测 iPhone 17 视口：1 行 9.75 → 2 行 34.75 → 3 行 58.25），
   * 等于每打一行，两端就从「尖椭圆端头」渐变到「四分之一圆」。这个形变不是
   * 用户操作的对象，读起来像抖动。
   *
   * 传「静止态（单行）的剩余高度」即可锁住：面板长高时上角不再变大，中间那段
   * 还原成竖直直边（本来就是更想要的样子）。
   */
  topRyMax?: number;
}

/**
 * 输入区外轮廓（面板坐标系，原点在面板左上角，y 向下）。
 *
 * 上下角不等大：下角被"贴屏幕角"锁死为 R−d，上角吃掉剩余高度。
 */
export function composerOutline(options: ComposerOutlineOptions): Point[] {
  const { width: w, height: h, inset, exponent = 2.5, steps = 28, topRyMax } = options;
  const s = powerOf(exponent);
  /**
   * 屏幕圆角**按面板高度收缩**（2026-10）。
   *
   * 贴角区纵向占 R−d；面板太矮时它放不下，此前直接退化成「四角同半径」的胶囊
   * —— 一次 2px 的高度抖动就能让形状整体换掉（实测 iPhone 17 视口下间隙波动
   * 从 0.3px 跳到 17px），是个悬崖。这里改成连续降级：面板矮到放不下时，把
   * **建模的**屏幕圆角缩到刚好放得下（`R_eff = h − 8 + d`）。
   *
   * 代价只有「模型屏幕角比真机略紧」：R 差 1px 时 45° 处间隙偏差 ≈0.17px，
   * 与"整个形状换掉"不是一个量级。d 与 R 由 CSS 联动（`R − 0.85 × 条高`）时
   * R_eff = R 恒成立，这条路径平时根本走不到 —— 它是防抖动的兜底。
   */
  const fitRadius = Math.max(inset, Math.min(options.screenRadius, h - 8 + inset));
  const screenRadius = fitRadius;
  const touch = screenRadius - inset;
  // 剩下只有"几何上无解"才退化：触屏角无意义 / 偏移曲线比面板还宽
  const fits = screenRadius > 0 && touch > 0 && w > touch * 2;

  if (!fits) {
    // 直角屏（桌面 / iPhone SE）也要有圆角：touch ≤ 0 时退回 20px 兜底
    const side = Math.max(0, Math.min(h / 2, w / 2, touch > 0 ? touch : 20));
    return clockwise(w, h, side, side, s, steps);
  }

  // 屏幕左下角在面板坐标系里的位置：面板左边 x=0 距屏幕左边 inset，
  // 面板底边 y=h 距屏幕底边 inset，故屏幕角点在 (−inset, h + inset)。
  const half = sampleCornerOffset(screenRadius, inset, exponent, steps);
  const toPanel = (p: Point): Point => [p[0] - inset, h + inset - p[1]] as const;

  // BL：屏幕偏移曲线 → 面板坐标（起点在左边缘、终点在底边，顺时针方向）
  const bl = half.map(toPanel);
  // BR：镜像到右侧（同样是从右边到底边）
  const br = half.map((p) => [w - (p[0] - inset), h + inset - p[1]] as const);
  // 上角：纵向吃掉剩余高度，横向与贴角区同宽（两边切线都竖直 → C1 连续）。
  // topRy 取偏移曲线的实测端点高度而非 R−inset，否则接缝处有 0.03px 错位；
  // 再以「贴角区高度」封顶 —— 多行输入把面板撑高时，上角不该跟着无限变大。
  const topRy = Math.max(
    0,
    Math.min(bl[0][1], h - bl[0][1], topRyMax ?? Number.POSITIVE_INFINITY),
  );
  const tr = cornerPoints(w, 0, touch, topRy, -1, 1, exponent, steps);
  const tl = cornerPoints(0, 0, touch, topRy, 1, 1, exponent, steps);

  // 顺时针：左上 → 右上 → 右下 → 左下 → 闭合。
  // cornerPoints 对 TR/BL 给出的是逆时针参数方向，需反转。
  return [...tl, ...tr.reverse(), ...br, ...bl.reverse()];
}

/** 四角同半径的顺时针圆角矩形（退化口径：贴角放不下时用） */
function clockwise(
  w: number,
  h: number,
  rx: number,
  ry: number,
  s: number,
  steps: number,
): Point[] {
  // s 已是参数式幂次要，这里还原成指数交给库函数（库按指数接收）
  const exponent = 2 / s;
  return [
    ...cornerPoints(0, 0, rx, ry, 1, 1, exponent, steps),
    ...cornerPoints(w, 0, rx, ry, -1, 1, exponent, steps).reverse(),
    ...cornerPoints(w, h, rx, ry, -1, -1, exponent, steps),
    ...cornerPoints(0, h, rx, ry, 1, -1, exponent, steps).reverse(),
  ];
}
