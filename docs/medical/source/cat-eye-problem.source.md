# 病情资料:猫眼睛问题

## 0. 元信息

- `condition_id`:`cat_eye_problem`
- 中文名:猫眼睛问题
- 英文名:Eye problems in cats
- 对应 triage symptom:`eye`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-eye-problem.ai-card.md`
- 原始抓取:`docs/medical/raw/batch3-sensory-emergency/cat-eye-problem/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_conjunctivitis | Cornell Feline Health Center, Conjunctivitis | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/conjunctivitis | L1 | 2026-05-30 HTTP 200, text 3998 bytes | 结膜炎表现、常见病因、用药边界 |
| cornell_corneal_ulcers | Cornell Feline Health Center, Corneal Ulcers | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/corneal-ulcers | L1 | 2026-05-30 HTTP 200, text 4639 bytes | 角膜溃疡红旗、视力风险、诊断边界 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

眼睛入口最重要的是先排除角膜溃疡、外伤、化学刺激、明显疼痛和视力受损;轻微结膜炎可以当天/短期门诊评估,但“眯眼、揉眼、眼睛发白/发浑、睁不开”不能当普通流眼泪处理。

## 3. 症状/病情概述

猫眼睛问题常被用户描述为流泪、眼屎多、红、肿、眯眼、睁不开、第三眼睑露出、眼球发白或挠眼。Cornell 的资料把结膜炎和角膜溃疡分开:结膜炎常见于感染或刺激,可能一眼或双眼;角膜溃疡涉及角膜损伤,晚期可穿孔并造成失明或失眼。AI 不能只按“眼屎多”安慰,必须先问疼痛/眯眼、外伤/异物/化学品、角膜混浊和视力变化。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `eye_rf_pain_closed` | 明显眯眼、睁不开、怕光、一直揉眼/抓眼 | 当天门诊;严重或伴外伤按急诊 | `eye_004`, `eye_008` |
| `eye_rf_cloudy_ulcer` | 角膜发白/发蓝/发浑,疑似溃疡、眼球表面异常 | 尽快眼科/兽医检查 | `eye_004`, `eye_005`, `eye_008` |
| `eye_rf_trauma_chemical` | 抓伤、打架、撞伤、异物、清洁剂/刺激性液体接触 | 急诊或立即联系兽医 | `eye_006`, `eye_005` |
| `eye_rf_vision` | 走路撞东西、突然看不见、眼球明显异常 | 急诊/尽快眼科评估 | `eye_005`, `eye_004` |
| `eye_rf_systemic_kitten` | 幼猫/多猫环境,眼鼻分泌物明显,精神食欲下降 | 至少黄档,必要时当天门诊 | `eye_002`, `eye_003`, `emg_011` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 轻微流泪或少量分泌物,眼睛能睁开,无眯眼/揉眼/混浊/外伤,精神食欲正常 | 绿/黄边界:短期观察并预约咨询,出现疼痛或恶化升级 | `eye_001`, `eye_003` |
| moderate | 红肿、分泌物增多、第三眼睑露出、轻中度眯眼,但无明确外伤/混浊/视力异常 | 黄档:当天或 24 小时内联系兽医 | `eye_001`, `eye_003`, `eye_009` |
| severe | 角膜混浊/疑似溃疡、外伤/化学刺激、明显疼痛睁不开、视力异常、系统性状态差 | 红档或高黄档:尽快就医,不要自行滴药 | `eye_004`, `eye_005`, `eye_006`, `eye_008` |

## 6. 宿主风险画像

低风险特征:

- 成年健康猫。
- 单纯轻微流泪或少量眼屎,眼睛能正常睁开。
- 无外伤、无揉眼、无角膜混浊、精神食欲正常。

高风险特征:

- 幼猫、新到家、救助或多猫环境,同时有鼻涕、喷嚏、精神食欲下降。
- 曾有猫疱疹病毒相关眼病或反复眼病。
- 外出、打架、抓伤、异物或化学刺激接触史。
- 眼睛痛、怕光、角膜发浑、视力异常。

规则:宿主风险只能缩短观察窗口,不能把角膜混浊、外伤、疼痛或视力问题降级。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `eye_q_pain` | 眯眼、怕光、揉眼提示疼痛或角膜问题 | 是则至少 yellow,严重为 red | `eye_004`, `eye_008` |
| `eye_q_surface` | 角膜混浊/表面异常提示溃疡或损伤风险 | 是则 red/high yellow | `eye_004`, `eye_005` |
| `eye_q_trauma` | 抓伤、异物和化学刺激可导致角膜溃疡 | 是则 red | `eye_006` |
| `eye_q_discharge` | 分泌物形态和单/双眼有助区分结膜炎/感染风险 | 脓性或明显肿胀支持 yellow | `eye_001`, `eye_002` |
| `eye_q_systemic` | 精神食欲、鼻涕喷嚏和年龄决定观察窗口 | 幼猫/精神差/不吃支持 yellow/red | `eye_002`, `eye_003`, `emg_011` |

## 8. 就医前护理

### 可以做

- 拍清楚眼睛照片或 5-10 秒视频,记录开始时间、单眼/双眼、分泌物颜色。
- 防止继续揉眼或抓眼,必要时使用伊丽莎白圈并尽快就医。
- 如果怀疑接触刺激物,立即联系兽医或急诊,带上可疑物照片/包装。

### 不建议做

- 不要反复掰开眼皮检查,尤其猫明显疼痛时。
- 不要把“眼睛流泪”直接归因为上火、泪痕或小问题。
- 不要拖延明显眯眼、揉眼、角膜混浊或外伤。

### 绝对不要做

- 不要自行使用人用眼药水、抗生素眼膏、激素眼药、消炎药或旧药。
- 不要用茶水、酒精、双氧水、消毒液、精油或刺激性液体清洗眼睛。
- 不要因为另一只眼正常就排除严重问题。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 抗生素/抗病毒眼药 | Cornell 提到兽医可能根据病因使用抗生素或抗病毒眼药 | 只说“可能需要兽医开眼药”,不展示商品名/剂量 | `eye_009` |
| 伊丽莎白圈 | 防止揉眼可减少进一步损伤 | 可建议防抓挠,但不替代就医 | `eye_009` |
| 荧光素染色/眼科检查 | 角膜溃疡需要眼科检查确认 | 可说明需要兽医检查,不让用户自行判断 | `eye_008` |
| 国内药品可得性 | 眼科兽药/人药 off-label 需查国内批准和兽医审核 | 产品进入药品卡前必须做 CN 可得性检查 | `eye_011` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 轻微结膜炎是否可观察 | Cornell 提到部分结膜炎可自限,但也强调不适/分泌物需要排除严重问题 | 产品允许极低风险短期观察,但明显分泌物/疼痛进入黄档 | 观察窗口是否设为 12-24 小时 |
| 猫疱疹相关护理 | Cornell 角膜溃疡页面提到特定抗病毒/补充剂,但 URI source 对赖氨酸证据更谨慎 | AI 不推荐补充剂,只提示可能需兽医治疗 | 是否完全删除赖氨酸相关内容 |
| 药名展示 | 来源会提到兽医处方眼药 | 面向用户只展示类别和就医边界 | 兽医审核后是否可在专业版展示药名 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `eye_001` | 猫结膜炎可表现为单眼或双眼红肿、第三眼睑突出、眯眼/频繁眨眼、流泪或浓稠深色分泌物。 | Cornell Conjunctivitis | L1 | question/severity | draft |
| `eye_002` | 猫结膜炎常见病因包括刺激/过敏和感染,感染源可包括 FHV、FCV、Chlamydophila、Mycoplasma,幼猫和多猫环境更常见。 | Cornell Conjunctivitis | L1 | risk/question | draft |
| `eye_003` | 部分结膜炎可自行缓解,但有明显不适或分泌物时应由兽医评估以排除更严重眼病。 | Cornell Conjunctivitis | L1 | yellow/green boundary | draft |
| `eye_004` | 角膜溃疡可表现为眼部炎症、分泌物、角膜混浊、怕光、眯眼/揉眼和视力问题。 | Cornell Corneal Ulcers | L1 | red flag | draft |
| `eye_005` | 进展性角膜溃疡可能导致角膜穿孔、失明甚至失去眼球。 | Cornell Corneal Ulcers | L1 | red flag | draft |
| `eye_006` | 角膜溃疡可由抓伤、睫毛异常、眼睑下异物、腐蚀性化学物、病毒或细菌感染等引起。 | Cornell Corneal Ulcers | L1 | question/red | draft |
| `eye_007` | 反复角膜溃疡常见原因之一是猫疱疹病毒。 | Cornell Corneal Ulcers | L1 | history/risk | draft |
| `eye_008` | 角膜溃疡需要兽医眼科检查,常用荧光素染色确认角膜缺损。 | Cornell Corneal Ulcers | L1 | diagnosis boundary | draft |
| `eye_009` | 眼部治疗取决于严重程度和病因,兽医可能使用抗生素/抗病毒眼药并防止猫继续揉眼。 | Cornell Conjunctivitis / Corneal Ulcers | L1 | medicine boundary | draft |
| `eye_010` | 面向用户不能用眼部分泌物单独判断病因,需要结合疼痛、角膜外观、外伤和全身状态。 | Cornell 综合 | L1 | triage control | needs vet review |
| `eye_011` | 国内眼科药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 轻微流泪/少量眼屎是否允许绿档观察,观察多久。
- “眯眼/揉眼”应直接红档还是高黄档当天门诊。
- 是否允许建议使用伊丽莎白圈作为就医前防抓挠。
- 眼药类别是否全部隐藏,还是可显示“兽医可能开抗生素/抗病毒眼药”。
