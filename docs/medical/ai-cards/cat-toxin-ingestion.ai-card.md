# AI 分诊知识卡:猫误食 / 中毒风险

```yaml
condition_id: cat_toxin_ingestion
source_document: docs/medical/source/cat-toxin-ingestion.source.md
status: draft
entry_symptoms:
  - 误食
  - 吃了不该吃的
  - 中毒
  - 吃了药
  - 吃了植物
  - 吃了绳子
user_synonyms:
  - 偷吃
  - 咬了百合
  - 吃了布洛芬
  - 吃了巧克力
  - 吃了洋葱
  - 吃了塑料
  - 吞线

ai_task:
  primary_goal: 快速识别高危毒物/异物,收集急诊所需信息,引导联系兽医或毒物热线。
  never_do:
    - 不估算安全剂量并安慰没事
    - 不教催吐、活性炭、牛奶、油或任何解毒偏方
    - 不推荐任何药品、解毒剂或剂量
    - 不让用户等待症状出现
    - 不拉扯线状异物

questioning_boundary:
  goal: 第一轮就确认吃了什么、多少、什么时候、体重、是否有症状和是否有包装照片。
  ask_style: 每轮只问 1-2 个最影响分级的问题;高危物命中后停止常规追问。
  max_rounds_before_assessment: 2
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 症状持续多久
      - 精神状态
      - 食欲和饮水
      - 呼吸是否异常
      - 是否命中通用红旗
    condition_specific:
      - 吃了什么/接触了什么
      - 大概吃了多少
      - 大概什么时候吃的
      - 猫体重
      - 当前是否呕吐、流口水、抽搐、步态不稳、呼吸异常、瘫软
      - 是否有包装、成分、照片或植物样本
  stop_and_assess_when:
    - 命中百合、人药、NSAID、对乙酰氨基酚、巧克力/咖啡因、木糖醇、洋葱蒜、灭鼠/杀虫、线状异物
    - 已出现任何中毒或系统性症状
    - 毒物不确定但可能有风险
    - 用户无法确认吃了多少或什么时候
  continue_asking_when:
    - 物质种类不清且用户能马上补充
    - 缺少时间/量/体重且会帮助兽医判断

red_flags:
  - id: tox_rf_known_high_risk
    user_signal: 百合、人用止痛退烧药、NSAID、巧克力/咖啡因、木糖醇、洋葱蒜、杀虫灭鼠、清洁剂、绳线异物
    action: immediate_vet_or_poison_control
    stop_questioning: true
    source_claim_ids: [tox_002, tox_003, tox_004, tox_005, tox_006, tox_007, tox_008, tox_010, tox_011]
  - id: tox_rf_symptoms
    user_signal: 呕吐、腹泻、流口水、步态不稳、抽搐、呼吸重、瘫软
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [tox_001, emg_001, emg_006]
  - id: tox_rf_uncertain
    user_signal: 不知道吃了什么/多少/什么时候,或包装成分不明
    action: urgent_vet_or_poison_control
    stop_questioning: false
    source_claim_ids: [tox_012, tox_014]

triage_questions:
  - id: tox_q_what
    ask: 它吃到或接触的具体是什么?有包装、药名、植物照片或成分表吗?
    why: 物质种类决定是否立即急诊。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 百合/人药/NSAID/对乙酰氨基酚: red
      - 巧克力/咖啡因/木糖醇/洋葱蒜: red_or_high_yellow
      - 绳线/塑料/异物: red
      - 低风险物但不确定: yellow
    source_claim_ids: [tox_002, tox_003, tox_004, tox_005, tox_006, tox_007, tox_008, tox_011, tox_013]
  - id: tox_q_when_amount_weight
    ask: 大概什么时候吃的、吃了多少?猫大概多重?
    why: 兽医或毒物热线需要时间、量和体重判断处理。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 时间近或量不清楚: red_or_yellow
      - 体重很轻: more_conservative
    source_claim_ids: [tox_012, tox_014]
  - id: tox_q_symptoms
    ask: 现在有没有吐、流口水、走路不稳、抽搐、呼吸变重、精神很差?
    why: 已出现症状应急诊。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 任一明显症状: red
      - 暂无症状但高危物: still_red_or_high_yellow
    source_claim_ids: [tox_001]

severity_scale:
  mild:
    definition: 可确认低风险物品、极少量、无症状,且能马上联系专业人员确认。
    likely_tier: yellow
    action: 电话联系兽医确认,不自行用药。
  moderate:
    definition: 毒物不确定、量/时间不清楚、目前无症状。
    likely_tier: yellow_or_red
    action: 尽快联系兽医或毒物热线,准备包装和体重。
  severe:
    definition: 已知高危毒物/人药/百合/线状异物,或已出现任何中毒症状。
    likely_tier: red
    action: 立即急诊或联系毒物热线。

tier_rules:
  red:
    if_any:
      - tox_rf_known_high_risk matched
      - tox_rf_symptoms matched
      - string_or_linear_foreign_body_possible
      - acetaminophen_or_nsaid_possible
      - lily_exposure_possible
    action: 停止常规问诊,建议立即联系急诊兽医/毒物热线。
  yellow:
    if_any:
      - unknown_substance
      - amount_unknown
      - time_unknown
      - low_risk_item_but_user_uncertain
    action: 电话确认,不要自行处理。
  green:
    only_if_all:
      - veterinarian_or_poison_control_has_confirmed_low_risk
      - no_symptoms
      - no_high_risk_substance
    action: 按专业人员建议观察。
  unknown:
    default: 误食默认不绿档;信息不足时按 yellow_or_red。

host_risk_profile:
  lower_risk_features:
    - 已由兽医或毒物热线确认低风险
    - 无症状
  higher_risk_features:
    - 幼猫、老年猫、体重很轻
    - 慢病或正在用药
    - 已有神经、呼吸、消化或虚弱症状
    - 高危物或剂量不明
  risk_modifier_rules:
    - if: high_risk_substance_possible
      effect: immediate_red
    - if: information_unknown
      effect: at_least_yellow

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 判断依据
      - 还不能确定的部分
      - 现在该做什么
      - 要准备给兽医的信息
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 吃了什么
        - 什么时候吃的
        - 吃了多少
        - 猫体重和当前症状
  uncertainty_policy:
    if_user_cannot_answer: 按更高风险处理
    if_conflicting_answers: 建议立即电话联系专业人员

home_care:
  allowed:
    - action: 隔离猫和可疑物品
      applies_to: all_tiers
      source_claim_ids: [tox_013]
    - action: 保留包装、药板、植物照片、剩余物或呕吐物照片
      applies_to: all_tiers
      source_claim_ids: [tox_013]
    - action: 记录体重、误食时间、估计量和当前症状
      applies_to: all_tiers
      source_claim_ids: [tox_012, tox_014]
  forbidden:
    - action: 自行催吐
      reason: 需兽医或毒物中心明确指导
      source_claim_ids: [tox_016]
    - action: 自行喂活性炭、牛奶、油、解毒药
      reason: 可能延误或加重风险
      source_claim_ids: [tox_015, tox_017]
    - action: 拉扯嘴里或肛门外露出的线
      reason: 线状异物可造成肠道损伤
      source_claim_ids: [tox_011]

medicine_policy:
  status: prohibited_for_user_recommendation
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - antidotes
    - activated_charcoal
    - emesis_induction
    - fluid_therapy
  user_safe_message: 误食/中毒不能靠网上剂量判断,也不要自行催吐或喂解毒东西;请马上联系兽医急诊或毒物热线。

response_style:
  must_say:
    - 这个入口先按安全处理,不要等症状
    - 请准备包装、照片、时间、量和体重
    - 不要自行催吐或喂任何解毒东西
  avoid_terms:
    - 安全剂量
    - 应该没事
    - 观察一下
  forbidden_phrases:
    - 喂牛奶解毒
    - 用双氧水催吐
    - 吃一点没关系
    - 自己喂活性炭

source_claim_ids:
  - tox_001
  - tox_002
  - tox_003
  - tox_004
  - tox_005
  - tox_006
  - tox_007
  - tox_008
  - tox_009
  - tox_010
  - tox_011
  - tox_012
  - tox_013
  - tox_014
  - tox_015
  - tox_016
  - tox_017
  - tox_018
```
