import { describe, expect, it } from 'vitest';
import {
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
  const height = 68;
  const inset = 14;
  const R = 55;

  it('下角与屏幕角的间隙恒为 inset（波动 < 0.3px）', () => {
    const pts = composerOutline({ width, height, inset, screenRadius: R, exponent: 4, steps: 40 });
    const bl = pts.slice(-41); // 末尾 41 点是左下角（steps=40）
    const arc = screenArc(R, 4);
    const gaps = bl.map(([x, y]) => distToPolyline([x + inset, height + inset - y], arc));
    expect(Math.min(...gaps)).toBeCloseTo(inset, 1);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.3);
  });

  it('左右边缘无直边：上角起点高度 = 下角终点高度（C1 连续）', () => {
    const pts = composerOutline({ width, height, inset, screenRadius: R, steps: 40 });
    const bl = pts.slice(-41);
    const tl = pts.slice(0, 41);
    expect(tl[0][0]).toBeCloseTo(0, 2); // 左上角起点在左边缘
    expect(bl[bl.length - 1][0]).toBeCloseTo(0, 2); // 左下角终点也在左边缘
    expect(tl[0][1]).toBeCloseTo(bl[bl.length - 1][1], 1);
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
   * 2026-10 iPhone 17 重标后新增的两条契约。
   *
   * 背景：R 从 55 抬到 74.5 后，`touch = R − inset` 涨到 58，与 68px 的条高只差
   * 10px。两条"悬崖"随之暴露 —— 高度抖 2px 就整体换成胶囊（间隙波动 0.3 → 17px），
   * 多行输入则让上角从 10px 长到 58px（每打一行形变一次）。下面把它们各钉一条。
   */
  it('面板略矮时按高度收缩屏幕圆角，而不是整块换成胶囊', () => {
    const R = 74.5;
    const inset = 16.5;
    const height = 60; // 真实 touch=58 放不下 → 触发收缩：R_eff = 60−8+16.5 = 68.5
    const steps = 40;
    const pts = composerOutline({ width: 369, height, inset, screenRadius: R, steps });
    const eff = height - 8 + inset;
    // 与既有判据同构：末尾 steps+1 点是左下角，逐点量到「收缩后」屏幕角的距离
    const bl = pts.slice(-(steps + 1));
    const arc = screenArc(eff, 2.5);
    const gaps = bl.map(([x, y]) => distToPolyline([x + inset, height + inset - y], arc));
    // 胶囊退化会让间隙从 16.5 起飞到几十像素；收缩口径下仍是等间隙
    expect(Math.min(...gaps)).toBeGreaterThan(inset - 1);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.5);
  });

  it('topRyMax 锁住上角：面板变高时上角半径不变，多出的高度成为竖直直边', () => {
    const opts = { width: 369, inset: 16.5, screenRadius: 74.5, steps: 24, topRyMax: 9.6 };
    const rest = composerOutline({ ...opts, height: 68 });
    const grown = composerOutline({ ...opts, height: 170 });
    // 首点 = 左上角起点（x=0, y=上角纵向半径）
    expect(rest[0][0]).toBeCloseTo(0, 6);
    expect(grown[0][0]).toBeCloseTo(0, 6);
    expect(grown[0][1]).toBeCloseTo(rest[0][1], 6);
    expect(grown[0][1]).toBeLessThan(10);
    // 长出来的部分必须是竖直直边：轮廓里存在 x≈0 且 y 跨越 60px 以上的点
    const left = grown.filter(([x]) => Math.abs(x) < 0.01).map(([, y]) => y);
    expect(Math.max(...left) - Math.min(...left)).toBeGreaterThan(60);
    // 且仍在框内
    for (const [x, y] of grown) {
      expect(x).toBeGreaterThan(-0.01);
      expect(x).toBeLessThan(369.01);
      expect(y).toBeGreaterThan(-0.01);
      expect(y).toBeLessThan(170.01);
    }
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
      height: 68,
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
