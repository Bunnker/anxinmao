# AI 分诊知识卡:猫呕吐

```yaml
condition_id: cat_vomiting
source_document: docs/medical/source/cat-vomiting.source.md
status: draft
entry_symptoms:
  - 呕吐
  - 吐了
  - 吐毛球
  - 干呕
  - 反胃
user_synonyms:
  - 吐黄水
  - 吐白沫
  - 吐粮
  - 吐血
  - 一直吐
  - 毛球

ai_task:
  primary_goal: 判断呕吐是否可短期观察,还是需要当天门诊/立即急诊。
  never_do:
    - 不把呕吐直接诊断为毛球、肠胃炎或吃坏肚子
    - 不推荐人用止吐药、胃药、止痛药、抗生素或剂量
    - 不教用户自行催吐、禁水或输液
    - 不拉扯任何线状异物

questioning_boundary:
  goal: 用最少问题排除持续呕吐、出血、系统性差、误食毒物/异物和脱水风险。
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
      - 呕吐次数和频率
      - 呕吐物是否有血/异物/线
      - 是否腹痛或脱水
      - 是否可能误食药物、植物、巧克力、洋葱、绳线或异物
  stop_and_assess_when:
    - 命中误食毒物/线状异物/血/虚弱/脱水等红旗
    - 已能区分 red/yellow/green
    - 剩余未知信息不会改变处理建议
    - 用户已经明显焦虑或要求结论
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 不能判断呕吐频率或是否持续
    - 不能排除误食和异物
    - 精神食欲/饮水/排便信息缺失且会改变分级

red_flags:
  - id: vom_rf_repeated
    user_signal: 连续吐、一天多次吐、吐完又吐
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [vom_002, vom_005, emg_007]
  - id: vom_rf_blood
    user_signal: 呕吐物有血、咖啡渣样、血量多或反复有血
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [vom_005, emg_003]
  - id: vom_rf_systemic
    user_signal: 精神很差、虚弱、腹痛、脱水、发热、体重下降
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [vom_005, vom_006, emg_006]
  - id: vom_rf_toxin_foreign
    user_signal: 吃了药、植物、巧克力、洋葱、绳线、塑料或其它异物
    action: immediate_er_or_toxin_path
    stop_questioning: true
    source_claim_ids: [vom_008, vom_009]

triage_questions:
  - id: vom_q_frequency
    ask: 它今天一共吐了几次?是只吐了一次,还是连续/反复吐?
    why: 呕吐频率是区分可观察和需要就医的核心。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 只吐一次且状态正常: 支持 green
      - 一天多次或连续吐: yellow_or_red
      - 每周反复或持续多天: yellow
    answer_options:
      - label: 只吐了一次,现在正常
        risk: green
        weight: 0
      - label: 今天吐了两三次
        risk: yellow
        weight: 1
      - label: 连续吐/一直吐
        risk: red
        red_flag_id: vom_rf_repeated
      - label: 反复好几天或每周都吐
        risk: yellow
        weight: 2
    source_claim_ids: [vom_001, vom_002, vom_005]
  - id: vom_q_contents_exposure
    ask: 吐出来的东西里有没有血、线/塑料/异物?它可能吃过药、植物、巧克力、洋葱或绳线吗?
    why: 血、毒物和异物会直接改变为急症路径。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 有血: red
      - 可能误食毒物/人药: red
      - 可能吞绳线/异物: red
      - 只是毛球且状态正常: 支持 green
    answer_options:
      - label: 有血或咖啡渣样
        risk: red
        red_flag_id: vom_rf_blood
      - label: 可能吃了药、植物、巧克力、洋葱等
        risk: red
        red_flag_id: vom_rf_toxin_foreign
      - label: 可能吞了线、塑料、橡皮筋、异物
        risk: red
        red_flag_id: vom_rf_toxin_foreign
      - label: 像毛球,没有其它异常
        risk: green_or_yellow
      - label: 都没有/不确定
        risk: unknown
    source_claim_ids: [vom_005, vom_008, vom_009]
  - id: vom_q_state
    ask: 现在精神、食欲、喝水、排尿排便怎么样?有没有腹痛、趴着不动或脱水?
    why: 系统性状态决定是否可观察。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 精神食欲正常: 支持 green
      - 不吃/虚弱/脱水/腹痛: yellow_or_red
      - 不排尿或尿不出: 转尿闭红档
    source_claim_ids: [vom_005, vom_006, vom_007]

severity_scale:
  mild:
    definition: 偶发 1 次或低频毛球样呕吐,精神食欲饮水排泄正常,无血/腹痛/误食。
    likely_tier: green
    action: 观察 12-24 小时,少量多次饮水和恢复进食,给升级条件。
  moderate:
    definition: 短期反复呕吐、轻度食欲下降、同时软便,但无血、无异物毒物、无明显虚弱。
    likely_tier: yellow
    action: 联系兽医或 24 小时内门诊。
  severe:
    definition: 连续/频繁呕吐、带血、精神差、脱水、腹痛、误食毒物或线状异物。
    likely_tier: red
    action: 急诊或立即联系兽医。

tier_rules:
  red:
    if_any:
      - vom_rf_blood matched
      - vom_rf_toxin_foreign matched
      - continuous_vomiting and weak_or_dehydrated
      - severe_abdominal_pain
      - breathing_abnormal
    action: 停止常规追问,建议立刻急诊或转误食急症路径。
  yellow:
    if_any:
      - vomiting_count_today >= 2
      - vomiting_persistent_days >= 1
      - appetite_down
      - diarrhea_or_constipation
      - kitten_or_senior_or_chronic_disease
    action: 尽快联系兽医,通常不建议继续观察超过当天。
  green:
    only_if_all:
      - single_or_rare_episode
      - appetite_normal
      - energy_normal
      - drinking_normal
      - stool_urine_normal
      - no_blood
      - no_toxin_or_foreign_body_exposure
      - no_red_flags
    action: 短期观察并给升级条件。
  unknown:
    default: 不能排除误食、血或频繁呕吐时按 yellow_or_red 保守处理。

host_risk_profile:
  lower_risk_features:
    - 成年健康猫
    - 呕吐后恢复正常
    - 正常饮水排尿排便
    - 无误食/异物接触
  higher_risk_features:
    - 幼猫或老年猫
    - 已知肾病、糖尿病、甲亢、心脏病等慢病
    - 不吃、虚弱、脱水、腹痛
    - 可能吞了线状物或毒物
  risk_modifier_rules:
    - if: higher_risk_features_count >= 1 and vomiting_repeated
      effect: green_to_yellow_or_red
    - if: toxin_or_string_possible
      effect: immediate_red

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
        - 是否能排除毒物/异物/血
        - 是否会改变 red/yellow/green
        - 是否能判断观察窗口
  uncertainty_policy:
    if_user_cannot_answer: 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 记录次数、时间、呕吐物照片
      applies_to: all_tiers
      source_claim_ids: [vom_003]
    - action: 低风险且停止呕吐后少量多次提供水和易消化食物
      applies_to: green
      source_claim_ids: [vom_010]
    - action: 保留可疑包装、植物或异物照片
      applies_to: toxin_or_foreign_possible
      source_claim_ids: [vom_008, vom_009]
  forbidden:
    - action: 自行催吐
      reason: 毒物和异物处理需要专业判断
      source_claim_ids: [vom_008, vom_009]
    - action: 自行给人用止吐药、胃药、止痛药
      reason: 猫用药风险高且可能掩盖病情
      source_claim_ids: [vom_011, vom_013]
    - action: 拉扯线状物
      reason: 线状异物可能造成肠道损伤
      source_claim_ids: [vom_009]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - antiemetics
    - fluid_therapy
    - gastrointestinal_diet
  user_safe_message: 频繁或严重呕吐有时需要止吐药、补液或检查病因,但具体药和剂量必须由兽医决定。

response_style:
  must_say:
    - 我先帮你判断要不要急
    - 呕吐只是症状,原因需要结合检查
    - 如果有误食或线状物,不要等症状
  avoid_terms:
    - 肠胃炎
    - 毛球症
    - 吃坏了
  forbidden_phrases:
    - 先吃人用胃药
    - 先催吐
    - 拉出来就好了
    - 肯定只是毛球

source_claim_ids:
  - vom_001
  - vom_002
  - vom_003
  - vom_004
  - vom_005
  - vom_006
  - vom_007
  - vom_008
  - vom_009
  - vom_010
  - vom_011
  - vom_012
  - vom_013
```
