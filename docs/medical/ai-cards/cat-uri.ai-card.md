# AI 分诊知识卡:猫上呼吸道症状 / 打喷嚏流鼻涕

```yaml
condition_id: cat_uri
source_document: docs/medical/source/cat-uri.source.md
status: draft
entry_symptoms:
  - 打喷嚏
  - 流鼻涕
  - 眼鼻分泌物
  - 咳嗽
  - 猫感冒
user_synonyms:
  - 猫感冒
  - 鼻塞
  - 一直喷嚏
  - 眼屎多
  - 流鼻水
  - 支原体
  - 猫鼻支

ai_task:
  primary_goal: 判断是否需要立刻急诊、尽快门诊,还是可以短期在家观察。
  never_do:
    - 不诊断具体病原,例如“就是猫鼻支/支原体”
    - 不推荐抗生素、抗病毒药、眼药水或剂量
    - 不把 URI 说成普通人类感冒
    - 不编造来源

questioning_boundary:
  goal: 获取足够上下文后做风险判断,不是追求病原诊断确定。
  ask_style: 每轮只问 1-2 个最影响分级的问题。
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
      - 喷嚏频率
      - 是否有眼鼻分泌物及颜色
      - 是否有口腔溃疡/流口水
      - 是否新到家/未免疫/多猫环境
  stop_and_assess_when:
    - 命中呼吸异常/发绀/瘫软等红旗
    - 已能区分 red/yellow/green
    - 剩余未知信息不会改变处理建议
    - 用户已经明显焦虑或要求结论
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 缺少的信息会改变风险档
    - 还不能判断是否呼吸异常或不吃
    - 用户描述互相矛盾

red_flags:
  - id: uri_rf_breathing
    user_signal: 张口喘 / 呼吸费力 / 嘴唇或牙龈发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [uri_001, emg_001]
  - id: uri_rf_no_eat
    user_signal: 明显不吃东西,尤其超过 24 小时或幼猫不吃
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [uri_002, uri_009]
  - id: uri_rf_mouth_ulcer
    user_signal: 口腔溃疡、流口水、不愿吃硬粮
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [uri_003]
  - id: uri_rf_collapse
    user_signal: 瘫软、叫不醒、精神极差
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [uri_004, emg_006]

triage_questions:
  - id: uri_q_frequency
    ask: 它是偶尔打一两个喷嚏,还是一阵一阵打、一天很多次?
    why: 区分低风险刺激物和持续性上呼吸道问题。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 偶尔打一两个: 支持 green
      - 一阵一阵打: 支持 yellow
      - 一直打或很多次: green_to_yellow
    answer_options:
      - label: 偶尔打一两个,平时正常
        risk: green
        weight: 0
      - label: 一阵一阵打,中间有缓解
        risk: yellow
        weight: 1
      - label: 一直在打,或一天打很多次
        risk: yellow
        weight: 2
    source_claim_ids: [uri_006, uri_007]
  - id: uri_q_with
    ask: 有没有流鼻涕、眼睛红、嘴里溃疡、不吃东西或呼吸费力?
    why: 伴随症状决定是否升级。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 呼吸费力/张口喘: red
      - 口腔溃疡/流口水/不吃硬粮: yellow_or_red
      - 精神食欲下降: green_to_yellow
      - 都没有: 支持 green
    answer_options:
      - label: 呼吸费力、张口喘
        risk: red
        red_flag_id: uri_rf_breathing
      - label: 明显不吃东西,或活动量明显减少
        risk: yellow_or_red
        red_flag_id: uri_rf_no_eat
      - label: 嘴里有溃疡、流口水、不愿吃硬粮
        risk: yellow_or_red
        red_flag_id: uri_rf_mouth_ulcer
      - label: 眼睛红/流泪,或眼角有黄绿色分泌物
        risk: yellow
      - label: 流鼻涕、鼻子结鼻屎
        risk: yellow
      - label: 都没有
        risk: green
        exclusive: true
    source_claim_ids: [uri_002, uri_003, uri_008, uri_001]
  - id: uri_q_duration
    ask: 这样多久了?
    why: 持续时间决定观察窗口。
    priority: 3
    multi_select: false
    changes_decision_by:
      - 今天才开始: 支持 green/yellow
      - 超过 2-3 天: green_to_yellow
      - 反复出现: yellow,并考虑应激/FHV 复发方向但不诊断
    answer_options:
      - label: 今天才开始,或一两天
        risk: green_or_yellow
        weight: 0
      - label: 三五天
        risk: yellow
        weight: 1
      - label: 超过一周
        risk: yellow
        weight: 2
      - label: 时好时坏,反复出现
        risk: yellow
        weight: 1
    source_claim_ids: [uri_010, uri_011]
  - id: uri_q_host
    ask: 它多大了?疫苗打全了吗?是不是刚到家或家里有其它猫?
    why: 幼猫、未免疫、新到家、多猫环境会缩短观察窗口。
    priority: 4
    multi_select: true
    changes_decision_by:
      - 成年健康且已免疫: 支持低风险
      - 幼猫/未免疫/新到家/多猫: green_to_yellow
    source_claim_ids: [uri_005, uri_011]

severity_scale:
  mild:
    definition: 偶发喷嚏,无明显分泌物,精神食欲呼吸正常,低风险宿主。
    likely_tier: green
    action: 在家观察 24-48 小时,给升级条件。
  moderate:
    definition: 持续喷嚏、眼鼻分泌物、轻度精神食欲变化,或幼猫/未免疫/新到家/多猫环境。
    likely_tier: yellow
    action: 尽快约门诊或 24-48 小时内联系兽医,同时支持护理。
  severe:
    definition: 呼吸异常、发绀、不吃不喝、明显瘫软、严重口腔溃疡或系统性状态差。
    likely_tier: red
    action: 急诊或立刻联系兽医。

tier_rules:
  red:
    if_any:
      - uri_rf_breathing matched
      - uri_rf_collapse matched
      - severe respiratory or systemic signs
    action: 停止追问,建议立刻急诊。
  yellow:
    if_any:
      - persistent_symptoms_days >= 3
      - colored_discharge == true
      - appetite_or_energy_down == true
      - mouth_ulcer_or_drooling == true
      - kitten_or_unvaccinated_or_new_cat == true
    action: 尽快门诊,给支持护理和升级条件。
  green:
    only_if_all:
      - occasional_sneeze == true
      - appetite_normal == true
      - energy_normal == true
      - breathing_normal == true
      - no_obvious_discharge == true
      - no_red_flags == true
      - host_risk_low == true
    action: 短期观察,检查环境刺激物,给明确升级条件。
  unknown:
    default: 如果缺少食欲/精神/呼吸信息,先问;问不到则按 yellow 保守处理。

host_risk_profile:
  lower_risk_features:
    - 成年健康猫
    - 已按时免疫
    - 精神食欲正常
    - 呼吸正常
    - 症状短暂且没有加重
  higher_risk_features:
    - 幼猫
    - 老年猫
    - 未免疫或疫苗不完整
    - 新到家/救助/多猫环境
    - 已知慢性病或免疫低下
    - 不吃不喝
    - 精神差或躲起来不动
  risk_modifier_rules:
    - if: higher_risk_features_count >= 2
      effect: green_to_yellow
    - if: kitten_or_senior and appetite_down
      effect: shorten_observation_window
    - if: unvaccinated_kitten and uri_signs
      effect: prefer_vet_visit

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
        - 是否能排除呼吸红旗
        - 是否会改变 red/yellow/green
        - 是否能判断观察窗口
  uncertainty_policy:
    if_user_cannot_answer: 保守处理
    if_conflicting_answers: 解释不确定性 + 建议更高一级处理

home_care:
  allowed:
    - action: 用生理盐水湿棉片或湿毛巾轻轻擦眼鼻分泌物
      applies_to: yellow_or_green
      source_claim_ids: [uri_015]
    - action: 保持环境安静、减少应激
      applies_to: yellow_or_green
      source_claim_ids: [uri_011, uri_015]
    - action: 加热食物到接近体温以增加气味吸引力
      applies_to: yellow
      source_claim_ids: [uri_015]
    - action: 多猫家庭隔离病猫,分开食盆水碗和猫砂盆
      applies_to: yellow
      source_claim_ids: [uri_005, uri_015]
  forbidden:
    - action: 自行给人用感冒药或止痛药
      reason: 多种人药对猫有毒
      source_claim_ids: [uri_012, emg_008]
    - action: 自行使用抗生素、抗病毒药、眼药水
      reason: 病原和眼部病变需要兽医检查
      source_claim_ids: [uri_012, uri_013]
    - action: 默认推荐赖氨酸补剂
      reason: 有效性存在争议,部分研究提示可能加重
      source_claim_ids: [uri_014]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - antibiotics
    - antivirals
    - eye_medications
    - supplements
  user_safe_message: 这类情况有时需要抗生素、抗病毒或眼药,但具体药和剂量必须由兽医检查后决定。

response_style:
  must_say:
    - 我先帮你判断要不要急
    - 具体是哪种病原需要兽医做检查
    - 这是参考,不能替代兽医
  avoid_terms:
    - 猫感冒
    - 确诊
    - 肯定是
  forbidden_phrases:
    - 这就是猫鼻支
    - 吃阿莫西林
    - 先喂人用感冒药
    - 赖氨酸一定有用

source_claim_ids:
  - uri_001
  - uri_002
  - uri_003
  - uri_004
  - uri_005
  - uri_006
  - uri_007
  - uri_008
  - uri_009
  - uri_010
  - uri_011
  - uri_012
  - uri_013
  - uri_014
  - uri_015
```
