# AI 分诊知识卡:猫呼吸困难 / 呼吸异常

```yaml
condition_id: cat_dyspnea
source_document: docs/medical/source/cat-dyspnea.source.md
status: draft
entry_symptoms:
  - 呼吸困难
  - 呼吸怪
  - 张口喘
  - 喘气
  - 咳嗽喘
  - 呼吸急促
user_synonyms:
  - 像狗一样喘
  - 肚子一鼓一鼓
  - 呼吸很用力
  - 嘴巴张开呼吸
  - 牙龈发紫
  - 舌头发蓝

ai_task:
  primary_goal: 识别猫呼吸困难硬急症,尽快建议急诊和安全运输。
  never_do:
    - 不诊断哮喘、心脏病或普通咳嗽
    - 不让张口喘/费力呼吸在家观察
    - 不推荐哮喘喷剂、人用药、止咳药、抗生素或剂量
    - 不建议洗澡、蒸汽、香薰、雾化或强行喂水

questioning_boundary:
  goal: 第一轮排除张口喘、费力呼吸、发绀、塌陷;命中任一项即停止常规追问。
  ask_style: 呼吸入口最多先问 1 个组合红旗问题;命中红旗立即评估。
  max_rounds_before_assessment: 2
  minimum_context_for_assessment:
    universal:
      - 症状持续多久
      - 精神状态
      - 呼吸是否异常
      - 是否命中通用红旗
    condition_specific:
      - 是否张口呼吸
      - 是否腹部用力/头颈前伸/身体前伸
      - 牙龈舌头是否蓝紫或苍白
      - 是否塌陷、抽搐、极度虚弱
      - 是否只是咳嗽/喷嚏且休息时呼吸正常
  stop_and_assess_when:
    - 张口呼吸
    - 呼吸费力
    - 发绀/蓝紫黏膜
    - 塌陷或极度虚弱
    - 用户描述喘不过气
    - 已能区分 red/yellow/other_path
  continue_asking_when:
    - 用户说“咳嗽/呼吸怪”但没有说明是否张口喘或费力
    - 需要区分咳嗽/呕吐/打喷嚏路径且无红旗

red_flags:
  - id: bre_rf_open_mouth
    user_signal: 张口呼吸、像狗一样喘、嘴巴张着喘
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bre_001, bre_004, emg_001]
  - id: bre_rf_labored
    user_signal: 腹部用力、头颈伸直、身体前伸、呼吸很费劲
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bre_001, bre_002]
  - id: bre_rf_blue
    user_signal: 舌头、牙龈、嘴唇或鼻子发紫/发蓝
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bre_004, emg_001]
  - id: bre_rf_collapse
    user_signal: 瘫软、叫不醒、抽搐、极度虚弱
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bre_005, emg_006]

triage_questions:
  - id: bre_q_redflag_combo
    ask: 现在有没有张口喘、呼吸很用力、肚子明显一鼓一鼓、头颈伸直,或牙龈/舌头发紫发蓝?
    why: 这些都是呼吸急症信号。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 张口喘: red
      - 呼吸费力: red
      - 蓝紫黏膜: red
      - 都没有: 继续判断是否咳嗽/喷嚏/其它路径
    source_claim_ids: [bre_001, bre_002, bre_004]
  - id: bre_q_state
    ask: 它还能正常站立和回应你吗?有没有瘫软、抽搐或明显虚弱?
    why: 塌陷和极度虚弱是急诊信号。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 瘫软/叫不醒/抽搐: red
      - 能正常活动: 继续判断呼吸表现
    source_claim_ids: [bre_005, emg_006]
  - id: bre_q_not_dyspnea
    ask: 如果没有张口喘和费力,它更像是咳嗽、打喷嚏,还是刚运动/紧张后短暂喘?
    why: 无红旗时才考虑转 URI/咳嗽路径。
    priority: 3
    multi_select: false
    changes_decision_by:
      - 咳嗽/喷嚏且呼吸正常: other_path
      - 休息后仍呼吸快: yellow_or_red
    source_claim_ids: [bre_007, bre_008]

severity_scale:
  mild:
    definition: 没有真正呼吸困难,仅轻微咳嗽/喷嚏且休息时呼吸正常。
    likely_tier: other_path
    action: 转 URI/咳嗽路径并给呼吸红旗。
  moderate:
    definition: 偶发咳嗽/喘鸣、疑似哮喘史,当前无张口喘、费力和发绀。
    likely_tier: yellow
    action: 当天联系兽医,加重立即急诊。
  severe:
    definition: 张口喘、费力呼吸、发绀、塌陷、极度痛苦或持续呼吸急促。
    likely_tier: red
    action: 立即急诊。

tier_rules:
  red:
    if_any:
      - bre_rf_open_mouth matched
      - bre_rf_labored matched
      - bre_rf_blue matched
      - bre_rf_collapse matched
      - user_says_cannot_breathe
    action: 停止追问,建议立即急诊和安静运输。
  yellow:
    if_any:
      - cough_or_wheeze_without_red_flags
      - known_asthma_history_with_current_mild_signs
      - breathing_fast_but_not_labored
    action: 当天联系兽医;出现任何 red 立即急诊。
  green:
    only_if_all:
      - no_open_mouth_breathing
      - no_labored_breathing
      - gum_tongue_color_normal
      - energy_normal
      - breathing_normal_at_rest
      - symptom_is_sneeze_or_mild_cough_only
    action: 转相关路径,但保留呼吸红旗提醒。
  unknown:
    default: 呼吸异常描述不清时,先问红旗组合;问不到则按 red/yellow 保守处理。

host_risk_profile:
  lower_risk_features:
    - 没有真正呼吸困难
    - 休息时呼吸正常
    - 精神食欲正常
  higher_risk_features:
    - 任何张口喘或费力呼吸
    - 已知哮喘/心脏病/胸腔积液史
    - 老年猫
    - 肥胖
    - 接触烟雾、粉尘猫砂、喷雾、香薰、清洁剂
  risk_modifier_rules:
    - if: open_mouth_or_labored_breathing
      effect: immediate_red
    - if: known_asthma and current_wheeze
      effect: at_least_yellow

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 判断依据
      - 现在该做什么
      - 路上安全处理
      - 还不能确定的部分
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否张口喘
        - 是否费力呼吸
        - 黏膜颜色
        - 是否塌陷
  uncertainty_policy:
    if_user_cannot_answer: 呼吸入口保守升级
    if_conflicting_answers: 建议更高一级处理

home_care:
  allowed:
    - action: 保持安静,减少抓抱和刺激
      applies_to: red_or_yellow
      source_claim_ids: [bre_009]
    - action: 立即联系急诊医院并准备运输
      applies_to: red
      source_claim_ids: [bre_005, bre_009]
    - action: 能安全拍短视频则拍,不要因此拖延
      applies_to: yellow_or_unclear
      source_claim_ids: [bre_007]
  forbidden:
    - action: 强行喂水、喂食、喂药
      reason: 呼吸困难时可能增加应激和误吸风险
      source_claim_ids: [bre_009]
    - action: 洗澡、蒸汽、香薰、雾化或喷药
      reason: 可能加重呼吸刺激或延误急诊
      source_claim_ids: [bre_008, bre_009]
    - action: 自行使用哮喘喷剂或人药
      reason: 药物和病因需要兽医判断
      source_claim_ids: [bre_010, bre_011]

medicine_policy:
  status: emergency_restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - oxygen
    - bronchodilators
    - corticosteroids
    - emergency_procedures
  user_safe_message: 呼吸困难不能在家靠药试;哮喘或其它呼吸问题可能需要氧气、吸入药或急诊处理,必须由兽医判断。

response_style:
  must_say:
    - 张口喘或呼吸费力就是急诊信号
    - 现在先减少刺激并联系急诊
    - 不要喂水喂药或洗澡蒸汽
  avoid_terms:
    - 可能只是热
    - 先观察
    - 哮喘发作而已
  forbidden_phrases:
    - 用人的哮喘喷雾
    - 蒸汽熏一下
    - 洗个澡降温
    - 喂点止咳药

source_claim_ids:
  - bre_001
  - bre_002
  - bre_003
  - bre_004
  - bre_005
  - bre_006
  - bre_007
  - bre_008
  - bre_009
  - bre_010
  - bre_011
```
