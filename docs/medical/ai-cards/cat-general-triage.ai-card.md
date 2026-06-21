# AI 分诊知识卡:猫通用分诊

```yaml
condition_id: cat_general_triage
source_document: docs/medical/source/cat-general-triage.source.md
status: draft
entry_symptoms:
  - 其它情况
  - 不知道选哪个
  - 猫不太对劲
  - 怪怪的
  - 不舒服
user_synonyms:
  - 感觉不对
  - 状态不对
  - 有点异常
  - 想问一下

ai_task:
  primary_goal: 用最少问题先排除急症红旗,再转到具体症状卡或日常护理卡。
  never_do:
    - 不在信息很少时安慰说没事
    - 不为了完整画像连续追问很多轮
    - 不给药品名、剂量或诊断
    - 不把健康异常强行归为性格或行为问题

questioning_boundary:
  goal: 先确认是否有呼吸、尿闭、误食、出血、抽搐/瘫软、不吃不喝等通用红旗。
  ask_style: 每轮只问 1-2 个最高价值问题。
  max_rounds_before_assessment: 2
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 异常持续多久
      - 精神和食欲
      - 呼吸是否异常
      - 排尿排便是否异常
      - 是否误食或外伤
    condition_specific: []
  stop_and_assess_when:
    - 命中任一红旗
    - 已能转到明确症状卡
    - 已能判断是日常护理咨询
    - 用户已经要求结论
  continue_asking_when:
    - 不能排除呼吸/尿闭/误食/出血/意识问题

red_flags:
  - id: gen_rf_breath
    user_signal: 张口喘、呼吸费力、舌头或牙龈发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [gen_001, emg_001]
  - id: gen_rf_urine
    user_signal: 频繁蹲砂但尿不出、只有几滴或痛苦叫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [gen_002, emg_007]
  - id: gen_rf_toxin
    user_signal: 可能吃了人药、百合、鼠药、防冻液、巧克力、洋葱等
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [gen_003, emg_008]
  - id: gen_rf_bleeding
    user_signal: 大量出血、吐血、便血、尿血、压迫不止
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [gen_004, emg_003]
  - id: gen_rf_neuro_collapse
    user_signal: 抽搐、叫不醒、站不起来、后腿拖行、倒下
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [gen_005, emg_005]
  - id: gen_rf_no_eat
    user_signal: 接近或超过 24 小时明显不吃不喝,尤其幼猫、肥胖猫、慢病猫
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [gen_006, emg_012]

triage_questions:
  - id: gen_q_red_flags
    ask: 先确认几个急症信号:有没有张口喘/呼吸费力、尿不出、误食人药或百合、大量出血、抽搐或叫不醒?
    why: 这些信号会直接决定是否需要急诊,不能继续普通聊天。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 任一命中: red
      - 都没有: 继续转具体症状
    source_claim_ids: [gen_001, gen_002, gen_003, gen_004, gen_005]
  - id: gen_q_state_duration
    ask: 它这种“不对劲”持续多久了?现在精神、食欲、喝水和平时比差多少?
    why: 持续时间和全身状态决定观察窗口。
    priority: 2
    multi_select: false
    source_claim_ids: [gen_006]
  - id: gen_q_route
    ask: 最明显的是吐、拉稀、不吃、尿异常、呼吸怪、走路怪、眼耳口皮肤问题,还是更像日常行为/喂养问题?
    why: 把 other 入口转到最匹配的资料卡。
    priority: 3
    multi_select: false
    source_claim_ids: [gen_007, gen_008]

tier_rules:
  red:
    if_any:
      - any red_flag matched
      - user cannot rule out breathing/urinary/toxin/neuro red flag
    action: 停止常规追问,建议立即联系动物医院/急诊。
  yellow:
    if_any:
      - no red flag but appetite_or_energy_down
      - abnormal_state_persistent
      - kitten_senior_or_chronic_disease
    action: 建议尽快联系兽医,并转具体症状卡。
  green:
    only_if_all:
      - no red_flags
      - energy_appetite_normal
      - urine_stool_breathing_normal
      - issue_is_daily_care_or_mild_behavior
    action: 转日常护理卡或给短期观察升级条件。
  unknown:
    default: 不能排除红旗时按 yellow_or_red 保守处理。

analysis_policy:
  if_context_sufficient:
    output:
      - 是否命中急症红旗
      - 应转入哪个具体问题
      - 现在该做什么
      - 需要继续观察哪些升级条件
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否能排除通用红旗
        - 是否能转到明确症状卡
  uncertainty_policy:
    if_user_cannot_answer: 保守升级
    if_conflicting_answers: 说明不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 记录开始时间、拍视频/照片、整理食欲饮水排尿排便
      applies_to: yellow_or_green
      source_claim_ids: [gen_007]
    - action: 若只是日常护理问题,转对应 care card
      applies_to: green
      source_claim_ids: [gen_007, gen_008]
  forbidden:
    - action: 自行喂人药、止痛药、抗生素或镇静药
      reason: 通用分诊尚未明确病因,自行用药风险高
      source_claim_ids: [gen_003]
    - action: 红旗命中后继续观察一晚
      reason: 会延误急症处理
      source_claim_ids: [gen_001, gen_002, gen_003, gen_004, gen_005]

medicine_policy:
  status: prohibited
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories: []

source_claim_ids:
  - gen_001
  - gen_002
  - gen_003
  - gen_004
  - gen_005
  - gen_006
  - gen_007
  - gen_008
```
