#!/usr/bin/env python3
"""把"棋盘格假透明"PNG 抠成真透明 webp。

ChatGPT 出的透明图下载后,常把透明预览的浅灰/白棋盘格烤进像素(alpha 全 255)。
本脚本:从四边 flood-fill,凡是"亮且低饱和(灰/白棋盘)且与边缘连通"的像素抹成透明,
保留中间暖色的猫+箱子(猫内部的奶白被暖色包住、不与边缘连通,不会被误删)。
然后裁到内容包围盒 + 小边距,存 webp。

用法: python3 scripts/dechecker-to-transparent.py <in.png> <out.webp> [max_w]
"""
import sys
from collections import deque
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
MAX_W = int(sys.argv[3]) if len(sys.argv) > 3 else 700

im = Image.open(src).convert("RGBA")
if im.width > MAX_W:
    h = round(im.height * MAX_W / im.width)
    im = im.resize((MAX_W, h), Image.LANCZOS)
W, H = im.size
px = im.load()

# 角落采样确认棋盘色
print("角落采样:", [px[x, y][:3] for x, y in [(1, 1), (W - 2, 1), (1, H - 2), (W - 2, H - 2)]])

def is_bg(p):
    r, g, b, a = p
    mx, mn = max(r, g, b), min(r, g, b)
    return mn > 180 and (mx - mn) < 30          # 亮 + 低饱和 = 灰/白棋盘

# 多源 BFS:从所有在 bg 掩码内的边缘像素灌水,标记连通背景
visited = bytearray(W * H)
q = deque()
def seed(x, y):
    i = y * W + x
    if not visited[i] and is_bg(px[x, y]):
        visited[i] = 1; q.append((x, y))
for x in range(W):
    seed(x, 0); seed(x, H - 1)
for y in range(H):
    seed(0, y); seed(W - 1, y)
while q:
    x, y = q.popleft()
    for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
        if 0 <= nx < W and 0 <= ny < H:
            i = ny * W + nx
            if not visited[i] and is_bg(px[nx, ny]):
                visited[i] = 1; q.append((nx, ny))

removed = 0
for y in range(H):
    base = y * W
    for x in range(W):
        if visited[base + x]:
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0); removed += 1
print(f"抹成透明像素: {removed} / {W*H}")

bb = im.getbbox()                                # 裁到内容
im = im.crop(bb)
print(f"裁后尺寸 {im.size} (bbox={bb})")
im.save(out, lossless=True)
print(f"已存 {out}")
