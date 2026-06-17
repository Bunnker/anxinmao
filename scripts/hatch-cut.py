#!/usr/bin/env python3
"""hatch-cut: 蓝幕动画条 → 去蓝幕 → 列投影谷底切 N 帧 → 统一基线 → 192x208 webp + GIF 预览。
用法:
  python3 scripts/hatch-cut.py <strip.png> <out_prefix> --n 6 [--cell 192x208] [--gif out.gif] [--durs 300,300,...]
出: <out_prefix>-0.webp .. <out_prefix>-{n-1}.webp;给 --gif 时另出预览 GIF。
"""
import argparse, os
from PIL import Image

def dechroma(im):
    im = im.convert("RGBA"); W, H = im.size
    px = list(im.getdata()); out = [(0, 0, 0, 0)] * len(px); col = [0] * W
    for i, (r, g, b, a) in enumerate(px):
        mx = r if r > g else g
        if b > 100 and b - mx > 40:
            out[i] = (0, 0, 0, 0)
        else:
            nb = mx if (a > 0 and b > mx + 18 and b > 105) else b
            out[i] = (r, g, nb, a)
            if a > 12: col[i % W] += 1
    im2 = Image.new("RGBA", (W, H)); im2.putdata(out)
    return im2, col

def segments(col, W, n):
    thr = max(col) * 0.04; on = [c > thr for c in col]
    segs = []; s = None
    for x in range(W):
        if on[x] and s is None: s = x
        elif (not on[x]) and s is not None:
            if x - s > 20: segs.append([s, x])
            s = None
    if s is not None: segs.append([s, W])
    merged = []
    for seg in segs:
        if merged and seg[0] - merged[-1][1] < 22: merged[-1][1] = seg[1]
        else: merged.append(seg)
    while len(merged) < n:  # 不足 → 最宽段谷底劈分
        wi = max(range(len(merged)), key=lambda i: merged[i][1] - merged[i][0])
        x0, x1 = merged[wi]; lo, hi = x0 + int((x1 - x0) * 0.3), x0 + int((x1 - x0) * 0.7)
        cut = min(range(lo, hi), key=lambda x: col[x]); merged[wi:wi + 1] = [[x0, cut], [cut, x1]]
    if len(merged) > n:  # 过多 → 取面积最大 n 段
        merged = sorted(sorted(merged, key=lambda s: -(s[1] - s[0]))[:n])
    return merged

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("strip"); ap.add_argument("out_prefix")
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--cell", default="192x208")
    ap.add_argument("--gif"); ap.add_argument("--durs", default="")
    a = ap.parse_args()
    CW, CH = (int(v) for v in a.cell.split("x"))
    im2, col = dechroma(Image.open(a.strip))
    W, H = im2.size
    crops = []
    for (x0, x1) in segments(col, W, a.n):
        sub = im2.crop((x0, 0, x1, H)); bb = sub.getbbox()
        crops.append(sub.crop(bb) if bb else sub)
    maxh = max(c.height for c in crops); scale = (CH - 18) / maxh
    frames = []
    for i, c in enumerate(crops):
        nw, nh = max(1, round(c.width * scale)), max(1, round(c.height * scale))
        cs = c.resize((nw, nh), Image.LANCZOS)
        cell = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        cell.alpha_composite(cs, ((CW - nw) // 2, CH - 8 - nh))
        cell.save(f"{a.out_prefix}-{i}.webp"); frames.append(cell)
    print(f"cut {len(frames)} frames -> {a.out_prefix}-*.webp")
    if a.gif:
        durs = [int(x) for x in a.durs.split(",")] if a.durs else [400] * len(frames)
        bg = Image.new("RGBA", (CW, CH), (247, 246, 243, 255))
        gm = [Image.alpha_composite(bg, f).convert("P", palette=Image.ADAPTIVE) for f in frames]
        gm[0].save(a.gif, save_all=True, append_images=gm[1:], duration=durs, loop=0)
        print("gif ->", a.gif)

if __name__ == "__main__":
    main()
