/**
 * 超椭圆（squircle）轮廓计算 —— 输入区"贴合设备屏幕角"用。
 *
 * ## 为什么需要这个文件
 *
 * CSS `border-radius` 只能画**圆弧**。iPhone 屏幕角是超椭圆（连续曲率），
 * 用圆弧去贴它，无论半径取多少都会在 45° 附近错位（实测最优半径仍有 2.3px
 * 的间隙波动）。`corner-shape: superellipse(4)` 能直接画超椭圆，但 Safari
 * 至今不支持（MDN BCD：safari 仍是 preview）。
 *
 * 所以改成 `clip-path: path()`：由本模块算出真实轮廓的折线，交给 CSS 裁剪。
 * clip-path 在 Safari 支持良好，形状可以任意精确。
 *
 * ## 几何模型
 *
 * 设设备屏幕角半径 R、输入区到屏幕左/右/底边的留白 d（三者必须相等，
 * 否则任何形状都无法让角部间隙恒定）。
 *
 * - **下角**（贴屏幕角的那两个）必须等于「屏幕角超椭圆沿法线内缩 d」——
 *   这是一条偏移曲线，**不是**同族超椭圆（拿半径 R−d 的超椭圆去近似，
 *   实测偏差 2.65px）。本模块直接对屏幕弧采样后沿法线内移，误差 < 0.1px。
 * - **上角**没有屏幕对应物（那里屏幕边是直的），取同族超椭圆，纵向取
 *   剩余高度，使上下两段在左/右边缘处切线都竖直 → C1 连续，看不出接缝。
 *
 * 代价是"贴角区"纵向占 R−d（iPhone 15：55−14 = 41px），输入区静止态只有
 * 68px 高，于是左右两侧没有竖直直边，端头呈椭圆状。这是完全贴合的必然
 * 结果 —— 想要可见直边只能降低贴合度（调大 --composer-inset 或调小 R）。
 */

export type Point = readonly [number, number];

const HALF_PI = Math.PI / 2;

/** 超椭圆参数化指数：x^n + y^n = r^n 的参数式取 2/n 次幂 */
function powerOf(exponent: number): number {
  return 2 / Math.max(2, exponent);
}

/**
 * 单角超椭圆的采样点（顺时针绕行）。
 *
 * 以面板角顶点 (cx, cy) 为基准，圆心落在 (cx + sx·rx, cy + sy·ry)。
 * t 从 0 到 π/2 依次给出「从一条边切出」到「从另一条边切入」：
 * - TL (sx=+1, sy=+1)：(0, ry) → (rx, 0)
 * - TR (sx=-1, sy=+1)：(w, ry) → (w−rx, 0)
 * - BR (sx=-1, sy=-1)：(w, h−ry) → (w−rx, h)
 * - BL (sx=+1, sy=-1)：(0, h−ry) → (rx, h)
 */
function cornerPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sx: 1 | -1,
  sy: 1 | -1,
  s: number,
  steps: number,
): Point[] {
  const out: Point[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const t = (k / steps) * HALF_PI;
    const c = Math.cos(t) ** s;
    const sn = Math.sin(t) ** s;
    out.push([cx + sx * rx * (1 - c), cy + sy * ry * (1 - sn)]);
  }
  return out;
}

/** 沿法线把**开放**折线整体内移 d（内向由「指向 (cx, cy)」判定） */
function offsetOpen(pts: Point[], d: number, cx: number, cy: number): Point[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[i === 0 ? 0 : i - 1];
    const b = pts[i === n - 1 ? n - 1 : i + 1];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    let nx = -ty;
    let ny = tx;
    if ((cx - p[0]) * nx + (cy - p[1]) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return [p[0] + nx * d, p[1] + ny * d] as const;
  });
}

/**
 * 屏幕左下角超椭圆（半径 R、指数 n）沿法线内缩 inset 后的曲线。
 *
 * 返回**屏幕坐标系**下的点（角在原点、y 向上），t 从 0 到 π/2：
 * 起点落在屏幕左边 (inset, ≈R)，终点落在屏幕底边 (≈R, inset)。
 */
export function screenCornerOffset(
  screenRadius: number,
  inset: number,
  exponent = 2.5,
  steps = 28,
): Point[] {
  const R = screenRadius;
  const s = powerOf(exponent);
  const arc: Point[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const t = (k / steps) * HALF_PI;
    arc.push([R - R * Math.cos(t) ** s, R - R * Math.sin(t) ** s] as const);
  }
  // 屏幕角的圆心在 (R, R)，即曲线的内凹侧
  return offsetOpen(arc, inset, R, R);
}
/**
 * 沿法线把**闭合**折线整体内缩 d（顺时针绕向 → 内向法线为 (-ty, tx)）。
 * 用于生成 1px 描边的内轮廓。
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
    // 相邻两条边的内向法线
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

/** 点集 → SVG path data（闭合） */
export function toPathData(pts: Point[], precision = 2): string {
  const k = 10 ** precision;
  const f = (v: number) => Math.round(v * k) / k;
  const parts: string[] = [];
  for (let k = 0; k < pts.length; k += 1) {
    const [x, y] = pts[k];
    parts.push(`${k === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/** CSS `path()` 函数值，可直接赋给 clip-path */
export function toClipPath(pts: Point[], precision = 2): string {
  return `path("${toPathData(pts, precision)}")`;
}

export interface ComposerOutlineOptions {
  width: number;
  height: number;
  /** 输入区到屏幕左/右/底边的留白（三者相等才成立） */
  inset: number;
  /** 设备屏幕圆角半径；0 = 直角屏（桌面 / iPhone SE） */
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
   * 还原成竖直直边（本来就是更想要的样子，见文件头「想要可见直边只能降低贴合度」）。
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
   * 与"整个形状换掉"不是一个量级。d 与 R 由 CSS 联动（`R − 58px`）时
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
  const half = screenCornerOffset(screenRadius, inset, exponent, steps);
  const toPanel = (p: Point): Point => [p[0] - inset, h + inset - p[1]] as const;

  // BL：屏幕偏移曲线 → 面板坐标（起点在左边缘、终点在底边，顺时针方向）
  const bl = half.map(toPanel);
  // BR：镜像到右侧（同样是从右边到底边）
  const br = half.map((p) => [w - (p[0] - inset), h + inset - p[1]] as const);
  // 上角：纵向吃掉剩余高度，横向与贴角区同宽（两边切线都竖直 → C1 连续）。
  // topRy 取偏移曲线的实测端点高度而非 R−inset，否则接缝处有 0.03px 错位；
  // 再以「贴角区高度」封顶 —— 多行输入把面板撑高时，上角不该跟着无限变大
  // （否则边缘出现细高椭圆），多余高度应还原成竖直直边。
  const topRy = Math.max(
    0,
    Math.min(bl[0][1], h - bl[0][1], topRyMax ?? Number.POSITIVE_INFINITY),
  );
  const tr = cornerPoints(w, 0, touch, topRy, -1, 1, s, steps);
  const tl = cornerPoints(0, 0, touch, topRy, 1, 1, s, steps);

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
  return [
    ...cornerPoints(0, 0, rx, ry, 1, 1, s, steps),
    ...cornerPoints(w, 0, rx, ry, -1, 1, s, steps).reverse(),
    ...cornerPoints(w, h, rx, ry, -1, -1, s, steps),
    ...cornerPoints(0, h, rx, ry, 1, -1, s, steps).reverse(),
  ];
}
