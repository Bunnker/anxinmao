#!/usr/bin/env python3
"""把「向右奔跑」行每帧的脚底(轮廓最低点)对齐到统一基线,消除跑步时的上下乱飘。

AI 出的 8 帧跑步,每帧猫的竖直位置不一致(脚底 y 在 182~203 间乱跳),
而猫是底对齐渲染的 → 看着一会儿贴地一会儿悬空、像"在天上顿一下"。
本脚本把每帧整体下移,使轮廓最低点都落到 TARGET,跑起来脚踩在同一条地面线上。
之后再跑 mirror-run-left.py 把右行镜像到左行,保持左右一致。

只动 row 1(running-right)。行距 pitch 208×224,单格 192×208。
"""
from PIL import Image

SRC = "public/pet/spritesheet.webp"
COLS = 8
CW, CH = 192, 208
PITCH_Y, PITCH_X = 224, 208
ROW = 1
TARGET = 203  # = 当前各帧脚底最大值,全部下移到这里,不会超出格底(208)

im = Image.open(SRC).convert("RGBA")
shifts = []
for c in range(COLS):
    x0 = c * PITCH_X
    cell = im.crop((x0, ROW * PITCH_Y, x0 + CW, ROW * PITCH_Y + CH))
    bb = cell.getbbox()
    dy = TARGET - bb[3]                      # ≥0,向下移到统一基线
    new = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    new.paste(cell, (0, dy))                 # 无 mask = 整格平移,顶部空出透明
    im.paste(new, (x0, ROW * PITCH_Y))       # 写回(覆盖,清掉旧像素)
    shifts.append((c, bb[3], dy))

im.save(SRC, lossless=True)
print("frame, old_foot, shift_down:", shifts)
print(f"已把 running-right 8 帧脚底对齐到 y={TARGET},存 lossless。记得再跑 mirror-run-left.py")
