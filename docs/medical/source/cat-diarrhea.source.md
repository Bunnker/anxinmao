# 病情资料:猫腹泻

## 0. 元信息

- `condition_id`:`cat_diarrhea`
- 中文名:猫腹泻
- 英文名:Diarrhea / diarrhoea in cats
- 对应 triage symptom:`diarrhea`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-diarrhea.ai-card.md`
- 原始抓取:`docs/medical/raw/batch2-core-risk/cat-diarrhea/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_diarrhea | Cornell Feline Health Center, Diarrhea | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/diarrhea | L1 | 2026-05-30 HTTP 200, text 3069 bytes | 病因、系统性症状、OTC 风险 |
| icatcare_diarrhoea | International Cat Care, Diarrhoea in cats | https://icatcare.org/articles/diarrhoea-in-cats | L1 | 2026-05-30 HTTP 200, text 9683 bytes | 严重程度、黑便/血便、支持护理 |
| vca_diarrhea | VCA Hospitals, Diarrhea in Cats | https://vcahospitals.com/know-your-pet/diarrhea-in-cats | L2 | 2026-05-30 HTTP 200, text 12423 bytes | 追问、家庭处理、复诊窗口 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

腹泻分诊的重点是判断是否只是短期轻微软便,还是已经出现血便/黑便、频繁水样便、呕吐、不吃、精神差、脱水、幼猫或持续超过 1-2 天这些升级因素。

## 3. 症状/病情概述

腹泻是临床表现而不是疾病。来源一致指出,轻微短期腹泻可能来自饮食变化或应激,但也可能由感染、寄生虫、中毒、炎症、胰腺/肝肾/内分泌疾病、猫瘟或肿瘤等引起。AI 不应诊断病因,应通过便便形态、频率、持续时间、血/黑便、精神食欲、呕吐和宿主风险来决定观察还是就医。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `dia_rf_severe_bloody` | 严重腹泻、明显血便或大量血 | 尽快门诊/急诊 | `dia_004`, `dia_006`, `emg_003` |
| `dia_rf_black_tarry` | 黑色柏油样便,疑似上消化道出血 | 立即联系兽医 | `dia_006` |
| `dia_rf_systemic` | 同时呕吐、不吃、精神差、虚弱、发热、腹痛、脱水 | 尽快门诊或急诊 | `dia_004`, `dia_005`, `emg_006` |
| `dia_rf_persistent` | 腹泻持续超过 1-2 天或超过几天仍未缓解 | 门诊评估 | `dia_003`, `dia_007` |
| `dia_rf_kitten` | 幼猫腹泻,尤其水样/频繁/精神差 | 缩短观察窗口,尽快就医 | `dia_002`, `dia_010` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 成年健康猫,轻微软便或短期饮食/应激相关,精神食欲正常,无呕吐/血/黑便/脱水 | 绿档:短期观察,记录便便,维持水分,若超过 24-48 小时或加重则就医 | `dia_001`, `dia_002`, `dia_011` |
| moderate | 持续 1-2 天、频繁、黏液/少量鲜血、轻度食欲下降,或幼猫/老年/慢病但无急症红旗 | 黄档:联系兽医,准备粪便样本,可能需要检查 | `dia_003`, `dia_006`, `dia_008` |
| severe | 严重水样/血性/黑便、伴呕吐不吃精神差、脱水虚弱、腹痛发热,或持续加重 | 红档:急诊或当天门诊 | `dia_004`, `dia_005`, `dia_006`, `dia_009` |

## 6. 宿主风险画像

低风险特征:

- 成年健康猫。
- 轻微软便,次数不多,精神食欲正常。
- 最近有换粮、偷吃或轻度应激解释,且没有加重。

高风险特征:

- 幼猫、老年猫、免疫不全或慢病猫。
- 水样频繁、血便/黑便、明显臭味或黏液多。
- 同时呕吐、不吃、精神差、虚弱、脱水或腹痛。
- 持续超过 1-2 天,或反复慢性腹泻。

规则:腹泻本身不一定急,但系统性症状和宿主风险会显著缩短观察窗口。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `dia_q_stool` | 便便形态、颜色、血/黏液决定风险 | 黑便/大量血 red;水样频繁 yellow/red | `dia_006`, `dia_008` |
| `dia_q_duration_frequency` | 持续时间和次数决定观察窗口 | >1-2 天或频繁支持 yellow | `dia_003`, `dia_007` |
| `dia_q_systemic` | 呕吐、不吃、精神差、脱水决定是否急 | 任一明显系统性表现支持 yellow/red | `dia_004`, `dia_005` |
| `dia_q_host` | 年龄、慢病、免疫影响能不能观察 | 幼猫/老年/慢病支持更高风险 | `dia_010` |
| `dia_q_exposure` | 饮食变化、毒物、寄生虫接触影响路径 | 毒物/人药/未免疫幼猫改走红旗或猫瘟路径 | `dia_012`, `tox_001` |

## 8. 就医前护理

### 可以做

- 记录便便次数、颜色、是否有血/黏液,拍照。
- 多猫家庭确认是哪只猫腹泻。
- 保持饮水,可询问兽医是否需要电解质液。
- 预约时带新鲜粪便样本。
- 轻症可在兽医建议下短期易消化饮食。

### 不建议做

- 不要在腹泻时频繁换很多新食物或大量零食。
- 不要自行使用人用止泻药。
- 不要把幼猫腹泻当作普通软便拖延。

### 绝对不要做

- 血便/黑便、持续呕吐、不吃、虚弱、脱水时不要继续观察。
- 不要自行给抗生素、驱虫药或止泻药。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 益生菌/益生元 | iCatCare/VCA 提到可作为支持治疗的一部分,但质量和适用性需咨询兽医 | 可说“兽医可能建议益生菌”,不推荐品牌/剂量 | `dia_011` |
| 驱虫药/抗寄生虫药 | 寄生虫可导致腹泻,治疗需依据检查和兽医判断 | 不自行推荐驱虫药 | `dia_012` |
| 止泻药/抗生素 | 可能由兽医处方,但 OTC 或人药可能伤猫 | 只展示类别边界,不展示具体药和剂量 | `dia_013` |
| 国内药品可得性 | 进入产品前需查国家兽药查询/中国兽药信息网 | 药品信息默认 `review_required: true` | `dia_014` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 少量鲜血 | iCatCare 认为少量鲜血不必然急诊,但应检查 | 产品列为 yellow,大量/持续血或系统性差才 red | 血量阈值如何给用户描述 |
| 禁食 | VCA 提到成年健康猫可能由兽医建议短期禁食 | AI 不主动建议禁食,只说按兽医建议易消化饮食 | 是否允许“少喂多餐” |
| 益生菌 | 来源支持但产品质量参差 | 不推荐具体产品 | 是否可列“兽医常见建议类别” |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `dia_001` | 腹泻是粪便不成形/稀软/水样且常伴频率增加的临床表现,不是一个诊断。 | Cornell / VCA / iCatCare | L1/L2 | overview | draft |
| `dia_002` | 饮食突然变化或应激可导致短期轻度腹泻;幼猫风险更高。 | Cornell | L1 | green/host | draft |
| `dia_003` | 成年猫异常排便若持续超过 1-2 天应咨询兽医。 | Cornell / VCA | L1/L2 | yellow | draft |
| `dia_004` | 腹泻伴食欲差、嗜睡、呕吐等系统性症状应尽快就医。 | Cornell / VCA / iCatCare | L1/L2 | red/yellow | draft |
| `dia_005` | 严重或长期腹泻可导致脱水和代谢异常,可能需要住院静脉补液。 | VCA / iCatCare | L2/L1 | red | draft |
| `dia_006` | 黑色柏油样便提示上消化道出血风险;大量或持续血便需联系兽医。 | iCatCare / VCA | L1/L2 | red/yellow | draft |
| `dia_007` | 腹泻持续几天、严重或伴随其他病征时应由兽医检查。 | iCatCare / Cornell | L1 | yellow | draft |
| `dia_008` | 便便频率、颜色、黏液/血、是否里急后重等信息能帮助兽医缩小病因。 | iCatCare / VCA | L1/L2 | question | draft |
| `dia_009` | 腹泻可能由感染、寄生虫、毒物、植物、饮食不耐受、过敏等多种原因引起。 | VCA / Cornell | L1/L2 | overview | draft |
| `dia_010` | 幼猫、老年或慢病猫腹泻的观察窗口应缩短。 | Cornell / 产品综合 | L1/internal | host risk | needs vet review |
| `dia_011` | 支持治疗可包括易消化饮食、维持液体摄入和兽医建议的益生菌/益生元。 | iCatCare / VCA | L1/L2 | home care | draft |
| `dia_012` | 寄生虫和感染性病原可能导致腹泻,诊断和治疗可能需要粪检等检查。 | VCA / iCatCare | L2/L1 | diagnosis | draft |
| `dia_013` | 一些非处方或人用药可能对猫有害,腹泻用药应咨询兽医。 | Cornell / VCA | L1/L2 | medicine boundary | draft |
| `dia_014` | 国内药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 少量鲜血、黏液便在产品里应该黄档还是红档。
- 绿档观察窗口是 24 小时还是 48 小时。
- 是否允许推荐具体“益生菌类别”,以及是否需要国内商品可得性列表。
- 幼猫年龄阈值和猫瘟相关升级条件。
