# 病情资料:猫呕吐

## 0. 元信息

- `condition_id`:`cat_vomiting`
- 中文名:猫呕吐
- 英文名:Vomiting in cats
- 对应 triage symptom:`vomit`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-vomiting.ai-card.md`
- 原始抓取:`docs/medical/raw/batch2-core-risk/cat-vomiting/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_vomiting | Cornell Feline Health Center, Vomiting | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/vomiting | L1 | 2026-05-30 HTTP 200, text 4072 bytes | 红旗、频率、病因范围 |
| merck_vomiting | Merck Veterinary Manual, Vomiting in Cats | https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/vomiting-in-cats | L1 | 2026-05-30 HTTP 200, text 4912 bytes | 呕吐定义、短期/长期边界、治疗边界 |
| vca_vomiting | VCA Hospitals, Vomiting in Cats | https://vcahospitals.com/premier/know-your-pet/vomiting-in-cats | L2 | 2026-05-30 HTTP 200, text 14919 bytes | 用户追问、家庭护理、临床话术 |
| vca_linear_foreign_body | VCA Hospitals, Linear Foreign Body in Cats | https://vcahospitals.com/know-your-pet/linear-foreign-body-in-cats | L2 | 2026-05-30 HTTP 200, text 13430 bytes | 线状异物红旗 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

呕吐不是诊断,产品要先判断是否有频繁/持续、带血、精神差、腹痛、脱水、误食毒物或异物这些需要尽快就医的风险;只有低频、短期、精神食欲正常的成年猫才进入短期观察。

## 3. 症状/病情概述

权威来源一致认为,猫可以偶发呕吐,但频繁或伴随全身症状时可能来自中毒、异物、感染、肾肝胰腺疾病、内分泌病、炎症性肠病、肿瘤等多种问题。AI 不应判断“就是毛球”或“吃坏肚子”,而应围绕频率、持续时间、呕吐物、精神食欲、排便排尿、误食和宿主风险做分级。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `vom_rf_repeated` | 连续/反复呕吐,或一天超过 1-2 次并持续 | 尽快门诊;若精神差/脱水则急诊 | `vom_002`, `vom_005`, `emg_007` |
| `vom_rf_blood` | 呕吐物有较多或持续血液、咖啡渣样内容物 | 急诊/立即联系兽医 | `vom_005`, `emg_003` |
| `vom_rf_systemic` | 同时精神差、虚弱、发热、腹痛、脱水、体重下降 | 尽快门诊或急诊 | `vom_005`, `vom_006`, `emg_006` |
| `vom_rf_diarrhea_or_no_stool` | 同时腹泻、便秘、不排便或腹部不适 | 至少黄档,怀疑梗阻时红档 | `vom_007`, `vom_009` |
| `vom_rf_toxin_foreign` | 可能吃了药、植物、巧克力、洋葱、绳线、异物 | 停止追问,按误食/中毒或异物急症处理 | `vom_008`, `vom_009`, `tox_001` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 偶发 1 次或低频毛球样呕吐,精神食欲饮水正常,无血/腹痛/腹泻/误食,成年健康猫 | 绿档:观察 12-24 小时,少量多次饮水/进食,给升级条件 | `vom_001`, `vom_003`, `vom_010` |
| moderate | 短期呕吐但不重,或一天内反复、轻度食欲下降、同时软便,无明显红旗 | 黄档:联系兽医或 24 小时内门诊,避免自行用药 | `vom_004`, `vom_007`, `vom_011` |
| severe | 频繁/持续、带血、腹痛、明显虚弱/脱水、误食毒物/异物、幼猫/老年/慢病猫状态差 | 红档:急诊或立刻联系兽医 | `vom_005`, `vom_006`, `vom_008`, `vom_009` |

## 6. 宿主风险画像

低风险特征:

- 成年健康猫。
- 偶发、短时间、呕吐后精神食欲恢复。
- 正常饮水、排尿、排便。
- 无误食、人药、植物、线状物接触史。

高风险特征:

- 幼猫、老年猫、孕猫、已知肾病/糖尿病/甲亢/心脏病等慢病。
- 精神差、虚弱、脱水、不吃、腹痛、发热。
- 多次呕吐或持续超过 24 小时。
- 可能吞食绳线、橡皮筋、塑料、药片、有毒植物或食物。

规则:高风险宿主的观察窗口应缩短;低风险宿主也不能在出现血、腹痛、持续呕吐或误食时降级。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `vom_q_frequency` | 频率是区分偶发与严重/长期呕吐的核心 | 偶发支持 green;一天多次或连续支持 yellow/red | `vom_001`, `vom_002`, `vom_005` |
| `vom_q_contents` | 血、异物、毛球、食物形态会改变风险 | 血/线状物/药片/植物支持 red | `vom_005`, `vom_008`, `vom_009` |
| `vom_q_systemic` | 精神、食欲、脱水、腹痛决定是否可观察 | 精神差/虚弱/腹痛/脱水支持 yellow/red | `vom_005`, `vom_006` |
| `vom_q_stool_urine` | 同时腹泻、便秘或尿异常提示系统性或梗阻风险 | 腹泻或不排便支持 yellow;尿闭另走 red | `vom_007`, `emg_009` |
| `vom_q_exposure` | 中毒和异物需要单独急症路径 | 误食毒物/人药/绳线/异物支持 red | `vom_008`, `vom_009` |

## 8. 就医前护理

### 可以做

- 记录呕吐次数、时间、呕吐物外观,保留照片或视频。
- 低风险轻症且呕吐停止后,少量多次提供清水和易消化食物。
- 保持安静,暂停新食物、零食、换粮和剧烈活动。
- 若怀疑误食,保留包装、植物样本或照片带去医院。

### 不建议做

- 不要把频繁呕吐归因于毛球后继续拖延。
- 不要在没有兽医指导下禁水。
- 不要给人用止吐药、止痛药、胃药或抗生素。

### 绝对不要做

- 不要自行催吐,尤其误食腐蚀物、尖锐/线状异物或猫已经虚弱时。
- 不要拉扯嘴里或肛门外露出的线状物。
- 红旗命中时不要继续观察或尝试家庭药品。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 止吐药 | VCA/Merck 提到持续呕吐、脱水、虚弱时兽医可能处方止吐药和液体治疗 | 只能说“可能需要兽医开止吐药/补液”,不推荐商品名或剂量 | `vom_011` |
| 胃肠道处方粮/易消化饮食 | 轻症或恢复期可能使用易消化饮食,但要按兽医建议 | 可建议少量多次、易消化食物;不指定处方粮品牌 | `vom_010` |
| 补液 | 严重/持续呕吐可需要皮下或静脉补液 | 可提醒脱水需医院处理,不可教用户自行输液 | `vom_006`, `vom_012` |
| 国内药品可得性 | 国内是否有对应兽药/进口注册产品需查国家兽药查询或中国兽药信息网 | 药品卡进入产品前必须做 CN 可得性和兽医审核 | `vom_013` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 低风险观察窗口 | Merck 提到短期偶发且无其他病征可支持护理;VCA 给出急性 2-3 天定义 | 产品采用更保守 12-24 小时观察,出现升级条件即就医 | 是否放宽到 24-48 小时 |
| 禁食策略 | Merck 提到兽医可能建议短期禁食;VCA 强调水应可获得 | 面向用户不主动建议禁食/禁水,只建议少量多次和联系兽医 | 是否允许“暂停食物 6-8 小时” |
| 药名展示 | VCA 提到部分药名 | AI 只展示类别,不展示具体药名/剂量 | 药品卡审核后是否可展示“兽医可能用药” |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `vom_001` | 健康猫偶发呕吐或低频毛球样呕吐可不代表异常。 | Cornell / VCA | L1/L2 | green | draft |
| `vom_002` | 每周超过一次、反复或频繁呕吐应由兽医评估。 | Cornell / Merck | L1 | yellow | draft |
| `vom_003` | 呕吐不同于反流和咳嗽,追问努力性腹部收缩、视频和吐出物形态有助分辨。 | Merck / VCA | L1/L2 | question | draft |
| `vom_004` | 短期、偶发且无其他病征的呕吐可先支持治疗和观察。 | Merck / VCA | L1/L2 | green/yellow | draft |
| `vom_005` | 呕吐伴血、腹痛、精神沉郁、脱水、虚弱、发热、体重下降等需要详细兽医检查。 | Merck / VCA | L1/L2 | red/yellow | draft |
| `vom_006` | 严重或长期呕吐可导致脱水、电解质和酸碱异常,可能需要住院静脉补液。 | Merck / VCA | L1/L2 | red | draft |
| `vom_007` | 呕吐伴腹泻、便秘或排便异常会影响兽医判断和分级。 | VCA / Cornell | L2/L1 | question | draft |
| `vom_008` | 有毒植物、人药、巧克力、洋葱等可导致猫呕吐或中毒。 | Cornell / ASPCA / Merck | L1 | red | draft |
| `vom_009` | 线状异物在猫中危险,可表现为呕吐、厌食、脱水、嗜睡和腹痛,并可能导致肠穿孔。 | VCA Linear Foreign Body | L2 | red | draft |
| `vom_010` | 轻症恢复期可按兽医建议使用易消化饮食,水分应可获得以防脱水。 | VCA / Merck | L1/L2 | home care | draft |
| `vom_011` | 持续呕吐、脱水或虚弱时,兽医可能使用止吐药、补液和针对病因的治疗。 | Merck / VCA | L1/L2 | medicine boundary | draft |
| `vom_012` | 家庭自行补液、给药或禁水可能掩盖或加重风险,尤其持续呕吐时。 | Merck / VCA 综合 | L1/L2 | forbidden | needs vet review |
| `vom_013` | 国内药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 绿档观察窗口是否应固定为 12-24 小时。
- 是否允许给“少量多次喂易消化食物”的具体举例。
- 代码里哪些呕吐选项应从 red 调整为 yellow。
- 是否允许面向用户展示“兽医可能使用止吐药/补液”,以及是否隐藏所有药名。
