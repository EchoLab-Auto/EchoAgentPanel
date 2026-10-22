import { describe, expect, it } from 'vitest';
import {
  composerCornerSpan,
  composerGeometry,
  composerOutline,
  insetPolyline,
  screenCornerOffset,
  toClipPath,
  toPathData,
  type Point,
} from '../squircle';

/** 屏幕左下角超椭圆（角在原点、y 向上），n=4 */
function screenArc(R: number, n: number, count = 4000): Point[] {
  const s = 2 / n;
  const pts: Point[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = (i / count) * (Math.PI / 2);
    pts.push([R - R * Math.cos(t) ** s, R - R * Math.sin(t) ** s]);
  }
  return pts;
}

function distToPolyline(p: Point, line: Point[]): number {
  let best = Infinity;
  for (const q of line) {
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best) best = d;
  }
  return best;
}

describe('screenCornerOffset', () => {
  it('沿法线内缩 = 到屏幕角的距离恒为 inset', () => {
    const R = 55;
    const inset = 14;
    const arc = screenArc(R, 4);
    const offset = screenCornerOffset(R, inset, 4, 40);
    const gaps = offset.map((p) => distToPolyline(p, arc));
    expect(Math.min(...gaps)).toBeCloseTo(inset, 1);
    expect(Math.max(...gaps)).toBeCloseTo(inset, 1);
    // 波动（这才��肉眼看到的"不齐"）
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.3);
  });

  it('起点落在屏幕左边、终点落在屏幕底边', () => {
    const pts = screenCornerOffset(55, 14, 4, 40);
    expect(pts[0][0]).toBeCloseTo(14, 1);
    expect(pts[pts.length - 1][1]).toBeCloseTo(14, 1);
  });
});

describe('composerOutline', () => {
  const width = 365;
  const inset = 14;
  const R = 55;
  // 上角 + 下角放得下的高度才能纯贴角（两角各 R−inset = 41）
  const height = 100;

  it('下角与屏幕角的间隙恒为 inset（波动 < 0.3px）', () => {
    const pts = composerOutline({ width, height, inset, screenRadius: R, exponent: 4, steps: 40 });
    const bl = pts.slice(-41); // 末尾 41 点是左下角（steps=40）
    const arc = screenArc(R, 4);
    const gaps = bl.map(([x, y]) => distToPolyline([x + inset, height + inset - y], arc));
    expect(Math.min(...gaps)).toBeCloseTo(inset, 1);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.3);
  });

  it('全部点落在面板框内', () => {
    const pts = composerOutline({ width, height, inset, screenRadius: R, steps: 24 });
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(width + 0.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(height + 0.01);
    }
  });

  it('直角屏（screenRadius 0）退化为四角同半径超椭圆', () => {
    const pts = composerOutline({ width, height, inset, screenRadius: 0, steps: 16 });
    // 无贴角区 → 首点在左边缘、y = 半径
    expect(pts[0][0]).toBeCloseTo(0, 2);
    expect(pts[0][1]).toBeGreaterThan(0);
  });

  it('面板太矮放不下贴角区时退化为胶囊且不自交', () => {
    const pts = composerOutline({ width, height: 40, inset: 14, screenRadius: 55, steps: 16 });
    for (const [, y] of pts) {
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(40.01);
    }
  });

  /**
   * 2026-10 用户报「移动端输入区上两个圆角和下两个圆角不相等」后的新契约：
   * **四个角等大**。
   *
   * 旧口径里上角"纵向吃剩余高度"，iPhone 上纵向只有 10~25px，下角却是
   * 41~56px（镜像误差实测 10.7~46px，卡片越高差得越多）。新口径把上角改成
   * 下角关于水平中轴的**镜像**，并把跨度封顶在「静止态半高」。
   */
  it('四角等大：轮廓关于水平中轴镜像对称（偏差 < 0.05px）', () => {
    const cases = [
      { width: 365, height: 93, inset: 14, screenRadius: 65.5, cornerMax: 46.5 },
      { width: 402 - 37.5, height: 93, inset: 18.74, screenRadius: 74.5, cornerMax: 46.5 },
      { width: 365, height: 100, inset: 14, screenRadius: 55 },
      { width: 365, height: 170, inset: 14, screenRadius: 65.5, cornerMax: 46.5 },
      { width: 365, height: 68, inset: 14, screenRadius: 55, steps: 40 },
      { width: 300, height: 90, inset: 12, screenRadius: 0 },
    ];
    for (const c of cases) {
      const pts = composerOutline({ steps: 24, ...c });
      const mirrored = pts.map(([x, y]) => [x, c.height - y] as Point);
      const oneWay = Math.max(...pts.map((p) => distToPolyline(p, mirrored)));
      const otherWay = Math.max(...mirrored.map((p) => distToPolyline(p, pts)));
      expect(Math.max(oneWay, otherWay)).toBeLessThan(0.05);
    }
  });

  it('上下两角各吃一半高度：静止态 93px 卡片上跨度 = 46.5（而不是 R−d = 51.5）', () => {
    const geo = composerGeometry({ width: 365, height: 93, inset: 14, screenRadius: 65.5 });
    // 上限先由 height/2 命中（调用方不传 cornerMax 时）
    expect(geo.span).toBeCloseTo(46.5, 6);
    expect(geo.hugging).toBe(true);
    // 上角起点（左边缘）与下角终点（左边缘）关于中轴对称 → 各占一半
    const pts = composerOutline({ width: 365, height: 93, inset: 14, screenRadius: 65.5, steps: 24 });
    expect(pts[0][1]).toBeCloseTo(46.5, 1);
    expect(93 - pts[pts.length - 1][1]).toBeCloseTo(46.5, 1);
  });

  it('cornerMax 锁住大小：卡片被多行撑高时两角不变，长出来的是竖直直边', () => {
    const opts = { width: 369, inset: 16, screenRadius: 74.5, steps: 24, cornerMax: 46.5 };
    const rest = composerOutline({ ...opts, height: 93 });
    const grown = composerOutline({ ...opts, height: 200 });
    expect(rest[0][1]).toBeCloseTo(46.5, 1);
    expect(grown[0][1]).toBeCloseTo(rest[0][1], 6);
    // 左边缘变成一段竖直直边：x≈0 的点跨越 100px 以上
    const left = grown.filter(([x]) => Math.abs(x) < 0.01).map(([, y]) => y);
    expect(Math.max(...left) - Math.min(...left)).toBeGreaterThan(100);
    // 且仍在框内
    for (const [x, y] of grown) {
      expect(x).toBeGreaterThan(-0.01);
      expect(x).toBeLessThan(369.01);
      expect(y).toBeGreaterThan(-0.01);
      expect(y).toBeLessThan(200.01);
    }
  });

  it('cornerMax 比 R−d 更小就按 cornerMax 来：内层圆角跟着变小', () => {
    const opts = { width: 369, height: 200, inset: 16, screenRadius: 74.5, steps: 24 };
    // 不封顶：跨度 = R−d = 58.5
    expect(composerCornerSpan(opts)).toBeCloseTo(58.5, 6);
    // 封顶 40：跨度降到 40（上下各 40，中间 120 直边）
    expect(composerCornerSpan({ ...opts, cornerMax: 40 })).toBeCloseTo(40, 6);
    expect(composerOutline({ ...opts, cornerMax: 40 })[0][1]).toBeCloseTo(40, 1);
  });

  it('面板略矮时按高度收缩屏幕圆角，而不是整块换成胶囊', () => {
    const R2 = 74.5;
    const inset2 = 16.5;
    const height2 = 60; // 两角各 30 → 收缩后模型屏幕角 = 30 + 16.5 = 46.5
    const steps = 40;
    const pts = composerOutline({ width: 369, height: height2, inset: inset2, screenRadius: R2, steps });
    const eff = height2 / 2 + inset2;
    // 与既有判据同构：末尾 steps+1 点是左下角，逐点量到「收缩后」屏幕角的距离
    const bl = pts.slice(-(steps + 1));
    const arc = screenArc(eff, 2.5);
    const gaps = bl.map(([x, y]) => distToPolyline([x + inset2, height2 + inset2 - y], arc));
    // 胶囊退化会让间隙从 16.5 起飞到几十像素；收缩口径下仍是等间隙
    expect(Math.min(...gaps)).toBeGreaterThan(inset2 - 1);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.5);
  });
});

describe('insetPolyline', () => {
  it('矩形内缩后每点到原边距离 = d', () => {
    const rect: Point[] = [
      [0, 0],
      [100, 0],
      [100, 60],
      [0, 60],
    ];
    const inner = insetPolyline(rect, 6);
    expect(inner).toEqual([
      [6, 6],
      [94, 6],
      [94, 54],
      [6, 54],
    ]);
  });

  it('超椭圆轮廓内缩 1px 后仍在框内且面积变小', () => {
    const outer = composerOutline({
      width: 365,
      height: 100, // 留出竖直直边：胶囊形中间是尖缝，内缩后 miter 会顶出去
      inset: 14,
      screenRadius: 55,
      steps: 24,
    });
    const inner = insetPolyline(outer, 1);
    const area = (pts: Point[]) => {
      let s = 0;
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        s += a[0] * b[1] - b[0] * a[1];
      }
      return Math.abs(s) / 2;
    };
    expect(area(inner)).toBeLessThan(area(outer));
    for (const [x, y] of inner) {
      expect(x).toBeGreaterThan(-0.01);
      expect(y).toBeGreaterThan(-0.01);
    }
  });
});

describe('path 输出', () => {
  it('toPathData 以 M 开头、Z 结尾，命令可解析', () => {
    const pts = composerOutline({ width: 365, height: 68, inset: 14, screenRadius: 55, steps: 4 });
    const d = toPathData(pts);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    const commands = d.match(/[ML]/g) ?? [];
    expect(commands.length).toBe(pts.length);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('toClipPath 包成 CSS path() 函数', () => {
    const pts = composerOutline({ width: 200, height: 60, inset: 12, screenRadius: 0, steps: 4 });
    expect(toClipPath(pts)).toMatch(/^path\("M[\d.]+ [\d.]+( L[\d.]+ [\d.]+)+ Z"\)$/);
  });
});
