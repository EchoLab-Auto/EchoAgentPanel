#!/usr/bin/env python3
"""生成 Panel 的 PWA 应用图标（XR 巨幕模式 / 独立应用运行所需）。

产物（web/public/icons/）：
    icon-192.png           PWA 图标（any）
    icon-512.png           PWA 图标（any）
    icon-maskable-512.png  maskable 图标（全幅背景，内容留 80% 安全区）

设计：新拟态浅色底 + panel 蓝（#0969da）方块字母 E（= EchoAgent）。
四倍超采样后缩放，保证圆角与抗锯齿质量。

用法: python3 web/scripts/gen-app-icons.py        （在 web/ 目录或任意位置运行均可）
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BG = (232, 237, 244, 255)      # #E8EDF4 浅色新拟态底
FACE = (243, 246, 250, 255)    # #F3F6FA 面板高光面
ACCENT = (9, 105, 218, 255)    # #0969da panel 蓝

SS = 4  # 超采样倍率


def draw_icon(size: int, *, rounded: bool, safe_scale: float = 1.0) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.21)
    if rounded:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=radius, fill=BG)
        d.rounded_rectangle(
            (int(s * 0.045), int(s * 0.045), s - 1 - int(s * 0.045), s - 1 - int(s * 0.045)),
            radius=int(radius * 0.86),
            fill=FACE,
        )
    else:
        d.rectangle((0, 0, s, s), fill=BG)
        d.rounded_rectangle(
            (int(s * 0.10), int(s * 0.10), s - 1 - int(s * 0.10), s - 1 - int(s * 0.10)),
            radius=int(radius * 0.7),
            fill=FACE,
        )

    # 字母 E：竖笔 + 三横笔（圆头），按 safe_scale 向中心缩放（maskable 安全区）
    bar = s * 0.105 * safe_scale
    r = bar / 2
    left = s * (0.5 - 0.205 * safe_scale)
    top = s * (0.5 - 0.225 * safe_scale)
    bottom = s * (0.5 + 0.225 * safe_scale)
    long_right = s * (0.5 + 0.215 * safe_scale)
    mid_right = s * (0.5 + 0.135 * safe_scale)

    def bar_rect(x0, y0, x1, y1):
        d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=ACCENT)

    bar_rect(left, top, left + bar, bottom)                    # 竖笔
    bar_rect(left, top, long_right, top + bar)                 # 上横
    bar_rect(left, (top + bottom) / 2 - bar / 2, mid_right, (top + bottom) / 2 + bar / 2)  # 中横
    bar_rect(left, bottom - bar, long_right, bottom)           # 下横

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(192, rounded=True).save(OUT / "icon-192.png")
    draw_icon(512, rounded=True).save(OUT / "icon-512.png")
    draw_icon(512, rounded=False, safe_scale=0.78).save(OUT / "icon-maskable-512.png")
    for f in sorted(OUT.iterdir()):
        print(f"✅ {f}  ({f.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
