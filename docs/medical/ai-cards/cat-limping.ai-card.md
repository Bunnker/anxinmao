# AI 分诊知识卡:猫跛行 / 走路异常

```yaml
condition_id: cat_limping
source_document: docs/medical/source/cat-limping.source.md
status: draft
entry_symptoms:
  - 跛行瘸
  - 一瘸一拐
  - 某条腿不敢用提着走
  - 跳不上以前能跳的地方
  - 走路异常
  - 后腿突然瘫软
user_synonyms:
  - 瘸了
  - 走路一拐一拐
  - 三条腿走路
  - 不敢落地
  - 腿肿了
  - 后腿拖着走
  - 后腿没力气
  - 起身慢不爱跳

ai_task:
  primary_goal: 把跛行当作「从局部小伤到致命急症」的入口,先排主动脉血栓栓塞、骨折/脱位、近期创伤和跛行伴全身症状,再决定老年骨关节炎和软组织小伤是否能短期观察。
  never_do:
    - 不诊断具体疾病或骨折部位,只判断风险和下一步
    - 不把老年猫不爱跳、起身慢解释成「老了不爱动很正常」
    - 不推荐人用止痛药,绝不提对乙酰氨基酚/泰诺/布洛芬等剂量
    - 不教用户在家给疑似骨折/脱位的腿正位或拉直
    - 不让 ATE、完全不能负重、肿胀畸形开放伤口、近期创伤后跛行或跛行伴发热不吃在家观察

questioning_boundary:
  goal: 第一轮排除后腿突然瘫软+大叫+冰凉(ATE)、完全不能负重、肿胀畸形开放伤口、近期创伤和跛行伴全身症状。
  ask_style: 跛行入口用组合问题快速收敛;命中硬急症立即评估,不要追问到诊断确定。
  max_rounds_before_assessment: 3
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 症状持续多久
      - 精神状态
      - 食欲是否正常
      - 是否命中通用红旗
      - 是否有已知心脏病
    condition_specific:
      - 是哪条腿、能否负重还是提着走
      - 是否后腿突然瘫软+大叫+后腿冰凉/脚垫发紫(ATE)
      - 腿部是否肿胀、畸形或有开放伤口
      - 近期是否有坠落/车祸/打架/被夹被踩
      - 是否同时发热、不吃、萎靡或多关节肿痛
      - 起病是突然还是逐渐、是否反复、老年是否跳跃减少
  stop_and_assess_when:
    - 后腿突然瘫软/拖行 + 大叫 + 后腿冰凉或脚垫发紫
    - 完全不能用某条腿、提着腿走
    - 腿部明显肿胀、畸形或有开放伤口
    - 刚坠落/车祸/打架/被夹被踩后跛行
    - 跛行同时发热、不吃、萎靡或多关节肿痛
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 用户只说「瘸了」但未说明能否负重、有无肿胀畸形和创伤史
    - 年龄/心脏病/创伤史会改变观察窗口
    - 需要区分老年慢性跛、肉垫异物与偶发软组织小伤

red_flags:
  - id: limp_rf_ate
    user_signal: 后腿突然瘫软或拖行、大声叫疼、后腿发凉摸不到脉搏、脚垫发紫或苍白
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [limp_010, limp_011, emg_010]
  - id: limp_rf_nonweightbear
    user_signal: 完全不能用某条腿、提着腿走、三条腿走
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [limp_004, emg_006]
  - id: limp_rf_deformity
    user_signal: 腿部明显肿胀、角度畸形或有开放伤口
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [limp_003, limp_004]
  - id: limp_rf_trauma
    user_signal: 刚高处坠落、车祸、打架、被门夹或被踩后跛行,即使看着能走
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [limp_012, limp_013]
  - id: limp_rf_systemic
    user_signal: 跛行同时发热、不吃、萎靡或关节肿胀拒触
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [limp_006, limp_007]
  - id: limp_rf_polyarthritis
    user_signal: 多个关节同时痛或肿、伴发热、反复发作
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [limp_008]

triage_questions:
  - id: limp_q_ate_weightbear
    ask: 它是后腿突然瘫软、大叫、后腿发凉吗?能不能用那条腿站着、踩地走,还是提着腿/三条腿走?
    why: 后腿突然瘫软+大叫+冰凉是几小时窗口的真急症,能否负重区分骨折/脱位。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 后腿突然瘫软大叫且发凉: red
      - 完全不能负重/提着走: red
      - 能踩地但有点瘸: 继续判断创伤和全身症状
    source_claim_ids: [limp_004, limp_010, limp_011]
  - id: limp_q_deformity_trauma
    ask: 那条腿有没有肿胀、变形或开放伤口?最近有没有从高处摔下、被车撞、打架,或被门夹/被踩到?
    why: 肿胀畸形开放伤口和近期创伤提示骨折/严重外伤,需排除内伤。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 肿胀/畸形/开放伤口: red
      - 近期坠落车祸打架被夹被踩: red_or_urgent
      - 都没有: 支持 yellow_or_green
    source_claim_ids: [limp_003, limp_012, limp_013]
  - id: limp_q_systemic_chronic
    ask: 它多大?有没有同时发热、不吃、萎靡,或多个关节都肿痛?是偶尔瘸一下就好,还是老猫近来不爱跳、起身慢、持续一瘸一拐?
    why: 全身症状提示感染/免疫性关节炎;年龄和病程区分老年骨关节炎与软组织小伤。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 跛行伴发热/不吃/萎靡或多关节肿痛: red_or_high_yellow
      - 老年猫跳跃减少/起身慢/持续跛: yellow
      - 偶尔瘸一下很快恢复且无其它: 支持 green
    source_claim_ids: [limp_005, limp_006, limp_007, limp_008]

severity_scale:
  mild:
    definition: 偶尔瘸一下、几分钟到几小时自行恢复,能正常负重,无肿胀畸形伤口,无发热不吃萎靡,无 ATE 表现。
    likely_tier: green
    action: 限制活动观察几天,记录起始时间和变化;任何升级条件立即转黄/红。
  moderate:
    definition: 持续或反复一瘸一拐超过约 24 小时无急症信号,或老年猫跳跃减少、起身慢,或肉垫异物/指甲问题。
    likely_tier: yellow
    action: 这几天内约门诊,兽医体检 + X 光;限制跳跃、体重管理,不自行喂药。
  severe:
    definition: 后腿突然瘫软大叫冰凉(ATE)、完全不能负重、肿胀畸形开放伤口、近期创伤后跛行、跛行伴发热不吃萎靡、多关节痛。
    likely_tier: red
    action: 立即就医;不在家正位、不喂人用止痛药。

tier_rules:
  red:
    if_any:
      - limp_rf_ate matched
      - limp_rf_nonweightbear matched
      - limp_rf_deformity matched
      - recent_trauma_with_lameness
      - lameness_with_fever_or_anorexia_or_lethargy
      - multiple_joints_swollen_painful
    action: 停止常规问诊,建议立即就医;明确不要在家正位、不要喂人用止痛药。
  yellow:
    if_any:
      - lameness_persistent_over_24h_without_red_flags
      - senior_cat_reduced_jumping_or_stiff_rising
      - footpad_foreign_body_or_nail_problem
      - recurrent_brief_lameness_after_activity
      - senior_or_known_heart_disease
    action: 这几天内约门诊,兽医体检和 X 光;限制活动和跳跃,反对自行用人药。
  green:
    only_if_all:
      - bears_weight_normally
      - brief_lameness_resolves_in_minutes_to_hours
      - no_swelling_deformity_open_wound
      - no_fever_anorexia_lethargy
      - no_ate_signs
      - no_recent_significant_trauma
    action: 限制活动观察几天并明确升级条件。
  unknown:
    default: 跛行信息不足时至少 yellow;不能确认能否负重、有无创伤或 ATE 表现时保守升级。

host_risk_profile:
  lower_risk_features:
    - 成年、健康、无已知心脏病
    - 仍能正常负重,偶尔瘸一下很快恢复
    - 无肿胀、畸形、开放伤口
    - 无发热、不吃、萎靡
  higher_risk_features:
    - 老年猫尤其 >10 岁,跳跃减少、起身慢、不爱上下跳
    - 已知或可疑肥厚性心肌病等心脏病
    - 近期坠落、车祸、打架、被门夹或被踩
    - 跛行伴发热、食欲下降、萎靡或关节肿胀拒触
  risk_modifier_rules:
    - if: sudden_hindlimb_paralysis_with_pain_and_cold_limbs
      effect: immediate_red
    - if: known_or_suspected_heart_disease and hindlimb_weakness
      effect: green_to_red_or_high_yellow
    - if: senior_cat and reduced_jumping_or_stiffness
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
        - 是否后腿突然瘫软大叫冰凉
        - 能否负重还是提着走
        - 有无肿胀畸形开放伤口和创伤史
        - 是否伴发热不吃萎靡或多关节痛
        - 年龄、心脏病、病程
  uncertainty_policy:
    if_user_cannot_answer: 按 yellow_or_red 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 观察哪条腿、能否负重、是否短步或不沾地,记录起始时间、突然还是逐渐、有无外伤
      applies_to: all_tiers
      source_claim_ids: [limp_001, limp_002]
    - action: 限制活动,关在小房间或大笼子里,不让它跳上跳下
      applies_to: all_tiers
      source_claim_ids: [limp_014]
    - action: 看得到且容易取的肉垫异物可取出,用温水或盐水清洁小伤口;扭挫伤轻度肿胀可冰敷约 15 分钟后咨询兽医
      applies_to: green_or_yellow
      source_claim_ids: [limp_009, limp_014]
    - action: 怀疑骨折/脱位时用毛巾包裹支撑患肢,放进航空箱、患肢朝上,支撑头部和臀部转运
      applies_to: red
      source_claim_ids: [limp_013]
  forbidden:
    - action: 给猫用任何人用止痛药(对乙酰氨基酚/泰诺/布洛芬/萘普生/阿司匹林)
      reason: 对乙酰氨基酚一片即可对猫致命,其它 NSAID 对猫剧毒
      source_claim_ids: [limp_015]
    - action: 在家给疑似骨折或脱位的腿正位或拉直
      reason: 可能加重损伤、压迫血管神经
      source_claim_ids: [limp_013]
    - action: 用「老了不爱动很正常」忽视老年猫跳跃减少和起身慢
      reason: 60-90% 老猫有骨关节炎且常被忽视,这是关节在疼而非单纯衰老
      source_claim_ids: [limp_005]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - vet_prescribed_nsaids
    - pain_relief_gabapentin_opioids
    - osteoarthritis_monoclonal_antibody
    - joint_supplements
  user_safe_message: 跛行的原因从小拉伤到致命血栓都有,药不能先试;绝不要给猫吃人用止痛药——对乙酰氨基酚(泰诺)一片就可能要了猫的命,布洛芬也剧毒。猫确实有处方止痛和关节治疗,但必须由兽医判断病因后开,我不能给药名和剂量。

response_style:
  must_say:
    - 跛行先看有没有急症信号:后腿突然瘫软大叫冰凉、不能负重、肿胀畸形伤口、刚受过伤
    - 老年猫不爱跳、起身慢往往是关节在疼,不是单纯老了
    - 疑似骨折脱位不要在家正位,限制活动尽快就医
  avoid_terms:
    - 老了不爱动很正常
    - 养几天就好
    - 喂点止痛药
  forbidden_phrases:
    - 喂点止痛药
    - 自行喂对乙酰氨基酚
    - 自行喂泰诺
    - 自行喂布洛芬
    - 自己把腿掰正
    - 老了不爱动很正常
    - 养几天就好

source_claim_ids:
  - limp_001
  - limp_002
  - limp_003
  - limp_004
  - limp_005
  - limp_006
  - limp_007
  - limp_008
  - limp_009
  - limp_010
  - limp_011
  - limp_012
  - limp_013
  - limp_014
  - limp_015
  - limp_016
  - limp_017
  - emg_006
  - emg_010
```
