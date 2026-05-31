# AI 分诊知识卡:猫眼睛问题

```yaml
condition_id: cat_eye_problem
source_document: docs/medical/source/cat-eye-problem.source.md
status: draft
entry_symptoms:
  - 眼睛问题
  - 流眼泪
  - 眼屎多
  - 眼睛红
  - 睁不开眼
  - 眯眼
user_synonyms:
  - 眼睛发白
  - 眼睛浑浊
  - 第三眼睑出来了
  - 一直揉眼睛
  - 眼睛肿
  - 眼睛有脓

ai_task:
  primary_goal: 先排除角膜溃疡、外伤、化学刺激、明显疼痛和视力风险,再判断是否可短期观察。
  never_do:
    - 不把眼屎多直接判断为上火、泪痕或普通结膜炎
    - 不推荐人用眼药水、旧眼药、激素眼药、抗生素眼药或剂量
    - 不建议用茶水、酒精、双氧水、消毒液或精油清洗眼睛
    - 不让角膜混浊、外伤、睁不开或明显疼痛在家观察

questioning_boundary:
  goal: 用最少问题判断是否存在疼痛、角膜/视力风险、外伤/化学刺激或系统性风险。
  ask_style: 每轮只问 1-2 个最影响分级的问题;眼睛疼痛或角膜异常命中后先评估。
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
      - 单眼还是双眼
      - 是否眯眼、睁不开、怕光、揉眼
      - 角膜是否发白/发蓝/发浑或表面异常
      - 是否外伤、抓伤、异物或清洁剂/刺激物接触
      - 分泌物颜色和量
      - 是否同时喷嚏、鼻涕、发热感或食欲下降
  stop_and_assess_when:
    - 角膜混浊或疑似溃疡
    - 外伤/化学刺激/异物
    - 明显疼痛、睁不开或持续揉眼
    - 视力异常
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 用户只说眼屎/流泪但没有说明疼痛和角膜外观
    - 不能排除外伤或刺激物
    - 精神食欲/年龄信息会改变观察窗口

red_flags:
  - id: eye_rf_pain_closed
    user_signal: 眯眼、睁不开、怕光、一直揉眼或抓眼
    action: same_day_vet_or_er_if_severe
    stop_questioning: false
    source_claim_ids: [eye_004, eye_008]
  - id: eye_rf_cloudy_ulcer
    user_signal: 眼球表面发白、发蓝、发浑、像有坑或膜
    action: urgent_vet_ophthalmic_exam
    stop_questioning: true
    source_claim_ids: [eye_004, eye_005, eye_008]
  - id: eye_rf_trauma_chemical
    user_signal: 抓伤、打架、撞伤、异物、清洁剂或刺激性液体接触
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [eye_006, eye_005]
  - id: eye_rf_vision
    user_signal: 走路撞东西、突然看不见、眼球外观明显异常
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [eye_004, eye_005]

triage_questions:
  - id: eye_q_redflag_combo
    ask: 它眼睛能正常睁开吗?有没有明显眯眼、怕光、一直揉眼,或者眼球表面发白/发浑?
    why: 疼痛和角膜异常是眼睛入口最关键的风险信号。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 睁不开/明显眯眼/一直揉: yellow_or_red
      - 角膜发白/发浑/表面异常: red
      - 都没有: 继续判断分泌物和全身状态
    source_claim_ids: [eye_004, eye_005, eye_008]
  - id: eye_q_trauma_chemical
    ask: 最近有没有打架抓伤、撞到、进异物,或者接触清洁剂、香薰、消毒液之类刺激物?
    why: 外伤和化学刺激可导致角膜损伤,不能按普通流泪观察。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 有外伤/异物/刺激物: red
      - 没有: 继续判断结膜炎和宿主风险
    source_claim_ids: [eye_006]
  - id: eye_q_discharge_systemic
    ask: 是一只眼还是两只眼?分泌物是清水样还是黄绿/浓稠?精神、食欲、喷嚏鼻涕怎么样?
    why: 分泌物和全身状态帮助判断结膜炎风险和观察窗口。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 黄绿/浓稠或红肿明显: yellow
      - 幼猫/多猫/喷嚏鼻涕/食欲下降: yellow_or_red
      - 清水样且状态正常: green_or_yellow
    source_claim_ids: [eye_001, eye_002, eye_003]

severity_scale:
  mild:
    definition: 轻微流泪或少量分泌物,眼睛可正常睁开,无揉眼/眯眼/角膜异常/外伤,精神食欲正常。
    likely_tier: green
    action: 短期观察并给升级条件;持续或恶化则联系兽医。
  moderate:
    definition: 红肿、分泌物明显、第三眼睑突出或轻中度眯眼,但无外伤、角膜混浊或视力异常。
    likely_tier: yellow
    action: 当天或 24 小时内联系兽医。
  severe:
    definition: 角膜混浊/疑似溃疡、外伤/化学刺激、明显疼痛睁不开、视力异常或系统性状态差。
    likely_tier: red
    action: 尽快就医,不要自行滴药。

tier_rules:
  red:
    if_any:
      - eye_rf_cloudy_ulcer matched
      - eye_rf_trauma_chemical matched
      - eye_rf_vision matched
      - severe_eye_pain_with_systemic_signs
    action: 停止常规追问,建议立即联系兽医或急诊。
  yellow:
    if_any:
      - eye_rf_pain_closed matched
      - thick_or_colored_discharge
      - conjunctiva_swollen_or_third_eyelid_visible
      - kitten_or_multicat_with_eye_discharge
      - symptoms_persisting_or_worsening
    action: 当天或 24 小时内门诊/咨询兽医。
  green:
    only_if_all:
      - eye_open_normally
      - no_squinting_or_rubbing
      - cornea_clear
      - no_trauma_or_chemical_exposure
      - appetite_energy_normal
      - adult_low_risk_cat
    action: 短期观察,出现疼痛/分泌物加重/角膜异常立即升级。
  unknown:
    default: 不能确认角膜清楚或是否疼痛时按 yellow 处理。

host_risk_profile:
  lower_risk_features:
    - 成年健康猫
    - 轻微清水样流泪或少量眼屎
    - 眼睛能正常睁开
    - 精神食欲正常
  higher_risk_features:
    - 幼猫、新到家、救助或多猫环境
    - 曾有猫疱疹病毒或反复眼病
    - 外出、打架、抓伤、异物或刺激物接触
    - 精神差、食欲下降、鼻涕喷嚏明显
  risk_modifier_rules:
    - if: corneal_opacity_or_trauma_possible
      effect: immediate_red_or_high_yellow
    - if: kitten_or_multicat and discharge_present
      effect: green_to_yellow

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 判断依据
      - 还不能确定的部分
      - 现在该做什么
      - 哪些变化需要升级
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否疼痛/睁不开
        - 角膜是否清亮
        - 是否外伤或刺激物
        - 精神食欲和年龄风险
  uncertainty_policy:
    if_user_cannot_answer: 眼睛入口保守升级为 yellow
    if_conflicting_answers: 解释不确定性并建议兽医检查

home_care:
  allowed:
    - action: 拍眼睛照片或短视频,记录单/双眼、分泌物和开始时间
      applies_to: all_tiers
      source_claim_ids: [eye_001, eye_004]
    - action: 防止继续揉眼或抓眼,必要时使用伊丽莎白圈
      applies_to: yellow_or_red
      source_claim_ids: [eye_009]
    - action: 保留刺激物或外伤相关照片/包装
      applies_to: trauma_or_chemical_possible
      source_claim_ids: [eye_006]
  forbidden:
    - action: 自行使用人用眼药水、旧眼药、抗生素或激素眼药
      reason: 眼病病因和角膜状态需要兽医判断
      source_claim_ids: [eye_008, eye_009, eye_011]
    - action: 用茶水、酒精、双氧水、消毒液、精油清洗眼睛
      reason: 可能刺激或加重眼部损伤
      source_claim_ids: [eye_006, eye_010]
    - action: 明显疼痛或角膜异常时继续观察
      reason: 角膜溃疡可导致严重视力后果
      source_claim_ids: [eye_005]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - ophthalmic_antibiotics
    - ophthalmic_antivirals
    - e_collar
    - fluorescein_exam
  user_safe_message: 眼药需要先判断角膜有没有损伤;不要自行滴人用或旧眼药,明显眯眼/揉眼/眼睛发浑请尽快看兽医。

response_style:
  must_say:
    - 我先帮你判断有没有角膜或外伤风险
    - 眼睛痛、睁不开或发浑不要自行滴药
    - 能安全拍照片会很有帮助
  avoid_terms:
    - 上火
    - 泪痕而已
    - 普通眼屎
  forbidden_phrases:
    - 滴人的眼药水
    - 用茶水洗
    - 先用以前剩下的眼药
    - 观察几天再说

source_claim_ids:
  - eye_001
  - eye_002
  - eye_003
  - eye_004
  - eye_005
  - eye_006
  - eye_007
  - eye_008
  - eye_009
  - eye_010
  - eye_011
```
