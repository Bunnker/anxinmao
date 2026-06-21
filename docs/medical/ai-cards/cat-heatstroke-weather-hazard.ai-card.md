# AI 分诊知识卡:猫高温 / 天气 / 家庭安全风险

```yaml
condition_id: cat_heatstroke_weather_hazard
source_document: docs/medical/source/cat-heatstroke-weather-hazard.source.md
status: draft
entry_symptoms:
  - 天太热
  - 中暑
  - 热到了
  - 高温后不舒服
  - 被关车里
  - 阳台暴晒
user_synonyms:
  - 夏天没精神
  - 流口水
  - 热得喘
  - 晒了太阳后倒下

ai_task:
  primary_goal: 判断高温或闷热暴露后是否需要急诊,并给就医前安全降温边界。
  never_do:
    - 不把高温后虚弱解释成普通困
    - 不建议冰水浸泡、强行灌水、人用退烧药
    - 不让用户在红旗命中后继续观察一晚

questioning_boundary:
  goal: 确认热暴露史和虚弱/呼吸/流涎/呕吐腹泻等红旗。
  ask_style: 疑似热射病时只问关键问题,确认后立即给行动。
  max_rounds_before_assessment: 1
  minimum_context_for_assessment:
    universal:
      - 是否有高温或闷热暴露
      - 是否呼吸异常
      - 是否虚弱、倒下或站不稳
      - 是否流口水、呕吐或腹泻
      - 暴露持续多久
    condition_specific: []
  stop_and_assess_when:
    - 高温暴露后命中任一红旗
    - 用户无法判断呼吸或意识状态
    - 猫刚从车内/阳台/密闭高温空间救出

red_flags:
  - id: heat_rf_collapse
    user_signal: 高温暴露后虚弱、倒下、站不稳、叫不醒
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [heat_001, emg_006]
  - id: heat_rf_breath_drool
    user_signal: 高温后张口喘、呼吸急促、流口水
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [heat_002, emg_001]
  - id: heat_rf_gi
    user_signal: 高温后呕吐、腹泻、精神明显差
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [heat_003]
  - id: heat_rf_trapped_hot_space
    user_signal: 被关在车内、阳台、无通风高温空间
    action: immediate_vet_contact
    stop_questioning: true
    source_claim_ids: [heat_004]

triage_questions:
  - id: heat_q_exposure
    ask: 它刚才是不是在高温、阳台、车里或通风很差的地方待过?大概多久?
    why: 热暴露史决定是否走高温急症路径。
    priority: 1
    source_claim_ids: [heat_004]
  - id: heat_q_red_flags
    ask: 现在有没有张口喘、流口水、站不稳/倒下、呕吐或腹泻?
    why: 这些信号会直接升级为急诊或立即联系医院。
    priority: 2
    multi_select: true
    source_claim_ids: [heat_001, heat_002, heat_003]

tier_rules:
  red:
    if_any:
      - heat_rf_collapse matched
      - heat_rf_breath_drool matched
      - heat_rf_trapped_hot_space matched and abnormal_state
    action: 立刻移到阴凉通风处,温和降温,同时联系动物急诊。
  yellow:
    if_any:
      - heat_exposure and mild_lethargy
      - high_risk_host
      - heat_rf_gi matched without collapse_or_dyspnea
    action: 立即联系兽医确认是否需要就诊,不要长时间观察。
  green:
    only_if_all:
      - no_heat_exposure_or_only_mild_warm_environment
      - breathing_normal
      - energy_appetite_normal
      - no_vomiting_diarrhea
    action: 预防性降温和补水环境建议,给升级条件。
  unknown:
    default: 不能判断呼吸/意识/暴露时按 yellow_or_red 处理。

home_care:
  allowed:
    - action: 移到阴凉、通风、安静处
      applies_to: red_or_yellow
      source_claim_ids: [heat_005]
    - action: 用凉水温和打湿毛发或脚垫帮助散热
      applies_to: red_or_yellow
      source_claim_ids: [heat_005]
    - action: 记录暴露时间和症状,路上带给医院
      applies_to: red_or_yellow
      source_claim_ids: [heat_004]
  forbidden:
    - action: 冰水浸泡或用冰块强冷
      reason: 可能造成额外风险,应温和降温并联系医院
      source_claim_ids: [heat_005]
    - action: 强行灌水或喂人用退烧药
      reason: 有误吸和中毒风险
      source_claim_ids: [heat_005]

medicine_policy:
  status: prohibited
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories: []

source_claim_ids:
  - heat_001
  - heat_002
  - heat_003
  - heat_004
  - heat_005
```
