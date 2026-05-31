# 病情资料:猫误食 / 中毒风险

## 0. 元信息

- `condition_id`:`cat_toxin_ingestion`
- 中文名:猫误食 / 中毒风险
- 英文名:Toxin ingestion / poisoning risk in cats
- 对应 triage symptom:`eat`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-toxin-ingestion.ai-card.md`
- 原始抓取:`docs/medical/raw/batch2-core-risk/cat-toxin-ingestion/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_poisons | Cornell Feline Health Center, Poisons | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/poisons | L1 | 2026-05-30 HTTP 200, text 5200 bytes | 猫中毒信号、急救边界 |
| aspca_poison_control | ASPCA Animal Poison Control | https://www.aspca.org/pet-care/animal-poison-control | L1 | 2026-05-30 HTTP 200, text 4198 bytes | 毒物热线、专题入口 |
| aspca_people_foods | ASPCA People Foods to Avoid Feeding Your Pets | https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets | L1 | 2026-05-30 HTTP 200, text 7310 bytes | 食物毒物 |
| aspca_household_products | ASPCA Poisonous Household Products | https://www.aspca.org/pet-care/aspca-poison-control/poisonous-household-products | L1 | 2026-05-30 HTTP 200, text 6978 bytes | 家庭用品 |
| aspca_lily | ASPCA Toxic and Non-toxic Plants: Lily | https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/lily | L1 | 2026-05-30 HTTP 200, text 2827 bytes | 百合植物 |
| aspca_asian_lily | ASPCA Toxic and Non-toxic Plants: Asian Lily | https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/asian-lily | L1 | 2026-05-30 HTTP 200, text 2859 bytes | 百合植物 |
| merck_human_analgesics | Merck Veterinary Manual, Toxicoses From Human Analgesics | https://www.merckvetmanual.com/toxicology/toxicities-from-human-drugs/toxicities-from-over-the-counter-drugs | L1 | 2026-05-30 HTTP 200, text 25302 bytes | 人用止痛药中毒 |
| merck_chocolate_toxicosis | Merck Veterinary Manual, Chocolate Toxicosis | https://www.merckvetmanual.com/toxicology/food-hazards/chocolate-toxicosis-in-animals | L1 | 2026-05-30 HTTP 200, text 10460 bytes | 巧克力/咖啡因 |
| fda_pain_relief_pets | FDA, Get the Facts about Pain Relievers for Pets | https://www.fda.gov/animal-veterinary/animal-health-literacy/get-facts-about-pain-relievers-pets | L1 | 2026-05-30 HTTP 200, text 18177 bytes | NSAID/对乙酰氨基酚边界 |
| fda_pet_emergency_contacts | FDA, Who Do You Call if You Have a Pet Emergency? | https://www.fda.gov/animal-veterinary/animal-health-literacy/who-do-you-call-if-you-have-pet-emergency | L1 | 2026-05-30 HTTP 200, text 4347 bytes | 紧急联系路径 |
| vca_toxic_hazards_cats | VCA, Toxic Hazards for Cats | https://vcahospitals.com/greater-savannah/know-your-pet/household-hazards-toxic-hazards-for-cats | L2 | 2026-05-30 HTTP 200, text 17888 bytes | 猫常见家庭危险物 |
| vca_linear_foreign_body | VCA, Linear Foreign Body in Cats | https://vcahospitals.com/know-your-pet/linear-foreign-body-in-cats | L2 | 2026-05-30 HTTP 200, text 13430 bytes | 绳线异物 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

误食入口最重要的是不要让 AI 估剂量、催吐或安慰观察;应立刻收集“吃了什么、多少、什么时候、体重、当前症状、包装/照片”,然后建议联系兽医急诊或毒物热线。

## 3. 症状/病情概述

猫中毒可表现为嗜睡、步态不稳、流口水、呼吸重、腹泻、抽搐、突然呕吐等。不同毒物的危险剂量差异很大,猫对一些人药尤其敏感。AI 不应根据用户粗略描述判断“没事”,而应把毒物识别、暴露时间和是否已出现症状作为优先级最高的追问。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `tox_rf_known_high_risk` | 百合、对乙酰氨基酚、布洛芬/NSAID、人药、杀虫/灭鼠、巧克力/咖啡因、木糖醇、洋葱蒜、绳线异物 | 立即联系兽医/毒物热线;多为红档 | `tox_002`, `tox_003`, `tox_004`, `tox_005`, `tox_006`, `tox_007`, `tox_011` |
| `tox_rf_symptoms` | 呕吐、腹泻、流口水、步态不稳、抽搐、呼吸重、瘫软 | 急诊 | `tox_001`, `emg_001`, `emg_006` |
| `tox_rf_lily` | 接触或误食百合任意部位/花粉/花瓶水 | 立即联系兽医;不要观察 | `tox_005` |
| `tox_rf_human_pain` | 吃了人用止痛药、退烧药或不确定药片 | 急诊/毒物热线 | `tox_003`, `tox_004` |
| `tox_rf_string` | 吞了线、绳、丝带、毛线,或嘴/肛门有线头 | 急诊;不要拉扯 | `tox_011` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 低风险物品、量很少、无症状、可确认不在高危清单 | 黄档:仍建议联系兽医或毒物热线确认,不要自行用药 | `tox_012`, `tox_014` |
| moderate | 毒物不确定、量不清楚、时间较近、猫目前无明显症状 | 黄/红边界:尽快电话咨询,准备包装和体重 | `tox_012`, `tox_013`, `tox_014` |
| severe | 已知高危毒物、任何症状、幼猫/慢病、吞异物/线状物,或剂量无法确认 | 红档:急诊或毒物热线 | `tox_001`, `tox_002`, `tox_003`, `tox_005`, `tox_011` |

## 6. 宿主风险画像

高风险特征:

- 幼猫、老年猫、慢病猫、体重很轻。
- 已经出现神经、呼吸、消化、虚弱或出血信号。
- 吃的是人药、百合、杀虫/灭鼠、清洁剂、巧克力/咖啡因、木糖醇、洋葱蒜或线状异物。
- 剂量、时间、包装都不清楚。

低风险特征:

- 可确认物品低毒,量极少,猫无症状,且能立即联系专业人员确认。

规则:误食场景不能因为“当前没症状”而绿档,除非专业毒物源或兽医明确确认低风险。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `tox_q_what` | 毒物种类决定急迫性 | 百合/人药/NSAID/对乙酰氨基酚/巧克力/线状物直接 red | `tox_002`, `tox_003`, `tox_004`, `tox_005`, `tox_011` |
| `tox_q_when_amount` | 时间和量决定专业处理方式 | 时间近/量大/不确定支持 red | `tox_012`, `tox_014` |
| `tox_q_weight` | 体重影响剂量风险,但 AI 不计算安全剂量 | 体重轻更保守 | `tox_014` |
| `tox_q_symptoms` | 是否已经中毒决定是否急诊 | 呕吐、抽搐、呼吸异常、瘫软等 red | `tox_001` |
| `tox_q_package` | 包装/成分能帮助兽医或毒物热线判断 | 无包装/成分不清则更保守 | `tox_013` |

## 8. 就医前护理

### 可以做

- 立刻把猫和可疑物品隔离。
- 保留包装、药板、植物照片、剩余食物或呕吐物照片。
- 记录体重、误食时间、估计量、当前症状。
- 联系本地急诊兽医;美国可联系 ASPCA Animal Poison Control 或 Pet Poison Helpline。
- 若皮肤接触腐蚀/毒性物质,可按兽医或毒物热线指导冲洗。

### 不建议做

- 不要等症状出现再行动。
- 不要搜索“安全剂量”后自行判断。
- 不要自行给牛奶、油、活性炭、解毒药。

### 绝对不要做

- 不要自行催吐,除非兽医或毒物控制中心明确要求。
- 不要给任何人用药。
- 不要拉扯嘴里或肛门外露出的线。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 活性炭 | AVMA/Merck 均提示只能在兽医或毒物中心指导下使用 | 禁止 AI 建议用户自行使用 | `tox_015` |
| 催吐 | Cornell/VCA/AVMA 均要求不要自行催吐,尤其异物/腐蚀物 | 禁止 AI 教催吐方法或剂量 | `tox_016` |
| 解毒/支持治疗 | 不同毒物处理完全不同,需专业判断 | 不推荐药品或剂量,只引导急诊/毒物热线 | `tox_017` |
| 国内药品可得性 | 国内兽药/解毒产品需查国家兽药查询/中国兽药信息网 | 所有毒物药品卡默认隐藏,仅专业审核后可用 | `tox_018` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 是否给低风险观察 | 毒物源强调尽快联系专业人员 | 产品不设纯绿档,最低也是“黄档电话确认” | 是否允许少量低毒食物进入 green |
| 毒物热线本地化 | 美国有 ASPCA/APCC;中国没有同等公开热线体系 | 中国用户文案改为“联系本地急诊兽医/宠物医院” | 国内可推荐的 24h 急诊路径 |
| 药品/催吐 | 专业源可能讨论催吐/活性炭 | 面向用户全部禁止自行操作 | 是否显示“医生可能会做” |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `tox_001` | 猫中毒常见表现包括嗜睡、步态不稳、流口水、呼吸重、腹泻、抽搐和突然呕吐等。 | Cornell | L1 | red flag | draft |
| `tox_002` | 人药、杀虫剂、灭鼠剂、清洁剂、植物和某些食物是猫常见中毒来源。 | Cornell / ASPCA / VCA | L1/L2 | overview | draft |
| `tox_003` | 对乙酰氨基酚对猫可致命,猫不应使用。 | FDA / Merck | L1 | red | draft |
| `tox_004` | NSAID/人用止痛药可造成猫胃肠、肾、肝等严重副作用,不应自行给猫。 | FDA / Merck / Cornell | L1 | red/forbidden | draft |
| `tox_005` | 百合对猫尤其危险,极少量接触/误食也可能导致严重肾损伤风险。 | Cornell / ASPCA | L1 | red | draft |
| `tox_006` | 巧克力、咖啡和咖啡因相关甲基黄嘌呤可导致呕吐、腹泻、心律异常、震颤、抽搐甚至死亡。 | ASPCA / Merck | L1 | red | draft |
| `tox_007` | 洋葱、蒜、韭菜等 Allium 可导致胃肠刺激和红细胞损伤,猫更易受影响。 | ASPCA / Cornell | L1 | red/yellow | draft |
| `tox_008` | 木糖醇可导致低血糖和潜在肝损伤,需要快速专业处理。 | ASPCA / FDA | L1 | red | draft |
| `tox_009` | 过量盐可导致呕吐、腹泻、抑郁、震颤、抽搐甚至死亡。 | ASPCA | L1 | red/yellow | draft |
| `tox_010` | 清洁剂、洗衣凝珠、阳离子洗涤剂等可造成胃肠刺激、口腔食道灼伤或严重症状。 | ASPCA | L1 | red/yellow | draft |
| `tox_011` | 线状异物在猫中危险,可造成肠道皱缩、穿孔和腹膜炎;常见症状包括呕吐、厌食、脱水和嗜睡。 | VCA Linear Foreign Body | L2 | red | draft |
| `tox_012` | 误食处理需要知道物质、时间、量、体重和当前症状。 | FDA / ASPCA / 产品综合 | L1/internal | question | draft |
| `tox_013` | 保留包装、容器、植物样本或照片有助兽医/毒物热线判断。 | VCA / FDA / ASPCA | L1/L2 | home care | draft |
| `tox_014` | 毒物风险取决于毒物强度、进入体内的量、年龄、体重、健康状况和代谢等因素。 | Cornell | L1 | risk | draft |
| `tox_015` | 活性炭等急救处理只能在兽医或毒物控制中心指导下使用。 | AVMA / Merck | L1 | forbidden | draft |
| `tox_016` | 不应自行催吐,除非兽医或毒物控制中心明确要求;异物/腐蚀物尤其危险。 | Cornell / VCA / AVMA | L1/L2 | forbidden | draft |
| `tox_017` | 不同毒物治疗策略不同,可能需要解毒剂、补液、控制神经/心血管症状等专业处理。 | Cornell / Merck / FDA | L1 | medicine boundary | draft |
| `tox_018` | 国内药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 中国用户误食入口是否需要内置“最近 24 小时急诊医院查找”。
- 百合、对乙酰氨基酚、布洛芬是否无条件红档。
- 是否允许展示 ASPCA 美国热线,以及中国版如何本地化。
- 国内常见误区:双氧水催吐、活性炭、牛奶/油/绿豆水是否需要点名禁止。
