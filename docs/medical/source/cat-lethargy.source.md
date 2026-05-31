# 病情资料:猫精神差 / 嗜睡

## 0. 元信息

- `condition_id`:`cat_lethargy`
- 中文名:猫精神差 / 嗜睡
- 英文名:Lethargy / decreased activity in cats
- 对应 triage symptom:`lethargy`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-lethargy.ai-card.md`
- 原始抓取:`docs/medical/raw/batch3-sensory-emergency/cat-lethargy/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| vca_recognizing_illness | VCA, Recognizing Signs of Illness in Cats | https://vcahospitals.com/know-your-pet/recognizing-signs-of-illness-in-cats | L2 | 2026-05-30 HTTP 200, text 16176 bytes | 精神食欲、牙龈、脱水、疾病识别 |
| anicira_emergency_10 | Anicira, 10 Signs Your Cat Is Having a Veterinary Emergency | https://anicira.org/resources/10-signs-your-cat-is-having-a-veterinary-emergency/ | L3 | 2026-05-30 HTTP 200, text 14404 bytes | 急诊红旗、家庭自评 |
| petmd_pale_gums | PetMD, Pale Gums in Cats | https://www.petmd.com/cat/symptom/pale-gums-in-cats | L3 | 2026-05-30 HTTP 200, text 9253 bytes | 牙龈苍白单点辅助验证 |
| merck_panleukopenia | Merck Veterinary Manual, Feline Panleukopenia | https://www.merckvetmanual.com/cat-owners/disorders-affecting-multiple-body-systems-of-cats/feline-panleukopenia | L1 | 2026-05-30 HTTP 200, text 3731 bytes | 幼猫/未免疫高风险、系统性疾病 |
| icatcare_panleukopenia | International Cat Care, Feline Infectious Enteritis | https://icatcare.org/articles/feline-infectious-enteritis-feline-parvovirus-panleukopenia-virus | L1 | 2026-05-30 HTTP 200, text 6226 bytes | 猫瘟风险、治疗边界 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

精神差是“系统性风险入口”,不是具体诊断;AI 要先排呼吸异常、塌陷、异常牙龈、脱水、不吃 24 小时、尿不出、呕吐腹泻/出血和幼猫未免疫等红旗,再决定是否能短期观察。

## 3. 症状/病情概述

猫会隐藏疼痛和疾病,精神差、躲藏、不理人、 grooming 变差、食欲饮水改变和排泄改变都可能是疾病信号。低风险的轻微疲倦可以短期观察,但真正“趴着不动、叫不醒、站不稳、不吃、牙龈白/黄/蓝、脱水、呼吸异常”的猫不能靠年龄或抵抗力硬熬。幼猫、未免疫猫和多猫/救助环境要特别警惕猫瘟等系统性疾病。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `leth_rf_collapse` | 叫不醒、瘫软、不能站立、明显虚弱 | 立即急诊 | `leth_006`, `emg_006` |
| `leth_rf_breathing` | 张口喘、呼吸费力、呼吸很快或发绀 | 立即急诊 | `leth_007`, `emg_001` |
| `leth_rf_gums` | 牙龈/舌头/皮肤/眼白苍白、白、黄、蓝紫 | 急诊或当天门诊 | `leth_005`, `bld_002`, `emg_009` |
| `leth_rf_dehydration` | 皮肤回弹慢、眼窝凹、严重不喝水/呕吐腹泻后精神差 | 立即就医 | `leth_004`, `emg_009` |
| `leth_rf_noeat` | 不正常进食接近或超过 24 小时,尤其胖猫/幼猫/慢病猫 | 立即联系兽医 | `leth_003` |
| `leth_rf_urinary` | 频繁蹲砂、尿不出或只有几滴,同时精神差 | 立即急诊 | `leth_008`, `emg_007` |
| `leth_rf_kitten_unvaccinated` | 幼猫/未免疫,精神差伴发热、呕吐、腹泻、不吃 | 急诊/当天门诊 | `leth_009`, `leth_010` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 比平时安静但仍能回应、行走、进食饮水、排尿排便正常,呼吸和牙龈正常,成年免疫完整 | 绿/黄边界:短期观察 12-24 小时,给升级条件 | `leth_001`, `leth_013` |
| moderate | 持续精神差、躲藏、食欲下降、 grooming 变差、轻度呕吐/软便,但无红旗 | 黄档:当天或 24 小时内联系兽医 | `leth_001`, `leth_002`, `leth_003` |
| severe | 塌陷、不能站立、呼吸异常、牙龈异常、脱水、不吃 24 小时、尿闭、幼猫未免疫伴 GI/发热 | 红档:急诊或立即联系兽医 | `leth_004`, `leth_005`, `leth_006`, `leth_009`, `leth_010` |

## 6. 宿主风险画像

低风险特征:

- 成年、免疫完整、无慢病。
- 仍能正常走动、回应、吃喝和排尿排便。
- 呼吸、牙龈颜色、体温感受和精神只是轻微变化。
- 有明确低风险原因,如刚运动、短暂应激后很快恢复。

高风险特征:

- 幼猫,尤其 5 月龄以下;未免疫或免疫不完整。
- 老年猫、肥胖猫、慢病猫、正在用药或免疫抑制。
- 新到家、救助、多猫环境或近期接触病猫。
- 不吃、不喝、呕吐腹泻、脱水、异常牙龈、尿异常、呼吸异常。

规则:年龄/免疫/抵抗力只用于调整观察窗口。幼猫、老年、未免疫和慢病猫窗口更短;成年健康猫也不能在命中红旗时降级。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `leth_q_responsive` | 能否站立/回应决定是否通用急症 | 不能站立/叫不醒为 red | `leth_006` |
| `leth_q_breath_gums` | 呼吸和黏膜颜色是最重要急停信号 | 呼吸异常或牙龈白/黄/蓝紫为 red | `leth_005`, `leth_007` |
| `leth_q_appetite_water` | 不吃不喝会快速改变风险 | 不吃接近/超过 24 小时为 red/high yellow | `leth_003`, `leth_004` |
| `leth_q_urine_stool_vomit` | 尿闭、呕吐腹泻、出血会转入具体急症路径 | 尿不出/持续 GI/出血为 red/yellow | `leth_008`, `leth_010`, `emg_003` |
| `leth_q_host_risk` | 年龄、疫苗、慢病决定观察窗口 | 幼猫/未免疫/慢病更保守 | `leth_009`, `leth_011`, `leth_013` |

## 8. 就医前护理

### 可以做

- 记录精神变化开始时间、食量、饮水、排尿排便、呕吐腹泻、体重变化。
- 安静保暖,减少刺激;能安全拍视频就拍给兽医看。
- 在不强迫、不造成应激的前提下观察牙龈颜色和皮肤回弹。
- 幼猫/未免疫或多猫环境疑似传染病时,先隔离并尽快就医。

### 不建议做

- 不要只因猫还会睡觉或躲着就判定没事。
- 不要把精神差解释成“懒、热、闹脾气”后拖过 24 小时。
- 不要强行灌水/灌食,尤其有呕吐、呼吸异常或意识差时。

### 绝对不要做

- 不要给人用退烧药、止痛药、抗生素、感冒药或镇静药。
- 不要用“抵抗力好应该能熬过”覆盖红旗。
- 命中红旗时不要继续观察或尝试家庭药品。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 补液/支持治疗 | 脱水、猫瘟或严重系统性疾病可能需要静脉补液和支持治疗 | 只提示可能需要医院处理,不教家庭输液 | `leth_004`, `leth_012` |
| 抗生素/止吐/营养支持 | 猫瘟等严重疾病可能需要抗生素、止吐和喂食支持 | 只展示治疗类别,不推荐商品名或剂量 | `leth_012` |
| 食欲促进剂/营养膏 | 精神差/不吃的病因不明时不能靠补剂掩盖 | 不推荐产品,先判断是否红旗和就医 | `leth_003`, `leth_013` |
| 国内药品可得性 | 所有药品卡需查国内批准和兽医审核 | AI 不展示剂量 | `leth_014` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 轻微精神差观察窗口 | 用户常想等一等,VCA 强调猫会隐藏疾病 | 成年低风险才给 12-24 小时短观察;任何食欲/牙龈/呼吸异常升级 | 绿档是否更短 |
| 不吃多久红档 | VCA 给出 24 小时立即关注;猫肥胖还涉及脂肪肝风险 | 产品设接近/超过 24 小时为高黄/红 | 是否按 12 小时区分幼猫 |
| 猫瘟入口 | 猫瘟不是所有精神差都要提示 | 只在幼猫/未免疫/呕吐腹泻/发热/多猫环境提示 | 中文文案如何避免恐吓 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `leth_001` | 猫会隐藏疾病和疼痛;外观、精力、社交、被毛、食欲、猫砂盆、呼吸或分泌物的突然变化都提示需要关注。 | VCA Recognizing Illness | L2 | overview/question | draft |
| `leth_002` | 生病的猫可能躲藏、退缩、变得黏人或易怒,也可能 grooming 变差、被毛油腻凌乱。 | VCA Recognizing Illness | L2 | question | draft |
| `leth_003` | 猫食欲/饮水变化很重要;不正常进食达到约 24 小时应立即寻求兽医关注。 | VCA Recognizing Illness | L2 | red/yellow | draft |
| `leth_004` | 皮肤回弹延迟、眼窝凹陷等提示脱水风险,需要立即治疗。 | VCA Recognizing Illness / Anicira | L2/L3 | red flag | draft |
| `leth_005` | 牙龈、皮肤或眼睛苍白、黄色、蓝色等异常颜色可能是严重疾病信号,延误数小时也可能危险。 | VCA Recognizing Illness / PetMD | L2/L3 | red flag | draft |
| `leth_006` | 猫无法站立、塌陷或不能正常回应可能涉及心肺脑或循环问题,应立即就医。 | Anicira | L3 | red flag | draft |
| `leth_007` | 呼吸困难的猫可能安静或躲藏;蓝紫、很白或异常牙龈属于紧急信号。 | Anicira / Emergency source | L3/internal | red flag | draft |
| `leth_008` | 尿道阻塞后期猫可能变得非常嗜睡甚至无法移动;尿不出应急诊。 | Anicira / Urethral obstruction source | L1/L3 | red flag | draft |
| `leth_009` | 猫瘟高度传染且常致命,幼猫尤其严重;5 月龄以下猫死亡风险更高。 | Merck Panleukopenia | L1 | host risk | draft |
| `leth_010` | 猫瘟可表现为发热、精神沉郁、食欲下降、呕吐、腹泻和快速脱水。 | Merck / iCatCare Panleukopenia | L1 | red/yellow | draft |
| `leth_011` | 猫瘟病毒可在环境中长期存活,未免疫猫/幼猫/多猫或救助环境风险更高。 | Merck / iCatCare Panleukopenia | L1 | host risk | draft |
| `leth_012` | 严重系统性疾病或猫瘟治疗可能需要静脉补液、抗生素、止吐和营养支持等兽医处理。 | iCatCare / Merck Panleukopenia | L1 | medicine boundary | draft |
| `leth_013` | 没有红旗时仍需结合年龄、免疫、慢病、症状持续时间和精神食欲判断观察窗口。 | VCA / 产品综合 | L2/internal | triage control | needs vet review |
| `leth_014` | 国内相关药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 精神差绿档观察窗口是否设为 12 小时还是 24 小时。
- 幼猫/未免疫猫是否一律当天门诊。
- 不吃接近 24 小时是否红档,以及肥胖猫是否更保守。
- 是否允许在用户端提到猫瘟,避免过度恐慌但不漏诊。
