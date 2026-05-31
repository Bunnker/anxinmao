# AI 分诊知识卡:猫不吃 / 食欲下降

```yaml
condition_id: cat_anorexia
source_document: docs/medical/source/cat-anorexia.source.md
status: draft
entry_symptoms:
  - 不吃东西
  - 食欲下降
  - 挑食
  - 只闻不吃
  - 不喝水
user_synonyms:
  - 厌食
  - 绝食
  - 没胃口
  - 不吃猫粮
  - 只舔两口
  - 想吃吃不了

ai_task:
  primary_goal: 判断不吃是否已经超过安全观察窗口,并区分真性厌食和想吃但吃不了。
  never_do:
    - 不把不吃归因于挑食后放任观察
    - 不教用户强喂、硬灌或自行使用开胃药
    - 不推荐人用药或剂量
    - 不忽略幼猫、肥胖猫和慢病猫风险

questioning_boundary:
  goal: 快速确认吃了多少、多久没吃、是否幼猫/肥胖/慢病、是否想吃但吃不了、是否伴随红旗。
  ask_style: 每轮只问 1-2 个最影响分级的问题。
  max_rounds_before_assessment: 3
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 症状持续多久
      - 精神状态
      - 食欲和饮水
      - 呼吸是否异常
      - 排尿排便是否异常
      - 是否命中通用红旗
    condition_specific:
      - 今天吃了平时的几成
      - 是否完全不吃
      - 是否想吃但咬不动/吞不下/流口水
      - 体型是否超重/肥胖
      - 是否呕吐、腹泻、疼痛、脱水或精神差
  stop_and_assess_when:
    - 幼猫 12 小时不吃
    - 成年猫接近或超过 24 小时完全不吃
    - 肥胖猫突然不吃
    - 命中呼吸异常、瘫软、持续呕吐等红旗
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 不能量化吃了多少
    - 缺少年龄/持续时间/精神状态
    - 不能判断是否假性厌食

red_flags:
  - id: ano_rf_adult_24h
    user_signal: 成年猫完全不吃接近或超过 24 小时
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [ano_001, ano_003]
  - id: ano_rf_kitten_12h
    user_signal: 6 周以下幼猫不吃约 12 小时
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [ano_002]
  - id: ano_rf_overweight
    user_signal: 肥胖/超重猫突然不吃
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [ano_004]
  - id: ano_rf_systemic
    user_signal: 不吃伴呕吐、腹泻、呼吸异常、瘫软、疼痛、脱水
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [ano_005, emg_001, emg_006]
  - id: ano_rf_pseudo
    user_signal: 想吃但咬不动、吞不下、流口水、口腔疼
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [ano_006]

triage_questions:
  - id: ano_q_amount_duration
    ask: 它从什么时候开始不吃?今天大概吃了平时的几成,还是完全没吃?
    why: 吃了多少和持续时间决定安全窗口。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 成年完全不吃接近 24h: high_yellow_or_red
      - 幼猫不吃 12h: red
      - 仍吃一部分且短时间: green_or_yellow
    source_claim_ids: [ano_001, ano_002, ano_003, ano_007]
  - id: ano_q_wants_but_cant
    ask: 它是完全没兴趣,还是会靠近食物、闻/舔,但咬不动、吞不下或流口水?
    why: 想吃但吃不了提示口腔、疼痛或吞咽问题。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 想吃但吃不了: yellow
      - 流口水/口腔疼: yellow_or_red
      - 完全没兴趣: 根据持续时间和精神分级
    source_claim_ids: [ano_006, ano_009]
  - id: ano_q_body_risk
    ask: 它是幼猫、老年猫、偏胖/肥胖,或本来有慢性病吗?
    why: 宿主风险决定是否缩短观察窗口。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 6 周以下幼猫: red
      - 肥胖猫: green_to_yellow_or_red
      - 慢病/老年: green_to_yellow
    source_claim_ids: [ano_002, ano_004, ano_005]
  - id: ano_q_systemic
    ask: 有没有呕吐、腹泻、呼吸异常、明显疼痛、瘫软、脱水或尿不出来?
    why: 伴随红旗会直接升级。
    priority: 4
    multi_select: true
    changes_decision_by:
      - 呼吸异常/瘫软/尿不出: red
      - 呕吐腹泻疼痛脱水: yellow_or_red
    source_claim_ids: [ano_005, emg_001, emg_006]

severity_scale:
  mild:
    definition: 短时间轻度少吃,仍吃一部分,精神饮水排泄正常,成年健康且非肥胖。
    likely_tier: green_or_yellow
    action: 安全诱食并严密记录,若接近 24 小时或加重就联系兽医。
  moderate:
    definition: 成年猫明显少吃/完全不吃接近 24 小时,或想吃但吃不了,或高风险宿主。
    likely_tier: yellow
    action: 当天联系兽医或尽快门诊。
  severe:
    definition: 幼猫短时间不吃、成年完全不吃超过 24-48 小时、肥胖猫不吃、伴系统性红旗。
    likely_tier: red
    action: 急诊或立即联系兽医。

tier_rules:
  red:
    if_any:
      - ano_rf_kitten_12h matched
      - no_food_over_24h and weak_or_dehydrated
      - breathing_abnormal
      - collapse
      - repeated_vomiting
    action: 立即联系兽医或急诊。
  yellow:
    if_any:
      - adult_no_food_near_24h
      - overweight_cat_sudden_inappetence
      - wants_to_eat_but_cannot
      - appetite_less_than_half_for_24h
      - senior_or_chronic_disease
    action: 当天联系兽医,不要继续等很多天。
  green:
    only_if_all:
      - eating_some_food
      - duration_less_than_12h
      - adult_healthy
      - not_overweight
      - energy_normal
      - drinking_normal
      - no_vomiting_diarrhea_pain_or_breathing_issue
    action: 短窗口诱食观察,给明确升级条件。
  unknown:
    default: 如果吃了多少和持续时间不清楚,先问;问不到按 yellow 保守处理。

host_risk_profile:
  lower_risk_features:
    - 成年健康猫
    - 仍吃一部分
    - 精神饮水排泄正常
    - 非肥胖
  higher_risk_features:
    - 6 周以下幼猫或幼猫
    - 肥胖/超重
    - 老年或慢病
    - 完全不吃
    - 伴呕吐腹泻疼痛脱水
  risk_modifier_rules:
    - if: kitten and not_eating
      effect: immediate_escalation
    - if: overweight and sudden_no_food
      effect: green_to_yellow_or_red
    - if: adult_no_food_24h
      effect: at_least_yellow

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 判断依据
      - 还不能确定的部分
      - 现在该做什么
      - 多久内复查/升级
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否超过年龄对应安全窗口
        - 是否完全不吃
        - 是否想吃但吃不了
        - 是否有系统性红旗
  uncertainty_policy:
    if_user_cannot_answer: 保守处理
    if_conflicting_answers: 按更高风险处理

home_care:
  allowed:
    - action: 记录实际进食量、饮水、尿量、体重
      applies_to: all_tiers
      source_claim_ids: [ano_007]
    - action: 少量多次提供原本喜欢且气味明显的食物
      applies_to: green_or_yellow_without_red_flags
      source_claim_ids: [ano_010]
    - action: 将湿粮温热到接近体温并搅拌均匀
      applies_to: green_or_yellow_without_red_flags
      source_claim_ids: [ano_010]
    - action: 提供安静、无竞争的进食环境
      applies_to: green_or_yellow
      source_claim_ids: [ano_010]
  forbidden:
    - action: 强行掰嘴喂、针筒硬灌
      reason: 可增加食物厌恶和误吸风险
      source_claim_ids: [ano_014]
    - action: 自行给开胃药、止吐药、止痛药
      reason: 需先判断病因和猫状态
      source_claim_ids: [ano_011, ano_013]
    - action: 长时间等待猫自己恢复
      reason: 成年猫 24h、幼猫更短时间不吃已有风险
      source_claim_ids: [ano_001, ano_002]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - appetite_stimulants
    - antiemetics
    - feeding_tube
    - recovery_diet
  user_safe_message: 不吃有时需要食欲刺激剂、止吐或营养支持,但要先由兽医判断病因,不能自己买药或强喂。

response_style:
  must_say:
    - 我先确认它到底吃了多少和多久没吃
    - 猫不吃要比人更谨慎
    - 不要强喂或硬灌
  avoid_terms:
    - 挑食
    - 绝食抗议
    - 饿一顿没事
  forbidden_phrases:
    - 饿了自然会吃
    - 强灌一点就行
    - 吃人用开胃药

source_claim_ids:
  - ano_001
  - ano_002
  - ano_003
  - ano_004
  - ano_005
  - ano_006
  - ano_007
  - ano_008
  - ano_009
  - ano_010
  - ano_011
  - ano_012
  - ano_013
  - ano_014
```
