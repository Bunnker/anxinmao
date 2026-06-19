# 分诊图文化 + 红/黄档处理增强 设计 spec

> 2026-06-19。来源:用户要「① 分诊病情从纯文字→图文 ② 选项带趣味性 ③ 红档别只『去医院』,
> 加院前处理/缓解」。经对齐,**红档缓解走安全拆分**(见 §0 红线)。分支 `pet-home`。
>
> **首要驱动(用户反馈)**:「红档全是『去医院』,感觉不靠谱」。诊断:问题**不是**"让去医院"错了,
> 而是红档**太单薄、像甩锅**——没让用户觉得 app 真分析过、真在帮忙。解法=**把红档做厚做具体**
> (为什么急 + 现在马上能做什么),提升**可信度**,而**不是**弱化「立刻就医」。这条让 Part C(红档)
> 成为最高优先,批次据此重排(见 §5)。

## §0 不可妥协的红线(本功能特有)

1. **图像**:症状/选项配图**只用中性线性 SVG 象形图**(脏器/概念/动作示意),**绝不用桌宠那只橘猫
   卡通或任何家猫形象**做病情示意 —— 来自 CLAUDE.md「AI 生成形象不进医学示意图」。理由:家猫卡通
   绑定「呼吸困难/牙龈苍白」等诊断信号会给错误信号。
2. **红档**:首屏 `badge`「红档 · 立刻就医」+ `headline` **保持不变**。新增的转运急救只是「送医前 / 路上
   能做的」,文案**绝不暗示可以不去 / 晚去**。硬红旗急停语义不动。
3. **判级不动**:本功能是**纯展示层增量**,不新增/不修改任何分诊问题、权重、判级阈值、急停逻辑。
   改完必须跑 `npm run triage:check` + `npm run medical:validate` 双绿。
4. **内容来权威源**:红档转运急救 / 黄档居家缓解的**每条文案**都对接 `docs/medical/` 下已审急救卡
   (trauma / heatstroke / seizure / constipation / general-triage 等),不自由发挥。source-authority 框架。
5. **多终端避让**:`src/lib/medical-knowledge.ts`、`src/types/cat.ts`、`docs/medical/ai-cards/*`、
   `behavior/page.tsx` 等正被另一条工作流改(在 dirty 列表)。本功能**只读**急救卡,**只写**:
   `src/lib/triage.ts`、`src/app/report/page.tsx`、`src/app/symptoms/page.tsx`、`src/lib/cat-illus.ts`
   (或新建 `src/lib/triage-icons.ts`)—— 全是当前干净的文件。

## §1 目标 & 范围

| Part | 做什么 | 改哪 |
|---|---|---|
| A 症状图文化 | 17 张症状卡加中性线性图标 | `symptoms/page.tsx`(Symptom 类型 + 渲染)、icons 库 |
| B 选项趣味性 | 分诊选项加可选图标(先高频流) | `triage.ts`(TriageOption + 填充)、`triage/page.tsx`(渲染)、icons 库 |
| C 红档转运急救 | 红档加「送医前/路上能做的」步骤 | `report/page.tsx`(TierInfo + OVERRIDE + 渲染) |
| D 黄档居家处理 | 黄档加「在家缓解 / 观察要点 / 升级条件」 | `report/page.tsx`(同上) |

不做:第三方图标库;改急救卡;改判级;红档「在家缓解可不去」。

## §2 图标方案(Part A/B 共用)

- **形态**:自绘**线性 SVG 象形图**,viewBox 24×24,`stroke=currentColor`、`fill=none`、圆角线头,
  与 `TabBar.tsx` 同手感(克制但友好、暖,不临床)。趣味性来自「友好圆润的简笔 + 与症状语义贴合」,
  不靠卡通脸。**非家猫、非第三方库、非 emoji**(emoji 跨端不一致、含动物表情易擦红线)。
- **库**:新建 `src/lib/triage-icons.ts` 导出 `ICONS: Record<string, string>`(SVG 字符串),
  模仿现有 `cat-illus.ts` 的字符串 SVG 模式。一个 `<Icon name= size= className=>` 极简组件(dangerouslySetInnerHTML)。
- **尺寸**:症状卡 22–24px;分诊选项 16–18px(不抢题文)。色:`currentColor`,继承 `--ink` / 选中态 `--accent`。
- **症状图标清单(17)**:呕吐(嘴+波纹)、腹泻、不吃(空碗)、精神差(下垂)、打喷嚏(鼻+飞沫)、
  耳朵、皮肤(毛+痒)、眼睛、口腔(牙)、行为(脑/问号)、跛行(腿)、误食(警示+叶)、呼吸(肺/气流)、
  大量出血(滴)、尿闭(膀胱+禁止)、小便不对劲(尿滴)、其它(三点)。**均为概念/脏器象形,不画猫脸。**
- **选项图标**:按语义复用症状图标 + 补「次数/血/胀/也拉/都没有(对勾)」等小图;**可选字段,缺省不渲染**,
  分批填、不阻塞。

## §3 数据结构改动

### Part A — Symptom(`symptoms/page.tsx`)
```ts
type Symptom = { id; label; sub; tier; icon?: string };  // icon = ICONS 的 key
```
渲染:卡片 label 前加 `<Icon name={s.icon} size={22} className="text-ink/70 shrink-0" />`,
flex 容器,不影响红点/副标题。

### Part B — TriageOption(`triage.ts`,第 8–15 行)
```ts
type TriageOption = { label; weight?; redFlag?; exclusive?; claim?; claims?; icon?: string };
```
渲染(`triage/page.tsx` 选项行,label `<span>` 前):
```tsx
{opt.icon && <Icon name={opt.icon} size={17} className="mr-2 text-ink/55 shrink-0" />}
```
缺省零变化;238 选项分批填,先 vomit/diarrhea/noeat/breath。

### Part C/D — TierInfo(`report/page.tsx`,第 62–72 行)新增可选字段
```ts
type TierInfo = {
  /* ...现有 8 字段不动... */
  dangerTitle?: string;     danger?: DangerItem[];          // 红档:为什么不能等(危险性+时限,源自官方资料)
  transportTitle?: string;  transports?: string[];          // 红档:送医前/路上急救
  mitigationTitle?: string; mitigations?: string[];         // 黄档:在家缓解
  monitorTitle?: string;    monitors?: string[];            // 黄档:观察要点
  // 升级条件复用现有 escalateTitle/escalateItems(黄档也展示)
};
type DangerItem = { text: string; source: string };  // text=危险性解释; source=权威出处
// 全量联动(2026-06-20 重构):红卡 = 组级基线(TierInfo.danger,该急症核心危险总显示)
//   + DANGER_BY_CLAIM[c] for c in 用户选中的 claimIds(中央总表,覆盖 16 流全部「令人担心」的选项),去重、封顶 6 条。
// DANGER_BY_CLAIM 共 83 条,逐条从 docs/medical/source + 证据-*.md 提炼 + 对抗安全校验(删无源/夸大/越界)。
// 良性/低危选项不入表(红卡不显示无谓内容);emg_* 跨组共享只定义一次。每条带各自权威出处。
```
渲染:在「为什么这么判断」section 之后、「升级清单」之前插入(均为可选,有才渲染):
- 红档:`shownTier==="red" && info.transports` → 「送医前 / 路上能做的」步骤列表(复用 `Step` 组件)
- 黄档:`shownTier==="yellow" && info.mitigations` →「在家可以这样缓解」;`&& info.monitors` →「盯着这几点」

## §4 红/黄档文案(对接已审急救卡,source-authority)

每条都标注来源急救卡,**不自由发挥**。示例(最终以卡原文为准):

### §4.0 红档「为什么不能等」(危险性解释,最高优先 —— 直接解决"不靠谱"反馈)
- 目标:让用户**看懂危险机制 + 时限**,意识到"这不是 app 偷懒甩锅,是真的等不得"。可信度靠**具体 + 权威**。
- **每条危险性解释必须从官方/权威资料提炼**(仓库:`docs/product/证据-*.md`、`docs/medical/source/*.source.md`、
  已审急救卡;必要时回溯 Cornell / Merck / VCA / iCatCare / ASPCA 原文),`DangerItem.source` 标注出处。
- 形态:2–4 条短句,讲「会发生什么 + 多快」。示例(最终以源文为准):
  - urethra(尿闭):「完全堵塞后,毒素和钾在体内积聚,**24–48 小时内**可致急性肾衰 / 高血钾心脏骤停。」(Cornell FLUTD / iCatCare)
  - ingest(误食):「很多毒物**数小时内**吸收,越早处理越可逆;有些**催吐反而更危险**,需兽医定。」(ASPCA APCC)
  - breath(呼吸困难):「张口呼吸 / 费力呼吸说明已在代偿边缘,可能**短时间内失代偿**。」(VCA)
- **图解(可选,非批1必须)**:若加,只用**中性示意/时间轴**(如"堵塞→24h→48h"危险时间轴、机制简图),
  **绝不用家猫卡通、绝不用可能误导的写实病征图**(守 §0.1)。批1先做文字解释,图解视效果再议。

**红档转运急救(transports)** —— 首屏「立刻就医」不变,这些是边送边做:
- breath(呼吸困难):路上保持绝对安静、别喂任何东西、放航空箱别按压胸腹、留意舌色/唇色变化
- blood(大量出血):干净纱布/毛巾**持续按压**别松、扎进去的异物**不要拔**、记出血起始时间
- urethra(尿闭):**别按压肚子/膀胱**、减少颠簸、保暖、立即走
- ingest(误食):**别自行催吐**(部分毒物催吐更危险)、带上包装/植物样本拍照、记摄入时间与量
- digest(剧吐/血吐):看到线状物**绝不外拉**、呕吐物拍照、止吐药不自己喂

**黄档(mitigations/monitors/escalate)** —— 黄档本就「尽快门诊、非急停」,居家观察安全:
- mitigations 在家缓解:按症状给(如 禁食观察时长、少量多次饮水、安静温暖处休息、别喂人药)
- monitors 观察要点:食欲 / 排尿排便次数 / 精神 / 呼吸频率 / 牙龈色 —— 给可量化的盯点
- escalate 升级条件(复用):出现哪些信号立刻转红、立刻就医

## §5 分批落地(逐批 commit,逐批给你看截图)

> 顺序按「验证过的痛点优先」重排:红/黄档内容先做(直接解决"红档不靠谱"反馈),图标后做。

- **批 1**:红档「为什么不能等」+ 转运急救(Part C)。TierInfo 扩 `danger[]`+`transports[]` + 渲染 +
  5–6 红线组文案。**危险性解释从官方资料提炼、标注出处**;转运急救对接急救卡。解决"红档单薄/甩锅/不靠谱"
  核心痛点。先看红档观感。(图解可选,留到效果确认后再议。)
- **批 2**:黄档居家缓解/观察/升级(Part D)。TierInfo 扩 `mitigations[]/monitors[]` + 渲染 + 各组文案。
- **批 3**:图标基建(`triage-icons.ts` + `Icon` 组件)+ 17 症状卡图文化(Part A)。
- **批 4**:分诊选项图标(Part B),高频流(vomit/diarrhea/noeat/breath)先行,其余迭代。
- 每批:`npm run triage:check` + `npm run medical:validate` + `npx tsc --noEmit` 全绿 + 移动端截图。

## §6 验收

- 红档首屏仍是「立刻就医」,转运急救读起来是「去,且边送边做」,无任何「可不去」暗示。
- 黄档缓解/观察/升级三段清晰可扫读。
- 图标全为中性象形、无家猫卡通、移动端 375 下不抢文字。
- triage:check / medical:validate / tsc 全绿。
