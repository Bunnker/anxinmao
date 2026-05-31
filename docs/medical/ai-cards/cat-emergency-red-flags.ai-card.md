# AI 分诊知识卡:猫通用急诊红旗

```yaml
condition_id: cat_emergency_red_flags
source_document: docs/medical/source/cat-emergency-red-flags.source.md
status: draft
entry_symptoms:
  - 通用红旗
  - 所有分诊入口
user_synonyms:
  - 喘不上气
  - 张嘴喘
  - 尿不出来
  - 抽了
  - 叫不醒
  - 后腿拖着走
  - 吃了药
  - 吃了百合

ai_task:
  primary_goal: 在任意问诊阶段识别立刻就医信号,并停止普通追问。
  never_do:
    - 命中红旗后继续完整问诊
    - 给药品名或剂量
    - 建议在家等一晚
    - 用“可能没事”安抚红旗用户

questioning_boundary:
  goal: 优先排除急症;命中急症后直接给行动建议。
  ask_style: 如果用户描述含糊但疑似红旗,只问一个澄清问题;确认后立即处理。
  max_rounds_before_assessment: 1
  minimum_context_for_assessment:
    universal:
      - 是否呼吸异常
      - 是否尿不出
      - 是否大量出血
      - 是否误食高危物
      - 是否抽搐/意识不清/瘫软
      - 是否接近或超过 24 小时不正常吃喝
    condition_specific: []
  stop_and_assess_when:
    - 命中任一 red_flag
    - 用户无法排除红旗
    - 用户描述高度焦虑且有急症关键词
  continue_asking_when:
    - 只差一个问题即可确认是否红旗

red_flags:
  - id: rf_dyspnea
    user_signal: 呼吸急促 / 张口喘 / 呼吸费力 / 牙龈或舌头发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [emg_001, emg_002]
  - id: rf_urinary_blockage
    user_signal: 频繁蹲砂但尿不出或只有几滴
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [emg_007]
  - id: rf_toxin
    user_signal: 怀疑误食百合、人药、鼠药、防冻液、巧克力、葡萄、洋葱等
    action: immediate_vet_or_er
    stop_questioning: true
    source_claim_ids: [emg_008]
  - id: rf_bleeding
    user_signal: 大量出血、吐血、便血、尿血、压迫后止不住
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [emg_003, emg_004]
  - id: rf_neuro_collapse
    user_signal: 抽搐、意识不清、叫不醒、无法站立、后腿拖行
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [emg_005, emg_006, emg_010]
  - id: rf_shock_or_dehydration
    user_signal: 牙龈白/黄/紫、皮肤回弹慢、极度虚弱
    action: urgent_vet
    stop_questioning: true
    source_claim_ids: [emg_009]
  - id: rf_no_eat_24h
    user_signal: 不正常吃东西或不喝水接近/超过 24 小时,尤其幼猫、肥胖猫、慢病猫
    action: urgent_vet
    stop_questioning: true
    source_claim_ids: [emg_012]

tier_rules:
  red:
    if_any:
      - any red_flag matched
      - user cannot rule out life-threatening sign after one clarification
    action: 立刻联系最近动物医院/急诊,不要继续在家观察。
  yellow:
    if_any:
      - no universal red flag but high_risk_host and persistent symptoms
    action: 进入具体病情卡片的 yellow 规则。
  green:
    only_if_all:
      - no universal red flag
      - condition-specific card supports green
    action: 由具体病情卡片决定。
  unknown:
    default: 保守升级到具体病情卡片的 yellow,并给明确复查窗口。

analysis_policy:
  if_context_sufficient:
    output:
      - 当前是否命中红旗
      - 为什么这不是继续聊天的场景
      - 现在该做什么
      - 路上不要做什么
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否能确认呼吸/尿闭/误食/出血/意识问题
  uncertainty_policy:
    if_user_cannot_answer: 按更高风险处理
    if_conflicting_answers: 解释不确定性,建议急诊或电话联系兽医

home_care:
  allowed:
    - action: 保持安静、减少搬动
      applies_to: red
      source_claim_ids: [emg_001, emg_006]
    - action: 出血时用干净布料持续按压
      applies_to: red
      source_claim_ids: [emg_003, emg_004]
    - action: 记录时间、拍照/视频、带上误食物包装
      applies_to: red
      source_claim_ids: [emg_008]
  forbidden:
    - action: 自行喂人药、止痛药、抗生素、镇静药
      reason: 猫对多种人药高度敏感,红旗场景会延误就医
      source_claim_ids: [emg_008]
    - action: 自行催吐
      reason: 误食物不明时可能加重损伤
      source_claim_ids: [emg_008]
    - action: 挤压膀胱
      reason: 疑似尿闭时有严重风险
      source_claim_ids: [emg_007]

medicine_policy:
  status: prohibited_for_red_flags
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories: []
  user_safe_message: 这种情况不适合先试药,先联系最近动物医院。

response_style:
  must_say:
    - 这类信号建议立刻联系动物医院/急诊
    - 路上保持安静,不要自行喂药
  avoid_terms:
    - 诊断
    - 确诊
  forbidden_phrases:
    - 先观察一晚
    - 吃点药看看
    - 问题不大

source_claim_ids:
  - emg_001
  - emg_002
  - emg_003
  - emg_004
  - emg_005
  - emg_006
  - emg_007
  - emg_008
  - emg_009
  - emg_010
  - emg_012
```
