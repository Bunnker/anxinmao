# 问答页 `/behavior` 重设计 + Agent 记忆设计(spec)

> 2026-06-17 · 分支 `pet-home` · 触发:用户给出 `问答.html` 设计稿 + 要求「全量重设计 + agent 记忆设计(更懂用户,长时短时)+ 语音输入」。
>
> **本文是 delta spec**,不重复已定稿内容。UI 落地基线沿用
> [`2026-06-15-full-app-redesign-claude-design-spec.md`](2026-06-15-full-app-redesign-claude-design-spec.md) §3.5(问答)+ §六·批三 + §五红线总表;
> 本文只负责三件该 spec **没覆盖或需要改判**的事:
> 1. **Agent 记忆**(长时 / 短时,「更懂用户」)—— 全新,centerpiece。
> 2. **语音输入**改判 —— 旧 spec §3.5「拍照/语音暂不落地」,用户 2026-06-17 拍板:**语音做、拍照不做**。
> 3. 问答页落地时的记忆/语音接线细节与红线护栏。

---

## 一、调研结论(现状)

### 1.1 前端 `src/app/behavior/page.tsx`(已落地核心)
已实现:`EmptyState`+`STARTERS`(4 条扁平起手式)、用户气泡(现 `bg-ink` 墨黑)、`AssistantCard`+`MarkdownMessage`(SSE 流式 + 闪烁光标)、`Thinking`、`FollowupChips`(答完并行拉取)、`ContextChip`(分诊衔接,圆点现固定陶土红)、composer(输入+发送)、去分诊兜底、`Disclaimer`、对话压缩(`COMPRESS_AT=20`/`KEEP_VERBATIM=8`)、`saveConversation` 落 `kind:"behavior"` 记录 + 云同步、`?c=<id>` 还原历史。

### 1.2 后端 `src/app/api/behavior/route.ts` + `lib/behavior-agent.ts`
请求 → 限流 → `classifyBehaviorIntent`(emergency / medical_general / triage_followup / daily_care / product_or_medicine)→ `catProfileContext`(静态档案注入)→ `buildMedicalKnowledgeContext` → `runBehaviorAgentTools`(模型规划 care_recall / local_medical_recall / authority_web_search)→ 装配 `fullMessages`(SYSTEM_PROMPT + 意图分流 + **tierSignal** + region + 猫档案 + 医学库 + agent 工具 + report/qa 摘要 + memo + recent)→ 流式 / guarded chat。

### 1.3 现有「记忆」三件套 + 缺口
| 维度 | 现状 | 评价 |
|---|---|---|
| **短时**(本轮对话内) | `recent`(逐字最近 N 条)+ `memo`(更早对话经 `/api/summarize` 压成滚动摘要) | ✅ 有,够用 |
| **长时·静态档案** | `catProfileContext`:名字/月龄/体重/品种/疫苗/驱虫/绝育/慢性病/过敏/备注,每轮注入 | ✅ 有 |
| **长时·分诊衔接** | 仅当从报告页跳入时带 `report`/`qa`/`tier`/`claimIds` | ⚠️ 一次性,非常驻 |
| **长时·既往对话/分诊回忆** | `store.records[]`(已云同步、上限 60 条,behavior 记录带完整 `messages`+`memo`)**从不回灌进 `/api/behavior`** | ❌ **核心缺口** |

> **「更懂用户」的本质缺口:** 助手记得「这只猫的档案」,但**不记得和这位主人聊过什么、上周分诊判了什么**。问完「打喷嚏要紧吗」三天后再来,它一无所知;`records[]` 明明存着、还云同步着,却没接进 agent 上下文。本 spec 的记忆设计就是补这条回路。

### 1.4 数据/持久化底座(记忆必须沿用,不另起炉灶)
`Store = { cats[], activeCatId, records[] }` → `saveStore` → `saveStoreLocal`(localStorage + Cookie 兜底,Cookie 版剔除 `messages`/`memo`/`avatar`/`photos`)+ `pushHistory`(防抖推匿名 `deviceId` 云端)。记录上限 `MAX_RECORDS=60`。**任何长时记忆都落在 `Store` 内、走这条同步链**,自动获得「三层存储 + 云同步」(见 [[anxinmao-persistence]])。

---

## 二、Agent 记忆设计(长时 + 短时)

借 agent-memory 框架五支柱(类型分类 / 双路径保存 / 后台提取 / 过期检测 / 召回索引),映射到「单猫单主人」领域。**总原则:小而准,常驻注入;绝不让记忆越过任何医疗红线。**

### 2.1 短时记忆(本轮对话内)—— 保留 + 一处微调
- 机制不变:`recent` + `memo` 滚动摘要。
- **微调(可选,Phase 3 才做):** `/api/summarize` 的产物从「一段自由摘要」结构化为两块 ——「① 对话进展(短时)② 本猫新出现的稳定事实/偏好(供长时提取复用)」。这样长时提取能直接吃②,省一次模型调用。Phase 1/2 不动。

### 2.2 长时记忆 —— 两层,按成本/精度分层

#### Tier A · 既往档案回忆(派生,**零新 schema**)— Phase 2,高价值低风险
- **来源:** 当前猫的 `store.records[]`(已存在、已同步)。
- **构建(纯前端,零模型调用):** 进入问答页 / 每次发送时,从 records 派生一段 ≤600 字「近期档案」:
  - 最近 ≤3 条 **triage**:`{相对日期, 症状中文, tier, outcome}` → 例「3 天前·呕吐·黄档(已就医)」。
  - 最近 ≤3 条 **behavior**:`{相对日期, question/summary}` → 例「上周问过·驱虫多久一次」。
  - 复用 `relativeDate`/`SYMPTOM_LABELS`;去重、按时间倒序、整体截断。
- **注入:** `/api/behavior` 新增请求字段 `history`(或 `episodes`);服务端拼成 system 块:
  > 【这只猫近期的就诊 / 问答档案 —— 自然延续、别从头重复问;**仅作背景,不可据此改判级、不可当诊断**】
- **效果:** 助手自然回指 ——「上次你担心哈基米打喷嚏,后来好了吗?」。这一层单独上线即拿下大半「更懂用户」。

#### Tier B · 蒸馏的猫/主人记忆(结构化,**新 schema**)— Phase 3,「更懂用户」内核
新增类型(挂在 `Store`,按 catId 索引;随 `pushHistory` 同步):
```ts
type MemoryKind = "cat_fact" | "owner_note" | "care_pref";
interface MemoryItem {
  id: string;
  kind: MemoryKind;     // 领域映射 agent-memory 的类型分类
  text: string;         // "怕剪指甲,要慢慢来" / "主人很担心体重" / "只吃某款冻干"
  source: "chat" | "triage" | "profile";
  createdAt: string;
  lastSeenAt: string;   // 续命:再次被提及时刷新(LRU 依据)
  ttlDays?: number;     // 仅给「可能短命」的事实;稳定特质不设
}
interface CatMemory { catId: string; items: MemoryItem[]; updatedAt: string; }
```
- **类型分类:** `cat_fact`(猫的稳定特质/习惯,非症状)、`owner_note`(主人的反复担忧/沟通偏好)、`care_pref`(喂养/护理偏好)。
- **双路径保存:**
  - *快路径(v1 跳过):* 客户端对显式事实做轻量捕获。
  - *后台路径:* 一段对话结束(或每 N 轮)后调新接口 `/api/memory/extract`(输入:本轮对话 + 现有 items;输出:新增/更新的 `MemoryItem[]`,LLM 蒸馏,形似 `/api/summarize` 但带类型)。按语义键去重。
- **过期/衰减:** 每猫 cap ~20 条,超出按 `lastSeenAt` LRU 淘汰;带 `ttlDays` 的过期即弃。
- **召回:** 顶部 items 注入「【关于这只猫,你已经知道的】」system 块(已蒸馏、本就小,常驻即可,无需向量检索)。
- **索引:** v1 规模 ~20 条,仅按 kind + 时间排序;>200 条再谈向量化(注释留 future)。

### 2.3 记忆红线护栏 ⚠️(实现时逐条核对,违一条即回退)
1. **记忆永不改判级。** tierSignal「上游分诊判级是 ground truth」最高优先级;Tier A 块明写「不可据此改判级」。过去红档不自动升级本轮、过去绿档不软化本轮。
2. **记忆永不成为诊断库。** 提取 prompt **禁止**把「得了 X 病 / 是某某炎 / 慢性胃炎」写进 `MemoryItem`;只允许 episodic 事实(「曾因呕吐看过黄档」),不允许疾病标签。
3. **慢性病 / 过敏只走结构化档案**(兽医/主人在 onboarding 录入),**绝不由对话自动蒸馏**,防止助手凭聊天「发明」病史。
4. **短命症状不得升格为长时事实。** 「这两天在拉肚子」给短 `ttlDays`、且属对话上下文而非 `cat_fact`;只有稳定特质/偏好/主人语境才落 Tier B。
5. **AI 形象红线不受影响**(记忆是纯文本,不进医学示意图)。详见 [[anxinmao-triage-safety]] 的 source-authority + 偏保守框架。

---

## 三、UI 重设计(delta,基线见旧 spec §3.5)

设计稿 `问答.html` 与本仓库 `globals.css` **同源同令牌**(`--bg`=`--paper`、`--terra`=`--accent`、风险盘一致),且字体走**系统字体红线**(不引 Google Noto)。导航沿用全局 `TabBar`(固定底部 56px),**不在页内复制 tabbar**。

### 3.1 发现态(empty / discovery)
| 区块 | 落地 | 红线 |
|---|---|---|
| navbar 吸顶 | 标题「问{真实猫名}」+ 右侧 pet 徽章(`CatAvatar` 24px + `ageLabel` + `cat.sex`)。返回键可选(TabBar 已管导航;留作「新对话」次要操作) | 纯 UI |
| 空态卡 | 「关于{name},想问点什么?」+ scope 文案 + 内联一行「由 AI 解答,不替代兽医面诊」 | 守「不替代兽医」 |
| 分类 chips | 推荐/健康/喂养/行为/日常,横滚,选中**陶土红实心** | 纯 UI |
| 推荐问题行 | 按分类出;标签「健康」用 `--accent-tint`;**「和{name}有关」标签必须用 `--accent`,⚠ 设计稿误用了 `--risk-green`,落地改掉**(旧 spec §3.5②)。"和{name}有关" 的来源即 **Tier A 记忆**(命中既往 record 的相关问题置顶+打标) | ⚠ 装饰不取风险盘 |
| 最近问过 | 读 `records` `kind:behavior`(当前猫),问题 + `relativeDate`,点回 `recordHref()`→`/behavior?c=<id>`;无则不渲染 | 合规 |
| 去分诊 | 「想要红黄绿分诊报告? 去分诊 →」→ `/symptoms` | 合规 |

### 3.2 对话态(thread)—— restyle,功能全保留
- 用户气泡:墨黑 → **陶土红渐变**(旧 spec Q6 已拍板)。
- `AssistantCard`:保留 `MarkdownMessage` 流式;沿用 `CatTag`(「一位懂猫的朋友」)。**不**强加设计稿那条静态「Cornell/Merck 出处」脚注(易误导;底部全局 `Disclaimer` 已守红线)。
- **急症横幅 `.er`(红线必做):** 用户输入命中急症词(呼吸/喘/误食/尿不出/出血/抽搐/中毒…)→ 即时插红底横幅 + 红 CTA「去分诊 / 找医院」。这是「红旗中途急停」红线的前端可视化,**先于/并行于 LLM 出现**,纯防御纵深(旧 spec §3.5④)。
- `ContextChip` 圆点:固定陶土红 → **按 tier 取 `--red/--amber/--green`**(旧 spec §3.5⑥)。
- `FollowupChips` / `Thinking` / 偏黄偏绿微标 `.lchip`(可选):保留 / 按旧 spec。

### 3.3 输入栏(composer)+ 语音(**本 spec 改判:做**)
- 圆角毛玻璃条:输入框 + 发送键(陶土红)。
- **语音按钮(mic):** 浏览器原生 `webkitSpeechRecognition`(`lang="zh-CN"`),按一下听写 → 文字填进输入框、可编辑再发。
  - **优雅降级:** `!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)` → **整颗 mic 按钮不渲染**(不留死按钮,守「明显可点必须真能用」)。
  - 权限被拒 / 出错 → 轻 toast「没听清,直接打字也行」,不阻塞。
  - iOS Safari 支持不稳:`onerror`/`onend` 兜底复位,绝不卡死输入。
- **拍照:不做**(后端无视觉;「拍下症状照片我能看得更准」是过度承诺,医疗场景尤忌)。

---

## 四、后端改动

> **架构定稿(批2 落地时较初稿细化):服务端派生为单一可信源。** 客户端只把 records 裁成
> `EpisodeInput[]`(剥离 messages/memo 等 PII、排除当前会话),发 `history`;**护栏措辞 +
> 症状白名单 + 注入/病名过滤 + 截断全在服务端 `buildEpisodeRecall`**,可经 dryRun 测。
> 理由:安全关键的派生逻辑要可信且可测,不能信任客户端拼好的字符串。

| 文件 | 改动 | 阶段 |
|---|---|---|
| `src/lib/behavior-memory.ts`(新) | ✅ `toEpisodeInputs(records, excludeId)`(客户端裁剪,≤12 条)+ `buildEpisodeRecall(episodes)`(服务端派生护栏块):TIER/outcome 枚举白名单、症状只取 `SYMPTOM_LABELS`、自由文本(question/老数据 symptom)过 `sanitizeFree`(NFKC + 去零宽 + 去 MD + 注入/病名黑名单 + 截断)、≤3+≤3、逐行预算截断 | ✅P2 |
| `src/app/api/behavior/route.ts` | ✅ 解析 `b.history` → `buildEpisodeRecall` → system 块插在「猫档案」之后(且在 `tierSignal` 之后);dryRun 加 `episodeRecallPreview` | ✅P2 |
| `src/app/api/memory/extract/route.ts`(新) | LLM 蒸馏对话→`MemoryItem[]`,带类型 + 去重 + 红线过滤(禁疾病标签/慢病) | P3 |
| `src/lib/storage.ts` | `CatMemory` 读写 + 随 `saveStore` 同步;`saveConversation` 后触发后台提取(防抖、失败静默) | P3 |
| `src/types/cat.ts` | 加 `MemoryItem`/`CatMemory`;`Store` 加可选 `memory?: CatMemory[]`(按 catId) | P3 |

前端 `page.tsx`:✅ runChat 发送时附 `history`(P2,`toEpisodeInputs`)/ `memory`(P3);✅ `subscribeStore` 补听 `catstore:updated`(本会话刚落的记录即时进回忆);其余流式/压缩/handoff **不动**。

---

## 五、分期落地(每批独立可验证)

- **✅ 批 1 · UI 重设计**(发现态 + 对话态 restyle + 语音输入)—— 已落地。
- **✅ 批 2 · Tier A 既往档案回忆**(`behavior-memory.ts` 服务端派生 + route 注入 + 前端附带 + harness)—— 已落地。经设计/安全 fan-out + 对抗评审硬化(outcome 白名单、symptom 回退过滤、NFKC/去零宽/病名黑名单、逐行截断、同窗口 store 刷新)。
- **✅ 批 3 · Tier B 蒸馏记忆** —— 已落地。`CatMemory` 类型 + `/api/memory/extract` 提取端点(LLM 蒸馏 + dryRun rawModelOutput 可测)+ `storage.ts` 存储(`getCatMemory`/`mergeCatMemory`/LRU/TTL/去重续命/删猫连带)+ `buildMemoryRecall` 召回注入(episodeRecall 之后、tierSignal 之后)+ `memory-extract.ts` 客户端调度(防抖+单飞+min-new+flush)。经设计/安全 fan-out + 对抗评审(11 confirmed 全修)硬化:
>   - 病名过滤转「显式列表 + 结构启发式(X炎/X癌 + FIP/FIV/FLUTD + 病史/确诊/阳性)」,堵猫瘟/传腹/猫鼻支/甲状腺/腹水 等;症状/注入(繁体+英文)/PII(地址)黑名单补全。
>   - **跨猫隔离**:`page.tsx` 加 cat.id 变化 reset effect(多 tab 切活动猫即 flush 旧猫 + 清空会话),实测 A 猫对话绝不串 B 猫。
>   - 续命死代码修复(`memoNormalize` 统一 extract 去重与 storage `memoKey`;distill 不再硬删已存在事实,留给 merge 续命)、flush-vs-inflight 不丢、NaN 日期兜底、`cm.items` 数组守卫、`lastCount` 软上限。

> 批 1 可独立上线;批 2 依赖批 1 的发现态;批 3 依赖批 2 的注入管线。三批均已落地、未 commit/部署。

---

## 六、验证

- `npm run build`(类型检查 + 构建)。
- `node scripts/harness-behavior.mjs`(压缩 + 连贯性)— 批 1/2/3 都跑;批 2/3 **新增 harness**:`harness-behavior-memory.mjs`(记忆注入不改判级、不诊断、短命症状不升格)。
- `scripts/harness-behavior-intent.mjs` / `harness-cat-profile-context.mjs` 回归。
- 改判级类逻辑前先跑 `npm run triage:check` + `medical:validate`(见 [[anxinmao-triage-safety]])。
- preview:进问答页验证发现态/语音/急症横幅/历史回点;SSE 流式照常。
- **部署需显式批准**(见 [[anxinmao-deploy-approval]])。

---

## 七、开放问题(待用户拍板)

1. **落地顺序:** 三批是否就按「UI → Tier A → Tier B」?还是先把记忆(批 2)和 UI(批 1)合在一次 PR?
2. **pet 徽章性别字面:** 设计稿写「母」,App 它处直接显 `cat.sex`(雌/雄)。统一用哪个?(倾向 `cat.sex`,与全站一致)
3. **Tier B 蒸馏触发时机:** 每轮后(更实时、更耗 token)vs 会话结束/离开页面时(更省)?(倾向后者)
4. **记忆对用户可见/可删?** MVP 是否给「忘掉这条」入口(隐私 + 纠错)?还是先纯后台、后续在 `/pets` 档案页露出?
