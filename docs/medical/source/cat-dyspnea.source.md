# 病情资料:猫呼吸困难 / 呼吸异常

## 0. 元信息

- `condition_id`:`cat_dyspnea`
- 中文名:猫呼吸困难 / 呼吸异常
- 英文名:Dyspnea / respiratory distress in cats
- 对应 triage symptom:`breath`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-dyspnea.ai-card.md`
- 原始抓取:`docs/medical/raw/batch2-core-risk/cat-dyspnea/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_dyspnea | Cornell Feline Health Center, Dyspnea | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/dyspnea-difficulty-breathing | L1 | 2026-05-30 HTTP 200, text 4014 bytes | 呼吸困难红旗、病因、处理边界 |
| cornell_feline_asthma | Cornell Feline Health Center, Feline Asthma | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-asthma-risky-business-many-cats | L1 | 2026-05-30 HTTP 200, text 7501 bytes | 哮喘表现、严重程度、用药边界 |
| vca_emergencies_cats | VCA, Emergencies in Cats | https://vcahospitals.com/know-your-pet/emergencies-in-cats?sf154871043=1 | L2 | 2026-05-30 HTTP 200, text 18247 bytes | 急症处理和运输 |
| avma_pet_first_aid_pdf | AVMA, Pet First Aid | https://ebusiness.avma.org/files/ProductDownloads/mcm-client-brochures-pet-first-aid-2025.pdf | L1 | 2026-05-30 HTTP 200, PDF 转文本 20646 bytes | 急救边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

猫呼吸困难是硬急症入口:只要张口喘、呼吸费力、明显加快、蓝紫牙龈/舌头、塌陷或呼吸伴痛苦,AI 应停止常规追问并建议立即急诊。

## 3. 症状/病情概述

Dyspnea 是临床信号而不是疾病,可能来自哮喘急性发作、心衰、胸腔积液、气道异物、肺部疾病、创伤、感染等。权威来源一致强调,猫呼吸困难死亡风险高,家庭无法安全排查病因。AI 的任务是识别红旗和运输安全,不是鉴别哮喘、心脏病或普通咳嗽。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `bre_rf_open_mouth` | 张口呼吸/张口喘/像狗一样喘 | 立即急诊 | `bre_001`, `bre_004`, `emg_001` |
| `bre_rf_labored` | 腹部用力、身体前伸、头颈伸直、呼吸费力 | 立即急诊 | `bre_001`, `bre_002` |
| `bre_rf_blue` | 嘴唇、鼻子、舌头、牙龈发紫/发蓝 | 立即急诊 | `bre_004`, `emg_001` |
| `bre_rf_collapse` | 瘫软、叫不醒、抽搐、极度虚弱 | 急诊 | `emg_006`, `bre_005` |
| `bre_rf_choking` | 疑似卡住、喘不过气、发出窒息声 | 急诊;若还能呼吸先保持安静并就医 | `bre_006` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 仅偶发咳嗽/轻微打喷嚏,休息时呼吸正常,无张口喘/费力/发绀,精神食欲正常 | 不走 dyspnea 红档,转 URI/咳嗽路径并给升级条件 | `bre_007` |
| moderate | 呼吸比平时快、偶发喘鸣/咳嗽、疑似哮喘但当前无张口喘/发绀/塌陷 | 黄/红边界:当天联系兽医,若加重立刻急诊 | `bre_003`, `bre_008` |
| severe | 张口喘、费力呼吸、发绀、明显痛苦、塌陷、持续呼吸急促 | 红档:立即急诊 | `bre_001`, `bre_004`, `bre_005` |

## 6. 宿主风险画像

高风险特征:

- 任何年龄的猫出现张口喘或费力呼吸。
- 老年猫、已知心脏病、哮喘、胸腔积液史。
- 肥胖会让呼吸问题更快恶化。
- 接触烟雾、香薰、粉尘猫砂、喷雾、清洁剂、花粉等可能诱发呼吸道问题。

低风险特征:

- 严格来说,真正呼吸困难没有低风险观察。只有确认“不是呼吸困难”的轻微咳嗽/喷嚏才可转其它路径。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `bre_q_open_mouth` | 张口呼吸是猫急症信号 | 是则 red,停止追问 | `bre_001`, `bre_004` |
| `bre_q_effort_color` | 费力和发绀提示氧合问题 | 费力/蓝紫 red | `bre_002`, `bre_004` |
| `bre_q_state` | 塌陷、无法站立、极度虚弱为通用急症 | 是则 red | `bre_005`, `emg_006` |
| `bre_q_cough_vs_vomit` | 用户可能把咳嗽/呕吐/喘混淆 | 无红旗时帮助转路径 | `bre_007` |
| `bre_q_trigger_history` | 哮喘/烟雾/粉尘/心脏病史影响兽医判断 | 不降级,只用于准备信息 | `bre_003`, `bre_008` |

## 8. 就医前护理

### 可以做

- 让猫保持安静,减少抓抱和刺激。
- 立刻联系急诊医院并出发。
- 用硬质航空箱或猫包运输,保持通风。
- 如果能安全拍 5-10 秒视频,给兽医看;不要为了拍视频拖延。

### 不建议做

- 不要强行喂水、喂食、喂药。
- 不要洗澡、吹风、蒸汽、雾化或香薰。
- 不要反复抱起来检查牙龈导致应激。

### 绝对不要做

- 张口喘/费力/发绀时不要在家观察。
- 不要自行给哮喘喷剂、人用支气管扩张剂、抗生素或止咳药。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 氧气/急诊处理 | 呼吸困难需要兽医检查和针对病因处理 | 只引导急诊,不教家庭氧疗 | `bre_009` |
| 支气管扩张剂/糖皮质激素 | 猫哮喘可能用这些药,吸入给药较常被专家偏好 | 不推荐具体药、剂量或人用喷剂 | `bre_010` |
| 胸腔穿刺/补液等 | 胸腔积液、心衰等需专业处理 | 只说明可能需要医院处理 | `bre_009` |
| 国内药品可得性 | 进入药品卡前需查国家兽药查询/中国兽药信息网 | 禁止直接展示剂量 | `bre_011` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 咳嗽/哮喘是否一律红档 | Cornell asthma 指出轻中重分级,但呼吸困难可快速恶化 | 用户入口如描述“呼吸怪”,先排 red;无 red 再转黄档门诊 | 是否需要呼吸频率阈值 |
| 家庭急救 | AVMA 有急救说明,但用户很难安全执行 | 产品仅提示保持安静、通风运输、联系急诊 | 是否展示 CPR/窒息处理 |
| 药名 | Cornell 提到吸入药名 | 面向用户不展示药名和剂量 | 专业版是否展示 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `bre_001` | 猫呼吸困难/呼吸窘迫表现包括吸气呼气困难、呼吸明显加快、张口喘、咳嗽、头颈前伸等。 | Cornell Dyspnea | L1 | red/question | draft |
| `bre_002` | 呼吸费力的猫可能低头、身体前伸,看起来像要呕吐或作呕。 | Cornell Dyspnea | L1 | question | draft |
| `bre_003` | 常见呼吸窘迫原因包括哮喘急性加重、心衰和胸腔积液,也可有异物、创伤、感染等。 | Cornell Dyspnea | L1 | overview | draft |
| `bre_004` | 张口喘、发绀或蓝紫黏膜提示危及生命的氧合问题,需要急诊。 | Cornell Asthma / VCA | L1/L2 | red | draft |
| `bre_005` | 呼吸困难若不及时治疗,猫有死亡风险。 | Cornell Dyspnea / Cornell Asthma | L1 | red | draft |
| `bre_006` | 窒息动物可能呼吸困难、抓嘴、发出窒息声、嘴唇/舌头发蓝;若仍能呼吸应保持安静并立即就医。 | AVMA | L1 | red | draft |
| `bre_007` | 用户可能把咳嗽、呕吐和呼吸异常混淆,视频可帮助兽医判断。 | VCA vomiting / 产品综合 | L2/internal | question | draft |
| `bre_008` | 烟草烟雾、粉尘猫砂、清洁喷雾、花粉、霉菌、烟尘等可作为哮喘或呼吸道刺激因素。 | Cornell Asthma | L1 | question/home | draft |
| `bre_009` | 呼吸困难病因复杂,只有兽医能检查并决定氧气、抽液、药物等处理。 | Cornell Dyspnea / VCA | L1/L2 | treatment boundary | draft |
| `bre_010` | 猫哮喘治疗可能包括糖皮质激素和支气管扩张剂,给药方式和适应症需兽医决定。 | Cornell Asthma | L1 | medicine boundary | draft |
| `bre_011` | 国内药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 是否加入静息呼吸频率阈值,以及对用户如何避免误测。
- 咳嗽但无呼吸困难时,黄档还是转 URI/其它路径。
- 是否允许展示“急诊路上不要喂水喂药”的强提示。
- 哮喘药物是否完全隐藏药名。
