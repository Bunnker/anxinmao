# 安心猫医学资料库

本目录把权威网页、现有证据底稿和兽医审核意见整理成两层资料:

1. `source/*.source.md` —— 给人和兽医看的权威资料整理。它回答:权威来源怎么说、哪些 claim 可用、哪些还存疑。
2. `ai-cards/*.ai-card.md` —— 给 AI 问诊/分诊读取的行为卡。它回答:什么时候追问、什么时候停止追问、怎么分 red/yellow/green、什么能说和不能说。

原则:AI 卡片只能引用 source 文档里的 `claim_id`。不要让第二层重新从网页自由总结,否则事实会漂移。

## 目录

```txt
docs/medical/
  README.md
  source-registry.md
  condition-index.md
  templates/
    source-template.md
    ai-card-template.md
  source/
    cat-emergency-red-flags.source.md
    cat-anorexia.source.md
    cat-bleeding.source.md
    cat-diarrhea.source.md
    cat-dyspnea.source.md
    cat-ear-problem.source.md
    cat-eye-problem.source.md
    cat-lethargy.source.md
    cat-toxin-ingestion.source.md
    cat-uri.source.md
    cat-urethral-obstruction.source.md
    cat-vomiting.source.md
  ai-cards/
    cat-emergency-red-flags.ai-card.md
    cat-anorexia.ai-card.md
    cat-bleeding.ai-card.md
    cat-diarrhea.ai-card.md
    cat-dyspnea.ai-card.md
    cat-ear-problem.ai-card.md
    cat-eye-problem.ai-card.md
    cat-lethargy.ai-card.md
    cat-toxin-ingestion.ai-card.md
    cat-uri.ai-card.md
    cat-urethral-obstruction.ai-card.md
    cat-vomiting.ai-card.md
  source-manifest.json
  raw/
    batch2-core-risk/
    batch3-sensory-emergency/
```

## 权威等级

- `L1` 规则锚点: Cornell、Merck/MSD、iCatCare/ISFM、AVMA、ASPCA APCC、AAHA/AAFP、WSAVA、官方药品标签。
- `L2` 临床解释: VCA、Cornell/Merck owner-facing 页面、iCatCare owner resources、国内高校动物医院/行业协会。
- `L3` 辅助验证: Anicira、PetMD、Petplan 等单点科普。只能补充红旗/话术,不能单独决定分诊规则或用药策略。
- `CN-RX` 国内药品可得性: 中国兽医药品监察所/中国兽药信息网、国家兽药基础数据库、农业农村部国家兽药查询/综合查询。

## 生成流程

1. 为一个症状/病情收集 2-5 个权威页面。
2. 抽取短 claim,每条 claim 只表达一个事实。
3. 生成 `source/*.source.md`,保留来源、分歧、药品/护理边界。
4. 兽医或人工审核 source 文档,标记能否进入产品。
5. 生成 `ai-cards/*.ai-card.md`,所有规则都挂 `claim_id`。
6. 分诊代码、AI 问诊 prompt、报告文案只读取 AI card,不直接读取网页全文。

## 抓取流水线

- manifest:`docs/medical/source-manifest.json`
- fetch command:`npm run medical:fetch -- --batch <batch-id>`
- raw output:`docs/medical/raw/<batch-id>/` (本地缓存,已被 `.gitignore` 忽略,不入仓)
- latest successful summary:`docs/medical/raw/crawl-summary-2026-05-30T15-57-33-813Z.json`

抓取脚本会保存 `raw.html`/`raw.pdf`、`text.txt` 和 `meta.json`。如果本机有 `pdftotext`,PDF 会自动转为 `text.txt`。

## 运行时接入

- 分诊选项在 `src/lib/triage.ts` 里挂 `claim` / `claims`。
- `selectedClaimIds()` 会把用户本次选择映射为去重后的 claim 列表,写入报告 URL 和本地 `CatRecord.claimIds`。
- 分诊问答原文和报告摘要不放进 URL;用 `src/lib/triage-handoff.ts` 暂存在 `sessionStorage`,URL 只带短 `handoff` id。
- 服务端 `src/lib/medical-knowledge.ts` 负责把 `symptom + claimIds` 映射回相关 `ai-cards/*.ai-card.md`,生成给 LLM 的资料库上下文。
- 服务端 `src/lib/agent-retrieval.ts` 是受控 Agent 工具层:先用 `local_medical_recall` 从 `docs/medical` 召回本地资料;本地资料不足时,`authority_web_search` 只允许搜索白名单权威域名作为临时补充。
- `/api/triage` 会直接读取这份上下文做追问 / 分级解释。
- `/api/behavior` 支持可选 `medical: { symptom, tier, claimIds }`,用于从报告页或未来问诊入口带入同一份证据上下文。

## 验证

- `npm run triage:check`:静态检查分诊选项里的 `claim` / `claims` 是否都能映射到医学资料。
- `npm run medical:validate`:校验 source 与 AI card 的 `claim_id` 引用一致性。
- `npm run harness:agent-retrieval`:在本地 `npm run dev` 跑起来后,验证直接问 AI 时会主动召回本地资料,并暴露权威网页搜索白名单;不会调用大模型,不实际联网。
- `npm run harness:triage`:在本地 `npm run dev` 跑起来后,用 `/api/triage` 的 dev-only `dryRun` 验证 `symptom + tier + claimIds` 是否正确注入 AI 上下文;不会调用大模型,不消耗额度。
- `npm run harness:cat-context`:在本地 `npm run dev` 跑起来后,验证 `/api/triage` 与 `/api/behavior` 都能接收到完整猫档案上下文;不会调用大模型,不消耗额度。

## 当前批次

- 已生成 batch 1:通用红旗、上呼吸道/打喷嚏、尿道阻塞。
- 已生成 batch 2:呕吐、腹泻、不吃、误食中毒、呼吸困难。
- 已生成 batch 3:眼睛问题、耳朵问题、出血/看到血、精神差。
- 已生成 batch 4:皮肤、口腔、行为突变、跛行/走路异常。
- 下一批建议:batch 5 —— 其它情况(`cat_general_triage`)与把通用红旗/宿主风险接入所有问诊的总控 prompt。

## 产品红线

- AI 不诊断具体疾病,只做风险判断和下一步建议。
- AI 不自由推荐药品、不显示剂量。药品信息必须经过地区可得性检查和兽医审核。
- 红档不继续追问,不推荐药品,只给立刻就医和路上安全处理。
- 年龄、免疫、慢病、精神食欲等宿主风险只用于调整观察窗口,不能把高风险情况降级为“熬一熬”。
