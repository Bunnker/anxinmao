#!/usr/bin/env python3
"""用「向右奔跑」行水平镜像出「向左奔跑」行,覆盖回雪碧图。

向左跑那行是 AI 单独生成的,带杂点(第5帧竖纹、第3/8帧碎块)且帧间漂移,
跑动时像残影/涂层。向右那行干净。2D 跑步循环本就该左右互为镜像,所以直接把
右行逐帧水平翻转写进左行 —— 帧完全一致、无杂点、不耗任何出图 API。

行布局:8 列 × 17 行,单格 192×208,行距(pitch)208×224(含 16px 透明间隙)。
running-right = row 1,running-left = row 2。
"""
from PIL import Image

SRC = "public/pet/spritesheet.webp"
COLS = 8
CW, CH = 192, 208
PITCH_Y = 224
PITCH_X = 208
ROW_RIGHT, ROW_LEFT = 1, 2

im = Image.open(SRC).convert("RGBA")
for c in range(COLS):
    x0 = c * PITCH_X
    cell = im.crop((x0, ROW_RIGHT * PITCH_Y, x0 + CW, ROW_RIGHT * PITCH_Y + CH))
    flipped = cell.transpose(Image.FLIP_LEFT_RIGHT)
    # 无 mask 粘贴 = 整格(含透明)覆盖左行,确保旧杂点被清掉;只动 192×208,不碰右侧 gutter
    im.paste(flipped, (x0, ROW_LEFT * PITCH_Y))

im.save(SRC, lossless=True)
print(f"mirrored row{ROW_RIGHT}(right) -> row{ROW_LEFT}(left), {COLS} frames, saved lossless")
