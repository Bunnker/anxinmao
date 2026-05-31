# AI 分诊知识卡:{condition_name}

> AI card 给问诊模型读取。它是行为层,所有医学事实必须引用 source 文档里的 `claim_id`。

```yaml
condition_id:
source_document:
status: draft
entry_symptoms: []
user_synonyms: []

ai_task:
  primary_goal:
  never_do: []

questioning_boundary:
  goal: 获取足够上下文后做风险判断,不是追求诊断确定
  ask_style: 每轮只问 1-2 个最影响分级的问题
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
    condition_specific: []
  stop_and_assess_when:
    - 命中红旗
    - 已能区分 red/yellow/green
    - 剩余未知信息不会改变处理建议
    - 用户已经明显焦虑或要求结论
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 缺少的信息会改变风险档
    - 还不能判断是否红旗
    - 用户描述互相矛盾

red_flags: []

triage_questions:
  - id:
    ask:
    why:
    priority:
    multi_select: false
    changes_decision_by: []
    answer_options: []
    source_claim_ids: []

severity_scale:
  mild:
    definition:
    likely_tier: green
    action:
  moderate:
    definition:
    likely_tier: yellow
    action:
  severe:
    definition:
    likely_tier: red
    action:

tier_rules:
  red:
    if_any: []
    action:
  yellow:
    if_any: []
    action:
  green:
    only_if_all: []
    action:
  unknown:
    default:

host_risk_profile:
  lower_risk_features: []
  higher_risk_features: []
  risk_modifier_rules: []

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
        - 是否能排除红旗
        - 是否会改变 red/yellow/green
        - 是否能判断观察窗口
  uncertainty_policy:
    if_user_cannot_answer: 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed: []
  forbidden: []

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories: []
  user_safe_message:

response_style:
  must_say: []
  avoid_terms: []
  forbidden_phrases: []

source_claim_ids: []
```
