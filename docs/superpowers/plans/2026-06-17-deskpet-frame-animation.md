# 桌宠盖帧动作逐帧动画化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把桌宠 5 个盖帧动作(洗脸/逗猫棒/梳毛/挠板/钻箱)从「2 帧闪 + CSS 摇晃」升级成 hatch-pet 6 帧关键帧逐帧动画,并删掉假动态 CSS。

**Architecture:** 沿用现有「藏实时精灵 + 在猫/家具位置盖多帧 webp」机制,只把帧数 2→6+。出图走 `gpt-image-2` skill 的 `gen.sh`(蓝幕底整条 + 锚 `~/pet-hatch/run1/decoded/base.png`),切片走新固化脚本 `scripts/hatch-cut.py`(去蓝幕→列投影谷底切→统一基线)。接线:定长帧步进 effect 升级成变长(照现有 `brushFrame`),洗脸用自定义播放序列(舔段循环)。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4;Python3 + PIL(切片);codex `gen.sh`(gpt-image-2,蓝幕 chroma-key)。

**前置事实(已读实际代码,行号截至本计划撰写时):**
- 盖帧常量:`src/app/page.tsx:156-234`(CAT_SCRATCH_FRAMES / BRUSH_SEQS / CAT_WAND_FRAMES / WASH_SEQS / CAT_JUMP_FRAMES / CAT_IN_BOX_POSES + 各 ALIGN/W/DX/DY)。
- 帧步进 effect:boxPose `:560`、jumpFrame `:586`(单向变长,已自适配)、scratchFrame `:611`(定长 0↔1)、brushFrame `:626`(**变长 ping-pong 模板**)、pounceFrame `:656`(定长)、washFrame `:670`(定长)。
- 渲染:jump 挂 `box-hop-*` class `:1372`、brush 挂 `cat-groom-sway` class `:1450`、scratch/wand/wash 盖帧 `:1411/:1467/:1500`。
- 假动态 CSS:`src/app/globals.css` box-hop-in/out `:174-214`、cat-groom-shiver/.cat-groom-sway `:265-291`、reduce-motion 引用 `:292-298`。
- 洗脸 POC 已切好 12 帧在 `tmp/variants/wash-lick-0..5.webp` + `wash-wipe-0..5.webp`(已认可)。
- 身份锚:`~/pet-hatch/run1/decoded/base.png`;纠偏 prompt 要点见 spec §2。
- ⚠ 出图慢(每条 ~2-4min,**串行**,codex 并发会串台)、良率 ~50%(出不顺退 4 帧 ping-pong)。**部署须用户批准**,本计划只到 commit/preview。

---

## Task 1: 固化切片管线脚本

把 POC 的一次性切片逻辑固化成可复用脚本,后续每个动作复用。

**Files:**
- Create: `scripts/hatch-cut.py`

- [ ] **Step 1: 写切片脚本**

```python
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
```

- [ ] **Step 2: 用洗脸 POC 条回归验证脚本**

Run(复跑已认可的 lick/wipe 条,确认脚本切片结果与 POC 一致):
```bash
cd /Users/mantou/project/pet
python3 scripts/hatch-cut.py tmp/variants/wash-lick-strip.png tmp/check-lick --n 6
python3 scripts/hatch-cut.py tmp/variants/wash-wipe-strip.png tmp/check-wipe --n 6
ls tmp/check-lick-*.webp tmp/check-wipe-*.webp
```
Expected: 各输出 6 个 webp;肉眼对比 `tmp/check-lick-*.webp` 与 `tmp/variants/wash-lick-*.webp` 一致(干净切片、无残留)。

- [ ] **Step 3: Commit**

```bash
git add scripts/hatch-cut.py
git commit -m "feat(pet): 固化盖帧切片管线脚本 hatch-cut.py"
```

---

## Task 2: 洗脸入库 + 接线(自定义播放序列)

洗脸 12 帧已切好且认可,正式入库 + 接线(舔段循环的自定义序列)。

**Files:**
- Create: `public/pet/items/cat-wash-lick-0..5.webp`, `cat-wash-wipe-0..5.webp`(从 tmp 拷)
- Modify: `src/app/page.tsx`(WASH_SEQS `:202`、washFrame effect `:670`、渲染 `:1500`)

- [ ] **Step 1: 入库 12 帧**

```bash
cd /Users/mantou/project/pet
for i in 0 1 2 3 4 5; do cp tmp/variants/wash-lick-$i.webp public/pet/items/cat-wash-lick-$i.webp; cp tmp/variants/wash-wipe-$i.webp public/pet/items/cat-wash-wipe-$i.webp; done
ls public/pet/items/cat-wash-lick-*.webp public/pet/items/cat-wash-wipe-*.webp
```
Expected: 12 个文件就位。

- [ ] **Step 2: 改 WASH_SEQS(12 帧:舔 0-5 + 擦 6-11)**

`src/app/page.tsx:202` 把 WASH_SEQS 改为:
```ts
const WASH_SEQS: Record<string, string[]> = {
  paw: [
    "/pet/items/cat-wash-lick-0.webp", "/pet/items/cat-wash-lick-1.webp",
    "/pet/items/cat-wash-lick-2.webp", "/pet/items/cat-wash-lick-3.webp",
    "/pet/items/cat-wash-lick-4.webp", "/pet/items/cat-wash-lick-5.webp",
    "/pet/items/cat-wash-wipe-0.webp", "/pet/items/cat-wash-wipe-1.webp",
    "/pet/items/cat-wash-wipe-2.webp", "/pet/items/cat-wash-wipe-3.webp",
    "/pet/items/cat-wash-wipe-4.webp", "/pet/items/cat-wash-wipe-5.webp",
  ],
};
```
(WASH_VARIANTS / WASH_ALIGN 保持 `paw`;ALIGN 的 `{w:124,dx:0,dy:-4}` 沿用——12 帧已统一基线。)

- [ ] **Step 3: 改 washFrame 为自定义序列驱动**

`src/app/page.tsx:670-681` 整段替换为(舔段 core 循环 4 轮 + 擦段,setTimeout 链按 order/durs 走):
```ts
  // 洗脸:自定义播放序列——舔爪 core(2-5)循环 4 轮(舔好几下) + 擦脸(6-11)。
  const WASH_ORDER = [0, 1, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const WASH_DURS  = [420, 340, 300, 300, 300, 320, 300, 300, 300, 320, 300, 300, 300, 320, 300, 300, 300, 320, 440, 440, 460, 460, 480, 560];
  const [washFrame, setWashFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "washing" || calm) {
      setWashFrame(0);
      return;
    }
    let k = 0;
    let t: number;
    const tick = () => {
      setWashFrame(WASH_ORDER[k]);
      t = window.setTimeout(() => {
        k = (k + 1) % WASH_ORDER.length;
        tick();
      }, WASH_DURS[k]);
    };
    tick();
    return () => clearTimeout(t);
  }, [roam.kind, calm]);
```
(渲染 `:1500` 处 `seq[washFrame]` 不变——washFrame 现在取值 0-11,seq 有 12 帧,自动适配。)

- [ ] **Step 4: 验证**

Run: `npm run build`
Expected: 构建 + 类型检查通过。
然后 preview 首页:把猫引到地毯触发 washing(或临时把 sit 调度的 rug 概率调高/手点地毯),观察猫舔爪舔好几下再擦脸、无 2 帧闪、橘猫不走样、盖帧贴合猫位置不抖。

- [ ] **Step 5: Commit**

```bash
git add public/pet/items/cat-wash-lick-*.webp public/pet/items/cat-wash-wipe-*.webp src/app/page.tsx
git commit -m "feat(pet): 洗脸盖帧升级为12帧逐帧(舔爪循环+擦脸),替换2帧闪"
```

---

## Task 3: 逗猫棒 6 帧逐帧

**Files:**
- Create: `tmp/variants/p-pounce.txt`(prompt)、`public/pet/items/cat-wand-0..5.webp`
- Modify: `src/app/page.tsx`(CAT_WAND_FRAMES `:192`→WAND_SEQS、pounceFrame `:656`、渲染 `:1467`)

- [ ] **Step 1: 写 prompt(6 帧扑抓弧线)**

写 `tmp/variants/p-pounce.txt`,用 spec §2 的 head 模板 + 纠偏要点 + 该 action:
```
（沿用 hatch-pet head:同一只 xiaoju 橘猫 / 6 帧横排 / 纯蓝 #0000FF 底 / 6 等宽槽 / soft watercolor 绘本 / low-saturation matte 不要塑料光玻璃眼 / golden-orange 条纹 / 透明边）

State action (pouncing at a feather teaser wand, slow build-up): across the 6 frames — (1) crouched low to the ground, hindquarters raised, eyes locked on a dangling feather wand; (2) wiggle/coil tighter, ready to spring; (3) leap up with both front paws reaching for the feather; (4) catch the feather, paws clasped around it; (5) pull it down hugging it to the chest, playful; (6) ease back to a calm sitting pose. Include the slim feather teaser wand in every frame. Eyes big and excited. The kitten stays roughly in the same spot.
```

- [ ] **Step 2: 出图(锚 base + 现有逗猫棒帧)**

```bash
cd /Users/mantou/project/pet
SK="$HOME/.claude/skills/gpt-image-2/scripts/gen.sh"
bash "$SK" --prompt "$(cat tmp/variants/p-pounce.txt)" \
  --ref "$HOME/pet-hatch/run1/decoded/base.png" \
  --ref public/pet/items/cat-wand-0.webp --ref public/pet/items/cat-wand-1.webp \
  --out tmp/variants/pounce-strip.png --timeout-sec 480
python3 -c "from PIL import Image; print(Image.open('tmp/variants/pounce-strip.png').size)"
```
Expected: 出一张宽条(蓝幕 6 帧)。读图目检:6 帧扑抓弧线、橘猫一致、羽毛棒在帧里。漂移/良率不达 → 重跑(良率 ~50%)。

- [ ] **Step 3: 切 6 帧入库**

```bash
python3 scripts/hatch-cut.py tmp/variants/pounce-strip.png tmp/variants/pounce --n 6 --gif tmp/variants/pounce.gif --durs 360,320,240,300,360,520
for i in 0 1 2 3 4 5; do cp tmp/variants/pounce-$i.webp public/pet/items/cat-wand-$i.webp; done
```
目检 `tmp/variants/pounce.gif` 动效顺。

- [ ] **Step 4: 改常量为 SEQS + 6 帧**

`src/app/page.tsx:192-198` 把 `CAT_WAND_FRAMES` 替换为:
```ts
const WAND_SEQS: Record<string, string[]> = {
  pounce: [
    "/pet/items/cat-wand-0.webp", "/pet/items/cat-wand-1.webp",
    "/pet/items/cat-wand-2.webp", "/pet/items/cat-wand-3.webp",
    "/pet/items/cat-wand-4.webp", "/pet/items/cat-wand-5.webp",
  ],
};
const WAND_W = 156;
const WAND_DX = 16;
const WAND_DY = -4;
```

- [ ] **Step 5: pounceFrame 升级变长 ping-pong**

`src/app/page.tsx:656-667` 整段替换:
```ts
  // 逗猫棒扑抓:pounce 期间帧序列 ping-pong(蹲伏→扑→抱→回),~260ms 一拍
  const [pounceFrame, setPounceFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "pounce" || calm) {
      setPounceFrame(0);
      return;
    }
    const n = WAND_SEQS.pounce.length;
    let i = 0, dir = 1;
    setPounceFrame(0);
    const id = window.setInterval(() => {
      i += dir;
      if (i >= n - 1) { i = n - 1; dir = -1; }
      else if (i <= 0) { i = 0; dir = 1; }
      setPounceFrame(i);
    }, 260);
    return () => clearInterval(id);
  }, [roam.kind, calm]);
```

- [ ] **Step 6: 改渲染读 SEQS**

`src/app/page.tsx:1467` 把 `const src = CAT_WAND_FRAMES[pounceFrame] ?? CAT_WAND_FRAMES[0];` 改为:
```ts
            const wandSeq = WAND_SEQS.pounce;
            const src = wandSeq[pounceFrame] ?? wandSeq[0];
```

- [ ] **Step 7: 验证 + Commit**

Run: `npm run build`(过)。preview 触发逗猫棒(道具栏拖逗猫棒到猫)观察 6 帧扑抓。
```bash
git add public/pet/items/cat-wand-*.webp src/app/page.tsx
git commit -m "feat(pet): 逗猫棒盖帧升级为6帧逐帧扑抓,替换2帧闪"
```

---

## Task 4: 梳毛 6 帧逐帧 + 删 cat-groom-sway

**Files:**
- Create: `tmp/variants/p-brush.txt`、`public/pet/items/cat-brush-0..5.webp`(覆盖/扩展 back 序列)
- Modify: `src/app/page.tsx`(BRUSH_SEQS `:170`、渲染删 `cat-groom-sway` class `:1450`)、`src/app/globals.css`(删 cat-groom-shiver/.cat-groom-sway)

- [ ] **Step 1: 写 prompt(6 帧被梳享受)**

`tmp/variants/p-brush.txt`(head 模板 + 纠偏 + action):
```
State action (being brushed and enjoying it, slow): a small pet grooming brush glides along the cat's back. Across the 6 frames — (1) sitting calm, brush touches the upper back; (2) brush strokes down the back, cat turns head slightly, eyes softening; (3) eyes blissfully half-closed, leaning into the brush; (4) brush reaches the lower back / tail base, body gives a happy little lean; (5) brush lifts, cat content; (6) ease back to calm sitting. Include the small brush in every frame, moving along the back. The cat body stays in the same spot, only head tilt / lean changes. Cozy, blissful mood.
```

- [ ] **Step 2: 出图(锚 base + 现有梳毛帧)**

```bash
cd /Users/mantou/project/pet
SK="$HOME/.claude/skills/gpt-image-2/scripts/gen.sh"
bash "$SK" --prompt "$(cat tmp/variants/p-brush.txt)" \
  --ref "$HOME/pet-hatch/run1/decoded/base.png" \
  --ref public/pet/items/cat-brush-0.webp --ref public/pet/items/cat-brush-1.webp \
  --out tmp/variants/brush-strip.png --timeout-sec 480
```
目检:6 帧梳背、橘猫一致、梳子在帧里移动。良率不达重跑。

- [ ] **Step 3: 切 6 帧入库**

```bash
python3 scripts/hatch-cut.py tmp/variants/brush-strip.png tmp/variants/brush --n 6 --gif tmp/variants/brush.gif --durs 360,340,420,420,360,520
for i in 0 1 2 3 4 5; do cp tmp/variants/brush-$i.webp public/pet/items/cat-brush-$i.webp; done
```

- [ ] **Step 4: 改 BRUSH_SEQS.back 为 6 帧**

`src/app/page.tsx:170` 把 `BRUSH_SEQS.back` 改为 6 帧(belly 保持不动,本批不做):
```ts
const BRUSH_SEQS: Record<string, string[]> = {
  back: [
    "/pet/items/cat-brush-0.webp", "/pet/items/cat-brush-1.webp",
    "/pet/items/cat-brush-2.webp", "/pet/items/cat-brush-3.webp",
    "/pet/items/cat-brush-4.webp", "/pet/items/cat-brush-5.webp",
  ],
  belly: [
    "/pet/items/cat-brush-belly-0.webp",
    "/pet/items/cat-brush-belly-1.webp",
  ],
};
```
(brushFrame effect `:626` 已是变长 ping-pong,自动适配 6 帧。BRUSH_ALIGN.back `{w:124,dx:0,dy:-4}` 沿用——出图统一基线后应贴合,preview 微调 dy 若需要。)

- [ ] **Step 5: 渲染删 cat-groom-sway class**

`src/app/page.tsx:1450` 把 `className="absolute cat-groom-sway"` 改为 `className="absolute"`(真帧到位,不再需要 CSS 抖)。

- [ ] **Step 6: globals.css 删 cat-groom-shiver**

`src/app/globals.css`:删除 `:259-291` 的注释块 + `@keyframes cat-groom-shiver` + `.cat-groom-sway`;并从 `:292-298` 的 `@media (prefers-reduced-motion)` 块里删掉 `.cat-groom-sway,` 这一行(其余 pet-enter/pet-bubble/thought-in 保留)。

- [ ] **Step 7: 验证 + Commit**

Run: `npm run build`(过)。`grep -rn "cat-groom-sway\|cat-groom-shiver" src/` 应无残留。preview 拖梳子到猫,观察 6 帧梳背、无抖动假动感。
```bash
git add public/pet/items/cat-brush-*.webp src/app/page.tsx src/app/globals.css
git commit -m "feat(pet): 梳毛升级6帧逐帧 + 删cat-groom-sway摇晃CSS"
```

---

## Task 5: 挠板 6 帧逐帧(家具锚定)

**Files:**
- Create: `tmp/variants/p-scratch.txt`、`public/pet/items/cat-scratch-0..5.webp`
- Modify: `src/app/page.tsx`(CAT_SCRATCH_FRAMES `:156`→SCRATCH_SEQS、scratchFrame `:611`、渲染 `:1411`)

- [ ] **Step 1: 写 prompt(6 帧挠板上下行程,带猫抓板几何)**

`tmp/variants/p-scratch.txt`(head 模板 + 纠偏 + action,强调与参考的三角瓦楞抓板几何一致):
```
State action (scratching a triangular wedge cat-scratching post, slow up-down): the cat stands on the left side of a beige corrugated wedge scratching post with red/orange trim (same geometry and color as the reference post). Across the 6 frames — (1) standing, front paws reaching up onto the slanted face; (2) claws high on the post; (3) drag down, claws raking the surface; (4) paws low; (5) reach up again; (6) settle. The scratching post stays identical and in the same place in every frame; only the cat's front paws move up and down on it. Side view, kitten on the left.
```

- [ ] **Step 2: 出图(锚 base + scratch.webp 保板几何 + 现有挠板帧)**

```bash
cd /Users/mantou/project/pet
SK="$HOME/.claude/skills/gpt-image-2/scripts/gen.sh"
bash "$SK" --prompt "$(cat tmp/variants/p-scratch.txt)" \
  --ref "$HOME/pet-hatch/run1/decoded/base.png" \
  --ref public/pet/items/scratch.webp \
  --ref public/pet/items/cat-scratch-0.webp --ref public/pet/items/cat-scratch-1.webp \
  --out tmp/variants/scratch-strip.png --timeout-sec 480
```
目检:6 帧挠板、橘猫一致、**板几何/颜色与 scratch.webp 一致**(对齐关键)。漂移或板变形重跑。

- [ ] **Step 3: 切 6 帧入库**

```bash
python3 scripts/hatch-cut.py tmp/variants/scratch-strip.png tmp/variants/scratch-f --n 6 --gif tmp/variants/scratch.gif --durs 240,220,260,240,220,300
for i in 0 1 2 3 4 5; do cp tmp/variants/scratch-f-$i.webp public/pet/items/cat-scratch-$i.webp; done
```

- [ ] **Step 4: 改常量为 SEQS + 6 帧**

`src/app/page.tsx:156` 把 `CAT_SCRATCH_FRAMES` 替换为:
```ts
const SCRATCH_SEQS: Record<string, string[]> = {
  post: [
    "/pet/items/cat-scratch-0.webp", "/pet/items/cat-scratch-1.webp",
    "/pet/items/cat-scratch-2.webp", "/pet/items/cat-scratch-3.webp",
    "/pet/items/cat-scratch-4.webp", "/pet/items/cat-scratch-5.webp",
  ],
};
const SCRATCH_W = 134;
const SCRATCH_DX = -52;
const SCRATCH_DY = -18;
```

- [ ] **Step 5: scratchFrame 升级变长 ping-pong**

`src/app/page.tsx:611-622` 整段替换:
```ts
  // 挠抓板:scratch 期间帧序列 ping-pong(前爪在斜面上下挠),~230ms 一拍
  const [scratchFrame, setScratchFrame] = useState(0);
  useEffect(() => {
    if (roam.kind !== "scratch" || calm) {
      setScratchFrame(0);
      return;
    }
    const n = SCRATCH_SEQS.post.length;
    let i = 0, dir = 1;
    setScratchFrame(0);
    const id = window.setInterval(() => {
      i += dir;
      if (i >= n - 1) { i = n - 1; dir = -1; }
      else if (i <= 0) { i = 0; dir = 1; }
      setScratchFrame(i);
    }, 230);
    return () => clearInterval(id);
  }, [roam.kind, calm]);
```

- [ ] **Step 6: 改渲染读 SEQS**

`src/app/page.tsx:1411` 把 `src={CAT_SCRATCH_FRAMES[scratchFrame] ?? CAT_SCRATCH_FRAMES[0]}` 改为:
```tsx
              src={SCRATCH_SEQS.post[scratchFrame] ?? SCRATCH_SEQS.post[0]}
```

- [ ] **Step 7: 验证(重点查家具对齐) + Commit**

Run: `npm run build`(过)。preview 点猫抓板触发 scratch:看 6 帧挠、**帧内板与静态 scratch.webp 重合不错位**、拖动抓板时盖帧跟随。错位 → 调 SCRATCH_DX/DY/W。
```bash
git add public/pet/items/cat-scratch-*.webp src/app/page.tsx
git commit -m "feat(pet): 挠板升级6帧逐帧上下挠,替换2帧闪"
```

---

## Task 6: 钻箱多帧逐帧 + 删 box-hop CSS

钻箱保留「进 / 在箱里 / 出」三段。出更顺的帧后删掉 box-hop CSS 位移补偿。

**Files:**
- Create: `tmp/variants/p-box-in.txt`、`public/pet/items/cat-box-0..5.webp`(扩到 6 帧)
- Modify: `src/app/page.tsx`(CAT_JUMP_FRAMES `:217`、CAT_IN_BOX_POSES `:225`、jumpFrame `:586`、渲染删 box-hop class `:1372`)、`src/app/globals.css`(删 box-hop)

- [ ] **Step 1: 写 prompt(6 帧由低到高的钻箱起身)**

`tmp/variants/p-box-in.txt`(head 模板 + 纠偏 + action,带纸箱几何):
```
State action (a cat rising up inside an open cardboard box, slow): a cat inside a beige open-top cardboard box (same box geometry/color as the reference). Across the 6 frames — (1) only ears/top of head peeking just over the box rim; (2) eyes peek over the rim; (3) head and front paws on the rim, looking out; (4) sitting up halfway inside; (5) sitting up tall, head well above the rim; (6) sitting tall, looking around content. The cardboard box stays identical and in the same place in every frame; only the cat rises from low to high. Front view.
```

- [ ] **Step 2: 出图(锚 base + box.webp 保箱几何 + 现有钻箱帧)**

```bash
cd /Users/mantou/project/pet
SK="$HOME/.claude/skills/gpt-image-2/scripts/gen.sh"
bash "$SK" --prompt "$(cat tmp/variants/p-box-in.txt)" \
  --ref "$HOME/pet-hatch/run1/decoded/base.png" \
  --ref public/pet/items/box.webp \
  --ref public/pet/items/cat-box-0.webp --ref public/pet/items/cat-box-3.webp \
  --out tmp/variants/box-strip.png --timeout-sec 480
```
目检:6 帧由低到高、**箱几何与 box.webp 一致**、橘猫一致。漂移/箱变形重跑。

- [ ] **Step 3: 切 6 帧入库**

```bash
python3 scripts/hatch-cut.py tmp/variants/box-strip.png tmp/variants/box-f --n 6 --gif tmp/variants/box.gif --durs 200,200,220,220,240,300
for i in 0 1 2 3 4 5; do cp tmp/variants/box-f-$i.webp public/pet/items/cat-box-$i.webp; done
```

- [ ] **Step 4: 改 CAT_JUMP_FRAMES / CAT_IN_BOX_POSES 为 6 帧**

`src/app/page.tsx:217` 把 `CAT_JUMP_FRAMES` 扩到 6 帧:
```ts
const CAT_JUMP_FRAMES = [
  "/pet/items/cat-box-0.webp", "/pet/items/cat-box-1.webp",
  "/pet/items/cat-box-2.webp", "/pet/items/cat-box-3.webp",
  "/pet/items/cat-box-4.webp", "/pet/items/cat-box-5.webp",
];
```
`:225` CAT_IN_BOX_POSES 改为在箱里高/中姿势随机(用新帧 5/3/4,避免用最低的探头帧当 idle):
```ts
const CAT_IN_BOX_POSES = [
  "/pet/items/cat-box-5.webp",
  "/pet/items/cat-box-3.webp",
  "/pet/items/cat-box-4.webp",
];
```
(jumpFrame effect `:586` 单向 0→last/last→1,增帧自动适配:hopin 顺播 0→5=由低升起钻进,hopout 倒播 5→1=探出爬走。boxPose `:560` 随机切自适配。)

- [ ] **Step 5: 渲染删 box-hop class**

`src/app/page.tsx:1372` 把
```tsx
                (roam.kind === "hopin" ? "box-hop-in" : "box-hop-out")
```
所在的 className 拼接里删掉 box-hop 部分(真逐帧已表现进/出,不再叠 CSS 位移)。改为该 img 只保留定位 class(如 `"absolute"`),不再按 hopin/hopout 加 box-hop-* class。

- [ ] **Step 6: globals.css 删 box-hop**

`src/app/globals.css`:删除 `:172-214` 的注释 + `@keyframes box-hop-in`/`box-hop-out` + `.box-hop-in`/`.box-hop-out`。

- [ ] **Step 7: 验证 + Commit**

Run: `npm run build`(过)。`grep -rn "box-hop" src/` 应无残留。preview 点纸箱触发钻箱:看由低升起钻进(6 帧)、箱里东张西望、探出爬走;箱不错位。
```bash
git add public/pet/items/cat-box-*.webp src/app/page.tsx src/app/globals.css
git commit -m "feat(pet): 钻箱升级6帧逐帧进出 + 删box-hop位移CSS"
```

---

## Task 7: 收尾——资产清理 + 全回归

**Files:**
- Modify/Delete: `public/pet/items/*.png`(源 PNG)、`tmp/variants/*`(中间产物)

- [ ] **Step 1: 清理违规源 PNG / 中间产物**

```bash
cd /Users/mantou/project/pet
git status --porcelain public/pet/items/ | grep '\.png' || echo "无 png 入库"
rm -f public/pet/items/cat-brush-*.png   # 历史违规滞留的源 PNG(同名 webp 已用)
ls public/pet/items/*.png 2>/dev/null && echo "⚠ 仍有 png" || echo "public 已无源 png"
```
(tmp/variants 出图中间产物保留在 tmp、不入库即可,不必删。)

- [ ] **Step 2: 全量回归**

```bash
npm run build
npx eslint src/app/page.tsx src/components/PetSprite.tsx 2>&1 | tail -5
grep -rn "cat-groom-sway\|cat-groom-shiver\|box-hop\|CAT_WAND_FRAMES\|CAT_SCRATCH_FRAMES" src/ || echo "假动态/旧常量已清干净"
```
Expected: build 过;lint 无新增错(既有 Date.now/Math.random-in-render 通病不计);grep 无残留(WASH_SEQS/BRUSH_SEQS/WAND_SEQS/SCRATCH_SEQS 取代旧定长常量,cat-groom/box-hop 已删)。

- [ ] **Step 3: 三宽度 preview 实测**

preview 在 360 / 393 / 430 三个宽度逐一触发 5 个动作(洗脸/逗猫棒/梳毛/挠板/钻箱):每个逐帧流畅、橘猫一致、盖帧与猫/家具对齐不抖、拖家具时挠板/钻箱盖帧跟随。记录任何错位 → 回到对应 Task 调 ALIGN。

- [ ] **Step 4: Commit**

```bash
git add -A public/pet/items/
git commit -m "chore(pet): 清理盖帧源PNG + 逐帧动画化收尾回归"
```

---

## 验收(对照 spec §8)

- `npm run build` 过、lint 无新增错;
- 5 个动作逐帧流畅(无 2 帧闪/无摇晃感)、橘猫身份一致、对齐不抖、拖家具跟随;
- `cat-groom-sway` / `box-hop` / 旧定长常量已清干净、无死 keyframes;
- `public/` 无源 PNG。
- **不部署**(待用户批准);commit 后如需 push 另行确认。

## 注意

- 出图**串行**(codex 并发串台);每条 ~2-4min;良率 ~50%,出不顺的动作退 4 帧 ping-pong(只缩短对应 SEQS 到 4 帧、durs 调慢、ping-pong 不变)。
- 每动作出图后**人工目检一致性**(对照 base.png:过饱和/塑料光/条纹偏红/玻璃眼 → 重出)。
- 家具锚定型(挠板/钻箱)对齐是最大风险:务必 i2i 喂家具图 + preview 实测帧内家具与静态 webp 重合。
