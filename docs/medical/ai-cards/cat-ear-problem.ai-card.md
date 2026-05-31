# AI 分诊知识卡:猫耳朵问题

```yaml
condition_id: cat_ear_problem
source_document: docs/medical/source/cat-ear-problem.source.md
status: draft
entry_symptoms:
  - 耳朵问题
  - 挠耳朵
  - 甩头
  - 耳朵臭
  - 耳垢多
  - 耳朵红
user_synonyms:
  - 黑色耳垢
  - 耳螨
  - 耳朵塌了
  - 碰耳朵会痛
  - 头歪
  - 走路不稳

ai_task:
  primary_goal: 区分外耳瘙痒/耳螨/外耳炎与中耳/内耳或神经平衡风险,并阻止错误清耳和自行滴药。
  never_do:
    - 不仅凭黑色耳垢诊断耳螨
    - 不推荐耳药、驱虫药、人用耳药、抗生素或剂量
    - 不建议双氧水、醋、酒精、精油、茶树油或深棉签清耳
    - 不让头歪、走不稳、眼球异常运动在家观察

questioning_boundary:
  goal: 第一轮先排除头歪/走不稳/面部或眼球异常,再判断外耳炎/耳螨门诊急迫性。
  ask_style: 每轮 1-2 个问题;神经/平衡信号命中后停止常规追问。
  max_rounds_before_assessment: 3
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 症状持续多久
      - 精神状态
      - 食欲和饮水
      - 呼吸是否异常
      - 是否命中通用红旗
    condition_specific:
      - 是否头歪、走不稳、摔倒或眼球左右摆动
      - 是否频繁甩头/挠耳
      - 耳道是否有黑色/脓性/恶臭分泌物
      - 是否疼痛、红肿或抓出血
      - 是否外出、多猫、近期接触新猫
      - 是否已经自行清耳或滴药
  stop_and_assess_when:
    - 头歪、走不稳、眼球异常运动或面部异常
    - 严重疼痛/肿胀/抓出血
    - 用户已使用刺激性清洁物或不明耳药
    - 已能区分 red/yellow/green
  continue_asking_when:
    - 用户只说耳垢/耳臭但未说明疼痛和平衡
    - 是否有分泌物和臭味会改变分级
    - 外出/多猫/幼猫信息会改变观察窗口

red_flags:
  - id: ear_rf_neuro_balance
    user_signal: 头歪、走不稳、转圈、摔倒、跳不上去、眼球左右摆动
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [ear_008, ear_009]
  - id: ear_rf_facial
    user_signal: 眼睑下垂、第三眼睑突出、瞳孔异常、脸部不对称
    action: urgent_vet
    stop_questioning: true
    source_claim_ids: [ear_008]
  - id: ear_rf_severe_pain
    user_signal: 触碰耳朵剧痛、耳道明显肿胀闭塞、持续抓到出血
    action: same_day_vet
    stop_questioning: false
    source_claim_ids: [ear_004, ear_010]

triage_questions:
  - id: ear_q_neuro_combo
    ask: 它有没有头歪、走路不稳、摔倒、转圈,或者眼球左右抖动/脸部看起来不对称?
    why: 这些提示中耳/内耳或神经平衡风险,不能按普通耳螨观察。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 头歪/走不稳/眼球异常: red
      - 面部异常: red_or_high_yellow
      - 都没有: 继续判断外耳症状
    source_claim_ids: [ear_008, ear_009]
  - id: ear_q_outer_ear
    ask: 有没有频繁甩头、挠耳、耳朵红肿、臭味,或黑色/脓性耳垢?
    why: 外耳炎和耳螨通常需要兽医检查确认。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 分泌物/臭味/红肿/疼痛: yellow
      - 只是偶尔挠且无异常: green_or_yellow
    source_claim_ids: [ear_001, ear_004, ear_005]
  - id: ear_q_risk_home_action
    ask: 它是幼猫、外出猫或多猫家庭吗?你有没有已经用双氧水、醋、精油、人用耳药或棉签深入清过?
    why: 耳螨传染风险和错误处理会改变建议。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 幼猫/外出/多猫且典型耳螨: yellow
      - 已用刺激性产品: yellow_or_red_if_worse
    source_claim_ids: [ear_002, ear_003, ear_006]

severity_scale:
  mild:
    definition: 偶尔挠耳或少量耳垢,无臭味/红肿/疼痛/甩头/平衡异常,精神食欲正常。
    likely_tier: green
    action: 短期观察,不要自行清耳滴药;持续或加重则门诊。
  moderate:
    definition: 明显挠耳、甩头、黑色/脓性/恶臭分泌物、红肿或疼痛,但无神经/平衡信号。
    likely_tier: yellow
    action: 预约门诊做耳镜/显微镜检查。
  severe:
    definition: 头歪、走不稳、眼球异常运动、面部神经异常、严重疼痛或听力/平衡改变。
    likely_tier: red
    action: 尽快就医。

tier_rules:
  red:
    if_any:
      - ear_rf_neuro_balance matched
      - ear_rf_facial matched
      - severe_pain_with_systemic_signs
    action: 停止常规问诊,建议尽快门诊或急诊。
  yellow:
    if_any:
      - frequent_head_shaking_or_scratching
      - dark_or_purulent_or_smelly_discharge
      - ear_red_swollen_or_painful
      - kitten_outdoor_multicat_with_ear_mite_signs
      - used_irritating_home_cleaner_or_unknown_ear_drops
    action: 尽快预约兽医检查,不要自行滴药清耳。
  green:
    only_if_all:
      - no_neuro_balance_signs
      - no_pain
      - no_redness_swelling_odor
      - no_large_discharge
      - appetite_energy_normal
      - low_risk_adult_indoor_cat
    action: 短期观察,持续或加重转黄档。
  unknown:
    default: 不能排除疼痛、分泌物或头歪时按 yellow 处理。

host_risk_profile:
  lower_risk_features:
    - 成年室内猫
    - 偶尔挠耳
    - 无臭味、红肿、疼痛、甩头
    - 走路和平衡正常
  higher_risk_features:
    - 幼猫、外出猫、多猫家庭或近期接触新猫
    - 黑色碎屑样耳垢、强烈瘙痒、甩头
    - 反复耳病或自行用药史
    - 头歪、走不稳、眼球异常运动或面部异常
  risk_modifier_rules:
    - if: neuro_or_balance_signs
      effect: immediate_red_or_high_yellow
    - if: typical_mite_signs and multicat
      effect: at_least_yellow

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 判断依据
      - 还不能确定的部分
      - 现在该做什么
      - 不要做什么
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否头歪/走不稳
        - 是否疼痛/红肿/分泌物/臭味
        - 是否用过刺激性清洁或耳药
  uncertainty_policy:
    if_user_cannot_answer: 按 yellow 保守处理
    if_conflicting_answers: 建议兽医检查确认

home_care:
  allowed:
    - action: 拍耳道外观、分泌物和甩头/走路视频
      applies_to: all_tiers
      source_claim_ids: [ear_001, ear_004, ear_008]
    - action: 防止抓破耳朵,必要时伊丽莎白圈
      applies_to: yellow_or_red
      source_claim_ids: [ear_004]
    - action: 多猫家庭疑似耳螨时减少密切接触并预约检查
      applies_to: suspected_mites
      source_claim_ids: [ear_002, ear_003]
  forbidden:
    - action: 双氧水、醋、酒精、精油、茶树油或人用耳药入耳
      reason: 可刺激耳道并加重感染风险
      source_claim_ids: [ear_006]
    - action: 深入棉签掏耳或频繁清耳
      reason: 健康猫通常不需常规清耳,病耳需兽医判断
      source_claim_ids: [ear_007, ear_010]
    - action: 只凭黑色耳垢自行买耳螨药
      reason: 病因可能是耳螨、细菌、酵母、过敏、异物或中耳问题
      source_claim_ids: [ear_005]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - acaricides
    - otic_antibiotics
    - otic_antifungals
    - ear_cleaners
  user_safe_message: 耳螨、外耳炎和中耳问题用药不同;不要自行滴耳药或清耳,先让兽医检查耳道和分泌物。

response_style:
  must_say:
    - 我先排除头歪和走不稳这类更急的信号
    - 耳朵病因需要检查,不要直接按耳螨处理
    - 不要用双氧水、醋、精油或人用耳药
  avoid_terms:
    - 肯定是耳螨
    - 掏干净就好
    - 滴点药就行
  forbidden_phrases:
    - 用双氧水洗耳朵
    - 用醋滴一下
    - 买耳螨药直接滴
    - 用人的滴耳液

source_claim_ids:
  - ear_001
  - ear_002
  - ear_003
  - ear_004
  - ear_005
  - ear_006
  - ear_007
  - ear_008
  - ear_009
  - ear_010
  - ear_011
```
