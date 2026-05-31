# AI 分诊知识卡:猫行为突变 / 行为问题

```yaml
condition_id: cat_behavior_change
source_document: docs/medical/source/cat-behavior-change.source.md
status: draft
entry_symptoms:
  - 突然攻击咬人
  - 躲藏不出
  - 过度叫嚎叫
  - 乱排泄不用猫砂盆
  - 不爱玩没精神
  - 突然变敏感脾气变
user_synonyms:
  - 脾气突然变坏
  - 一摸就咬
  - 一碰就嚎叫
  - 总是躲起来
  - 半夜一直叫
  - 在床上地毯上尿尿
  - 一直舔毛舔秃
  - 老猫晚上叫白天睡

ai_task:
  primary_goal: 把行为突变当作身体疼痛/疾病的隐性表达入口,先排疼痛攻击、合并躯体症状和神经异常等红旗,再把任何突然或持续的行为变化导向兽医先做体检和血尿检排除医学原因。
  never_do:
    - 不把突然变坏的行为当成只是脾气坏或闹脾气
    - 不点名诊断具体疾病,只判断风险和下一步是否就医
    - 不建议惩罚、体罚或喷水恐吓
    - 不推荐人用镇静药/抗焦虑药,也不显示任何药品剂量
    - 不让疼痛攻击、合并躯体或神经症状的猫在家观察

questioning_boundary:
  goal: 第一轮排除触碰激发的疼痛攻击、行为变化合并躯体症状(不吃/吐/拉/喘/流口水)和神经异常(走路不稳/转圈/撞东西/意识异常)。
  ask_style: 行为入口用组合问题快速收敛;命中红旗立即评估,不追问到诊断确定,绝不点名疾病。
  max_rounds_before_assessment: 3
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 行为变化持续多久
      - 主要变化类型
      - 是否有触发因素或环境变化
      - 是否合并躯体症状
      - 是否命中通用红旗
    condition_specific:
      - 是否之前温顺、现在被摸某部位就嚎叫/咬/抓
      - 是否合并不吃、呕吐、腹泻、喘、流口水
      - 是否走路不稳、转圈、撞东西、意识异常
      - 变化类型(攻击/躲藏/过度发声/乱排泄/不爱玩/变敏感)
      - 年龄是否大于 10 岁,有无迷失方向/夜叫/性格改变
      - 是否未绝育、近期是否搬家/新成员等应激
  stop_and_assess_when:
    - 之前温顺、现在被摸某部位就嚎叫/咬/抓
    - 行为变化合并不吃/呕吐/腹泻/喘/流口水
    - 突然走路不稳、转圈、撞东西、意识异常
    - 完全拒食且躲起来不动、看着痛苦
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 用户只说脾气变了但未说明是否触碰激发、是否合并躯体症状
    - 年龄/是否老年会改变排查方向和观察窗口
    - 需要区分发情/应激等低风险触发与持续行为变化

red_flags:
  - id: beh_rf_pain_aggression
    user_signal: 之前温顺、现在被摸某个部位就嚎叫/咬/抓/躲闪,该部位可能在疼
    action: urgent_vet
    stop_questioning: true
    source_claim_ids: [beh_006, beh_007]
  - id: beh_rf_somatic
    user_signal: 行为变化同时不吃、呕吐、腹泻、张口喘或流口水
    action: urgent_vet
    stop_questioning: true
    source_claim_ids: [beh_008]
  - id: beh_rf_neuro
    user_signal: 突然走路不稳、转圈、撞东西、意识异常
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [beh_009, emg_005, emg_006]
  - id: beh_rf_breathing
    user_signal: 行为异常同时张口喘、呼吸费力、牙龈/舌头发蓝发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [beh_008, emg_001]
  - id: beh_rf_shutdown
    user_signal: 完全拒食、躲起来不动、看着痛苦
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [beh_008, beh_010]

triage_questions:
  - id: beh_q_pain_and_somatic
    ask: 它是不是之前温顺、现在一摸某个地方就嚎叫或咬人?有没有同时不吃、吐、拉、张口喘或流口水?
    why: 触碰激发攻击提示疼痛攻击,合并躯体症状提示全身性疾病,都是行为入口的硬急症。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 一碰就嚎叫/咬且之前温顺: red
      - 合并不吃/吐/拉/喘/流口水: red
      - 都没有: 继续判断变化类型和背景
    source_claim_ids: [beh_006, beh_007, beh_008]
  - id: beh_q_neuro_shutdown
    ask: 它有没有突然走路不稳、转圈、撞东西、意识不清?是不是完全不吃、躲起来一动不动、看着很难受?
    why: 神经异常和整体崩溃式恶化需要立即就医。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 走路不稳/转圈/撞东西/意识异常: red
      - 完全拒食且躲起不动: red
      - 都没有: 支持进入 yellow/green 判断
    source_claim_ids: [beh_009, beh_010]
  - id: beh_q_type_age_context
    ask: 主要变化是哪种(突然攻击/总躲藏/过度叫/乱排泄/不爱玩/变敏感)?它多大、绝育了吗?最近有没有搬家、添新成员等变化?
    why: 变化类型、年龄和是否有低风险触发决定排查方向与能否归绿。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 老年猫伴迷失方向/夜叫/性格改变: yellow_lean_high
      - 乱排泄/强迫/过敏感持续: yellow
      - 未绝育发情或近期明确应激且无红旗: 支持 green
      - 突然或持续变化但无低风险触发: yellow
    source_claim_ids: [beh_001, beh_004, beh_013, beh_017]

severity_scale:
  mild:
    definition: 有明确低风险触发(发情、青春期喷尿、短期应激、品种特征、幼猫高能期),无躯体症状/疼痛/神经信号,精神食欲排泄正常。
    likely_tier: green
    action: 先确认已排除红黄;给环境调整和几天到一两周适应期,记录变化。
  moderate:
    definition: 任何突然或持续的行为变化但无硬红旗;乱排泄能排尿;强迫/过敏感持续;老年猫行为变化。
    likely_tier: yellow
    action: 这周内约门诊,兽医先体检 + 血尿检排除医学原因,再考虑行为咨询。
  severe:
    definition: 触碰激发疼痛攻击;行为变化合并躯体症状;神经异常;完全拒食躲起不动。
    likely_tier: red
    action: 立即就医或急诊,不点名疾病只判断风险与下一步。

tier_rules:
  red:
    if_any:
      - beh_rf_pain_aggression matched
      - beh_rf_somatic matched
      - beh_rf_neuro matched
      - beh_rf_breathing matched
      - beh_rf_shutdown matched
    action: 停止常规问诊,建议立即就医或急诊;不诊断、不推荐药品。
  yellow:
    if_any:
      - behavior_change_sudden_or_persistent
      - inappropriate_elimination_can_urinate
      - compulsive_or_hyperesthesia_persistent
      - senior_cat_behavior_change
      - aggression_without_pain_or_somatic_signs
    action: 这周内约门诊,兽医先体检 + 血尿检排除医学原因。
  green:
    only_if_all:
      - red_and_yellow_excluded
      - clear_low_risk_trigger_present
      - no_pain_on_touch
      - no_somatic_symptoms
      - no_neuro_signs
      - eating_and_eliminating_normally
      - not_a_senior_with_new_change
    action: 给环境调整与关注变化,几天到一两周适应期。
  unknown:
    default: 行为变化信息不足时至少 yellow;不能确认是否触碰激发疼痛或合并躯体症状时保守升级。

host_risk_profile:
  lower_risk_features:
    - 成年、无慢病
    - 行为变化有明确低风险触发(发情/短期应激等)
    - 仍能正常走动、回应、吃喝排泄
    - 无躯体症状、无疼痛信号、无神经异常
  higher_risk_features:
    - 老年猫尤其大于 10 岁
    - 行为变化合并躯体症状或神经异常
    - 触碰某部位即攻击/嚎叫
    - 有慢病、近期外伤或骨关节问题
  risk_modifier_rules:
    - if: senior_cat and behavior_change
      effect: prioritize_rule_out_cds_hyperthyroid_hypertension_shorten_window
    - if: touch_triggered_aggression and previously_docile
      effect: green_to_red
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
        - 是否触碰激发疼痛攻击
        - 是否合并躯体或神经症状
        - 变化类型与年龄
        - 是否有低风险触发
  uncertainty_policy:
    if_user_cannot_answer: 按 yellow_or_red 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 记录行为变化开始时间、出现场景、触发因素和是否合并躯体症状
      applies_to: all_tiers
      source_claim_ids: [beh_001]
    - action: 在猫不表现时拍视频给兽医看,到医院可能不复现
      applies_to: all_tiers
      source_claim_ids: [beh_019]
    - action: 攻击性猫先隔离到独立房间(配独立猫砂盆、水、食物、藏身处)保护自己和其它猫
      applies_to: aggression_or_yellow
      source_claim_ids: [beh_013, beh_018]
    - action: 怀疑发情或短期应激时提供房间内独享资源,给几天到一两周适应期
      applies_to: green
      source_claim_ids: [beh_012, beh_013]
  forbidden:
    - action: 打猫、体罚或用喷水恐吓
      reason: 会让猫怕人、破坏信任并加重恐惧与攻击
      source_claim_ids: [beh_022]
    - action: 给猫喂人用镇静药或抗焦虑药
      reason: 剂量错误可致命,行为药物必须由兽医处方并配合行为调整
      source_claim_ids: [beh_018, beh_021]
    - action: 把突然变坏当只是脾气坏而拖延医学排除
      reason: 突然或持续行为变化应先由兽医排除医学原因
      source_claim_ids: [beh_001, beh_006]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - pain_management
    - anti_anxiety_behavior_medication
    - pheromone_environmental_aids
  user_safe_message: 行为突变常是身体在疼或生病的信号,药不能先试,人用镇静/抗焦虑药更可能致命;行为类药物只能由兽医处方并配合环境调整。如果一碰就嚎叫/咬、合并不吃吐拉喘或走路不稳,需要尽快就医。

response_style:
  must_say:
    - 猫的脾气不会无缘无故变,先排查身体原因
    - 一碰就疼可能是那个部位在疼
    - 突然或持续的行为变化先看兽医做体检和血尿检
  avoid_terms:
    - 闹脾气
    - 不听话
    - 报复
  forbidden_phrases:
    - 打一顿就好
    - 喷水教育
    - 喂点人的镇静药
    - 就是脾气坏
    - 惩罚它

source_claim_ids:
  - beh_001
  - beh_002
  - beh_003
  - beh_004
  - beh_005
  - beh_006
  - beh_007
  - beh_008
  - beh_009
  - beh_010
  - beh_011
  - beh_012
  - beh_013
  - beh_014
  - beh_015
  - beh_016
  - beh_017
  - beh_018
  - beh_019
  - beh_020
  - beh_021
  - beh_022
```
