# AI 分诊知识卡:猫腹泻

```yaml
condition_id: cat_diarrhea
source_document: docs/medical/source/cat-diarrhea.source.md
status: draft
entry_symptoms:
  - 腹泻
  - 拉稀
  - 软便
  - 水样便
  - 血便
user_synonyms:
  - 拉肚子
  - 稀便
  - 便便不成形
  - 果冻便
  - 黑便
  - 拉血

ai_task:
  primary_goal: 判断腹泻是否可短期观察,还是需要尽快门诊/急诊。
  never_do:
    - 不诊断具体病因,例如寄生虫、猫瘟、肠炎
    - 不推荐人用止泻药、抗生素、驱虫药或剂量
    - 不把幼猫腹泻轻描淡写
    - 不让血便/黑便/虚弱脱水继续观察

questioning_boundary:
  goal: 排除血便/黑便、严重水样便、呕吐不吃、精神差、脱水、幼猫和持续时间风险。
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
      - 便便形态和颜色
      - 是否有血/黑便/黏液
      - 腹泻次数
      - 是否同时呕吐或不吃
      - 是否幼猫/老年/慢病
  stop_and_assess_when:
    - 命中黑便/大量血/虚弱脱水/持续呕吐等红旗
    - 已能区分 red/yellow/green
    - 剩余未知信息不会改变处理建议
    - 用户要求先给结论
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 不能判断是否血便/黑便
    - 缺少持续时间和频率
    - 精神食欲信息缺失且会改变分级

red_flags:
  - id: dia_rf_severe_bloody
    user_signal: 大量血便、反复血便或严重水样便
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [dia_004, dia_006, emg_003]
  - id: dia_rf_black_tarry
    user_signal: 黑色柏油样便
    action: immediate_vet
    stop_questioning: true
    source_claim_ids: [dia_006]
  - id: dia_rf_systemic
    user_signal: 同时呕吐、不吃、精神差、虚弱、发热、腹痛、脱水
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [dia_004, dia_005, emg_006]
  - id: dia_rf_kitten
    user_signal: 幼猫腹泻,尤其水样/频繁/精神差
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [dia_002, dia_010]

triage_questions:
  - id: dia_q_stool
    ask: 便便现在是什么样?是软便、水样、带黏液、鲜血,还是黑色柏油样?
    why: 便便形态和血/黑便直接影响分级。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 黑色柏油样: red
      - 大量鲜血或反复血: red_or_high_yellow
      - 水样频繁: yellow_or_red
      - 轻微软便: green_possible
    source_claim_ids: [dia_001, dia_006, dia_008]
  - id: dia_q_duration_frequency
    ask: 拉了多久?今天大概几次?
    why: 持续超过 1-2 天或次数很多需要升级。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 刚开始且次数少: 支持 green
      - 超过 1-2 天: yellow
      - 频繁水样: yellow_or_red
    source_claim_ids: [dia_003, dia_007]
  - id: dia_q_systemic
    ask: 它有没有呕吐、不吃、精神变差、肚子痛、发热或看起来脱水?
    why: 系统性症状让腹泻从观察升级为就医。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 同时呕吐/不吃/精神差: yellow_or_red
      - 脱水/虚弱/腹痛: red
      - 都没有: 支持 green/yellow
    source_claim_ids: [dia_004, dia_005]
  - id: dia_q_host
    ask: 它多大了?是幼猫、老年猫,或本来有慢性病吗?
    why: 年龄和基础病改变观察窗口。
    priority: 4
    multi_select: false
    changes_decision_by:
      - 幼猫/老年/慢病: green_to_yellow
      - 成年健康: 支持低风险
    source_claim_ids: [dia_010]

severity_scale:
  mild:
    definition: 成年健康猫,轻微软便或短期饮食/应激相关,精神食欲正常,无血黑便呕吐脱水。
    likely_tier: green
    action: 短期观察,保持饮水,记录便便;加重或超过 24-48 小时联系兽医。
  moderate:
    definition: 持续 1-2 天、频繁、黏液/少量鲜血、轻度食欲下降,或高风险宿主。
    likely_tier: yellow
    action: 联系兽医,准备粪便样本。
  severe:
    definition: 黑便、大量血便、严重水样频繁、伴呕吐不吃精神差、虚弱脱水或腹痛。
    likely_tier: red
    action: 急诊或当天门诊。

tier_rules:
  red:
    if_any:
      - dia_rf_black_tarry matched
      - severe_bloody_diarrhea and weak_or_dehydrated
      - diarrhea_with_repeated_vomiting
      - collapse_or_breathing_abnormal
    action: 建议急诊或立即联系兽医。
  yellow:
    if_any:
      - diarrhea_duration_days >= 1
      - frequent_watery_stool
      - mucus_or_small_blood
      - appetite_down
      - kitten_or_senior_or_chronic_disease
    action: 联系兽医,通常需要准备粪便样本。
  green:
    only_if_all:
      - adult_healthy
      - mild_soft_stool
      - duration_short
      - appetite_normal
      - energy_normal
      - no_vomiting
      - no_blood_or_black_stool
      - no_dehydration
    action: 短期观察,给明确升级条件。
  unknown:
    default: 不能确认血/黑便或精神食欲时,先问;问不到则按 yellow。

host_risk_profile:
  lower_risk_features:
    - 成年健康猫
    - 轻微软便
    - 精神食欲正常
    - 最近换粮或轻度应激
  higher_risk_features:
    - 幼猫
    - 老年猫
    - 慢病或免疫低下
    - 水样频繁/血便/黑便
    - 呕吐、不吃、精神差、脱水
  risk_modifier_rules:
    - if: kitten_or_senior_or_chronic_disease and diarrhea
      effect: green_to_yellow
    - if: bloody_or_black_stool
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
        - 是否有血便/黑便
        - 是否伴随呕吐不吃精神差
        - 是否幼猫/高风险宿主
  uncertainty_policy:
    if_user_cannot_answer: 保守处理
    if_conflicting_answers: 建议更高一级处理

home_care:
  allowed:
    - action: 记录便便照片、次数、颜色和是否有黏液/血
      applies_to: all_tiers
      source_claim_ids: [dia_008]
    - action: 保持饮水,询问兽医是否需要电解质液
      applies_to: green_or_yellow
      source_claim_ids: [dia_011]
    - action: 预约时带新鲜粪便样本
      applies_to: yellow
      source_claim_ids: [dia_008]
  forbidden:
    - action: 自行给人用止泻药
      reason: 非处方药可能对猫有害
      source_claim_ids: [dia_013]
    - action: 自行给抗生素或驱虫药
      reason: 需要检查和兽医判断病因
      source_claim_ids: [dia_012, dia_013]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - probiotics
    - dewormers
    - antidiarrheals
    - gastrointestinal_diet
  user_safe_message: 腹泻有时会用益生菌、驱虫药或其它药,但要看病因和猫的状态,具体药和剂量需要兽医决定。

response_style:
  must_say:
    - 我先看有没有血便、黑便和脱水风险
    - 腹泻是症状,不是一个具体诊断
    - 幼猫腹泻要更保守
  avoid_terms:
    - 只是吃坏了
    - 肠胃炎
    - 普通拉肚子
  forbidden_phrases:
    - 吃人用止泻药
    - 先随便驱虫
    - 血便也可以先等等

source_claim_ids:
  - dia_001
  - dia_002
  - dia_003
  - dia_004
  - dia_005
  - dia_006
  - dia_007
  - dia_008
  - dia_009
  - dia_010
  - dia_011
  - dia_012
  - dia_013
  - dia_014
```
