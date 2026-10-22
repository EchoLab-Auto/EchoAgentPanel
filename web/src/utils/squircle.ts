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
 * 1. **把「屏幕角偏移曲线」（下角）与它的水平镜像（上角）拼成一个四角等大的
 *    轮廓** —— `composerOutline` + `composerGeometry`；
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
 * - **上角**取**下角关于水平中轴的镜像**（2026-10 起）：四个角必须等大 ——
 *   此前上角"纵向吃剩余高度"，在 iPhone 上纵向只有 10~25px，而下角是 41~56px，
 *   肉眼一眼看出上下不等（实测镜像误差 10.7~46px，卡片越高差得越多）。
 *
 * 上下等大的代价：两角加起来不能超过卡片高度，所以跨度取
 * `min(R − d, 静止态半高)` —— 建模的屏幕角因此比真机略紧（iPhone 上 65.5 → 60.4），
 * 下角间隙从「恒为 d」变成「d ± 1.7px」（R=74.5 的机型 ±3.0px）。要严格等间隙
 * 就得放弃等大，二者在静止态 93px 的卡片上无法兼得：唯一两全解是把 d 提到
 * R − 半高 ≈ 33~42px，输入区会被推得又窄又高。
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
   * 上下角纵向尺寸（= 贴角跨度）的上限，单位 px。省略 = 只按当前高度的一半封顶。
   *
   * 为什么要封顶：贴角跨度必须是 `R − d`（下角贴着屏幕角走）才能等间隙，但
   * 「上下角等大」要求两角加起来不超过卡片高度 —— 而 R−d 在 iPhone 上就有
   * 41~56px，卡片静止高度才 93px，一半是 46.5px。于是跨度取
   * `min(R − d, 上限)`，**上角与下角共用这一个值**（上角是下角关于水平中轴的
   * 镜像，形状完全相同）。
   *
   * 为什么由调用方传"静止态半高"而不是用当前 `height / 2`：多行输入会把卡片
   * 从 93 撑到 170，用 `height / 2` 会让两角每打一行就变大一次（用户读作抖动）。
   * 传静止半高即可锁住：长出来的高度成为竖直直边。
   */
  cornerMax?: number;
}

/** 轮廓的几何口径（`composerOutline` 与 `composerCornerSpan` 共用） */
export interface ComposerGeometry {
  /** 上下四角共用的纵向尺寸（贴角跨度）；退化口径下等于同半径的半径 */
  span: number;
  /** 建模用的屏幕圆角跨度：贴角模式下 = span + inset */
  screenRadius: number;
  /** true = 贴角模式（下角 = 屏幕角偏移曲线）；false = 四角同半径兜底 */
  hugging: boolean;
}

/**
 * 解出轮廓的几何口径。
 *
 * 跨度取三者最小：真实屏角 `R`、调用方给的静止半高上限、以及当前高度的
 * 一半（两角不能重叠 —— 这一条是兜底，静止态下 `cornerMax` 已经先命中）。
 * 收缩模型的代价只有「模型屏幕角比真机略紧」：R 差 1px 时 45° 处间隙偏差
 * ≈0.17px，肉眼读不出；换来的是上下角等大。
 */
export function composerGeometry(options: ComposerOutlineOptions): ComposerGeometry {
  const { width: w, height: h, inset, screenRadius: R, cornerMax } = options;
  const limit = Math.min(
    R,
    (cornerMax ?? Number.POSITIVE_INFINITY) + inset,
    h / 2 + inset,
  );
  const span = Math.max(0, Math.min(R, limit) - inset);
  // 只有"几何上无解"才退化：直角屏（span ≤ 0）/ 偏移曲线比面板还宽
  if (span > 0 && w > span * 2) {
    return { span, screenRadius: span + inset, hugging: true };
  }
  // 退化：四角同半径（直角屏给 20px 兜底，别画成纯矩形）
  return {
    span: Math.max(0, Math.min(h / 2, w / 2, span > 0 ? span : 20)),
    screenRadius: 0,
    hugging: false,
  };
}

/**
 * 上下角实际使用的纵向尺寸（面积 = 贴角跨度）。
 *
 * 面板侧拿它当 `--composer-corner-r`：内层控件按 `span − padding − border`
 * 算同心圆角，与真实生效的外轮廓一致（不能再用 `R − inset` —— 封顶之后
 * 那个值比实际大）。
 */
export function composerCornerSpan(options: ComposerOutlineOptions): number {
  return composerGeometry(options).span;
}

/**
 * 输入区外轮廓（面板坐标系，原点在面板左上角，y 向下）。
 *
 * **四个角等大**（2026-10 用户要求）：下角是屏幕角的偏移曲线，上角是它关于
 * 水平中轴的**镜像** —— 所以形状严格对称，不是"看起来差不多"。
 * 跨度由 `composerGeometry` 统一解出（见 `cornerMax`）。
 */
export function composerOutline(options: ComposerOutlineOptions): Point[] {
  const { width: w, height: h, inset, exponent = 2.5, steps = 28 } = options;
  const s = powerOf(exponent);
  const geo = composerGeometry(options);

  if (!geo.hugging) {
    return clockwise(w, h, geo.span, geo.span, s, steps);
  }

  // 屏幕左下角在面板坐标系里的位置：面板左边 x=0 距屏幕左边 inset，
  // 面板底边 y=h 距屏幕底边 inset，故屏幕角点在 (−inset, h + inset)。
  const half = sampleCornerOffset(geo.screenRadius, inset, exponent, steps).slice() as Point[];
  // 端点吸附到屏幕两条边上：偏移曲线的端点法线是用**单侧**切线估的（没取到
  // 真正的切线），实测会差 0.2px（R=65.5 时 46.71 而非 46.5）。理论端点就是
  // 「弧起点 (0, R) 沿法线 (1,0) 内移 d」= (d, R)，吸附后跨度精确等于 span，
  // 内层圆角（span − padding）才有意义。
  half[0] = [inset, geo.screenRadius];
  half[half.length - 1] = [geo.screenRadius, inset];
  const toPanel = (p: Point): Point => [p[0] - inset, h + inset - p[1]] as const;

  // BL：屏幕偏移曲线 → 面板坐标（起点在左边缘、终点在底边，顺时针方向）
  const bl = half.map(toPanel);
  // BR：镜像到右侧（同样是从左边…不，从右边到底边）
  const br = half.map((p): Point => [w - (p[0] - inset), h + inset - p[1]] as const);
  // TL / TR：把下角关于水平中轴 y = h/2 翻上去 —— 上下角因此**同形同大**。
  // 翻折不改 x，所以 tl 仍然"从左边起、到顶边止"，顺序可直接用；
  // tr 翻折后是"从右边起、到顶边止"，需反转成"顶边 → 右边"。
  const tl = bl.map(([x, y]): Point => [x, h - y] as const);
  const tr = br.map(([x, y]): Point => [x, h - y] as const);

  // 顺时针：左上 → 右上 → 右下 → 左下 → 闭合。
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
