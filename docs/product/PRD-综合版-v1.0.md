# 安心猫 · 产品需求文档(PRD 综合版)

**版本:** v1.0(综合版)
**最后更新:** 2026-05-24
**仓库:** [github.com/Bunnker/anxinmao](https://github.com/Bunnker/anxinmao)
**当前状态:** v1 主功能已上线本地,Vercel 部署未完成
**取代:** `PRD-v0.1.md`(讨论稿,内容已吸收)
**关联文档:**
- `前端设计PRD-v0.1.md` —— 设计规范(暖纸调、衬线标题等)
- `AI生成形象-实施说明.md` —— AI 形象功能边界与护栏
- `~/.gstack/projects/project/*-design-*.md` —— office hours 决策文档(2026-05-21 MVP 定位 + 2026-05-24 conductor 对话设计)
- `docs/product/证据-*.md` × 15 —— 兽医证据底稿(对接 Cornell / Merck / VCA / iCatCare / Anicira)

---

## 一、产品概述

### 一句话定义

**安心猫(anxinmao)** —— 面向新手猫主的"**安心决策伴侣**":猫不对劲时,5 步分诊 + 红黄绿风险报告 + 带出处的多轮追问,**降低不确定性下的焦虑**,而不是当一个百科 / 聊天机器人。

### 品牌定位

- 中文名:**安心猫**
- 英文 / repo:**anxinmao**
- 情绪轴:**怕 → 安心**
- 产品姿态:**Trustworthy Conductor**(主动追问 + 拒答未知 + 带出处),而不是 Oracle(给万能答案)

### 核心价值主张

1. **降低焦虑,不是提供信息**。用户掏手机时已经是焦虑状态,App 的任务是让他在 60 秒内有一个**可信判断 + 下一步动作**,而不是吐 2000 字百科。
2. **带出处的回答**。每条建议都标注 Cornell / Merck / VCA / iCatCare / Anicira 等权威源,**不编、不糊**。
3. **保守送医**。拿不准 → 偏向送医。错杀比漏诊安全(产品红线)。
4. **猫档案上下文**。每次问答自动结合猫的月龄 / 体重 / 疫苗 / 病史,不用重复说。

### 跟通用 AI 的 differentiation

| | 安心猫 | 豆包 / ChatGPT / Kimi(+ 联网) | 小红书 / 抖音 |
|---|---|---|---|
| 答案来源 | corpus 内权威源 + 拒答 | 自由互联网 + LLM hallucinate | UGC 良莠不齐 |
| 出处展示 | inline citation chip | 链接但常 ignore / 编造 | 几乎没有 |
| 红线症状 | 急停 + 直接送医模板 | 一般回避 / 没机制 | 凭运气刷到 |
| 主动追问 | ✅ 像兽医面诊 | ❌ 给什么回什么 | ❌ |
| 猫档案上下文 | ✅ 自动结合 | ❌ 用户自己重复 | ❌ |
| 焦虑闭合 | 红黄绿 + 在家护理 vs 送医 | 长篇科普,需用户自己消化 | 一堆别人案例,自己对号入座 |

---

## 二、目标用户与场景

### 主画像

**「刚养猫的新手,纯新手」**,典型特征:
- 把猫接回家头几周 / 几个月
- 对猫一窍不通,但**怕做错、怕害了猫**(office hours 2026-05-21 原话:"主要担心小猫生病")
- 国内、移动端为主,搜索型(非 chatbot 型)
- 信息渠道:小红书 / 抖音 / 百度 / 朋友
- **不爱社交,愿意 self-serve 解决问题**

### 真实场景(用户自身经历)

#### 场景 1:急性焦虑(果冻案例)
> 半夜 11 点,果冻(用户的小猫)连续打了 10 个喷嚏,流清鼻涕。用户:这要不要去医院?现在去急诊还是等明天?

**当前流程(/symptoms → /triage → /report):**
- 选「打喷嚏」卡片 → 5 个追问(频次 / 鼻涕颜色 / 精神 / 食欲 / 接触史)→ 黄档可在家观察 + 升级条件清单

**v1.1 计划(本次 office hours 设计):**
- 报告下方加「就这个问题继续聊」→ 进 conductor 对话 → 用户可以继续追问"那要不要先给雾化?用什么浓度?"→ AI 拒答(剂量类) + 拿权威源原文 + 强烈建议明天看兽医

#### 场景 2:日常决策
> 果冻 6 个月,要不要变成成年猫粮?可以洗澡了吗?能不能给吃奶酪?

**当前流程:** 无专属流(/behavior 可问,但缺出处 + 通用)

**v1.1 计划:** conductor 对话 + 引用 Cornell / Merck 营养段落

#### 场景 3:用药咨询
> 兽医开了某种眼药水,但忘了具体用法。能不能问 AI?

**v1.1 计划:** AI 拒答(不开剂量),只拿 corpus 原段落 + 建议联系开方兽医

#### 场景 4:确认安心
> 看了别人说的,猫这种情况通常 X,我家猫也是 X,是不是就没事?

**v1.1 计划:** 通过追问(月龄 / 病史 / 时长 / 伴随症状)做风险判断,不是简单 echo。命中红线症状直接吐红档。

### 不做(明确边界)

- ❌ 多猫切换 UI(数据模型留接口,UI 不做)
- ❌ 用户社区 / UGC
- ❌ 医院推荐 / 电商导流(用地图 deep link 代替)
- ❌ 真人在线兽医
- ❌ 登录墙(localStorage 即可)
- ❌ 虚拟养成 / 图鉴 / 成长相册

---

## 三、产品红线 —— 不可妥协

来自 CLAUDE.md(office-hours 审核确立):

### R1 · 医疗措辞
- **绝不出现「诊断」「确诊」「肯定是」**。能说:「这种情况看着像 ...」「权威建议是 ...」「建议送医排查 ...」。
- 每屏底部固定:「**AI 整理 · 不能替代兽医**」。
- 知识页 / 对话页顶部固定:「**未经兽医审核 —— AI 依据公开兽医资料整理,但不能替代兽医的检查和诊断**」(UnreviewedNotice 组件)。

### R2 · 红旗症状急停
触发即弹送医模板,AI 不试图自由作答:
- 呼吸困难、张口喘
- 抽搐、惊厥
- 大量出血
- 尿不出 / 憋尿(尿道阻塞)
- 误食毒物(百合 / 巧克力 / 葡萄 / 对乙酰氨基酚 / 洋葱 / 鼠药等)
- 瘫软 / 叫不醒 / 昏迷

完整词表见 `~/.gstack/projects/project/mantou-unknown-design-20260524-175515.md` Appendix D。

### R3 · 风险三色独立信号层
红 / 黄 / 绿 不从暖色品牌盘里调色;**颜色 + 图标 + 文字** 三重传达,不靠颜色单扛。令牌:`--red / --amber / --green`(`src/app/globals.css`)。

### R4 · AI 生成宠物形象边界
- ✅ 允许:头像 / 伴侣角色(greeting / 报告卡角落 / 知识页氛围插图)
- ❌ 禁止:症状描述图 / 病征对比图 / 急诊红档信息层 / 分诊页症状细节
- 详见 `AI生成形象-实施说明.md` §二

### R5 · 不做这些
登录墙、电商 / 导流、社区 / UGC、多猫切换 UI、真人兽医在线问诊、用户上传猫照片做"诊断"(撞 R1)。

### R6 · 中文排版
- 中文不用斜体
- 衬线只用于标题 / 情绪文字,功能文字用黑体
- 暖米色基调 + 陶土红点缀,克制留白

---

## 四、整体功能架构

```
┌──────────────────────────────────────────────────────────┐
│                    安心猫(anxinmao)                       │
│              "猫不对劲时帮你做可信判断"                       │
└──────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
       【档案层】       【决策层】       【陪伴层】
       cat profile      triage flow     companion
            │               │               │
   ┌────────┴──────┐  ┌─────┴─────┐  ┌──────┴──────┐
   │ /onboarding   │  │ /symptoms │  │ /behavior    │  ← v1 已上线
   │ cat 字段录入   │  │ /triage    │  │ AI 行为问答  │
   │ 卡通头像生成   │  │ /report    │  │ (SSE+压缩)  │
   │ (Seedream 5)  │  │ (15 轨道)  │  │              │
   └───────────────┘  └────────────┘  └──────────────┘
                            │               │
                            │               └─ /knowledge ← v1 已上线
                            │                 「看着吓人但不必慌」
                            │                 6 张 AI 配图
                            │
                            ↓
                   ┌──────────────────┐
                   │ /ask (新)        │  ← v1.1 本次设计
                   │ Conductor 对话   │
                   │ 带 citation 多轮 │
                   │ + 拒答 protocol  │
                   └──────────────────┘
                            │
                            ↓
              ┌──────────────────────────┐
              │ v2 / v3 待评估            │
              │ - STT(语音输入)         │
              │ - 总结 / 历史复看         │
              │ - 多模态(撞红线评估)    │
              │ - 分享平台(撞红线)      │
              └──────────────────────────┘
```

---

## 五、功能矩阵 + Roadmap

### 阶段切片

| 阶段 | 状态 | 涵盖功能 | 时间预算 |
|---|---|---|---|
| **v1** | ✅ 已上线(本地) | 猫档案 + 5 步分诊 + 红黄绿报告 + 行为问答 + 安心知识页 + AI 卡通头像 | 已花约 1 个月 |
| **v1.0.1** | 🚧 部署中 | Vercel 公网部署 + 域名 | 1-2 天 |
| **v1.1** | 📋 已设计 | Conductor 对话(/ask),带 citation 多轮 + 拒答 | 1.5-2 周 |
| **v1.2** | 📋 待启动 | 行为问答 Q&A 持久化(localStorage 进阶) | 1 天 |
| **v2** | 🤔 评估中 | STT 语音输入、对话 summary 沉淀 + 历史复看 | 1-2 周 |
| **v3** | ⚠️ 撞红线 | 多模态照片诊断、分享平台、社区 —— 需重新讨论或砍 | n/a |
| **长期** | ⏳ 阻塞 | 找执业兽医审 docs/product/证据-*.md,撤 UnreviewedNotice | 看缘分 |

### 功能矩阵详细

| 功能 | 优先级 | 阶段 | 状态 | 说明 |
|---|---|---|---|---|
| 猫档案录入 | P0 | v1 | ✅ | /onboarding,字段:名/月龄/性别/毛色/体重/绝育/疫苗/驱虫/过敏 |
| 卡通头像生成 | P1 | v1 | ✅ | Seedream 5 image-to-image + Qwen-VL 守门(必须是猫)|
| 默认头像 fallback | P1 | v1 | ✅ | 没图时 SVG 猫脸 icon |
| 16 张症状卡 | P0 | v1 | ✅ | /symptoms,覆盖 15 个症状轨道 + other |
| 症状专属分诊流 | P0 | v1 | ✅ | /triage,每个症状 4-6 个追问 |
| 红黄绿安心报告 | P0 | v1 | ✅ | /report,11 个 group 各专属文案 |
| 5 个红线急停 | P0 | v1 | ✅ | digest/breath/blood/urethra/ingest 不出绿档 |
| 找附近医院 | P0 | v1 | ✅ | 红档跳高德地图 deep link,不自建医院库 |
| 行为问答(SSE) | P1 | v1 | ✅ | /behavior,DeepSeek/通义流式 + 对话压缩(20+ 轮) |
| 「看着吓人但不必慌」 | P1 | v1 | ✅ | /knowledge,Anicira 6 张配图 + ✓ chips overlay |
| UnreviewedNotice | P0 | v1 | ✅ | 顶部固定提示组件 |
| Disclaimer | P0 | v1 | ✅ | 底部固定「AI 整理 · 不能替代兽医」 |
| Vercel 部署 | P0 | v1.0.1 | 🚧 | 让产品公网可访问 |
| **Conductor 对话 /ask** | **P0** | **v1.1** | **📋** | **本次 office hours 主设计:带 citation 多轮 + 拒答 protocol** |
| /report 接「继续聊」 | P0 | v1.1 | 📋 | sessionStorage 传 context |
| Citation server-side 校验 | P0 | v1.1 | 📋 | LLM 给的 `[xxx §三]` 必须 cross-check corpus map |
| 红线词表 server-side 中间件 | P0 | v1.1 | 📋 | Level 1/2/3 分级,见 design doc Appendix D |
| 行为问答持久化 | P1 | v1.2 | 📋 | 数据模型已留 `kind:"behavior"`,落 localStorage |
| 语音输入(STT) | P2 | v2 | 🤔 | Web Speech API → text → /ask;1-2 天 add-on |
| 对话 summary 沉淀 | P2 | v2 | 🤔 | 用户主动「保存」一次对话 → 自动 summary + 配图 → 进「最近」列表 |
| 用户评价 / 补充 summary | P2 | v2 | 🤔 | 看完 summary 可点赞 / 补充细节,持久化 localStorage |
| 历史 summary 复看 | P2 | v2 | 🤔 | 「最近」section 可点开看历史 summary |
| 上传照片做诊断 | P3 | v3 | ⚠️ | **撞 R1 红线**:让 AI 看照片"诊断"= 违反「绝不出现诊断」。需要重新框定:可以做"照片识别症状关键词 → 跳现有分诊流",但不做诊断 |
| 分享 summary 到平台 | P3 | v3 | ❌ | **撞 R5 红线**:不做社区。需要彻底重新讨论或砍 |
| 兽医署名审核 | P0 | 长期 | ⏳ | 撤 UnreviewedNotice 的唯一路径 |
| 多猫切换 UI | P3 | 长期 | ⏳ | 数据模型留接口,UI 不做 |

---

## 六、关键功能 detail

### 6.1 猫档案模块 ✅

**目的:** 后续所有问答的"上下文源头"。

**字段:**
- 必填:名字(显示)
- 主字段:月龄、性别、毛色、体重(滑块)、绝育状态
- 选填:到家日期、疫苗记录(多条)、上次驱虫、过敏 / 慢性病备注、卡通头像
- 自动:`avatar?: string` (base64 dataURL,Seedream 生成)

**入口:** `/onboarding`(首次)/ 首页右上角头像点击(编辑)

**约束:**
- localStorage 持久化,key=`catTriage:v1`
- 数据模型按多猫设计(`cats[]` + `activeCatId`),UI 单猫
- 默认演示猫「豆豆」用于无档案时兜底

---

### 6.2 5 步分诊流 + 红黄绿报告 ✅

**目的:** 用户慌乱时,4-6 个追问内出可信判断。

**症状轨道(15 个):**
- 急症层:吐 / 拉 / 不吃 / 萎靡 / 误食 / 大量出血 / 尿闭 / 呼吸困难
- 日常层:打喷嚏 / 耳朵 / 皮肤 / 眼 / 口腔 / 行为突变 / 跛行
- 兜底:其它(general flow)

**Group 与红线:**
- 11 个 report group,每个有专属文案(`OVERRIDE[group][tier]`)
- 5 个红线 group **不出绿档**(`NO_GREEN_GROUPS`):digest / breath / blood / urethra / ingest

**证据底稿:** `docs/product/证据-*.md` × 15,每个 group 对接具体权威源 + 红线信号 + 居家护理边界。

**红档跳转:** 高德地图 deep link 找附近宠物医院,不自建医院库。

---

### 6.3 行为问答(/behavior) ✅

**目的:** 喂养 / 训练 / 行为习惯类轻量问答,跟分诊不重叠。

**实现:**
- DeepSeek 或通义(provider 无关,看 .env.local)
- SSE 流式输出
- 对话超 20 轮自动 compact(`/api/summarize` 生成 memo,替换历史)
- harness 测试脚本:`scripts/harness-behavior.mjs`

**问题:** 当前不带 citation,跟通用 AI 没差异。v1.1 的 conductor 对话(/ask)将取代或并存。

---

### 6.4 「看着吓人但不必慌」知识页(/knowledge)✅

**目的:** 降低新手家长的过度焦虑。

**6 张卡片(基于 Anicira 急诊 10 信号 §三 + Merck):**
- 猫发烧本身、粪便里少量血、打架后局部小脓肿、母猫发情期嚎叫打滚、单次短暂抽搐 + 完全恢复、猫咳嗽

**视觉结构(三层递进):**
1. 顶部场景图(放松状态的猫)—— Seedream/wanx 生成,情绪传达「安心」
2. 图底部 ✓ chips —— 从 why 抽取的「这几项都正常 = 通常不必慌」标准
3. 卡片下方红色 escalate 条 —— 升级信号请立刻走分诊

**红线:** 即使是「安心」类内容,仍带 UnreviewedNotice + 兜底「还是不放心 → 去分诊」入口。

---

### 6.5 AI 卡通头像 ✅

**目的:** 「自家猫脸」出现在 greeting / 报告角落,降低 App「陌生」感。

**实现:**
- 服务端 `/api/avatar`(密钥不进浏览器)
- 上传照片 → **Qwen-VL-Plus 守门**(`is_cat` + features 提取)
- 是猫 → ARK Seedream 5 lite i2i + features 前置 + watermark:false
- 不是猫 → 422 + `code:NOT_A_CAT` → 前端弹「用默认头像 / 换一张」
- 无照片 → wanx 文字生成回退
- 输出 base64 dataURL,落 localStorage

**展示位置(严格按 AI生成形象-实施说明.md §二):**
- ✅ 首页右上角(点击进 /onboarding 编辑)
- ✅ 报告页 header 左上角(身份标识)
- ❌ 症状描述 / 红档信息层 / 知识页关键信号(永远不进医学示意)

---

### 6.6 Conductor 对话(/ask)📋 **v1.1 主功能**

**详细设计文档:** `~/.gstack/projects/project/mantou-unknown-design-20260524-175515.md`

**目的:** 把「卡片覆盖不到的 long-tail 问题」和「报告后的延伸追问」收尾。

**三个产品行为(差异化核心):**
1. **拒答未知** —— corpus 没覆盖就说没覆盖,绝不编
2. **带出处 inline 显示** —— `[uri.cornell §三]` chip,点开看原段落
3. **AI 主动追问**(v1.1.x 推迟)—— 先问月龄 / 病史 / 持续时间,收集够再答

**实现:**
- 前端 `/ask`,UI 复用 /behavior 模式
- 后端 `/api/ask`,15 份证据 docs 全文 inject 系统 prompt(待 Step 0 token spike 验证)
- Server-side citation 校验(LLM 给的 ID 必须在 corpus map 内)
- Server-side 红线词检测(Level 1 急停;Level 2 加 system flag;Level 3 正常 RAG)

**入口:**
- 首页加按钮「问个有据可查的」 → /ask(与 /behavior 并存,7 天后看数据再定 /behavior 命运)
- /report 末尾「就这个问题继续聊」 → /ask,通过 sessionStorage 传分诊上下文

**Step 0 fail-fast:** token budget 不通就退 Approach C(真 RAG),不要硬走半路坍方。

---

### 6.7 后续考虑:summary 沉淀 + 历史复看 🤔 (v2)

**用户原话:** 「提供一个总结功能保存在用户界面 ... 用户觉得有用也可以评价补充细节 ... 下次还是遇见了可以直接查看这个总结看看之前聊过的解决办法。」

**评估结论(本 PRD):**
- ✅ 真实价值:节省下一次重复问的时间;沉淀「我家猫的事」
- ✅ 不直接撞红线
- 🤔 但 v1.1 上线前不做。原因:**先验证 /ask 真有人用,有用了再做沉淀**;没用就不浪费这部分工程
- ⚠️ 「分享出去给其他用户看」**=社区,撞 R5 红线,本 PRD 不纳入**。后续如果有强信号(很多人想要),再做单独的 office hours 重审

---

### 6.8 不做的功能(撞红线评估)

| 功能 | 撞哪条 | 是否可调整 |
|---|---|---|
| 上传猫照片让 AI 诊断 | R1(诊断)+ R5(医学示意) | ⚠️ 可改造:照片 → 识别症状关键词 → 跳现有 /symptoms,但「诊断」一词永远不出现 |
| 用户社区 / 看别人的 summary | R5(不做社区) | ❌ 红线明确 |
| 用户评价补充其他用户的内容 | R5(UGC) | ❌ 红线明确 |
| 分享平台 / 关注 / 信息流 | R5(社区) | ❌ 红线明确 |
| 真人在线兽医问诊 | R5(不做真人兽医) | ❌ 红线明确 |
| 医院推荐 / 跳预约 | R5(不导流)| ⚠️ 当前用高德地图 deep link 替代,边界 OK |
| 电商导购(猫粮品牌等) | R5(不导流)+ 信任风险 | ❌ 红线明确 |

---

## 七、技术栈

### 现有(v1 已固化)

- **Next.js 16 (App Router) + React 19 + TypeScript** —— 前后端一体
- **Tailwind CSS v4** —— 设计令牌在 `src/app/globals.css`
- **localStorage** —— 数据持久化,无数据库
- **大模型(DeepSeek 或 通义)** —— provider 无关,`src/lib/llm.ts`
- **图像生成:**
  - 卡通头像:**ARK Seedream 5 lite i2i**(主)+ wanx t2i(回退)
  - 视觉守门:**Qwen-VL-Plus**(via DashScope OpenAI 兼容)
- **静态资产:** /knowledge 配图走 codex/gpt-image-2 一次性生成,存 public/
- **测试 harness:** `scripts/harness-behavior.mjs`(对话压缩 + 上下文连贯)
- **部署:** Vercel(待启动)

### v1.1 新增

- corpus loader(`src/lib/corpus.ts`)—— 读 15 份 markdown frontmatter
- 红线词检测中间件(server-side)
- citation server-side 校验
- SSE event 协议(token / citation / sources_final 三类)

### 长期可能引入(待决策)

- pgvector / Supabase(如果 Step 0 token spike 不通,真 RAG)
- Vercel Blob(头像迁出 localStorage 时;非紧迫)
- Web Speech API(v2 STT)

---

## 八、成功指标

### v1 已上线衡量(主观)
- ✅ 自己用 + 朋友用,焦虑场景下能跑通核心流
- ✅ 红线症状测试用例命中急停
- ✅ 头像生成 + 视觉守门 + 知识页配图实际可用

### v1.1 conductor 对话上线后的硬指标

- **覆盖率:** 至少 5 条 corpus 内典型 query 能拿到带 citation 答案
- **拒答可信度:** 至少 3 条 corpus 外 query 能老老实实拒答(不编)
- **红线检测:** 至少 1 条红线症状描述 → server-side 命中 → 红档(不走 LLM)
- **citation 校验:** 至少 1 条 fail case → chip 自动 strip 替换灰字
- **用户感知差异:** 自己用 10 次后,「这跟豆包不一样」的感受是否成立(主观)

### 长期(无时间表)
- 至少 1 位执业兽医愿意审 docs/product/证据-*.md,且审过的 group 可在 UI 上撤 UnreviewedNotice
- 1-3 位真实新手猫主用过 + 反馈值得继续做

---

## 九、Risk / 待解

### Risk

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Step 0 token budget 不通,corpus 全文 inject 装不下 | 中 | 高(v1.1 推倒重做) | 先 spike 再投入,fail-fast |
| /ask citation 用户不看,差异化失效 | 中 | 中(P2 假设破产,差异化模糊) | v1.1 上线后人工自验 10 次,若 UI 没冲击力则调 citation 形式 |
| /ask 跟 /behavior 流量分散 | 高 | 低(可接受) | 默认并存,7 天后看数据决定 |
| 找不到兽医审 | 高 | 中(UnreviewedNotice 永远在) | 接受;UnreviewedNotice 本身已是「诚实告知」红线,无兽医也能继续用 |
| Vercel 部署后流量 0 | 高 | 低(本来就 side project) | side project mode,不焦虑 |

### 待解(Open Questions)

1. **/behavior 7 天后是否删** —— 看 /ask 流量分布,如果几乎全转到 /ask 就退场
2. **「summary 沉淀」如果做了,是否纯本地存 vs 跨设备同步** —— 跨设备 = 引入 user ID + 后端,挑战「不做登录」红线
3. **「上传照片」如果重新框定为「症状关键词识别」,是否过 R1 红线** —— 需要单独 office hours 评估
4. **品牌外延** —— 安心猫只做猫,未来如果要做狗、兔等其它宠物,品牌叙事如何延伸?(目前不阻塞,后置)

---

## 十、本 PRD 的边界与作用

- **本文件是产品全景图**,给 solo dev 看的「现在在哪 / 接下来做什么 / 红线在哪」
- 具体某块功能的实施细节,看对应 design doc(`~/.gstack/projects/project/` 下的 office hours design docs)
- 红线 + 红黄绿 + 证据底稿等基础设施已在 v1 固化,**不重新讨论**(office hours 已闭合)
- **不是营销文案**,不是融资材料 —— 是工程师 / PM 一人分饰两角的工作底稿
- **滚动更新**:每个阶段切片完成后,更新对应行的状态(📋 → 🚧 → ✅)
