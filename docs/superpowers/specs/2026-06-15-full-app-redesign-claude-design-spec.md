# 安心猫 · claude design 全套 UI 落地实现设计文档(spec)

> 版本 v1.0 · 2026-06-16 · 用户已审阅并拍板全部开放问题(见下「决策定稿」)
> 目标读者:实现者(你 / 后续 agent)。本文是「设计稿 → 现有 Next 产品」的落地总规格,逐页给映射与红线护栏。
> 设计稿目录:`prototype/claude-design/`(home/A/B/C/triage/inquiry/report/qa/pets/pet-edit + shared.css + cat-illus.js + README + chat1)
> 落地目标:`/Users/mantou/project/pet/src/`

---

## 决策定稿(2026-06-16 用户已拍板,覆盖下文各处「倾向」)

- **Q1 字体**:✅ 引入 Noto Serif SC 衬线,仅用于标题/名字/情绪文案;功能文字黑体、中文不斜体。
- **Q2 首页资料卡**:✅ 精简为问候条,疫苗/绝育/相册移到 `/pets`;首页空间留给桌宠。
- **Q3 院子入口**:✅ 保留「小猫搭话泡」(猫冒泡、点了跳分诊/问答/小知识)+ 另给常驻、可手动点的小图标入口(尤其小知识)。
- **Q4 铃铛**:✅ 暂不做(护理到期/分诊回访提醒已由搭话泡+首页展示)。
- **Q5 分诊选症状**:✅ 只单选(保留现有单值路由,不做多选/合流)。
- **Q6 问答用户气泡**:✅ 陶土红渐变(与发送键统一)。
- **Q7 毛孩子路由**:✅ 新建 `/pets`(档案展示 + 多猫切换);`/onboarding` 退为录入/编辑表单。
- **Q8 健康提醒开关**:✅ 纯 UI 开关(记档案,不接后端推送)。
- **Q9 多猫切换(红线反转)**:✅ **做多猫切换** —— 落地切换条 + 多猫编辑/添加;**同步改 `CLAUDE.md` 红线**(「不做多猫切换 UI」→「支持多猫切换」)。下文 §4「砍多猫」决策**作废**,改为实现多猫。
- **Q2′ 首页布局(2026-06-16 终稿)**:✅ 最终采用 **C 院子沉浸方案**(`prototype/claude-design/home-c.html`),**非 A 竖排卡片**。结构 = 全屏 `stage` 院子(浮动问候 / 「?」/ 竖排 pills / floor 道具栏 / 搭话泡)+ 底部上拉 `sheet`(看病 CTA + 问问哈基米 + 最近)。批一-A 已落地的 A 版骨架(竖排问候 header / 价值主张 section / 院子下方最近)**作废,由本计划 `docs/superpowers/plans/2026-06-16-home-c-immersive-redesign.md` 替换**。下文 §3.1 的 A 版区块顺序与 ②③④ 独立堆叠区块**随之失效**,改按 C(问候/CTA/最近各归入浮层或 sheet)。

---

## 一、背景与目标

### 1.1 为什么做这次落地

此前产品收到三类核心反馈:**「UI 丑 / 交互不清 / 看不懂功能」**。用户用 claude design 把全套 UI 重做了一遍(首页 home + 分诊 triage + 问诊 inquiry + 报告 report + 问答 qa + 毛孩子 pets/pet-edit),走「iOS 克制精致 + 暖奶白底 + 衬线情绪标题 + 院子桌宠陪伴」路线,与 CLAUDE.md 现行设计方向(2026-06 Maple 重设计)同源、且把「看病是主场景」做成了页面级主入口。

本次任务:**把这套设计稿落地到现有 Next.js 16 / React 19 / Tailwind v4 产品**,在「不破坏既有业务逻辑、不踩产品红线、不退化已领先于设计稿的生产能力」前提下,补齐设计差量、对齐视觉语言。

### 1.2 关键判断(贯穿全文)

1. **这不是推倒重做,是「补差量 + 对齐视觉 + 守红线」。** report / behavior 两页已高度落地同一套设计语言;首页 / 分诊 / 问诊 / 毛孩子是差量较大的页。
2. **设计稿不是处处更优。** 院子桌宠系统、分诊引擎、三层存储、AI 头像、分诊跟进闭环等现有生产能力远超设计稿草图,**这些只做「视觉对齐」,绝不照搬 HTML 而退化功能**。
3. **设计稿撞了一条核心红线(多猫切换 UI),必须拦截。** 见 §4。

### 1.3 成功标准

- 首页让用户「一眼看懂这 App 是干嘛的、怎么看病」(补价值主张 + 看病 CTA)。
- 分诊 / 问诊 / 报告 三页视觉统一、交互路径清晰。
- 全程零红线违规(三色独立 / 医疗克制 / 不做电商社区养成 / AI 形象不进医学图 / 单猫)。
- 每批可独立验证、独立上线(部署须经用户批准,见 MEMORY)。

---

## 二、设计系统(对照 globals.css)

### 2.1 色板:99% 已对齐,只需补 2 个 token

设计稿 `shared.css` 的 token 与现有 `globals.css` 几乎逐一同源。**落地以现有 `globals.css` 为单一事实源,不回灌设计稿裸色值**(现有已补全 `--red-bg/--red-ink/--amber-bg/...` 等衍生色,设计稿缺这些)。

| 用途 | 设计稿 | 现有 globals.css | 动作 |
|---|---|---|---|
| 底色 | `--bg #f7f6f3` | `--paper #f7f6f3` | 复用 `--paper` |
| 卡片 | `--card #fff` | `--surface #fff` | 复用 `--surface` |
| 墨黑 | `--ink #1a1a18` | `--ink #1a1a18` | 一致 |
| 次文字 | `--ink-soft #6b675f` | `--ink-soft #6b6865` | 差 1 阶,可对齐到设计稿值(可选) |
| 弱文字 | `--ink-faint #9a958c` | `--ink-faint rgba(28,26,22,.48)` | 现有偏冷,可对齐(可选) |
| 品牌 | `--terra #b05a50` | `--accent #b05a50` | 复用 `--accent` |
| 风险红 | `--risk-red #d92d20` | `--red #d92d20` | 复用 `--red` |
| 风险黄 | `--risk-yellow #b97900` | `--amber #b97900` | 复用 `--amber` |
| 风险绿 | `--risk-green #238146` | `--green #238146` | 复用 `--green` |

**需新增 2 个 token(现有无):**
- `--accent-deep: #9c4a41` —— CTA / 按钮渐变底(设计稿 `--terra-deep`)
- `--accent-tint: #f3e3df` —— 图标底 / chip 底(设计稿 `--terra-tint`)。现有有 `--accent-soft #faeee9` 但更浅更冷,设计稿大量用更深更暖的 tint;**建议新增 `--accent-tint`,不复用 `--accent-soft`**。

**装饰场景色(墙/地板/阳光/窗/猫橘色族/性别 chip 等)一律作为「局部内联常量或组件内 CSS」,绝不写进 `:root` token** —— 防止污染风险信号红线盘。

### 2.2 字体:**最大开放决策(待用户拍板)**

- 设计稿明确想要 **Noto Serif SC**(衬线)给标题 / 情绪文字,Noto Sans SC 给正文。
- 现有 `globals.css` 已把 `--font-serif` 重定向到 `--font-sans`(SF/PingFang)—— 即 Maple 重设计「iOS 克制」方向放弃了衬线区分。
- 两条路冲突。CLAUDE.md 写「衬线只用于标题 / 情绪文字」,**倾向支持引入衬线但严格仅限标题 / 名字 / 情绪文案**。
- ➡️ **见 §7 开放问题 Q1,需用户拍板**。本文余下按「若引入衬线,仅标题级元素用 `--font-serif`」描述。

### 2.3 圆角:卡片调小一档

设计稿卡片普遍 18–24px,现有 `--radius-card: 28px` 偏大。

- 落地动作:卡片层级用 18–24px(可新增 `--radius-card-sm: 20px` 或局部 `rounded-[20px]`)。
- 控件 / 按钮 16–20px;pill / chip / seg 全 `999`(`--radius-control` 已有)。
- **report Hero 卡现有 `rounded-[32px]` 更克制、已落地,保留不动**(设计稿是 24,但现有更好)。

### 2.4 阴影:冷调 → 暖调

- 现有 `--shadow-card` 用冷色 `rgba(16,24,40,...)`;设计稿用暖色 `rgba(60,45,30,...)`,更贴主题。
- 落地建议:把现有阴影色相从冷调暖(改 `--shadow-card / --shadow-control` 的 rgba 基色),或新增设计稿三档 `--soft / --soft-sm / --soft-lg`。
- 陶土红强调阴影(CTA / 报告红绿按钮)按设计稿:CTA `0 10px 24px rgba(176,90,80,.34)`、报告红钮 `rgba(217,45,32,.34)`、绿钮 `rgba(35,129,70,.3)`。

### 2.5 组件:复用 vs 新增

| 组件 | 状态 | 动作 |
|---|---|---|
| `TabBar.tsx` | 已存在,结构一致 | 微调高度(56→可保留或调 84)、profile 图标(双猫脸+四爪);**第 4 tab href 改 `/onboarding`→`/pets`(若新建)**,`SHOW_PATHS` 同步 |
| `ReviewedNotice.tsx` | 已存在 | **加 collapsible 折叠变体**(分诊页用),措辞复用不重写 |
| `Disclaimer.tsx` | 已存在 | 全页保留,**任何重排不得移除** |
| `ShareReportButton.tsx` | 已存在,优于设计稿 | 报告页保留 |
| `CatAvatar.tsx` | 已存在(AI 头像 + 上传 + 兜底) | 保留逻辑,**用 cat-illus 升级「无生成图时的回退线稿」** |
| `PetSprite.tsx` + 院子系统 | 已存在,远超设计稿 | 保留,仅吸收设计稿 glass pill / 氛围视觉 |
| **`CatFace.tsx`(新增)** | 无 | **移植 `cat-illus.js` 为 `lib/cat-illus.ts` + `components/CatFace.tsx`**(6 眼×5 嘴 + 12 症状态 + 3 情绪态),供 症状插画 / 报告角标 / 毛孩子头像回退 / 问答复用。零依赖、可参数化、可换色 |
| Toggle / Stepper / Seg / BottomSheet(picker) | 部分有 | 毛孩子编辑页按需新增(开关用陶土红,绝不用风险色) |

**前置公共件(两批之前先做):①补 `--accent-deep / --accent-tint` 2 token + 阴影调暖;②`CatFace.tsx` 组件化。** 这两项是后续多页的依赖。

---

## 三、逐页规格

> 通用约定:设计稿的 `.phone / .statusbar / .device` 手机外壳与假状态栏是 iframe 预览脚手架,**生产一律不要**(现有已是 `max-w-[430px]` + `env(safe-area)`)。设计稿尺寸(390×844、各坐标)作为「基准宽内布局参考」。

### 3.1 首页 `/`(`src/app/page.tsx`)

终稿 = **`home-c.html`(C 院子沉浸方案)**,2026-06-16 用户拍板(见上「决策定稿」Q2′)。`home.html` / A / B 仅作院子姿态与视觉参考,不再是落地目标。

**结构(C 沉浸,自上而下):**

1. **全屏 `stage` 院子**(`flex-1` 撑满,沉浸 hero):内含
   - 浮动问候 `float-greet`(毛玻璃胶囊:头像 + 衬线问候 + 月龄/性别 meta,左上)
   - 「?」`help-btn`(右上,开 Guide)
   - 竖排常驻 `pills`(看病 / 问答 / 小知识,看病 dot 陶土红、其余灰;右上,**取代「等猫坐下才出现」的心事泡 nav**)
   - floor 道具栏 `care-float`(梳子/水/逗猫棒,落院子地面左下,拖拽逻辑不变)
   - 搭话泡 + 现有 PetSprite 桌宠(漫游/拖家具/盖帧/水碗,全部保留)
2. **底部上拉 `sheet`**(`-mt-30` 盖院子下沿、圆角顶、上向阴影):grab 把手 + 看病 CTA(陶土红渐变 + rgy + 「30 秒红黄绿就医建议」→ `/symptoms`)+ 问问哈基米 ask 卡(→ `/behavior`)+ 最近一条 record。
3. **TabBar**(layout 全局,fixed 底)。

> A 版的独立「问候条 / 价值主张 / 看病 CTA / 院子下方最近」四个堆叠区块已**并入浮层与 sheet**;下表 ②③④ 行描述的是已作废的 A 版堆叠形态,仅留作差量对照,落地以上述 C 结构为准。

| 区块(A 版形态,部分已并入浮层/sheet) | 设计稿 | 现有 | 动作 |
|---|---|---|---|
| ② 问候条 greet | 46px 头像 + 19px 衬线问候 + 一行 meta + 右铃铛 | **现有是 A 方案厚资料卡**(92px 头像 + 大名 + 疫苗/绝育/相册 3 stat + 相册上传条) | **改:** 砍厚资料卡为精简问候条,资料/相册移交毛孩子页。铃铛**暂不实现**(无通知系统)→ 见 Q4。**待拍板 Q2** |
| ③ 价值主张 value | 衬线 22px『**猫不对劲?**选症状,30秒给你红黄绿就医建议』(『猫不对劲?』陶土红)+ rgy 三色点 + 灰副标 | **现有无** | **新增**(最大缺口)。文案守红线:用「就医建议/该不该去医院」,不出现「诊断」 |
| ④ 看病 CTA | 陶土红渐变大按钮:左白底半透 ico + 衬线『看病』+ 副标『选症状·智能分诊』+ 右白箭头,圆角 20,链 `/symptoms` | **现有把入口藏在院子心事泡里** | **新增**,把「看病」提为页面级主入口(契合「看病是主场景」红线) |
| ⑥ 院子 hero | 纯 CSS 墙/窗/地板/家具 + CSS 猫 + glass pills + 搭话泡 | **现有 PetSprite 2.5D 桌宠系统**(WebP 17 态雪碧图 + 可拖家具持久化 + 深度排序 + 跟随气泡 + 水碗 + 道具栏 + codex 盖帧动作 + yard-bg.webp) | **保留现有,不照搬 CSS 猫。** 仅吸收:(a) 院子顶部常驻 **glass pills**(看病/聊天/小知识,看病 dot 陶土红、其余灰)解决「入口要等猫坐下才出现」的可发现性;(b) 可选窗户/阳光氛围。心事泡可降级为彩蛋。**待拍板 Q3** |
| 搭话泡 bubble | 猫主动招呼『你是来找我聊天的吗?→』floaty 浮动,尾角朝猫 | **现有气泡承载 followup/care/note/talk 等闭环逻辑** | **视觉对齐**(尾角朝猫、floaty、陶土红 `.go` 箭头);**功能气泡逻辑不可替换**;idle 时可让猫偶尔冒一句主动搭话 |
| ⑧ record 卡 | tier 圆点(带光环 ::after)+ 摘要 + 风险色 tag + 时间 + 箭头 | 现有 RecentRow 已实现 | 视觉微调:tier 加光环、tag 上对应风险色 |
| TabBar | 84px 毛玻璃,4 tab | 现有 56px,4 tab | 微调高度 + profile 图标 |

**保留的业务逻辑:** 三层存储兜底、分诊跟进闭环(followup/回执/升级再分诊)、Guide/Welcome 引导、AI 头像、家具拖拽持久化、水碗、道具栏 —— **全部不动**。

**红线护栏:** pills 的 dot 只用陶土红/灰,绝不用红黄绿;rgy 三色点仅作「风险分档示意」(合规);底部 Disclaimer 不移除;CTA 大面积陶土红 = 品牌色(非风险红),合规。

### 3.2 分诊页 `/symptoms`(`src/app/symptoms/page.tsx`)

设计稿 = `triage.html`。

**结构:** navbar(返回 + 宠物胶囊)→ head(衬线 H1『它现在最让你担心的是?』)→ styletoggle(图标/小猫插画)→ 搜索框 → 信任折叠条 → 「可能要急的」分区 + urgent grid → 「常见」分区 + common grid → 空态 → 吸底 dock。

| 元素 | 映射 / 动作 |
|---|---|
| 症状数据 | **复用现有 17 张 `SYMPTOMS`(id+label+sub+tier)**,按设计样式重绘。设计稿只画了 11 卡,**以现有 17 卡为准**,别照搬少卡集 |
| 症状卡 `.card` | 白卡 18 圆角 + 42px 图标块 + 双行文案;选中态陶土红描边 + 图标底变 `--accent-tint` + 右上勾;急症卡左 3px 红竖条 + 右上红点(`--red`) |
| styletoggle 图标/插画 | 插画模式用 `CatFace`(按症状名取 `SYM`)。**可拆后做**,首版先「图标模式」 |
| 搜索框 | 按 `dataset.k` 关键词 + 标题过滤,无匹配 → 空态跳问答 |
| 信任折叠条 | **复用 `ReviewedNotice` 折叠变体**,措辞不重写(「不替代面诊」保留) |
| dock 两态 | 未选 → `.bridge`『找不到?去问答直接描述 →』;选 ≥1 → 陶土红渐变 `.next` + 计数胶囊 |
| **交互升级(行为变更)** | 现有是「单选一卡即跳」,设计是「多选 + dock + next」。`lib/triage.ts` 的 `FLOWS` 按单 symptom 取流。**建议先按「多选视觉 + 取主症状(sel[0])跳 `/triage?symptom=`」落地,保留单值路由**;多症状合流是大工程,留后。**待拍板 Q5** |

**保留的业务逻辑:** `?symptom=` 路由、`lib/triage.ts` 全套引擎、`decideTier`、`hasRedFlag`、`triage-handoff`、`recordTriage`。**设计稿那个底部 result sheet 是 demo 简化版,绝不当真结果** —— 选完仍走完整 `/triage → /report`。

**红线护栏:** 选中态/勾框/dock 一律陶土红;红黄绿只接急症卡红点红竖条红字标签(三重传达,合规);插画只做「症状类别可爱图标」,**绝不示意病征**(脱水/苍白/呼吸困难等);Disclaimer 保留。

### 3.3 分诊问诊 `/triage`(`src/app/triage/page.tsx`)—— **优先做,换皮风险低收益高**

设计稿 = `inquiry.html`。

**结构:** 进度头 phead(返回 + 『分诊中·1/2』+ 进度条)→ `.ctx` 症状锚点胶囊 → 衬线大问题 `.q` 24px → hint → 选项区 → 「以上都没有」分隔 + 否定项 → 底部单一 `.nextb` 大按钮 + foot 红线。

| 元素 | 映射 / 动作 |
|---|---|
| 选项 `.opt` | 改成宽行卡:左 48px 图标块(物件 SVG)+ 中双行文案 + 右方形勾框;选中态陶土红描边 + 勾框填陶土红出白勾 |
| 进度条 | 现有 `(step+1)/total` 逻辑复用,换设计皮 |
| 「以上都没有」`.opt.none` | 现有 `exclusive` 否定项互斥逻辑 = 设计 `.divnone` + 中性灰配色,直接换皮 |
| nextLabel 动态文案 | 现有已有,保留 |

**保留的业务逻辑(安全红线):** 多选/单选(`q.multi`)、互斥否定项、**红旗急停(`hasRedFlag` → `toReport('red')` 中途急停)**。**绝不能用设计 demo 的「其它→红/没有→绿」简化逻辑** —— 必须走现有 `hasRedFlag/redFlag`。

**红线护栏:** `.ctx` 红点 = 「这是急症轨道」语义(合规),但建议配文字佐证(如「可能误食」),不留裸红点;foot『AI 整理·不能替代兽医』逐字保留;无「诊断」字样。

### 3.4 安心报告 `/report`(`src/app/report/page.tsx`)—— **已高度落地,只补 1 处**

设计稿 = `report.html`。现有已实现:分级 Hero 卡 + 地图深链 CTA + `ReviewedNotice` + 继续问问 + steps/why/escalate + `ShareReportButton` + `Disclaimer`,**且文案库(11 group + 5 红线急停)远比设计稿 demo 丰富**。

**唯一差量:** Hero 卡右上角加 **62px 圆形情绪猫**(`CatFace`,red→worried 皱眉、green→relieved 微笑)。优先级低,锦上添花。

**红线护栏(关键):** 报告 Hero 情绪猫**必须用 `CatFace` 的 MOOD 通用插画,绝不用用户 AI 生成图**;严守 `docs/product/AI生成形象-实施说明.md` §二 —— 仅作「报告卡角落情绪陪伴」,**绝不与脱水/苍白/呼吸困难等诊断信号绑定、不进病征示意**。CTA 大面积红 = CTA 即风险信号本体(合规);ReviewedNotice 盾用 `--accent` 非绿(合规)。

### 3.5 问答 `/behavior`(`src/app/behavior/page.tsx`)—— 已落地核心,补几处

设计稿 = `qa.html`。现有已实现:EmptyState + STARTERS + 气泡 + Thinking + FollowupChips + ContextChip + composer + 去分诊兜底 + Disclaimer + SSE 流式 + 压缩。

| 差量 | 动作 | 红线 |
|---|---|---|
| ① 空态分类 chips(推荐/健康/喂养/行为/日常) | 新增横滚切换,选中陶土红实心 | 纯 UI,合规 |
| ② 推荐问题行『和哈基米有关』标签 | 新增 | **⚠ 设计稿用了绿(`--risk-green`)装饰,撞红线!落地必须改 `--accent`/`--accent-tint`** |
| ③ 最近问过 history | 可选,读 localStorage `kind:behavior` 记录 | 合规 |
| ④ 答案体内急症横幅 `.er` | **强烈建议做**:命中急症词(呼吸/喘/误食/尿不出/出血/抽搐…)→ 答案顶插红横幅 + 红 CTA。这是「红旗中途急停」红线的前端可视化 | 红底红字 = 风险信号本体,合规 |
| ⑤ 答案偏黄/偏绿微标 `.lchip` | 可选,仅答案确有倾向时出、用 `--amber/--green` 实色 | 风险三色合法用途 |
| ⑥ ContextChip 圆点按档位上色 | **现有固定陶土红,丢了档位信号 → 改按 tier 取 `--red/--amber/--green`** | 把三色用对地方,合规更优 |
| 用户气泡 | 现有墨黑 `bg-ink`;设计稿陶土红渐变 | **审美取舍,待拍板 Q6**(倾向陶土红渐变,与发送键统一) |
| 拍照/语音 icon | 设计稿仅 toast 假实现 | **暂不落地**,避免未实现入口 |

**保留:** SSE 流式、压缩、handoff、from=triage 上下文带入 —— 全部不动。

### 3.6 毛孩子 `/pets`(新页面) + 档案编辑

设计稿 = `pets.html`(展示) + `pet-edit.html`(编辑)。**这是现有产品没有的新形态**(现有 TabBar 第 4 tab 指向 `/onboarding`)。

**路由决策:** 设计稿拆两个 html,但**落地不必拆路由**。两个选项:
- **(推荐)沿用现有 `/onboarding` 单页双态**(`isEdit && !editing` = 展示态 / 否则编辑态),只换视觉外壳;TabBar 第 4 tab 仍指 `/onboarding`,**导航零改动**。
- 或新建 `/pets`(展示)+ `/onboarding`(编辑),TabBar href 改 `/pets`、`SHOW_PATHS` 加 `/pets`。
- ➡️ **见 Q7。倾向沿用现有单页双态,改动最小。**

**展示页(对应 pets.html):**

| 区块 | 动作 |
|---|---|
| Hero 暖橘渐变背景 | 把现有页面 hero 区背景按设计加强(`#f6e7d6→#f3ddc6`) |
| 头像卡 | **复用 `CatAvatar`**(保留 AI 生成/上传弹窗 + NOT_A_CAT 守门),外观加 `.avslot` 暖橘渐变 + 相机角标;无生成图时回退用 `CatFace` |
| 性别徽章 | 母 粉(#fbeaf1/#c77fa0)/ 公 蓝(#e6f0f8/#5a90c2)—— 装饰场景色,不入 token |
| **速览统计条(新增)** | 年龄/体重/记录数/陪伴天数四宫格。**全部从现有 `Store/Cat` 派生**(`ageLabel`、`weight`、`records.filter(catId)`、`homeDate` 算),无需新字段 |
| 健康档案行(疫苗/驱虫/绝育) | 升级现有 GroupCard 为带 icon + 状态徽章。映射 `vaccines/deworm/neutered`;状态(done/due/no)派生逻辑或先静态。**⚠ 见红线:due 用风险黄违规,改中性/陶土红** |
| 健康记录时间线 | 升级现有 HealthFootprint 为逐条事件。数据源 `store.records`(`kind/tier/symptom/date/summary`);dot 颜色:triage 用 `tier→g/y/r`、behavior 用中性灰 `b`;复用 `TIER_VIS` |

**编辑页(对应 pet-edit.html):**

| 元素 | 动作 |
|---|---|
| 导航栏 | 取消 / 标题『编辑资料』/ 保存(陶土红);**固定「编辑资料」,绝不出现「添加毛孩子」** |
| iOS 设置风分组 `.group` | 对应现有 `EditCard`,min-height 54、左标签右值、1px 分隔 |
| 分段控件 `.seg` | 复用现有 `SegRow`,微调圆角 |
| 体重 stepper | 新增 −/数值/+ 步进器(步进 0.1、范围 0.2–15) |
| 品种 picker bottom sheet | 照现有头像弹窗 fixed inset-0 范式新增,预设清单 + 「其它/不确定」回退;写回 `Cat.breed` |
| 健康提醒开关组 | **新增 Toggle**(开态陶土红)。**MVP 可先做纯 UI 开关不接后端**(无推送);或新增 `Cat` 字段。见 Q8 |
| 危险区「移除这只毛孩子」 | **去掉**(单猫不删);或改非破坏「清空重填」需二次确认 |

**保留的现有资产(设计稿没画,不可丢):** AI 头像生成 + 上传弹窗 + NOT_A_CAT 守门、生活照相册(≤6 张)、WeightSparkline、健康背景分组(慢性病/过敏/备注,喂给分诊上下文)、查看页分组卡点击直达编辑 anchor。

**数据字段差异(待对齐,非阻塞):**
- 生日:设计用 `date`→算月龄;现有用 `ageMonths` 滑块。**建议沿用 `ageMonths` 省改动**,或新增 `birthDate` 派生。
- 性别:设计「公/母」两段;现有「雌/雄/不确定」三段。**建议保留三段(含「不确定」更贴新手)**。

**红线护栏:** Disclaimer 保留;头像猫脸属许可范围;无「诊断」字样;**多猫相关全砍(见 §4)**。

---

## 四、多猫切换红线决策 ⚠️ **待用户拍板**

### 4.1 撞红线的内容

设计稿 `pets.html` / `pet-edit.html` 加了完整多猫能力:
- `pets.html` 顶部 `.switcher` 多猫切换条(哈基米 / 奶豆 两只可切)+ 末尾 `.padd`「+」加猫按钮。
- `pet-edit.html` 配套 `PETS` 双猫数组 + `?add=1` 添加模式 + `?pet=N` 切换编辑 + 「添加毛孩子」标题 + 底部「移除这只毛孩子」删除按钮。

**直接撞 CLAUDE.md 产品红线:「不做多猫切换 UI(数据结构留接口)」。**

### 4.2 明确建议(默认守红线)

**落地只做单猫,数据结构保留数组以备未来,UI 不暴露任何切换/增删。** 具体砍掉:
1. `.switcher` 切换条与第二只「奶豆」;
2. 末尾「+」加猫按钮、`.padd`、`?add` 添加模式;
3. 编辑页标题固定「编辑资料」,不出现「添加毛孩子」;
4. 「移除这只毛孩子」删除按钮(单猫不删)。

**数据层天然已留好接口** —— `types/cat.ts` 注释明确写「数据层按多只猫设计(留接口),MVP 的 UI 只做单猫」,`Store.cats` 是数组、`activeCatId` 已存在。现有 `onboarding` 也正是只读 `cats[0]/activeCat`。**UI 拿掉切换/增删完全不动数据结构。**

### 4.3 为何不破例

多猫切换不是视觉问题,是**产品边界问题**:它会把「单只猫的安心分诊」拉向「多宠管理工具」,稀释「怕→安心」情绪轴与「看病主场景」聚焦,且引入删猫/切猫的数据与权限复杂度。守住单猫 = 守住产品定位。

➡️ **Q9:确认默认守红线只做单猫(留数据接口)?** 若用户坚持要多猫,需单独立项重新评估红线。

---

## 五、红线护栏总表(实现时逐条核对)

| 红线 | 护栏 |
|---|---|
| **风险三色独立信号层** | 红黄绿**只**接风险语义:record/timeline tier 点、症状急症卡红点红竖条、报告 badge/hero 色块、问答急症横幅/偏黄偏绿微标/ContextChip 档位点、价值主张 rgy 示意点。**所有装饰**(pill dot、Toggle 开关、CTA、选中态、勾框、sex chip、'和哈基米有关'标签、健康档案 due 徽章)**一律陶土红/中性灰/装饰专色,绝不从风险盘取色**。三重传达(色+图标+文字),不靠颜色单扛 |
| **医疗克制不诊断** | 统一「建议是否就医 / 该不该去医院」,**绝不出现「诊断」**;每屏底部固定 `Disclaimer`「AI 整理·不能替代兽医」,重排不移除;信任条「经执业兽医逐条审核 + 不替代面诊」措辞复用不重写 |
| **红旗中途急停** | `/triage` 任一 redFlag 勾中 → 立即 `toReport('red')` 急停,不照设计 demo 简化;`/behavior` 命中急症词 → 答案急症横幅 + 直跳就医。**UI 换皮不动安全逻辑** |
| **不做电商/社区/养成/登录** | 报告找医院走地图 deep link(不自建医院库);院子是桌宠陪伴**绝非养成**;无登录墙/电商/导流/社区 |
| **AI 形象不进医学图** | 卡通猫(`CatFace`/AI 头像)仅用于:头像、院子陪伴、报告卡角落情绪猫、症状卡装饰图标。**绝不**进入或暗示病征示意(分诊症状描述、报告病征、知识页关键信号);报告 Hero 情绪猫用 `CatFace` MOOD 通用插画,**非用户 AI 生成图** |
| **单猫** | 见 §4,砍多猫切换/增删 UI |
| **中文不用斜体;衬线只给标题** | 若引入 Noto Serif,仅标题/名字/情绪文案;功能文字黑体;中文不斜体 |

---

## 六、分批实现路线(每批可独立验证 / 上线)

> 部署须经用户批准(MEMORY:安心猫部署须批准)。本地改码/验证/commit/push 可自行做。

### 批〇 · 公共前置(两小时级,无 UI 变化)
- 补 `--accent-deep / --accent-tint` 2 token;阴影调暖。
- 移植 `cat-illus.js` → `lib/cat-illus.ts` + `components/CatFace.tsx`(纯 SVG,零依赖)。
- **验证:** `npm run build` 类型通过;`CatFace` 在一个临时页渲染 6 眼×5 嘴正常。
- *决策依赖:* §2.2 字体 Q1 最好在此批前定(影响标题类名)。

### 批一 · 首页先行(差量最大、最治「看不懂功能」)
- 补价值主张 + 看病 CTA 大按钮(链 `/symptoms`)。
- 院子顶部加常驻 glass pills(看病/聊天/小知识)。
- 问候条精简(若 Q2 拍板砍厚资料卡)。
- 气泡视觉对齐(功能逻辑不动);record/TabBar 视觉微调。
- **验证:** 首页「一眼看懂看病在哪」;院子桌宠/拖家具/跟进闭环全部照常;Disclaimer 在。

### 批二 · 分诊 / 报告核心流(看病主链路)
- `/triage` 问诊换皮(优先,风险低):宽行选项卡 + phead 进度头 + 否定项分隔。**红旗急停逻辑回归测试**。
- `/symptoms` 分诊换皮:卡片/分区/搜索/信任折叠条/dock(先图标模式 + 取主症状跳转)。
- `/report` 补 Hero 角落情绪猫。
- **验证:** `npm run triage:check` + `npm run medical:validate`(改判级相关须跑,MEMORY);走通 症状→问诊→报告 全链路;误食/呼吸等红旗直跳红档。

### 批三 · 问答(已落地,补差量)
- 空态分类 chips;『和哈基米有关』标签(**用陶土红**);急症横幅 `.er`;ContextChip 档位上色;可选 history/偏黄偏绿微标;可选用户气泡改陶土红渐变。
- **验证:** SSE 流式/压缩照常;急症词命中弹横幅;`scripts/harness-behavior.mjs` 通过。

### 批四 · 毛孩子(全新页 + 砍多猫,成本中高)
- 编辑页 `.group/.seg/stepper/picker sheet/Toggle` 视觉重建(改动集中,先做)。
- 展示页 hero/statrow/健康档案行/时间线(接 `store.records`)。
- **多猫切换/增删:直接不做(守红线)。**
- **验证:** 单猫档案录入/编辑/查看闭环;相册/AI 头像/WeightSparkline 保留;Disclaimer 在;无多猫 UI。

### 批二/三 顺序说明
批二、批三相对独立,可并行或调序;批四依赖批〇的 `CatFace`。**院子尽量少动(产品最复杂资产)。**

---

## 七、非目标 / 风险 / 待用户确认的开放问题

### 7.1 非目标(本次不做)
- 多猫切换/增删 UI(守红线,§4)。
- 拍照/语音输入(设计稿仅假实现)。
- 通知系统 / 铃铛实际功能(无后端推送)。
- 院子 CSS 猫替换现有雪碧图(现有更强,不回退)。
- 多症状合流分诊引擎(首版取主症状)。
- 数据库 / 登录 / 电商 / 社区 / 养成。

### 7.2 风险
- **R1 字体决策反复:** 若先按一种字体落地后改判,标题类名要返工。→ 批〇前定 Q1。
- **R2 院子改动溢出:** `page.tsx`(81KB)是最复杂资产,加 pills/氛围时易碰到拖拽/深度排序/缩放(近期 commit 5d6af61 刚修过手机裁切)。→ 院子只做加法(叠 pills 层),不重构布局;改后必在手机尺寸回归。
- **R3 分诊「单选→多选」行为变更:** 涉及 state + dock + 是否合流。→ 首版只做「多选视觉 + 取主症状跳转」,保留单值路由,降风险。
- **R4 红旗急停被换皮误伤:** 换 UI 时若顺手简化逻辑会破安全红线。→ 批二硬性回归 `triage:check`,redFlag 选项逐一验。
- **R5 装饰误用风险色:** 设计稿本身就有 2 处违规(qa『和哈基米有关』用绿、毛孩子 due 用风险黄)。→ 实现时按 §5 总表逐条核对,不照抄。

### 7.3 待用户拍板的开放问题
- **Q1(字体,影响批〇):** 引入 Noto Serif SC(标题更有温度,贴设计稿)还是沿用 SF/PingFang(更 iOS 克制)?**倾向:引入,仅限标题/名字/情绪文案。**
- **Q2(首页问候条):** 砍厚资料卡为精简问候条(跟终稿,首页留给桌宠)还是保留厚卡(信息全)?**倾向:跟终稿精简,资料移交毛孩子页。**
- **Q3(院子入口):** 常驻 glass pills / 保留心事泡彩蛋 / 两者都要?**倾向:加常驻 pills(可发现性)+ 心事泡降级彩蛋。**
- **Q4(铃铛):** 无通知系统,暂不实现?**倾向:暂不做。**
- **Q5(分诊多选):** 首版「多选视觉 + 取主症状跳转、保留单值路由」可接受?还是要真多症状合流?**倾向:先取主症状。**
- **Q6(用户气泡):** 墨黑 vs 陶土红渐变?**倾向:陶土红渐变(与发送键统一)。**
- **Q7(毛孩子路由):** 沿用现有 `/onboarding` 单页双态(导航零改) vs 新建 `/pets`?**倾向:沿用单页双态。**
- **Q8(健康提醒开关):** MVP 纯 UI 开关(不接后端) vs 新增 Cat 字段 + 提醒机制?**倾向:先纯 UI / 或暂不做。**
- **Q9(多猫,核心):** 确认默认守红线、只做单猫(留数据接口)?

---

## 附:关键文件索引(绝对路径)

**落地目标**
- 首页:`/Users/mantou/project/pet/src/app/page.tsx`
- 分诊:`/Users/mantou/project/pet/src/app/symptoms/page.tsx`
- 问诊:`/Users/mantou/project/pet/src/app/triage/page.tsx`
- 报告:`/Users/mantou/project/pet/src/app/report/page.tsx`
- 问答:`/Users/mantou/project/pet/src/app/behavior/page.tsx`
- 毛孩子/档案:`/Users/mantou/project/pet/src/app/onboarding/page.tsx`(或新建 `/pets`)
- 令牌:`/Users/mantou/project/pet/src/app/globals.css`

**复用 / 新增组件**
- `/Users/mantou/project/pet/src/components/TabBar.tsx`(改 profile 图标 + 高度;href 视 Q7)
- `/Users/mantou/project/pet/src/components/ReviewedNotice.tsx`(加折叠变体)
- `/Users/mantou/project/pet/src/components/Disclaimer.tsx`(保留)
- `/Users/mantou/project/pet/src/components/ShareReportButton.tsx`(保留)
- `/Users/mantou/project/pet/src/components/CatAvatar.tsx`(回退升级)
- `/Users/mantou/project/pet/src/components/PetSprite.tsx` + 院子系统(保留)
- **新增** `/Users/mantou/project/pet/src/lib/cat-illus.ts` + `/Users/mantou/project/pet/src/components/CatFace.tsx`

**逻辑 / 类型(保留不动)**
- `/Users/mantou/project/pet/src/lib/triage.ts`(`FLOWS/getFlow/decideTier/hasRedFlag/selectedClaimIds`)
- `/Users/mantou/project/pet/src/lib/triage-handoff.ts`
- `/Users/mantou/project/pet/src/types/cat.ts`(`Store.cats` 数组 + `activeCatId` 已留多猫接口)

**设计稿(参考,不照搬脚手架)**
- `/tmp/design-import/untitled/work/{home,A,B,C,triage,inquiry,report,qa,pets,pet-edit}.html`
- `/tmp/design-import/untitled/work/shared.css` · `/tmp/design-import/untitled/work/cat-illus.js`

**验证命令**
- `npm run build`(类型 + 构建)
- `npm run triage:check` + `npm run medical:validate`(改判级相关必跑)
- `scripts/harness-behavior.mjs`(问答压缩 + 连贯性)
