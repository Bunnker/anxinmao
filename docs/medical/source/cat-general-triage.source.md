# 病情资料:猫通用分诊

## 0. 元信息

- `condition_id`:`cat_general_triage`
- 中文名:猫通用分诊
- 英文名:General cat triage
- 对应 triage symptom:`other`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-06-17
- 上次人工核对:待审核
- 关联 AI card:`docs/medical/ai-cards/cat-general-triage.ai-card.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 用途 |
|---|---|---|---:|---|
| aaha_life_stage | AAHA/AAFP Feline Life Stage Guidelines | https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/ | L1 | 生命周期、预防、行为环境、营养、老年筛查 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 急停规则 |
| cornell_health_topics | Cornell Feline Health Topics | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics | L1 | 猫常见健康主题范围 |
| aaha_vaccination | AAHA/AAFP Feline Vaccination Guidelines | https://www.aaha.org/resources/2020-aahaaafp-feline-vaccination-guidelines/ | L1 | 疫苗计划边界 |
| wsava_nutrition | WSAVA Global Nutrition Guidelines | https://wsava.org/global-guidelines/global-nutrition-guidelines/ | L1 | 营养评估边界 |

## 2. 给产品的一句话

通用分诊用于承接“猫不对劲但说不清”的入口,先排除呼吸、尿闭、误食、出血、神经/虚弱、不吃不喝等急症红旗,再把问题转到具体症状卡或日常护理卡。

## 3. 适用范围

- 用户只说“怪怪的”“不舒服”“没精神一点”“我不知道选哪个入口”。
- 多个轻微问题混在一起,尚不能归到呕吐、腹泻、尿、呼吸等明确入口。
- 用户咨询预防、疫苗、饮食、行为环境,但夹杂可能健康异常。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `gen_rf_breath` | 张口喘、呼吸费力、舌头或牙龈发紫 | 急诊 | `gen_001`, `emg_001` |
| `gen_rf_urine` | 频繁蹲砂但尿不出、只有几滴或痛苦叫 | 急诊 | `gen_002`, `emg_007` |
| `gen_rf_toxin` | 可能吃了人药、百合、鼠药、防冻液、巧克力、洋葱等 | 立即联系医院/毒物路径 | `gen_003`, `emg_008` |
| `gen_rf_bleeding` | 大量出血、吐血、便血、尿血、压迫不止 | 急诊 | `gen_004`, `emg_003` |
| `gen_rf_neuro_collapse` | 抽搐、叫不醒、站不起来、后腿拖行、倒下 | 急诊 | `gen_005`, `emg_005` |
| `gen_rf_no_eat` | 接近或超过 24 小时明显不吃不喝,尤其幼猫、肥胖猫、慢病猫 | 尽快门诊/急诊评估 | `gen_006`, `emg_012` |

## 5. 分流原则

| 用户描述 | 优先转入 |
|---|---|
| 呕吐、吐毛球、干呕 | `cat_vomiting` |
| 腹泻、软便、便血 | `cat_diarrhea` |
| 不吃、食欲下降 | `cat_anorexia` |
| 精神差、躲起来、不互动 | `cat_lethargy` |
| 打喷嚏、流鼻涕、咳嗽 | `cat_uri` 或 `cat_dyspnea` |
| 尿不出、尿频、尿血 | `cat_urethral_obstruction` |
| 误食、人药、植物、异物 | `cat_toxin_ingestion` |
| 高温后虚弱、喘、流涎 | `cat_heatstroke_weather_hazard` |
| 几天没拉屎、排便用力 | `cat_constipation_straining` |
| 疫苗、饮食、抓家具、多猫、猫包 | `docs/care/ai-cards` 对应护理卡 |

## 6. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `gen_001` | 呼吸费力、张口喘、发绀等属于猫急症红旗,不适合继续普通观察。 | cat_emergency_red_flags | internal | red | draft |
| `gen_002` | 猫尿不出或疑似尿闭应作为急症处理。 | cat_emergency_red_flags | internal | red | draft |
| `gen_003` | 人药、百合等高危误食应立即联系兽医或急诊。 | cat_emergency_red_flags | internal | red | draft |
| `gen_004` | 大量或持续出血、血尿、吐血、便血需要紧急评估。 | cat_emergency_red_flags | internal | red | draft |
| `gen_005` | 抽搐、昏迷、无法站立、瘫软等神经或循环异常需要急诊。 | cat_emergency_red_flags | internal | red | draft |
| `gen_006` | 猫长时间不吃不喝,尤其幼猫、肥胖猫或慢病猫,观察窗口应缩短。 | cat_emergency_red_flags / aaha_life_stage | internal/L1 | red/yellow | draft |
| `gen_007` | 生命周期照护包括预防、疫苗、寄生虫、营养、绝育、牙科、行为环境和老年筛查。 | aaha_life_stage | L1 | routing | draft |
| `gen_008` | 营养和体重咨询应基于饮食史、体况评分和个体化计划,不应只给固定克数。 | wsava_nutrition | L1 | routing | draft |

## 7. 待兽医审核

- `other` 入口是否在产品 UI 中直接对应本卡。
- 通用分诊进入具体卡片的转接话术。
- 长时间不吃不喝的观察窗口是否按不同年龄和基础病拆得更细。
