#!/usr/bin/env python3
# 从 public/icons/icon-source.png(1024² RGB)派生 App 图标:
#   any:      icon-192 / icon-512(满幅)
#   maskable: maskable-192 / maskable-512(内 80% safe zone + 角落取色填边,自适应图标不裁主体)
#   apple:    apple-touch-icon-180(满幅,iOS 不做遮罩)
# 跑:python3 scripts/gen-app-icons.py
from PIL import Image
from pathlib import Path

ICONS = Path(__file__).resolve().parent.parent / "public" / "icons"
src = Image.open(ICONS / "icon-source.png").convert("RGB")

for size in (192, 512):
    src.resize((size, size), Image.LANCZOS).save(ICONS / f"icon-{size}.png")
src.resize((180, 180), Image.LANCZOS).save(ICONS / "apple-touch-icon-180.png")

pad = src.getpixel((0, 0))  # 角落像素填边,与原图背景无缝
for size in (192, 512):
    inner = round(size * 0.8)
    canvas = Image.new("RGB", (size, size), pad)
    canvas.paste(src.resize((inner, inner), Image.LANCZOS),
                 ((size - inner) // 2, (size - inner) // 2))
    canvas.save(ICONS / f"maskable-{size}.png")

print("✅ 图标已生成:icon-{192,512} / maskable-{192,512} / apple-touch-icon-180")
