# AI 分诊知识卡:猫便秘 / 排便用力

```yaml
condition_id: cat_constipation_straining
source_document: docs/medical/source/cat-constipation-straining.source.md
status: draft
entry_symptoms:
  - 便秘
  - 拉不出来
  - 不拉屎
  - 排便用力
  - 干硬便
user_synonyms:
  - 几天没拉
  - 蹲猫砂盆拉不出
  - 拉羊屎蛋
  - 一直蹲厕所
  - 便便很硬

ai_task:
  primary_goal: 先区分尿不出与便秘,再判断是否可短期观察或需要门诊/急诊。
  never_do:
    - 不在无法确认尿团时按普通便秘处理
    - 不推荐人用泻药、灌肠剂、矿物油或剂量
    - 不把频繁蹲砂自动解释为便秘
    - 不建议挤压腹部或膀胱

questioning_boundary:
  goal: 排除尿闭、呕吐腹痛精神差和多日不排便等升级信号。
  ask_style: 先问尿团和排便,再问全身状态。
  max_rounds_before_assessment: 2
  minimum_context_for_assessment:
    universal:
      - 最后一次正常排便时间
      - 猫砂盆里尿团是否正常
      - 是否呕吐、腹痛、不吃或精神差
      - 粪便是否干硬/小球/带血
      - 年龄和慢病/术后情况
    condition_specific: []
  stop_and_assess_when:
    - 不能排除尿不出
    - 伴随呕吐、腹痛、精神差或不吃
    - 多日未排便
    - 已能区分 red/yellow/green

red_flags:
  - id: con_rf_urinary_confusion
    user_signal: 频繁蹲砂但不确定是尿不出还是拉不出,或尿团很少/没有
    action: immediate_er_or_urinary_path
    stop_questioning: true
    source_claim_ids: [con_001, uo_001]
  - id: con_rf_vomit_pain
    user_signal: 便秘/排便用力伴呕吐、腹痛、精神差、不吃
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [con_002, vom_005]
  - id: con_rf_no_stool_persistent
    user_signal: 多日未排便、反复用力无结果、干硬小球
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [con_003]
  - id: con_rf_high_risk_host
    user_signal: 幼猫、老年猫、慢病猫、脱水或术后
    action: same_day_vet_if_persistent
    stop_questioning: false
    source_claim_ids: [con_004]

triage_questions:
  - id: con_q_urine_or_stool
    ask: 它蹲猫砂盆时,尿团正常吗?还是也尿不出来/只有几滴?
    why: 尿不出是急症,不能误当便秘。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 没有尿团或只有几滴: red
      - 尿团正常: 继续评估便秘
      - 不确定: red_or_yellow
    source_claim_ids: [con_001, uo_001]
  - id: con_q_last_stool
    ask: 最后一次正常便便是什么时候?现在是完全没拉,还是拉很少很硬的小球?
    why: 持续时间和粪便形态决定是否能观察。
    priority: 2
    source_claim_ids: [con_003]
  - id: con_q_systemic
    ask: 有没有呕吐、肚子痛、不吃、精神差、一直趴着或叫?
    why: 全身症状会把便秘升级为需要就医。
    priority: 3
    multi_select: true
    source_claim_ids: [con_002]

tier_rules:
  red:
    if_any:
      - con_rf_urinary_confusion matched
      - constipation_with_vomiting_and_weakness
      - severe_abdominal_pain
    action: 按尿闭/急症风险处理,立即联系动物医院。
  yellow:
    if_any:
      - no_stool_multiple_days
      - repeated_straining_without_result
      - appetite_down
      - high_risk_host
    action: 尽快联系兽医或当天/24 小时内门诊。
  green:
    only_if_all:
      - urine_normal
      - mild_hard_stool_or_short_interval
      - energy_appetite_normal
      - no_vomiting_or_abdominal_pain
      - adult_low_risk_host
    action: 短期观察,增加饮水和猫砂盆舒适度,给升级条件。
  unknown:
    default: 不能确认尿团或全身状态时保守升级。

home_care:
  allowed:
    - action: 记录最后排便时间、粪便照片和尿团情况
      applies_to: green_or_yellow
      source_claim_ids: [con_001, con_003]
    - action: 提供更多饮水机会、湿粮比例和安静干净猫砂盆
      applies_to: green
      source_claim_ids: [con_005]
  forbidden:
    - action: 自行给人用泻药、灌肠剂、矿物油或剂量
      reason: 猫的便秘原因和风险需要兽医判断,错误处理可造成伤害
      source_claim_ids: [con_005]
    - action: 挤压腹部或膀胱
      reason: 无法区分尿闭和便秘时风险更高
      source_claim_ids: [con_001]

medicine_policy:
  status: prohibited
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - hairball_support_products

source_claim_ids:
  - con_001
  - con_002
  - con_003
  - con_004
  - con_005
```
