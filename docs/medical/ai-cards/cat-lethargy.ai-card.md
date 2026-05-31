# AI 分诊知识卡:猫精神差 / 嗜睡

```yaml
condition_id: cat_lethargy
source_document: docs/medical/source/cat-lethargy.source.md
status: draft
entry_symptoms:
  - 精神差
  - 嗜睡
  - 没精神
  - 趴着不动
  - 不爱动
  - 躲起来
user_synonyms:
  - 叫不醒
  - 站不起来
  - 走路没力
  - 不理人
  - 不吃东西
  - 牙龈白
  - 皮肤回弹慢

ai_task:
  primary_goal: 把精神差当作系统性风险入口,先排通用红旗和宿主高风险,再决定是否短期观察。
  never_do:
    - 不把精神差诊断为懒、热、闹脾气或单纯应激
    - 不用年龄大/抵抗力好来降级红旗
    - 不推荐人用退烧药、止痛药、抗生素、感冒药、食欲促进剂或剂量
    - 不让不吃 24 小时、牙龈异常、脱水、呼吸异常、尿不出或塌陷在家观察

questioning_boundary:
  goal: 第一轮排除塌陷/不能站、呼吸异常、异常牙龈、脱水、不吃、尿闭和幼猫未免疫系统性疾病。
  ask_style: 精神差入口用组合问题快速收敛;命中红旗立即评估,不要追问到诊断确定。
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
      - 能否站立、回应、正常走动
      - 牙龈/舌头颜色是否粉红
      - 是否皮肤回弹慢、眼窝凹、明显脱水
      - 多久没正常吃东西
      - 是否呕吐、腹泻、出血、发热感
      - 是否尿不出或频繁蹲砂
      - 年龄、疫苗、慢病、新到家/多猫环境
  stop_and_assess_when:
    - 叫不醒、不能站立、瘫软
    - 呼吸异常或牙龈白/黄/蓝紫
    - 脱水明显
    - 不吃接近或超过 24 小时
    - 尿不出
    - 幼猫/未免疫伴呕吐腹泻或发热/精神沉郁
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 用户只说“没精神”但未说明食欲、呼吸、牙龈和排尿
    - 年龄/疫苗/慢病信息会改变观察窗口
    - 呕吐腹泻/出血/尿异常需要转具体路径

red_flags:
  - id: leth_rf_collapse
    user_signal: 叫不醒、瘫软、不能站立、明显虚弱
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [leth_006, emg_006]
  - id: leth_rf_breathing
    user_signal: 张口喘、呼吸费力、呼吸很快、舌头/牙龈发蓝发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [leth_007, emg_001]
  - id: leth_rf_gums
    user_signal: 牙龈或舌头苍白、白、黄、蓝紫
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [leth_005, bld_002, emg_009]
  - id: leth_rf_dehydration
    user_signal: 皮肤回弹慢、眼窝凹、明显不喝水或呕吐腹泻后精神差
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [leth_004, emg_009]
  - id: leth_rf_noeat
    user_signal: 不正常吃东西接近或超过 24 小时
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [leth_003]
  - id: leth_rf_urinary
    user_signal: 频繁蹲砂、尿不出或只有几滴,同时精神差
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [leth_008, emg_007]
  - id: leth_rf_kitten_unvaccinated
    user_signal: 幼猫/未免疫,精神差伴发热感、呕吐、腹泻或不吃
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [leth_009, leth_010, leth_011]

triage_questions:
  - id: leth_q_hard_redflags
    ask: 它现在能站起来、正常回应你吗?有没有张口喘/呼吸很费力,或牙龈发白、发黄、发蓝紫?
    why: 塌陷、呼吸异常和异常牙龈是精神差入口的硬急症。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 不能站立/叫不醒: red
      - 呼吸异常: red
      - 牙龈异常颜色: red
      - 都没有: 继续判断食欲饮水和排泄
    source_claim_ids: [leth_005, leth_006, leth_007]
  - id: leth_q_appetite_hydration_urine
    ask: 它多久没正常吃东西了?喝水、排尿正常吗?有没有频繁蹲砂但尿不出,或皮肤回弹慢/眼窝凹?
    why: 不吃、脱水和尿闭会快速改变风险。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 不吃接近/超过 24 小时: red_or_high_yellow
      - 脱水明显: red_or_high_yellow
      - 尿不出: red
      - 吃喝排尿正常: 支持 green_or_yellow
    source_claim_ids: [leth_003, leth_004, leth_008]
  - id: leth_q_context_symptoms
    ask: 它多大、疫苗完整吗?有没有呕吐、腹泻、出血、发热感,或是新到家/多猫环境?
    why: 幼猫、未免疫和伴随 GI/出血症状会缩短观察窗口。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 幼猫/未免疫伴呕吐腹泻: red_or_high_yellow
      - 呕吐腹泻/出血: 转对应路径并保守升级
      - 成年免疫完整且无伴随症状: 支持 green_or_yellow
    source_claim_ids: [leth_009, leth_010, leth_011, emg_003]

severity_scale:
  mild:
    definition: 比平时安静但能回应、走动、吃喝和排尿排便正常,呼吸牙龈正常,成年免疫完整。
    likely_tier: green
    action: 观察 12-24 小时,记录食欲饮水排尿;任何升级条件立即转黄/红。
  moderate:
    definition: 精神差持续、躲藏、食欲下降、grooming 变差或轻度 GI 症状,但无硬红旗。
    likely_tier: yellow
    action: 当天或 24 小时内联系兽医。
  severe:
    definition: 塌陷/不能站、呼吸异常、牙龈异常、脱水、不吃 24 小时、尿不出、幼猫未免疫伴系统症状。
    likely_tier: red
    action: 急诊或立即联系兽医。

tier_rules:
  red:
    if_any:
      - leth_rf_collapse matched
      - leth_rf_breathing matched
      - leth_rf_gums matched
      - leth_rf_urinary matched
      - severe_dehydration
      - kitten_unvaccinated_with_vomiting_diarrhea_and_depression
    action: 停止常规问诊,建议急诊或立即联系兽医。
  yellow:
    if_any:
      - lethargy_persistent_hours >= 12
      - appetite_down
      - grooming_poor_or_hiding
      - mild_vomiting_or_diarrhea_without_red_flags
      - senior_or_kitten_or_chronic_disease
      - not_eating_approaching_24h
    action: 当天或 24 小时内联系兽医。
  green:
    only_if_all:
      - responsive_and_can_walk
      - breathing_normal
      - gums_pink
      - appetite_and_drinking_normal
      - urination_normal
      - no_vomiting_diarrhea_bleeding
      - adult_vaccinated_low_risk
      - symptoms_short_and_mild
    action: 观察 12-24 小时并明确升级条件。
  unknown:
    default: 精神差信息不足时至少 yellow;不能确认呼吸/牙龈/排尿时保守升级。

host_risk_profile:
  lower_risk_features:
    - 成年免疫完整
    - 无慢病
    - 仍能正常走动和回应
    - 吃喝排尿排便正常
    - 呼吸和牙龈正常
  higher_risk_features:
    - 幼猫尤其 5 月龄以下
    - 未免疫或疫苗不完整
    - 老年猫、肥胖猫、慢病猫或正在用药
    - 新到家、救助、多猫环境
    - 不吃、不喝、呕吐腹泻、尿异常、异常牙龈或呼吸异常
  risk_modifier_rules:
    - if: kitten_or_unvaccinated and lethargy_with_gi_signs
      effect: green_to_red_or_high_yellow
    - if: senior_or_chronic_disease and appetite_down
      effect: green_to_yellow
    - if: any_hard_red_flag
      effect: immediate_red

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
        - 是否能站立回应
        - 呼吸和牙龈颜色
        - 食欲饮水和排尿
        - 年龄疫苗慢病
  uncertainty_policy:
    if_user_cannot_answer: 按 yellow_or_red 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 记录开始时间、食量饮水、排尿排便、呕吐腹泻和体重变化
      applies_to: all_tiers
      source_claim_ids: [leth_001, leth_003]
    - action: 安静保暖、减少刺激,能安全拍视频就拍
      applies_to: green_or_yellow
      source_claim_ids: [leth_001, leth_002]
    - action: 在不强迫和不造成应激的前提下观察牙龈颜色和皮肤回弹
      applies_to: unclear_or_yellow
      source_claim_ids: [leth_004, leth_005]
    - action: 幼猫/未免疫/多猫环境疑似传染病时先隔离并就医
      applies_to: kitten_or_unvaccinated
      source_claim_ids: [leth_011]
  forbidden:
    - action: 用人用退烧药、止痛药、抗生素、感冒药或镇静药
      reason: 药物风险高且会掩盖病情
      source_claim_ids: [leth_014]
    - action: 强行灌水灌食
      reason: 呕吐、呼吸异常或意识差时可能加重风险
      source_claim_ids: [leth_003, leth_004]
    - action: 用“抵抗力好能熬过”覆盖红旗
      reason: 红旗由当前风险决定,不是年龄或体质决定
      source_claim_ids: [leth_005, leth_006, leth_013]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - fluid_therapy
    - antiemetics
    - antibiotics
    - nutritional_support
    - appetite_support
  user_safe_message: 精神差的原因很多,药不能先试;如果不吃、脱水、牙龈异常、呼吸异常或幼猫未免疫伴呕吐腹泻,需要兽医处理。

response_style:
  must_say:
    - 精神差先看有没有急症信号
    - 年龄和疫苗会影响观察窗口
    - 不吃、牙龈异常、呼吸异常或尿不出不能拖
  avoid_terms:
    - 懒
    - 闹脾气
    - 抵抗力好能熬
  forbidden_phrases:
    - 喂点人药
    - 等它自己扛过去
    - 不吃也没事
    - 先观察几天

source_claim_ids:
  - leth_001
  - leth_002
  - leth_003
  - leth_004
  - leth_005
  - leth_006
  - leth_007
  - leth_008
  - leth_009
  - leth_010
  - leth_011
  - leth_012
  - leth_013
  - leth_014
```
