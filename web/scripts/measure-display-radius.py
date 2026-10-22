#!/usr/bin/env python3
"""量 iPhone 屏幕四角的物理圆角（跨度 R 与超椭圆指数 n）—— `--panel-display-radius` 的数据来源。

## 为什么需要这个脚本

`src/styles.css` 里 `--panel-display-radius` 是按机型分档的常量，而浏览器**没有**
任何 API 能读到屏幕圆角（CSS Round Display 的 `device-radius` 未实现，`env()` 也没有
对应变量）。所以这些数字只能离线量出来、写死在 CSS 里。这个脚本就是量它的工具，
目的是让那组常量**可复核、可重跑**，而不是一串没人知道怎么来的魔法数。

社区流传的值（「iPhone 15/16 = 55、16 Pro 起 = 62」）是**等效圆弧半径**；本项目
`utils/squircle.ts` 把屏幕角建模成超椭圆 x^n + y^n = R^n，需要的是角的**跨度 R**
（即「贴角区高度 = R − 留白」里的那个 R）。两者差 19%，混用会让角部错位 3~10px。
本脚本直接给跨度。

## 数据源：Apple 官方 bezel 素材（不用第三方估算）

Apple Design Resources 提供官方设备边框包，免费下载：
    https://developer.apple.com/design/resources/          （页面）
    https://devimages-cdn.apple.com/design/resources/download/Bezel-iPhone-17.dmg
    https://devimages-cdn.apple.com/design/resources/download/Bezel-iPhone-16.dmg

其中的 `PNG/<机型>/<机型> - <颜色> - Portrait.png` 里，**屏幕区域是 1:1 物理像素的
镂空**（透明），镂空宽高与机型物理分辨率精确相等 —— 脚本会打印实测宽高与期望值的
对照，这一步是整套测量的自检：对不上就说明素材换了规格，结论作废。

## 用法

    # 1. 取素材（Linux 下 dmG 是 UDIF，7z 可直接解）
    curl -LO https://devimages-cdn.apple.com/design/resources/download/Bezel-iPhone-17.dmg
    7z x Bezel-iPhone-17.dmg 'Bezel-iPhone-17/PNG/*' -o/tmp/bezel -y

    # 2. 量（依赖 numpy + Pillow：pip install -r 略）
    python3 scripts/measure-display-radius.py /tmp/bezel/Bezel-iPhone-17/PNG

    # 只想量某一代：把上一代的 PNG 目录也传进来对比
    python3 scripts/measure-display-radius.py \
        /tmp/bezel16/Bezel-iPhone-16/PNG /tmp/bezel/Bezel-iPhone-17/PNG

## 输出怎么读

    机型                屏宽(物理)  R(px)   R(CSS)   n      残差
    iPhone 17 Pro       1206      222.5    74.2    2.48   0.32

- 屏宽/R(px) 是 PNG 里的物理像素，R(CSS) = R(px) / 3（iPhone 全系 @3x）。
- 残差是「拟合轮廓 vs 实测轮廓」的平均绝对误差（px）；> 0.8px 说明这一代的形状
  不是单条超椭圆（或素材被换过），结论要打问号。
- 把 R(CSS) 写进 `styles.css` 对应视口宽度的档位。**不要**换算成等效圆弧再写。

## 方法（为什么是这样量）

1. 屏幕镂空的边界在 alpha 通道上，取 50% 灰度作为亚像素边界（每次跨边界做线性插值）。
2. 屏幕 bbox：中心行取最长的透明段给左右边界；中心列被灵动岛切成两段，取「底边段
   起点往上一段」的起点作为屏幕顶边（Macro 见 `screen_box()`）。
3. 右上角逐行取「该行屏幕右边界」，得到 dy → 内缩量 的剖面。
4. 对这个剖面按 `内缩(dy) = R − R·(1 − ((R−dy)/R)^n)^(1/n)` 做 (R, n) 二维网格
   最小二乘（R 步长 0.5px，n 步长 0.02）。
5. 交叉校验：R 换算回等效圆弧 r_eq = R·(1 − 2^(−1/n)) / (1 − 1/√2) 应落在社区流传值上
   （16 → 55、16 Pro → 62）。脚本会一起打印，对不上就别信这组数。
"""

from __future__ import annotations

import glob
import os
import sys

import numpy as np
from PIL import Image

# 逻辑视口宽度：用于把物理像素换算成 CSS px（R(CSS) = R(px) / 3，与宽度无关，
# 但打印出来方便和 styles.css 的档位对照）。
CSS_WIDTH = {
    'iPhone 16': 393,
    'iPhone 16 Plus': 430,
    'iPhone 16 Pro': 402,
    'iPhone 16 Pro Max': 440,
    'iPhone 17': 402,
    'iPhone 17 Pro': 402,
    'iPhone 17 Pro Max': 440,
    'iPhone Air': 420,
}
# 期望的物理屏宽（素材自检用；对不上说明 PNG 不是 1:1 物理像素，结论作废）
EXPECTED_PX = {
    'iPhone 16': 1179,
    'iPhone 16 Plus': 1290,
    'iPhone 16 Pro': 1206,
    'iPhone 16 Pro Max': 1320,
    'iPhone 17': 1206,
    'iPhone 17 Pro': 1206,
    'iPhone 17 Pro Max': 1320,
    'iPhone Air': 1260,
}


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """True 的连续段（含端点）。"""
    d = np.diff(np.concatenate(([0], mask.astype(np.int8), [0])))
    return list(zip(np.nonzero(d == 1)[0].tolist(), (np.nonzero(d == -1)[0] - 1).tolist()))


def screen_box(al: np.ndarray) -> tuple[int, int, int, int, int]:
    """屏幕镂空的 bbox（xl, xr, yt, yb）与中心列 cx。"""
    h, w = al.shape
    clear = al <= 0.5
    cy, cx = h // 2, w // 2
    xl, xr = max(runs(clear[cy]), key=lambda t: t[1] - t[0])
    inner = [t for t in runs(clear[:, cx]) if t[0] > 0 and t[1] < h - 1]
    bottom = max(inner, key=lambda t: t[1] - t[0])
    i = inner.index(bottom)
    # 中心列会被灵动岛切成两段：底边段的**上一段**起点才是屏幕顶边
    yt = inner[i - 1][0] if i > 0 else bottom[0]
    return xl, xr, yt, bottom[1], cx


def right_profile(al: np.ndarray, xr: int, yt: int, cx: int, rows: int = 320) -> dict:
    """右上角：dy → 该行屏幕右边界（亚像素，50% alpha 交点）。"""
    prof = {}
    for dy in range(rows):
        y = yt + dy
        if y >= al.shape[0]:
            break
        row = al[y]
        seg = [t for t in runs(row <= 0.5) if t[0] <= cx <= t[1]]
        if not seg:
            continue  # 该行被灵动岛切开
        e = seg[0][1]
        if e + 1 >= row.shape[0]:
            continue
        a0, a1 = row[e], row[e + 1]
        sx = float(e) if a1 <= a0 else e + (0.5 - a0) / (a1 - a0)
        prof[dy] = xr - sx
    return prof


def fit_superellipse(prof: dict) -> tuple[float, float, float]:
    """(R, n, 平均残差 px)。模型：内缩(dy) = R − R·(1 − ((R−dy)/R)^n)^(1/n)"""
    dys = np.array(sorted(prof), float)
    dx = np.array([prof[d] for d in sorted(prof)])
    best = None
    for R in np.arange(100, 340, 0.5):
        ok = dys < R
        if ok.sum() < 20:
            continue
        u = (R - dys[ok]) / R
        for n in np.arange(2.0, 5.01, 0.02):
            pred = R - R * np.power(np.clip(1 - u ** n, 0, None), 1 / n)
            err = float(np.abs(pred - dx[ok]).mean())
            if best is None or err < best[0]:
                best = (err, float(R), float(n))
    if best is None:
        raise SystemExit('拟合失败：轮廓点不足（素材规格变了吗？）')
    return best[1], best[2], best[0]


def main(argv: list[str]) -> int:
    dirs = argv[1:] or ['/tmp/bezel/Bezel-iPhone-17/PNG']
    files = []
    for d in dirs:
        files.extend(sorted(glob.glob(os.path.join(d, '*', '*Portrait.png'))))
    if not files:
        raise SystemExit(f'没找到 *Portrait.png：{dirs}')

    by_model: dict[str, str] = {}
    for p in files:
        by_model.setdefault(os.path.basename(os.path.dirname(p)), p)

    print(f"{'机型':20} {'屏宽(物理)':>10} {'R(px)':>8} {'R(CSS)':>8} {'n':>6} {'残差':>6} {'等效圆弧':>8}")
    for model, path in by_model.items():
        al = np.array(Image.open(path).convert('RGBA'))[..., 3].astype(np.float64) / 255.0
        xl, xr, yt, yb, cx = screen_box(al)
        w = xr - xl + 1
        flag = ''
        if model in EXPECTED_PX and EXPECTED_PX[model] != w:
            flag = f"  ← 屏宽期望 {EXPECTED_PX[model]}，素材可能不是 1:1 物理像素"
        R, n, err = fit_superellipse(right_profile(al, xr, yt, cx))
        r_eq = R / 3 * (1 - 0.5 ** (1 / n)) / (1 - 0.5 ** 0.5)
        print(
            f'{model:20} {w:>10} {R:>8.1f} {R / 3:>8.1f} {n:>6.2f} {err:>6.2f} {r_eq:>8.1f}{flag}'
        )
    print(
        '\n写进 styles.css 的是 R(CSS) = R(px)/3（**跨度**口径）。'
        '\n「等效圆弧」列只用于和社区流传值（16 → 55、16 Pro 起 → 62）对表，别拿它填 CSS。'
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
