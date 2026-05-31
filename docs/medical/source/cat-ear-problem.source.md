# 病情资料:猫耳朵问题

## 0. 元信息

- `condition_id`:`cat_ear_problem`
- 中文名:猫耳朵问题
- 英文名:Ear problems in cats
- 对应 triage symptom:`ear`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-ear-problem.ai-card.md`
- 原始抓取:`docs/medical/raw/batch3-sensory-emergency/cat-ear-problem/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_ear_mites | Cornell Feline Health Center, Ear Mites | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/ear-mites-tiny-critters-can-pose-major-threat | L1 | 2026-05-30 HTTP 200, text 3574 bytes | 耳螨表现、传染性、处理边界 |
| merck_otitis_externa | Merck Veterinary Manual, Otitis Externa in Cats | https://www.merckvetmanual.com/cat-owners/ear-disorders-of-cats/otitis-externa-in-cats | L1 | 2026-05-30 HTTP 200, text 3306 bytes | 外耳炎表现、诊断、家庭禁忌 |
| merck_otitis_media_interna | Merck Veterinary Manual, Otitis Media and Interna in Cats | https://www.merckvetmanual.com/cat-owners/ear-disorders-of-cats/otitis-media-and-interna-in-cats | L1 | 2026-05-30 HTTP 200, text 3330 bytes | 中耳/内耳红旗、神经/平衡风险 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 耳药地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

耳朵入口最重要的是区分“外耳瘙痒/耳螨/外耳炎”与“中耳/内耳或神经平衡异常”;前者通常需要门诊检查和耳药,后者出现头歪、走不稳、眼球异常运动或面部异常时要尽快就医。

## 3. 症状/病情概述

猫耳病常被用户描述为挠耳、甩头、耳朵臭、黑色耳垢、耳朵红肿、耳朵塌、碰耳朵疼。Cornell 和 Merck 一致强调,耳螨/外耳炎需要兽医通过耳镜或显微镜确认,不能靠肉眼判断后自行滴药。中耳/内耳问题可影响平衡、听力和面部神经,延误可能留下不可逆损伤。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `ear_rf_neuro_balance` | 头歪、走不稳、转圈、跳不上去、摔倒、眼球左右摆动 | 尽快门诊/急诊评估 | `ear_008`, `ear_009` |
| `ear_rf_facial` | 眼睑下垂、第三眼睑突出、瞳孔异常、脸部不对称 | 尽快兽医检查 | `ear_008` |
| `ear_rf_severe_pain` | 触碰耳朵剧痛、耳道明显肿胀闭塞、持续甩头抓到出血 | 当天门诊 | `ear_004`, `ear_010` |
| `ear_rf_discharge_odor` | 黑色/脓性/恶臭分泌物,伴红肿瘙痒 | 黄档门诊,不要自行清洗滴药 | `ear_001`, `ear_004`, `ear_006` |
| `ear_rf_kitten_outdoor_multicat` | 幼猫/外出猫/多猫环境出现典型耳螨表现 | 黄档门诊并考虑隔离 | `ear_002`, `ear_003` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 偶尔挠耳或少量耳垢,无臭味/红肿/疼痛/甩头/平衡异常 | 绿/黄边界:观察并避免自行清洁;持续或加重则门诊 | `ear_007`, `ear_004` |
| moderate | 明显挠耳、甩头、耳垢多、臭味、红肿、疼痛,但无神经/平衡信号 | 黄档:预约门诊检查耳镜/显微镜 | `ear_001`, `ear_004`, `ear_005` |
| severe | 头歪、走不稳、眼球异常运动、面部神经异常、严重疼痛或听力/平衡改变 | 红/高黄档:尽快就医 | `ear_008`, `ear_009`, `ear_010` |

## 6. 宿主风险画像

低风险特征:

- 成年室内猫。
- 只是偶尔挠耳,耳道无臭味、无大量分泌物、无疼痛。
- 精神食欲正常,走路和平衡正常。

高风险特征:

- 幼猫、外出猫、多猫家庭或近期接触新猫。
- 黑色碎屑样耳垢、强烈瘙痒、甩头、耳朵塌或红肿。
- 曾反复耳病或正在自行用耳药。
- 出现头歪、走不稳、眼球异常运动或面部异常。

规则:耳螨和外耳炎通常不是“马上吃药”的问题,而是要先确认病因;中耳/内耳信号不能被“可能只是耳螨”降级。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `ear_q_neuro` | 头歪/走不稳提示中耳/内耳或神经风险 | 是则 red/high yellow | `ear_008`, `ear_009` |
| `ear_q_discharge` | 黑色碎屑、臭味、脓性分泌物提示耳螨/感染/外耳炎 | 是则 yellow | `ear_001`, `ear_004` |
| `ear_q_pain` | 疼痛和肿胀影响是否当天门诊 | 明显疼痛/肿胀支持 yellow/red | `ear_004`, `ear_010` |
| `ear_q_context` | 外出、多猫和幼猫增加耳螨可能 | 高风险宿主缩短观察窗口 | `ear_002`, `ear_003` |
| `ear_q_home_action` | 用户可能已用双氧水、醋、精油或人药 | 已使用刺激物需停止并联系兽医 | `ear_006` |

## 8. 就医前护理

### 可以做

- 拍耳朵外观、分泌物和甩头/走路视频。
- 防止抓破耳朵,必要时使用伊丽莎白圈。
- 多猫家庭怀疑耳螨时,减少密切接触并预约检查。

### 不建议做

- 不要频繁掏耳朵或深入棉签。
- 不要在没有兽医指导下自行清洁健康猫耳朵。
- 不要只凭黑色耳垢判断“就是耳螨”。

### 绝对不要做

- 不要往耳道滴双氧水、醋、酒精、精油、茶树油或人用耳药。
- 不要使用来历不明或上次剩下的耳药。
- 出现头歪/走不稳/眼球异常运动时不要在家观察。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 驱耳螨药/耳药 | 耳螨和外耳炎需要兽医确认病因后选择治疗 | 可说“可能需要兽医开耳药”,不推荐商品名/剂量 | `ear_003`, `ear_005`, `ear_010` |
| 清耳液 | Merck 提醒健康猫通常不需要常规清耳,刺激性家庭清洁可能加重问题 | 不推荐用户自行清耳;只允许“按兽医指导使用” | `ear_006`, `ear_007` |
| 抗生素/抗真菌/抗炎治疗 | 细菌、酵母、过敏、中耳问题处理不同 | 只展示类别和就医边界 | `ear_005`, `ear_010` |
| 国内药品可得性 | 国内耳药/驱虫药需查批准和标签适用物种 | 药品卡必须 CN 可得性 + 兽医审核 | `ear_011` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 耳螨是否当天就医 | Cornell 建议不要拖延,但多数耳螨不是秒级急症 | 产品设黄档门诊;若剧痛/肿胀/神经信号升级 | 是否给 24-48 小时预约窗口 |
| 清耳建议 | 用户常期待“先清一下” | 当前默认不建议自行清耳,避免刺激和误伤 | 是否允许外耳廓轻擦 |
| 药名展示 | 常见驱虫/耳药有地区差异 | 面向用户隐藏商品名和剂量 | 兽医审核后是否可展示“可能治疗类别” |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `ear_001` | 猫耳螨可表现为外耳炎、耳朵塌、频繁抓挠/甩头以及黑色、黏稠或有臭味的耳垢/碎屑。 | Cornell Ear Mites | L1 | question/severity | draft |
| `ear_002` | 耳螨高度传染,常通过密切接触传播,外出猫风险更高。 | Cornell Ear Mites | L1 | host risk | draft |
| `ear_003` | 耳螨应尽快由兽医处理,否则可发展为外耳炎,并可能波及中耳/内耳造成听力或平衡损伤。 | Cornell Ear Mites | L1 | yellow/red | draft |
| `ear_004` | 猫外耳炎可表现为甩头、气味、红肿、抓挠、分泌物增多和鳞屑,通常疼痛或瘙痒。 | Merck Otitis Externa | L1 | question/severity | draft |
| `ear_005` | 外耳炎病因可包括寄生虫、异物、过敏、细菌/酵母和中耳问题,兽医可能需要耳镜和显微镜检查。 | Merck Otitis Externa | L1 | diagnosis boundary | draft |
| `ear_006` | 双氧水、醋等家庭清洁或刺激性产品可刺激耳道并促进感染,耳部产品应按兽医建议使用。 | Merck Otitis Externa | L1 | forbidden | draft |
| `ear_007` | 健康猫通常不需要常规清洁耳朵。 | Merck Otitis Externa | L1 | home care boundary | draft |
| `ear_008` | 中耳/内耳炎可出现头歪、面部神经变化、第三眼睑/瞳孔异常、协调差、起身或行走困难、眼球左右运动等。 | Merck Otitis Media/Interna | L1 | red flag | draft |
| `ear_009` | 中耳/内耳问题可导致平衡问题和耳聋,损伤可能不可逆。 | Merck Otitis Media/Interna | L1 | red flag | draft |
| `ear_010` | 耳病治疗取决于病因,可能需要兽医清洁、用药、镇静/麻醉或更深入检查。 | Merck Otitis Externa / Media/Interna | L1 | treatment boundary | draft |
| `ear_011` | 国内耳部药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 耳螨典型表现是否全部黄档,还是部分可 48 小时内门诊。
- 头歪/走不稳是否统一红档。
- 是否允许建议“只擦外耳廓可见污物”,以及具体怎么表述。
- 常见耳药类别是否可在用户端显示。
