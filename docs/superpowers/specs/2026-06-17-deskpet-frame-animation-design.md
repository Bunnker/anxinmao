---
title: 桌宠盖帧动作逐帧动画化 · 设计 spec
status: 待审 → 转 writing-plans
created: 2026-06-17
branch: pet-home
audience: 实现者 / 回来接手的自己
related:
  - docs/product/桌宠设计-项目文档.md
  - src/app/page.tsx
  - src/components/PetSprite.tsx
  - src/app/globals.css
  - ~/.codex/vendor_imports/skills/skills/.curated/hatch-pet/
  - ~/pet-hatch/run1/decoded/base.png
---

# 桌宠盖帧动作逐帧动画化 · 设计 spec

## 1. 背景与目标

桌宠现有动作分两套动画系统(详见 [桌宠设计·项目文档](../../product/桌宠设计-项目文档.md) §4):

- **系统 A · 雪碧图逐帧**(`PetSprite.tsx`,16 状态,每行 5–8 帧):idle/跑步/招手/睡/玩/喝水等,**真逐帧、质量过关**;
- **系统 B · 盖帧序列**(`page.tsx`,藏精灵后在猫/家具位置叠多帧 webp):钻箱 4 帧,但**挠板/逗猫棒/洗脸全是 2 帧 0↔1 ping-pong、梳毛是 2–3 帧 + CSS 摇晃**——观感接近"两张静图闪"或"靠抖动假装动"。

用户反馈:系统 B 这些是"画了好多静态的、靠摇晃实现动态",要求做成**像 codex pet 那样的逐帧动画**。

**目标**:把系统 B 的 5 个盖帧动作(洗脸 / 挠板 / 逗猫棒 / 梳毛 / 钻箱)全部升级成**真逐帧关键帧动画**,取代 2 帧闪 + CSS 摇晃。

**关键认知校准**(调研确认):codex pet 的"动态"本身就是**6 帧关键帧 + 400–600ms 慢播的定格动画**,不是 60fps 丝滑补间。"达到 codex pet 流畅度"用 hatch-pet 6 帧路线即可,无需引入 Rive 等骨骼补间(那是另一量级,本 spec 不涉及)。

**范围决策**(用户拍板):
- 做哪些 = **全部 5 个盖帧动作**(洗脸已 POC 完成,其余 4 个待做);纯猫雪碧图动作(晒太阳/玩球/喝水,要动主 spritesheet)**不在本批**,列为后续。
- 变体 = **每动作一个精逐帧动画**,不做"每互动 3 变体"(之前设想,转逐帧后工作量 ×3,推迟)。

## 2. 已验证的出图管线(洗脸 POC)

洗脸 POC 已跑通整条管线,作为本批标准流程:

1. **出图**:`gpt-image-2` skill 的 `gen.sh`,prompt 照 hatch-pet 的 row 模板(`~/pet-hatch/run1/prompts/rows/stretch.md`),要求"6 帧横排、纯蓝 `#0000FF` 底、6 等宽槽、同一只猫各帧姿势渐变"。**`--ref` 喂 `~/pet-hatch/run1/decoded/base.png`**(xiaoju 身份基图,与主雪碧图同源)+ 该动作的现有帧/家具图。
2. **去蓝幕**:纯 PIL,蓝幕像素(`b>100 且 b-max(r,g)>40`)设全透明 + 去蓝边溢色。
3. **切片**:列投影找帧 → 不足目标帧数时在最宽段的"列直方图谷底"劈分(避开猫身)→ 各帧 `getbbox` trim。
4. **统一基线**:所有帧按统一缩放比(基于全帧 maxh)缩放,水平居中、底部对齐放进 192×208 cell。
5. **拼装动图**:按设计的播放序列(可让某段循环)+ 逐帧时长,输出 webp/gif 预览 + 切好的 `*.webp` 帧。

洗脸成品:`lick` 6 帧 + `wipe` 6 帧,播放序列 = 起手 2 帧 + 舔核心(4 帧)×4 轮 + 擦脸 6 帧,舔段 ~5.6s、擦段 ~2.8s,**用户已认可**。

> 一致性已用三视角审核(配色/解剖/画风)验证:锚 base.png + 纠偏 prompt 后橘猫身份稳。**纠偏 prompt 要点(写进每条出图)**:low-saturation milky orange(别过艳)、flat matte 绘本质感(无玻璃高光/塑料光/3D 体积光)、stripes golden-orange(别偏红)、eyes deep matte brown(别琥珀玻璃眼)、soft diffused edges。

## 3. 各动作帧设计

每个动作锚 `base.png` + 现有帧/家具图(i2i),蓝幕底出整条,切 N 帧。道具一律**画进帧**(见 §4)。

| 动作 | roam.kind | 锚定类型 | 帧设计(动作弧线) | 条数×帧 | i2i 参考 |
|---|---|---|---|---|---|
| **洗脸 washing** ✅ | rug→washing | 猫位置 | 舔爪条(坐→举爪→舔×4→爪到鼻) + 擦脸条(擦鼻→颊→眼→耳后→回坐) | 2×6=12 | base + cat-wash-paw-0/1 |
| **挠板 scratch** | scratch | 家具(猫抓板) | 立姿前爪扒板,上下挠的完整行程:站立够板→前爪上举抓→下拉划→再上→再下→收爪 | 1×6 | base + scratch.webp + cat-scratch-0/1 |
| **逗猫棒 pounce** | pounce | 猫位置 | 蓄力扑:低伏蹲→屁股扭→举爪扑→抓到羽毛→抱住拉扯→松开回坐 | 1×6 | base + cat-wand-0/1 |
| **梳毛 brushing** | brushing | 猫位置 | 被梳享受(梳子画进帧、在背上移):坐→梳子落背扭头→眯眼舒服→身体微蹭→梳到尾→回坐 | 1×6 | base + cat-brush-0/1/tail |
| **钻箱 box** | hopin/box/hopout | 家具(纸箱) | 跳进(箱外→起跳→入箱沿→沉入)6 帧 + 箱里东张西望循环 4–6 帧 + 爬出(探头→撑箱沿→跨出→落地)6 帧 | 3 段 | base + box.webp + cat-box-0..3 |

帧数说明:常规动作 6 帧一条;钻箱因含进/出/在箱三段,分 3 条出。每动作出图后跑一致性目检(对照 base.png),漂移重出。

## 4. 复合动作道具对齐方案

调研确认现有盖帧有两类锚定,逐帧升级**沿用同机制**,只是帧数 2→6:

- **家具锚定型**(挠板/钻箱):道具(猫抓板/纸箱)画进每帧,出图 i2i 喂对应静态家具 webp 保几何;盖帧叠在 `layout.<furniture>` 坐标上,用 `DX/DY` 让帧内家具与静态 webp 像素重合(拖动家具时盖帧跟随)。`z = zOf(furniture.bottom)+1`。
- **猫位置锚定型**(洗脸/逗猫棒/梳毛):道具(逗猫棒/梳子)画进帧或无道具,盖帧叠在猫实时 `roam.x/roam.y`,水平居中对猫中心、按 `scaleOf(roam.y)` 缩放、clamp 进院子。`z = max(zOf(roam.y),150)+1`(前景)。

**对齐参数 `{w,dx,dy}`**:每动作出图后肉眼实测微调(无自动对齐),沿用现有 `*_ALIGN` 结构。家具锚定型务必让帧内家具与静态家具 webp 比例一致(同画布尺寸 + i2i 喂家具图)。

## 5. 接线方案(`src/app/page.tsx` + `globals.css`)

### 5.1 盖帧常量 → 多帧 SEQS

把定长 2/4 帧数组升级成多帧。已是 SEQS 结构的(`WASH_SEQS`/`BRUSH_SEQS`)直接加帧;定长 `*_FRAMES` 的(`CAT_SCRATCH_FRAMES`/`CAT_WAND_FRAMES`/`CAT_JUMP_FRAMES`/`CAT_IN_BOX_POSES`)改成多帧数组。每动作配 `*_ALIGN` 的 `{w,dx,dy}`。

### 5.2 帧步进统一变长

现有 `brushFrame`(page.tsx 变长 ping-pong)已支持任意帧数;`washFrame` 等定长 2 帧版升级为变长。每动作可选**顺播 loop**(挠板/梳毛循环动作)或**单向到尾**(钻箱进/出)或**ping-pong**(舔爪来回),按动作语义。逐帧时长按真实节奏:舔爪快(~300ms)、擦脸中(~450ms)、挠板中(~250ms)、钻箱进出快(~180–230ms)。

### 5.3 删除 CSS 摇晃(关键)

真帧到位后,以下"假动态"补丁全部删除:
- `globals.css` 的 `@keyframes cat-groom-shiver` + `.cat-groom-sway` 类(梳毛抖动)及 page.tsx 对应 `className`;
- `globals.css` 的 `box-hop-in` / `box-hop-out`(钻箱 CSS 位移挤压)——钻箱改由真逐帧表现进/出,弱化或删除该 CSS;
- 保留 `pet-breath`(整体呼吸,与逐帧不冲突)。

> 红线坑([[anxinmao-tailwind-keyframes]]):Tailwind v4 会摇掉只在内联 `style.animation` 引用的 `@keyframes`;本次是**删除**不是新增,注意删干净对应 class 引用,避免留下死 keyframes。

### 5.4 reduce-motion / 后台暂停

逐帧步进沿用现有 `calm`(prefers-reduced-motion)/`document.hidden` 暂停逻辑。reduce-motion 时定格首帧(不再像现在梳毛那样"删掉摇晃就完全静止"——真帧定格仍是合理姿势)。

## 6. 管线脚本固化

把 POC 的临时 driver 固化成可复用脚本(`scripts/hatch-action.py` 或 `.sh`),输入:动作名 / prompt 文件 / 参考图 / 目标帧数 / 切法,输出:蓝幕条 → 去蓝幕 → 切 N 帧 → 统一基线 → `public/pet/items/cat-<action>-<i>.webp` + GIF 预览。复用 POC 的去蓝幕 + 谷底切片 + 统一基线 Python。

## 7. 红线与护栏

- **橘猫一致性**:每条出图锚 `base.png` + 纠偏 prompt;出图后对照 base 目检,漂移(过饱和/塑料光/条纹偏红/玻璃眼)重出。这是本批头号质量风险。
- **AI 形象红线**:桌宠动作 = 陪伴角色形象,**不进医学示意图**,本批合规([[anxinmao-pet-product-direction]] / CLAUDE.md)。
- **资产规范**:出图源 PNG / 蓝幕条 / 中间产物**不进 `public/`**,只留切好的 webp;`tmp/` 产物出库后清理。顺带清理已违规滞留的 `cat-brush-*.png`。
- **风险三色独立信号层**:不受影响(桌宠在暖色院子层,与红黄绿隔离)。
- **部署须批准**([[anxinmao-deploy-approval]]):本批改码 / 本地验证 / commit / push 可自行;**部署上线须用户显式批准**。

## 8. 验收标准

- `npm run build` 过、lint 无新增错;
- 三宽度(360/393/430)院子里每个升级动作:逐帧流畅(无 2 帧闪/无摇晃感)、橘猫身份一致、盖帧与猫/家具对齐不抖、拖家具时挠板/钻箱盖帧跟随;
- `cat-groom-sway` / `box-hop` 等 CSS 摇晃已删干净、无死 keyframes;
- 源 PNG / 中间产物未进 `public/`。

## 9. 分批路线

1. **批一 · 管线固化**:POC driver → `scripts/hatch-action.*` 可复用脚本;洗脸 12 帧正式入库(`public/pet/items/`)+ 接线洗脸(WASH_SEQS 多帧、删洗脸的 2 帧旧实现)。
2. **批二 · 纯猫/简单道具**:逗猫棒 + 梳毛(猫位置锚定,道具画进帧)各出 6 帧 + 接线 + 删 `cat-groom-sway`。
3. **批三 · 家具锚定**:挠板(6 帧)+ 钻箱(进/箱里/出 3 段)出图 + 接线 + 删 `box-hop` CSS;家具对齐重点回归。
4. **批四 · 收尾**:三宽度回归、资产清理、build/lint;(后续候选:纯猫雪碧动作晒太阳/玩球/喝水逐帧化,要动主 spritesheet,另立 spec)。

每批出图后人工目检一致性,接线后 preview 实测。

## 10. 风险与未决

1. **出图良率 ~50%**(调研):hatch-pet 一次出整条约半数需重试挑帧,尤其大幅姿势(扑/钻箱起跳)。预案:出不顺的动作退而求其次用 4 帧更顺的 ping-pong(钻箱 idle 已验证可用)。
2. **家具锚定型对齐**:挠板/钻箱帧内家具要和静态家具 webp 比例/位置一致,否则拖动时盖帧与家具错位。靠 i2i 喂家具图 + 同画布尺寸 + `DX/DY` 实测对齐。
3. **梳子归属**:梳毛现为"用户拖梳子→盖帧里梳子自己动"。逐帧版梳子画进帧(猫被梳享受),梳子位置由帧决定、非用户实时控制——与现状一致,不回归。
4. **网络抖动**:codex 出图偶发 `tls handshake eof`,重试即可(POC 遇到过一次)。
5. **变体推迟**:本批"每动作一个逐帧";"每互动 3 变体"推迟,日后每变体一条 6 帧叠加(管线已支持)。
