# 病情资料:猫上呼吸道症状 / 打喷嚏流鼻涕

## 0. 元信息

- `condition_id`: `cat_uri`
- 中文名:猫上呼吸道症状
- 英文名:Feline upper respiratory tract signs / feline respiratory disease complex
- 对应 triage symptom:`sneeze`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-uri.ai-card.md`
- 现有底稿:`docs/product/证据-cat-uri-上呼吸道感染.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_uri | Cornell Feline Health Center, Respiratory Infections | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/respiratory-infections | L1 | 2026-05-30 curl UA 返回 HTTP 200;已有本地证据整理 | 症状、病原、诊断、护理、预防 |
| merck_frdc | Merck Veterinary Manual, Feline Respiratory Disease Complex | https://www.merckvetmanual.com/respiratory-system/respiratory-diseases-of-small-animals/feline-respiratory-disease-complex | L1 | 2026-05-30 curl UA 返回 HTTP 200;已有本地证据整理 | 病原、表现、治疗方向 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

打喷嚏/流鼻涕最重要的不是判断“是不是猫感冒”,而是判断有没有呼吸异常、不吃不喝、口腔溃疡、明显精神差、幼猫/未免疫/新到家等升级因素。

## 3. 症状/病情概述

猫上呼吸道症状可以来自多种病原或刺激物。产品不要诊断具体病原,只判断风险等级和下一步动作。

典型 URI 可能包括喷嚏、眼鼻分泌物、结膜炎、口腔溃疡、精神差、食欲下降。轻微、偶发喷嚏且精神食欲正常时可以观察;持续、伴分泌物、幼猫/未免疫/新到家、多猫环境时更偏向尽快门诊;呼吸异常、发绀、不吃不喝、瘫软时直接红档。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `uri_rf_breathing` | 呼吸费力、张口喘、嘴唇/牙龈发紫 | 立刻急诊 | `uri_001`, `emg_001` |
| `uri_rf_no_eat` | 明显不吃,尤其超过 24 小时或幼猫不吃 | 尽快就医;若精神差/脱水则急诊 | `uri_002`, `uri_009` |
| `uri_rf_mouth_ulcer` | 口腔溃疡、流口水、不愿吃硬粮 | 尽快就医,排查 FCV 等方向 | `uri_003` |
| `uri_rf_collapse` | 明显瘫软、叫不醒、精神极差 | 立刻急诊 | `uri_004`, `emg_006` |
| `uri_rf_tiny_kitten` | 极小幼猫出现 URI 且状态变差 | 偏向尽快/立刻就医 | `uri_005` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 偶尔喷嚏,无分泌物或只有少量清亮分泌物,精神食欲正常,呼吸正常,成年健康猫 | 绿档:在家观察 24-48 小时,给升级条件 | `uri_006`, `uri_007` |
| moderate | 喷嚏持续/反复,有眼鼻分泌物,轻度食欲下降,新到家/多猫/未免疫/幼猫,但无呼吸异常 | 黄档:尽快门诊或 24-48 小时内联系兽医,支持护理 | `uri_002`, `uri_005`, `uri_008`, `uri_010` |
| severe | 呼吸异常、发绀、不吃不喝、明显瘫软、严重口腔溃疡或系统性状态差 | 红档:急诊/立刻联系兽医 | `uri_001`, `uri_003`, `uri_004`, `emg_001` |

## 6. 宿主风险画像

低风险特征:

- 成年健康猫。
- 已按时免疫。
- 精神、食欲、饮水、呼吸正常。
- 症状短暂,没有加重。
- 单猫家庭或无新猫接触。

高风险特征:

- 幼猫,尤其很小的幼猫。
- 未免疫或疫苗不完整。
- 新到家、救助、多猫环境、收容所/猫舍来源。
- 已知慢性病或免疫低下。
- 食欲下降、精神差、脱水、呼吸异常。

规则:高风险特征不会自动诊断疾病,但会把观察窗口缩短。未免疫幼猫 + URI 表现,即使没有红旗,也应更偏向黄档门诊。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `uri_q_frequency` | 区分偶发刺激与持续性 URI 风险 | 偶发支持 green;持续很多次支持 yellow | `uri_006`, `uri_007` |
| `uri_q_discharge` | 分泌物和眼部表现提示 URI/继发感染风险 | 黄绿/带血/眼部分泌物支持 yellow;呼吸异常支持 red | `uri_002`, `uri_008`, `uri_001` |
| `uri_q_appetite_energy` | 食欲/精神是是否能观察的关键 | 食欲精神正常支持 green;下降支持 yellow;不吃/瘫软支持 red | `uri_002`, `uri_004` |
| `uri_q_duration` | 持续时间决定观察窗口 | 今日偶发支持 green;超过 2-3 天支持 yellow | `uri_007`, `uri_010` |
| `uri_q_host_risk` | 年龄、免疫、新到家、多猫会改变观察窗口 | 幼猫/未免疫/新到家支持 yellow | `uri_005`, `uri_011` |

## 8. 就医前护理

### 可以做

- 用生理盐水湿棉片或湿毛巾轻轻擦眼鼻分泌物。
- 确保饮水和营养,必要时加热食物提升气味吸引力。
- 减少应激:不要洗澡、不要频繁带出门、不要突然引入新猫。
- 多猫家庭隔离病猫,分开食盆、水碗、猫砂盆,接触后洗手。
- 记录喷嚏频率、分泌物颜色、精神食欲变化。

### 不建议做

- 不要因为“像感冒”就用人用感冒药。
- 不要自己买抗生素、眼药水或抗病毒药。
- 不要把赖氨酸补剂作为默认推荐;Cornell 对其有效性和潜在加重有争议。

### 绝对不要做

- 呼吸异常、发绀、不吃不喝、瘫软时不要继续在家观察。
- 不要给对乙酰氨基酚、布洛芬、减充血剂等人药。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 抗生素 | 某些病原/继发感染可能需要抗生素,但需兽医判断病原和适应症 | 可说“可能需要兽医开抗生素”,不可推荐具体药或剂量 | `uri_012` |
| 抗病毒 / 眼科用药 | FHV/角膜问题可能需要特定眼科/抗病毒治疗 | 只能说明由兽医检查后决定 | `uri_013` |
| 赖氨酸 | Cornell 资料中认为有效性有争议,部分研究提示可能加重 | 不作为 App 推荐项;若用户问,建议咨询兽医 | `uri_014` |
| 雾化/加湿 | 支持保持湿润空气和清理分泌物,家庭具体做法需谨慎 | 只推荐温和加湿/湿擦,不推荐药物雾化 | `uri_015` |

地区可得性:本卡不展示任何药品商品名。若未来加入药品卡,必须单独走 CN/US/UK 可得性和兽医审核。

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 赖氨酸 | 不同资料/临床实践对 lysine 态度不完全一致 | 不主动推荐,如用户问则说明存在争议 | 国内兽医是否建议直接劝阻 |
| 家庭蒸汽/雾化 | 权威资料支持湿润空气/生理盐水清理,但家庭蒸汽做法具体风险不清 | 只写加湿和湿擦,不写“浴室蒸汽治疗” | 国内实际可推荐的家庭做法 |
| 黄绿鼻涕是否红档 | 目前代码把“鼻涕黄/绿/带血”标红偏保守 | source 建议:黄绿分泌物通常 yellow;带血或伴全身差再 red | 兽医确认代码是否要降级 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `uri_001` | URI 罕见情况下可出现呼吸困难;呼吸异常/发绀是急症信号。 | Cornell / 通用红旗 | L1 | red flag | draft |
| `uri_002` | URI 可伴眼鼻分泌物、喷嚏、结膜炎、口腔溃疡、精神差和厌食。 | Cornell | L1 | question/report | draft |
| `uri_003` | FCV 等病原可表现出口腔溃疡和进食困难。 | Cornell / Merck | L1 | red/yellow | draft |
| `uri_004` | 精神极差、瘫软、叫不醒属于通用急诊信号。 | Anicira / 通用红旗 | L3 | red flag | draft |
| `uri_005` | 幼猫、多猫/收容所/猫舍、新到家和未免疫猫是 URI 风险更高的群体。 | Cornell / Merck | L1 | host risk | draft |
| `uri_006` | 健康猫偶发喷嚏可能由灰尘、气味、环境刺激引起,不等于需要立即就医。 | 产品综合 + Cornell 表现边界 | L1/internal | green | needs vet review |
| `uri_007` | 精神食欲正常、呼吸正常、症状短暂且无分泌物时可短期观察。 | 产品综合 | internal | green | needs vet review |
| `uri_008` | 黄绿分泌物、眼部表现、口腔溃疡、食欲下降提示需要兽医进一步检查。 | Cornell / Merck | L1 | yellow | draft |
| `uri_009` | 猫超过 24 小时不吃属于需要重视/就医的风险信号,幼猫更应缩短观察窗口。 | v0.2 anorexia / iCatCare PDF | L1 | host risk | draft |
| `uri_010` | 多数轻症 URI 可在支持护理下恢复,但持续/加重应就医。 | Cornell / Merck | L1 | yellow/green | draft |
| `uri_011` | 应激可诱发 FHV 复发,新猫/搬家/手术等是管理重点。 | Cornell | L1 | host risk/home care | draft |
| `uri_012` | 支原体/衣原体/Bordetella 等可涉及抗生素治疗,但须由兽医诊断后决定。 | Cornell / Merck | L1 | medicine boundary | draft |
| `uri_013` | 眼科并发或 FHV 相关问题可能需要特定治疗,由兽医检查决定。 | Cornell | L1 | medicine boundary | draft |
| `uri_014` | lysine 补剂有效性存在争议,部分研究提示可能无效或加重。 | Cornell | L1 | medicine boundary | draft |
| `uri_015` | 支持性护理包括保证水分、营养、清理鼻腔/分泌物和减少应激。 | Cornell / Merck | L1 | home care | draft |

## 12. 待兽医审核

- 黄绿鼻涕是否应直接红档,还是黄档 + 尽快门诊。
- 幼猫 URI 的最小年龄阈值和观察窗口。
- 赖氨酸是否在用户面向文案中直接劝阻。
- 是否允许推荐“生理盐水湿擦/加湿器”,是否禁止浴室蒸汽。
- 国内常见误区:葡萄糖水、妈咪爱、阿莫西林、人用眼药水是否要点名。
