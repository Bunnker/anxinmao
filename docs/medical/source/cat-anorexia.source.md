# 病情资料:猫不吃 / 食欲下降

## 0. 元信息

- `condition_id`:`cat_anorexia`
- 中文名:猫不吃 / 食欲下降
- 英文名:Anorexia / hyporexia in cats
- 对应 triage symptom:`noeat`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-anorexia.ai-card.md`
- 原始抓取:`docs/medical/raw/batch2-core-risk/cat-anorexia/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_anorexia | Cornell Feline Health Center, Anorexia | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/anorexia | L1 | 2026-05-30 HTTP 200, text 4667 bytes | 24h/12h 风险、病因、治疗边界 |
| vca_anorexia | VCA Hospitals, Anorexia in Cats | https://vcahospitals.com/know-your-pet/anorexia-in-cats | L2 | 2026-05-30 HTTP 200, text 14822 bytes | 真性/假性厌食、脂肪肝、家庭诱食 |
| icatcare_inappetence_pdf | International Cat Care, Managing the cat that won't eat | https://icatcare.org/resources/cat-carer-guide-managing-the-cat-that-wont-eat.pdf | L1 | 2026-05-30 HTTP 200, PDF 转文本 34258 bytes | 家庭诱食、避免强喂、喂食管 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

猫不吃不是“挑食”就能解释的入口:成年猫持续 24 小时不吃、肥胖猫突然不吃、幼猫尤其 6 周以下 12 小时不吃、以及任何不吃伴精神差/呕吐/呼吸异常/疼痛,都要缩短观察窗口。

## 3. 症状/病情概述

厌食或食欲下降是很多猫病的共同信号,可能来自系统性疾病、疼痛、口腔/牙齿问题、嗅觉受影响、恶心、应激、食物厌恶等。AI 要区分“想吃但吃不了”的假性厌食和“完全没兴趣”的真性厌食,并把持续时间、年龄、肥胖、精神状态、伴随症状作为核心分级依据。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `ano_rf_adult_24h` | 成年猫完全不吃接近或超过 24 小时 | 尽快联系兽医/门诊 | `ano_001`, `ano_003` |
| `ano_rf_kitten_12h` | 6 周以下幼猫不吃约 12 小时 | 急诊或立即联系兽医 | `ano_002` |
| `ano_rf_overweight` | 肥胖/超重猫突然不吃 | 尽快就医,警惕脂肪肝风险 | `ano_004` |
| `ano_rf_systemic` | 不吃伴呕吐、腹泻、呼吸异常、瘫软、疼痛、脱水 | 按伴随红旗升级 | `ano_005`, `emg_001`, `emg_006` |
| `ano_rf_pseudo` | 想吃但咬不动/吞咽困难/流口水/口腔疼 | 尽快门诊,排查口腔或吞咽问题 | `ano_006` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 食量轻度下降但仍在吃,精神饮水正常,短于 12-24 小时,有明确应激/换粮且无其他症状 | 绿/黄边界:诱食、记录食量,给很短复查窗口 | `ano_007`, `ano_010` |
| moderate | 成年猫明显少吃或不吃接近 24 小时,或持续挑食/体重下降/疑似口腔疼,但无急症红旗 | 黄档:当天联系兽医或尽快门诊 | `ano_001`, `ano_006`, `ano_008` |
| severe | 幼猫短时间不吃、成年猫完全不吃超过 24-48 小时、肥胖猫不吃、或伴系统性红旗 | 红/高黄:急诊或立即联系兽医 | `ano_002`, `ano_003`, `ano_004`, `ano_005` |

## 6. 宿主风险画像

低风险特征:

- 成年健康、体型正常。
- 仍能吃一部分,精神饮水和排泄正常。
- 最近有轻度应激或食物改变,并且时间很短。

高风险特征:

- 6 周以下幼猫、幼猫、老年猫。
- 肥胖/超重猫。
- 已知慢病、近期手术/住院/用药。
- 完全不吃、明显少吃、体重下降。
- 伴呕吐、腹泻、呼吸异常、疼痛、流口水、口腔异常、脱水或精神差。

规则:猫不吃的分级要比“人食欲差”保守。年龄越小、体重越高或基础病越多,越不能让用户“熬一熬”。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `ano_q_amount` | 区分完全不吃和食量下降 | 完全不吃升级;还吃一部分可短期诱食 | `ano_001`, `ano_007` |
| `ano_q_duration` | 持续时间是核心风险阈值 | 成年 24h、幼猫 12h 是关键阈值 | `ano_001`, `ano_002`, `ano_003` |
| `ano_q_wants_but_cant` | 判断真性 vs 假性厌食 | 想吃但吃不了支持口腔/疼痛方向,黄档 | `ano_006` |
| `ano_q_body_condition` | 肥胖猫不吃脂肪肝风险更高 | 肥胖/超重升级 | `ano_004` |
| `ano_q_systemic` | 伴随症状决定是否急诊 | 呕吐、呼吸异常、瘫软等 red | `ano_005` |

## 8. 就医前护理

### 可以做

- 量化记录:今天吃了平时的几成、喝水、尿量、体重。
- 尝试少量多次、气味明显、猫原本喜欢的食物。
- 可把湿粮温热到接近体温,注意搅拌避免烫伤。
- 提供安静进食环境,水碗与食盆分开放,多猫家庭避免资源冲突。
- 若有口腔疼、恶心或完全不吃,尽快联系兽医。

### 不建议做

- 不要一次摆很多陌生食物导致食物厌恶。
- 不要把药藏进主食,可能让猫对食物更排斥。
- 不要长期靠零食、人食或营养膏替代正餐。

### 绝对不要做

- 不要强行掰嘴喂、针筒硬灌或强迫吞咽。
- 不要自行给人用开胃药、止吐药、止痛药。
- 幼猫、肥胖猫、超过阈值或伴红旗时不要继续观察。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 食欲刺激剂 | Cornell/VCA 提到兽医可能使用 mirtazapine 等食欲刺激药 | 可说“兽医可能开食欲刺激药”,不展示药名/剂量给普通用户 | `ano_011` |
| 喂食管 | Cornell/VCA/iCatCare 都指出喂食管可作为营养支持,有时是救命桥接 | 只说明需要兽医操作,不要让用户自行处理 | `ano_012` |
| 家庭诱食 | 温热、少量多次、熟悉食物、改善环境可尝试 | 可展示安全诱食建议 | `ano_010` |
| 国内药品可得性 | 食欲刺激药/止吐药等进入产品前需查 CN 可得性并兽医审核 | 药品卡默认隐藏剂量 | `ano_013` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 24h 阈值 | Cornell 强调成年猫 24h 可造成严重影响;VCA 写超过两天需立即咨询 | 产品采用更保守:成年完全不吃约 24h 就黄/红边界 | 是否把 24h 写成硬红旗 |
| 强喂 | Cornell 老文提到 force feeding 但同时指出已不推荐;VCA/iCatCare 明确提示风险 | 产品禁止用户强喂 | 是否允许“轻放一小块在舌尖” |
| 药名展示 | VCA/Cornell 提到具体药 | 面向用户只展示类别,不给剂量 | 兽医审核后是否在专业版显示 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `ano_001` | 成年猫持续食欲丧失可在 24 小时内对健康产生严重影响。 | Cornell | L1 | yellow/red | draft |
| `ano_002` | 6 周以下幼猫拒食 12 小时即可构成致命威胁。 | Cornell | L1 | red | draft |
| `ano_003` | 猫拒食超过两天应立即咨询兽医。 | VCA | L2 | red/yellow | draft |
| `ano_004` | 肥胖猫突然不吃特别危险,可能发生 hepatic lipidosis/fatty liver。 | VCA / Cornell | L2/L1 | host risk | draft |
| `ano_005` | 食欲下降可提示多种潜在疾病,伴随系统性症状时应尽早就医。 | Cornell / VCA / iCatCare | L1/L2 | red/yellow | draft |
| `ano_006` | 需区分真性厌食和想吃但因疼痛、口腔、咀嚼或吞咽问题吃不了的假性厌食。 | VCA / iCatCare | L2/L1 | question | draft |
| `ano_007` | 轻度食量下降需要量化,不要只写“挑食”。 | iCatCare / 产品综合 | L1/internal | question | draft |
| `ano_008` | 体重、体温、牙龈牙齿、器官和必要检查可帮助兽医寻找病因。 | Cornell / VCA | L1/L2 | diagnosis | draft |
| `ano_009` | 疼痛、恶心、嗅觉受影响、应激、食物厌恶和基础疾病都可导致不吃。 | VCA / iCatCare / Cornell | L1/L2 | overview | draft |
| `ano_010` | 可尝试少量多次、熟悉且气味明显的食物、温热湿粮、安静环境和水分支持。 | VCA / iCatCare | L2/L1 | home care | draft |
| `ano_011` | 兽医可能使用食欲刺激剂,但用药取决于病因和猫的状态。 | Cornell / VCA | L1/L2 | medicine boundary | draft |
| `ano_012` | 喂食管可在猫无法主动进食时提供营养支持,应由兽医放置和管理。 | Cornell / VCA / iCatCare | L1/L2 | treatment boundary | draft |
| `ano_013` | 国内药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |
| `ano_014` | 强行喂食/针筒硬灌可能增加食物厌恶和误吸风险。 | VCA / iCatCare / Cornell | L1/L2 | forbidden | draft |

## 12. 待兽医审核

- 成年猫完全不吃 24 小时是否直接红档,还是“高黄 + 当天门诊”。
- 6 周以下幼猫 12 小时阈值在中文产品里如何表述更安全。
- 是否允许用户安全使用营养膏/处方恢复罐作为诱食,是否要列商品类别。
- 食欲刺激剂是否完全隐藏药名。
