# 首页 C 院子沉浸方案 重做 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务实施。步骤用 `- [ ]` 勾选跟踪。

**Goal:** 把首页从已落地的 A 竖排卡片方案,改成 claude design 的 **C 院子沉浸方案**(`prototype/claude-design/home-c.html`):院子全屏沉浸 + 浮动问候/pills + 底部上拉 sheet。

**Architecture:** 现有院子(`PetNudge`)是 280px 卡 + `YARD_BASE_W=345` 内容层 + `transform scale` 适配 + 家具/猫坐标(bottom 0~140 深度带)。C 要把院子升级为「全屏 stage」(`flex:1`,高度约 480~520px),底部叠一张 `sheet`(`margin-top:-30px` 盖院子下沿)。核心难点是院子**全屏化的坐标/缩放适配**——这是产品最复杂、上一条 commit `5d6af61` 刚修过手机裁切的资产,务必小步改、每步真机回归。

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4。设计稿 `prototype/claude-design/home-c.html`(+ `shared.css` 院子/猫/家具基样式)。落地 `src/app/page.tsx`(`HomePage` ~1859 起、`PetNudge` ~398 起)、`src/app/globals.css`。

**前置已完成:** 批〇(衬线字体栈、`--accent-deep/--accent-tint`、`lib/cat-illus.ts` + `CatFace`)、批一-A(A 版问候/价值主张/看病CTA — 本计划会替换掉它)。

**红线(全程不变):** 风险三色只用于风险档位圆点(record tier、CTA 里的 rgy 示意点),装饰/pills/CTA/开关一律陶土红;医疗克制不诊断;不做电商/社区/养成;搭话不制造焦虑;AI 形象不进医学图。

---

## 文件结构

- `src/app/page.tsx`
  - `HomePage` return:**重排**为 `stage`(全屏院子,内含 `PetNudge`)+ `sheet`(看病CTA + 问问哈基米 + 最近)+ 现有 TabBar。删 A 版的竖排问候 header / 价值主张 section /(院子下方)最近 section。
  - `PetNudge`(院子):容器从 `h-[280px]` 卡 → 由父 `stage` 撑满(`absolute inset-0`);坐标基准 `YARD_BASE_W`/`YARD_DEPTH`/家具默认 `bottom`、wrapper scale 适配新高度;新增浮层(float-greet 问候、help「?」、竖排 pills);现有道具栏从「最近上方」移到院子 floor 上(`care-float`)。
- `src/app/globals.css`:如需,补 `stage`/`sheet`/`pill`/`float-greet` 的少量类(优先 Tailwind 内联,避免新全局类)。
- `docs/superpowers/specs/2026-06-15-full-app-redesign-claude-design-spec.md`:§3.1 首页方向 A → C 更新(决策记录)。

---

## Task 1:更新 spec 首页方向 A→C

**Files:** Modify `docs/superpowers/specs/2026-06-15-full-app-redesign-claude-design-spec.md`(§3.1 首页 + 决策定稿区)

- [ ] **Step 1:** 在「决策定稿」区补一条:`Q2/首页布局:最终采用 C 院子沉浸方案(home-c.html),非 A 竖排。批一-A 的 A 版骨架作废、由本计划替换。`
- [ ] **Step 2:** §3.1 首页规格描述从 A(竖排问候→价值主张→CTA→院子卡→最近)改为 C(全屏 stage 院子 + 浮动问候/help/pills + floor 道具栏 + 搭话泡 + 底部 sheet[看病CTA + 问问哈基米 + 最近])。
- [ ] **Step 3:** Commit `docs: 首页方向 A→C(院子沉浸,据用户 claude design 终稿 home-c)`。

---

## Task 2:院子容器全屏化(最核心、最高风险)

**Files:** Modify `src/app/page.tsx`(`PetNudge` 院子 `<section ref={yardRef}>` ~1244;`YARD_BASE_W` ~196、`YARD_DEPTH` 195、家具 `YARD_ITEMS` 默认 bottom、wrapper scale)

设计稿规格(home-c.html / shared.css):`stage{flex:1;overflow:hidden}`;`yard{position:absolute;inset:0;height:100%;background:linear-gradient(180deg,#f6e8d8,#f1dcc6 50%)}`;`floor{height:34%}`(即地面占院子高约 34%);家具 `bottom:114~124px`、`cat-walk{bottom:150px}`、`care-float{bottom:118px}`、`bubble{bottom:222px}`。

- [ ] **Step 1:** 院子 `<section>` 去掉固定 `h-[280px]`,改为撑满父 `stage`(父给 `flex-1`、院子 `absolute inset-0` 或 `h-full`);背景图 `yard-bg.webp` 继续 `object-cover` 铺满。
- [ ] **Step 2:** 院子高度不再是 280 常量。把现有依赖「280」的地方(wrapper height、scale 基准、深度带)改为读实际高度 `yardRef.offsetHeight`(类似现有 `yardW` 测 offsetWidth 的做法,新增 `yardH`);`YARD_DEPTH`(地面纵深)按新高度的 ~34% floor 重新定标,使家具/猫落在地面带。
- [ ] **Step 3:** 家具默认坐标(`YARD_ITEMS` 的 bottom)按 C 稿调:让猫窝/纸箱/地毯/碗/毛线球落在 floor(底部 ~34%)区域内,不要散到墙上。对照 home-c.html 的 `bottom:114~124`(注意那是 844 高机型的 px,落地按 `yardH` 比例换算)。
- [ ] **Step 4:** 猫漫游范围、wrapper `scale`(`5d6af61` 的 `min(1,yardW/345)`)沿用横向逻辑;纵向新增按 `yardH` 的适配,保证猫在 floor 带漫游、不悬空、不出界。
- [ ] **Step 5:** 三宽度(360/393/430)+ 真机高度回归:猫漫游/拖家具/盖帧(梳毛/洗脸/逗猫棒/钻箱)/搭话泡全部正常,不裁不悬空;`npm run build` 过。
- [ ] **Step 6:** Commit `feat(home): 院子全屏化(stage 撑满 + 坐标按 yardH 适配)`。

⚠ 本任务改坐标系,极易碰坏院子。每改一处即在 preview 三宽度看猫+家具+盖帧。拆不动就再分:2a 容器撑满、2b 家具落位、2c 猫漫游/盖帧适配,各自 commit。

---

## Task 3:院子浮层 — 问候 / 「?」/ 竖排 pills / 道具栏上 floor

**Files:** Modify `src/app/page.tsx`(`PetNudge` 院子内)

设计稿(home-c.html):`float-greet`(top58 left20,毛玻璃胶囊:avatar38 + 衬线「早上好,哈基米」+ 「6个月·母·橘猫」);`help-btn`(top58 right18,圆「?」→ 打开 Guide);`pills`(top102 right18 竖排:看病 primary / 问答 / 小知识,毛玻璃,`data-act` 跳 `/symptoms`、`/behavior`、`/knowledge`);`care-float`(left20 bottom118,梳子/水/逗猫棒 52px 圆角方)。

- [ ] **Step 1:** 院子内加 `float-greet` 浮动问候(用 `CatFace` 头像 + 衬线 `greeting()+","+cat.name` + meta),毛玻璃 `bg-white/50 backdrop-blur`。
- [ ] **Step 2:** 加 `help-btn`「?」圆按钮(右上,`onClick={()=>setShowGuide(true)}`)。
- [ ] **Step 3:** pills 竖排常驻(看病/问答/小知识),用 `Link` 跳 `/symptoms`/`/behavior`/`/knowledge`;看病 primary(陶土红点),其余 alt(灰点);毛玻璃质感。**这取代现有 thinking 心事泡**(可保留搭话泡做猫主动邀请、见 Task 顺延)。
- [ ] **Step 4:** 现有道具栏(梳子/水瓶/逗猫棒,原在「最近」上方)移到院子 floor 上做 `care-float`,样式按 C(52px 圆角方、floor 左下);拖拽触发逻辑不变。
- [ ] **Step 5:** 搭话泡文案/位置对齐 C(「拿不准?直接问我 →」等,点击跳 `/behavior`;保留现有随机搭话逻辑)。
- [ ] **Step 6:** 三宽度回归 + build;Commit `feat(home): 院子浮层(问候/?/竖pills/floor道具栏/搭话泡)`。

---

## Task 4:底部上拉 sheet(看病CTA + 问问哈基米 + 最近)

**Files:** Modify `src/app/page.tsx`(`HomePage` return)

设计稿(home-c.html):`sheet{margin-top:-30px;bg:var(--bg);border-radius:28px 28px 0 0;box-shadow:0 -10px 30px}`,内含:`grab` 把手;`cta`(陶土红渐变「猫不对劲?选症状看病」+ rgy + 「30秒红黄绿就医建议」→ `/symptoms`);`ask`(白卡「问问哈基米 / 喂养·习性·拿不准的病情,都能问」→ `/behavior`);`record`(最近一条,tier 绿点脉冲)。

- [ ] **Step 1:** 在院子 `stage` 之后加 `sheet` 容器(`-mt-[30px]` 盖院子下沿、圆角顶、上向阴影)。
- [ ] **Step 2:** sheet 内放看病 CTA(复用批一-A 已写好的陶土红 CTA 视觉,文案改 C 版「猫不对劲?选症状看病」+ 内嵌 rgy 三点 + 「30秒红黄绿就医建议」)。
- [ ] **Step 3:** 加「问问哈基米」ask 卡(`bg-surface`、`--accent-tint` 图标底、→ `/behavior`)。
- [ ] **Step 4:** 加最近一条 record(复用现有 `RecentRow` 或按 C 样式:tier 绿点 + 脉冲环 + 标题 + 「绿档·先观察·时间」)。无记录时给空态。
- [ ] **Step 5:** build + preview 看 sheet 盖在院子底、CTA/问问/最近齐;Commit `feat(home): 底部上拉 sheet(看病CTA+问问哈基米+最近)`。

---

## Task 5:HomePage 重排 + 清理 A 版残留

**Files:** Modify `src/app/page.tsx`(`HomePage` return)

- [ ] **Step 1:** `HomePage` return 顶层结构改为:`stage`(全屏院子=`PetNudge`)+ `sheet`(Task 4)+ 现有 TabBar;外层不再是「可滚动竖排卡片」而是「stage flex-1 + sheet flex-none + tabbar」(参照 home-c.html 的 phone>stage+sheet+tabbar)。
- [ ] **Step 2:** 删批一-A 残留:竖排精简问候 `<header>`、价值主张+看病CTA `<section>`(已并入 sheet/浮层)、院子下方「最近」`<section>`(已并入 sheet)。
- [ ] **Step 3:** 处理因删除产生的 unused(photos/onAlbumPick/vaccines 等若彻底不用则删,或留待 Task 4/毛孩子页)。
- [ ] **Step 4:** build + 三宽度 preview:整页 = 沉浸院子 + 底部 sheet,无 A 版残影、无滚动错位;Commit `refactor(home): 重排为 C 沉浸布局,清理 A 版残留`。

---

## Task 6:联调 / 红线核对 / 验收

**Files:** 全首页

- [ ] **Step 1:** 红线逐条核对(§5 总表):三色只在 record tier + CTA rgy 示意点;pills/CTA/问问/help 一律陶土红或中性;搭话文案不焦虑不诊断;Disclaimer 若首页原有则保留位置。
- [ ] **Step 2:** 功能回归:看病 CTA/pills→/symptoms;问问哈基米/pills→/behavior;小知识 pill→/knowledge;「?」→Guide;院子摸猫/梳毛/喂水/逗猫棒/洗脸/钻箱/拖家具全部正常;最近点击→记录详情。
- [ ] **Step 3:** 三宽度(360/393/430)+ 真机回归:院子不裁不悬空、sheet 不挡 TabBar、浮层不出界。
- [ ] **Step 4:** `npm run build` 过;截图给用户验收;**部署须用户批准**(MEMORY 红线)。
- [ ] **Step 5:** Commit + (用户批准后)push + ssh deploy。

---

## Self-Review 备注

- **坐标适配是最大风险**(Task 2):院子从 280 定高改全屏,`YARD_DEPTH`/家具 bottom/wrapper scale/猫漫游全依赖高度。务必先读现有 `PetNudge` 全貌再动,小步 commit、每步三宽度回归。拆不动就细分 2a/2b/2c。
- **不要照搬 home-c.html 的 CSS 猫**:院子用现有 `PetSprite` 雪碧图系统(更强),只借 C 的布局(stage/sheet/浮层/pills)与坐标比例。
- **道具栏迁移**:现有道具栏在「最近」上方,C 把它放院子 floor;拖拽触发逻辑不动,只换位置/样式。
- **onboarding 引导**:home-c 的 welcome/coach 对应现有 `Welcome`/`Guide`,本计划不重写,沿用;「?」按钮接 `setShowGuide(true)`。
