# AI 分诊知识卡:猫抽搐 / 癫痫样发作 / 神经急症

```yaml
condition_id: cat_seizure_neurologic_emergency
source_document: docs/medical/source/cat-seizure-neurologic-emergency.source.md
status: draft
entry_symptoms:
  - 抽搐
  - 癫痫
  - 发作
  - 叫不醒
  - 倒下
  - 后腿拖行
  - 意识不清
user_synonyms:
  - 口吐白沫
  - 四肢乱蹬
  - 突然僵硬
  - 像触电一样
  - 睁眼没反应

ai_task:
  primary_goal: 区分短暂单次发作记录与需要急诊的持续/集群/意识异常/毒物外伤相关发作。
  never_do:
    - 不把抽搐解释为普通行为问题
    - 不建议把手伸进猫嘴里
    - 不推荐抗癫痫药、人药或剂量
    - 不建议突然停药或改药

questioning_boundary:
  goal: 确认发作时长、次数、恢复情况、误食/外伤和当前意识呼吸。
  ask_style: 如果正在发作或意识异常,立即给急诊行动,不继续完整追问。
  max_rounds_before_assessment: 1
  minimum_context_for_assessment:
    universal:
      - 是否仍在发作
      - 发作持续多久
      - 今天发作几次
      - 现在是否清醒能站
      - 是否误食、人药、外伤或头部撞击
      - 呼吸是否异常
    condition_specific: []
  stop_and_assess_when:
    - 发作超过 5 分钟
    - 短时间多次发作
    - 发作后不清醒/站不起来
    - 有误食或外伤

red_flags:
  - id: neu_rf_status
    user_signal: 抽搐持续超过 5 分钟或发作不停止
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [neu_001]
  - id: neu_rf_cluster
    user_signal: 短时间多次发作、连续发作
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [neu_002]
  - id: neu_rf_unconscious
    user_signal: 叫不醒、意识不清、无法站立、后腿拖行
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [neu_003, emg_005]
  - id: neu_rf_toxin_trauma
    user_signal: 抽搐前后有误食、人药、外伤或头部撞击
    action: immediate_er_or_toxin_path
    stop_questioning: true
    source_claim_ids: [neu_004, emg_008]
  - id: neu_rf_postictal_severe
    user_signal: 发作后 24 小时仍明显异常或越来越严重
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [neu_005]

triage_questions:
  - id: neu_q_active_duration
    ask: 它现在还在抽搐吗?这次大概持续了多久?
    why: 超过 5 分钟是不应等待的急症。
    priority: 1
    source_claim_ids: [neu_001]
  - id: neu_q_count_recovery
    ask: 今天发作了几次?发作后现在清醒吗,能站起来走吗?
    why: 集群发作和恢复差都会升级。
    priority: 2
    source_claim_ids: [neu_002, neu_003, neu_005]
  - id: neu_q_exposure
    ask: 发作前有没有可能吃到人药、驱虫药、植物、毒物,或者摔到/撞到头?
    why: 毒物和头部外伤会改变为急症路径。
    priority: 3
    source_claim_ids: [neu_004, neu_006]

tier_rules:
  red:
    if_any:
      - neu_rf_status matched
      - neu_rf_cluster matched
      - neu_rf_unconscious matched
      - neu_rf_toxin_trauma matched
      - breathing_abnormal
    action: 立即联系动物医院/急诊,路上保持安静和安全。
  yellow:
    if_any:
      - first_known_seizure_but_recovered
      - postictal_changes
      - known_seizure_history_with_change_in_pattern
    action: 当天联系兽医,带视频和记录。
  green:
    only_if_all:
      - no_current_seizure
      - no_loss_of_consciousness
      - no_toxin_or_trauma
      - brief_question_about_history_only
    action: 解释记录要点,仍建议兽医评估发作史。
  unknown:
    default: 发作信息不清时保守升级。

home_care:
  allowed:
    - action: 记录开始/结束时间,拍视频,清开周围硬物
      applies_to: red_or_yellow
      source_claim_ids: [neu_006]
    - action: 保持安静,避免摔落或撞伤
      applies_to: red_or_yellow
      source_claim_ids: [neu_006]
  forbidden:
    - action: 把手、勺子、筷子或任何物品伸进猫嘴里
      reason: 猫不会吞舌,这样会增加咬伤和伤害风险
      source_claim_ids: [neu_007]
    - action: 强行喂水、喂食、喂药
      reason: 发作和意识异常时有误吸和延误风险
      source_claim_ids: [neu_001, neu_003]
    - action: 自行停用或调整抗癫痫药
      reason: 突然停药可增加发作风险
      source_claim_ids: [neu_002]

medicine_policy:
  status: prohibited
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories: []

source_claim_ids:
  - neu_001
  - neu_002
  - neu_003
  - neu_004
  - neu_005
  - neu_006
  - neu_007
```
