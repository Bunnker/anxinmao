# 病情资料:猫高温 / 天气 / 家庭安全风险

## 0. 元信息

- `condition_id`:`cat_heatstroke_weather_hazard`
- 中文名:猫高温与天气相关风险
- 英文名:Heat and weather-related hazards in cats
- 对应 triage symptom:补充资料,可由 `other` 或 `breath` 入口转入
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-06-17
- 上次人工核对:待审核
- 关联 AI card:`docs/medical/ai-cards/cat-heatstroke-weather-hazard.ai-card.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 用途 |
|---|---|---|---:|---|
| cornell_heat | Cornell Feline Heat Safety | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-heat-safety | L1 | 热应激/中暑信号和行动 |
| cornell_health_hazards | Cornell Feline Health Topics, Health Hazards | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics | L1 | 安全主题范围 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 呼吸/虚弱急症 |

## 2. 给产品的一句话

猫在高温、闷热车内、阳台暴晒或通风差空间后出现虚弱、倒下、喘、流口水、呕吐腹泻等信号时,不应当作普通“热到了”,应立即降温转移并联系兽医。

## 3. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `heat_rf_collapse` | 高温暴露后虚弱、倒下、站不稳、叫不醒 | 立即联系急诊 | `heat_001`, `emg_006` |
| `heat_rf_breath_drool` | 高温后张口喘、呼吸急促、流口水 | 立即联系急诊 | `heat_002`, `emg_001` |
| `heat_rf_gi` | 高温后呕吐、腹泻、精神差 | 急诊或当天门诊,按全身状态升级 | `heat_003` |
| `heat_rf_trapped_hot_space` | 被关在车内、阳台、烘干机附近、无通风高温空间 | 即使暂时恢复也建议联系兽医 | `heat_004` |

## 4. 就医前处理边界

可以做:

- 立刻移到阴凉、通风、安静处。
- 用凉水而非冰水打湿毛发或脚垫,帮助散热。
- 记录暴露时间、环境和症状,尽快联系动物医院。

不建议:

- 不要把猫直接浸入冰水或用冰块强冷。
- 不要强行灌水。
- 不要因为短暂好转就继续观察一晚。
- 不要自行喂退烧药或人用止痛药。

## 5. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `heat_001` | 高温相关虚弱、倒下或站不稳提示严重风险,应立即联系兽医。 | cornell_heat | L1 | red | draft |
| `heat_002` | 高温后过度喘、流涎属于热应激/中暑警示信号。 | cornell_heat | L1 | red | draft |
| `heat_003` | 高温相关呕吐、腹泻与精神差需要升级处理。 | cornell_heat | L1 | red/yellow | draft |
| `heat_004` | 车内、阳台、通风差空间等热暴露史会提高风险。 | cornell_heat / cornell_health_hazards | L1 | question | draft |
| `heat_005` | 早期处理应是转移到阴凉处、温和降温并联系兽医,不是自行用药。 | cornell_heat | L1 | home care | draft |

## 6. 待兽医审核

- 家庭降温措辞是否需要更严格地限定时间和水温。
- 是否在产品里把“夏天阳台/车内/烘干机”作为单独提示。
