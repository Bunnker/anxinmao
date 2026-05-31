# AI 分诊知识卡:猫尿道阻塞 / 尿不出

```yaml
condition_id: cat_urethral_obstruction
source_document: docs/medical/source/cat-urethral-obstruction.source.md
status: draft
entry_symptoms:
  - 尿不出
  - 频繁蹲猫砂
  - 只尿几滴
  - 尿血
  - 乱尿
user_synonyms:
  - 一直蹲猫砂盆
  - 蹲半天没尿
  - 尿团很小
  - 公猫尿不出来
  - 猫砂盆里叫

ai_task:
  primary_goal: 快速区分完全/近乎完全尿不出与还能排尿但异常;前者立刻急诊,后者尽快门诊。
  never_do:
    - 不建议在家观察尿不出
    - 不建议挤膀胱
    - 不推荐消炎药/止痛药/利尿药
    - 不因为猫还精神尚可就降级

questioning_boundary:
  goal: 尿闭疑似时快速确认是否有尿输出,不是完整病因分析。
  ask_style: 最多先问 1-2 个核心问题;一旦接近尿不出直接红档。
  max_rounds_before_assessment: 2
  minimum_context_for_assessment:
    universal:
      - 是否真的尿出来
      - 是否只有几滴或没有正常尿团
      - 性别
      - 是否疼痛嚎叫
      - 是否不吃/呕吐/精神差
    condition_specific:
      - 最后一次正常尿团时间
      - 是否尿血或频繁进砂盆
  stop_and_assess_when:
    - 几乎尿不出或只有几滴
    - 公猫 + 尿不出/尿少
    - 猫砂盆里疼痛嚎叫
    - 伴不吃、呕吐、精神差
    - 用户无法确认是否有正常尿团
  continue_asking_when:
    - 用户说“尿频/乱尿”但能明确看到正常尿量
    - 缺少“有无尿输出”这个核心信息

red_flags:
  - id: uo_rf_no_output
    user_signal: 频繁蹲砂但几乎尿不出或只有几滴
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [uo_001, uo_002]
  - id: uo_rf_male_no_output
    user_signal: 公猫尿不出来或只有几滴
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [uo_001, uo_005]
  - id: uo_rf_pain
    user_signal: 排尿时嚎叫/痛苦
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [uo_003]
  - id: uo_rf_systemic
    user_signal: 不吃、呕吐、精神沉郁、脱水
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [uo_004]

triage_questions:
  - id: uo_q_output
    ask: 它蹲完猫砂盆后,有没有正常大小的尿团?还是几乎没有、只有几滴?
    why: 这是区分完全阻塞和未阻塞 FLUTD 的关键。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 几乎没有/只有几滴: red
      - 有尿但少/次数多/尿血: yellow
      - 正常尿团: 退出尿闭红旗,转其它症状
    answer_options:
      - label: 几乎尿不出,或只有几滴
        risk: red
        red_flag_id: uo_rf_no_output
      - label: 尿得出,但比平时少或次数变多
        risk: yellow
      - label: 尿得出,但疼/带血/乱尿
        risk: yellow
      - label: 能看到正常尿团,只是我担心
        risk: non_urinary_blockage_context
    source_claim_ids: [uo_001, uo_006, uo_007]
  - id: uo_q_sex
    ask: 它是公猫吗?有没有绝育?
    why: 尿道阻塞几乎只发生在公猫,绝育公猫也可能发生。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 公猫 + 尿少/尿不出: red
      - 母猫 + 尿少/尿血: 仍需 yellow/urgent,但完全阻塞概率较低
    source_claim_ids: [uo_005]
  - id: uo_q_systemic
    ask: 它有没有在猫砂盆里叫、不吃、呕吐、没精神或肚子紧?
    why: 这些说明可能已经很疼或影响全身。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 嚎叫/疼痛: red
      - 不吃/呕吐/精神差: red
      - 都没有但尿得出: yellow
    source_claim_ids: [uo_003, uo_004]

severity_scale:
  mild:
    definition: 对“尿闭”不设 mild;若确认正常排尿,应转入其它症状或观察排尿记录。
    likely_tier: green_not_allowed_for_pee
    action: 不给尿闭绿档。
  moderate:
    definition: 能排尿,但尿少/次数多/疼痛/血尿/猫砂盆外排尿,无系统症状。
    likely_tier: yellow
    action: 尽快门诊,观察是否升级为尿不出。
  severe:
    definition: 几乎尿不出、只有几滴、疼痛嚎叫、公猫尿不出、伴不吃呕吐精神差。
    likely_tier: red
    action: 立刻急诊。

tier_rules:
  red:
    if_any:
      - uo_rf_no_output matched
      - uo_rf_male_no_output matched
      - uo_rf_pain matched
      - uo_rf_systemic matched
      - user cannot confirm normal urine output
    action: 停止追问,建议立刻联系最近动物医院/急诊。
  yellow:
    if_any:
      - can_pass_urine_but_frequency_or_blood_or_pain == true
      - FLUTD signs without full obstruction
    action: 尽快门诊;给升级条件。
  green:
    only_if_all:
      - normal_urine_output_confirmed == true
      - no_pain == true
      - no_blood == true
      - no_systemic_signs == true
    action: 不输出“尿闭绿档”;说明目前不像尿闭,但继续观察尿团,必要时转其它症状。
  unknown:
    default: 无法确认是否有尿输出时按 red 处理。

host_risk_profile:
  lower_risk_features:
    - 母猫且能排出正常尿量
    - 精神食欲正常
    - 无疼痛嚎叫
  higher_risk_features:
    - 公猫或绝育公猫
    - 既往 FLUTD/FIC/结石史
    - 最近应激或多猫冲突
    - 不吃/呕吐/精神差
    - 没有正常尿团
  risk_modifier_rules:
    - if: male_cat and low_or_no_urine_output
      effect: immediate_red
    - if: cannot_verify_urine_output
      effect: red_by_uncertainty
    - if: can_pass_urine_but_pain_or_blood
      effect: yellow_no_green

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 有无尿输出这个核心依据
      - 为什么不能等
      - 现在该做什么
      - 路上不要做什么
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否能确认正常尿团
        - 是否公猫
        - 是否疼痛/呕吐/不吃/精神差
  uncertainty_policy:
    if_user_cannot_answer: 按尿不出处理,建议急诊或立刻电话联系兽医
    if_conflicting_answers: 解释“尿闭不能靠猜”,建议更高一级处理

home_care:
  allowed:
    - action: 立刻联系动物医院,说明“猫疑似尿道阻塞/尿不出来”
      applies_to: red
      source_claim_ids: [uo_001, uo_002]
    - action: 记录最后一次正常尿团时间和猫砂盆情况
      applies_to: red_or_yellow
      source_claim_ids: [uo_001, uo_007]
    - action: 运输时保持安静,减少挣扎
      applies_to: red
      source_claim_ids: [emg_001]
  forbidden:
    - action: 在家挤压或按摩膀胱
      reason: 可能造成严重伤害,解除阻塞应由兽医处理
      source_claim_ids: [uo_008]
    - action: 先喂消炎药/止痛药/利尿药
      reason: 会延误急诊,且药物安全性需兽医判断
      source_claim_ids: [uo_008]
    - action: 强行灌水
      reason: 不能解决阻塞,可能增加不适和风险
      source_claim_ids: [uo_001, uo_002]

medicine_policy:
  status: prohibited_for_red; restricted_for_yellow
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - pain_control
    - anti_inflammatory
    - antispasmodic
    - sedation_anesthesia
    - fluids
  user_safe_message: 尿不出不是适合在家先试药的情况,需要兽医判断是否导尿、输液和止痛。

response_style:
  must_say:
    - 尿不出来是猫的真急症,尤其公猫
    - 如果几乎没有尿或只有几滴,现在就联系动物医院
    - 不要在家挤膀胱或喂药
  avoid_terms:
    - 尿路感染确诊
    - 消炎药
    - 熬一熬
  forbidden_phrases:
    - 先观察一晚
    - 喂点消炎药
    - 给它多喝水冲一冲
    - 按摩膀胱

source_claim_ids:
  - uo_001
  - uo_002
  - uo_003
  - uo_004
  - uo_005
  - uo_006
  - uo_007
  - uo_008
```
