# AI 分诊知识卡:猫出血 / 看到血

```yaml
condition_id: cat_bleeding
source_document: docs/medical/source/cat-bleeding.source.md
status: draft
entry_symptoms:
  - 出血
  - 看到血
  - 流血
  - 吐血
  - 便血
  - 鼻血
  - 伤口
user_synonyms:
  - 黑便
  - 咖啡渣样
  - 牙龈白
  - 指甲流血
  - 被咬了
  - 鼠药
  - 止不住血

ai_task:
  primary_goal: 快速判断血从哪里来、是否止得住、是否有休克/内出血/中毒风险,并给安全就医前处理。
  never_do:
    - 不把血迹直接安慰为小事
    - 不推荐人用止血药、止痛药、抗生素、维生素 K 或剂量
    - 不让止不住出血、苍白牙龈、虚弱、呼吸快或鼠药风险在家观察
    - 不建议拔出深插异物或向鼻孔塞东西

questioning_boundary:
  goal: 第一轮判断止不止得住、有没有休克/呼吸异常、血的来源和是否外伤/鼠药。
  ask_style: 先问组合红旗;命中止不住/苍白牙龈/虚弱/呼吸快/鼠药/深异物即评估。
  max_rounds_before_assessment: 2
  minimum_context_for_assessment:
    universal:
      - 年龄阶段
      - 症状持续多久
      - 精神状态
      - 呼吸是否异常
      - 是否命中通用红旗
    condition_specific:
      - 血从哪里来
      - 出血量和是否仍在流
      - 持续按压后是否停止
      - 牙龈颜色、呼吸、虚弱/瘫软
      - 是否外伤、坠落、打架、咬伤或深插异物
      - 是否可能接触鼠药/抗凝剂
  stop_and_assess_when:
    - 按压 10-15 分钟仍止不住
    - 牙龈苍白/白、呼吸快、虚弱或瘫软
    - 怀疑内部出血、深插异物或胸腹突出物
    - 呕血/咖啡渣样/黑便伴状态差
    - 怀疑鼠药或多处出血
    - 已能区分 red/yellow/green
  continue_asking_when:
    - 出血来源不清且用户能马上补充
    - 需要判断按压是否有效
    - 需要区分鼻血吞咽与原发消化道出血

red_flags:
  - id: bld_rf_uncontrolled
    user_signal: 持续按压 10-15 分钟仍止不住、大量出血、喷血
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bld_003, bld_004, emg_004]
  - id: bld_rf_shock
    user_signal: 牙龈苍白/白、呼吸快、虚弱、瘫软、叫不醒
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bld_002, emg_006, emg_009]
  - id: bld_rf_internal
    user_signal: 被车撞/高处坠落/腹部膨大/无明显外伤但虚弱,怀疑内部出血
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bld_001, bld_006]
  - id: bld_rf_gi
    user_signal: 呕血、咖啡渣样呕吐、黑色柏油样便、便血伴精神差
    action: urgent_vet_or_er
    stop_questioning: false
    source_claim_ids: [bld_012, emg_003]
  - id: bld_rf_toxin
    user_signal: 可能接触鼠药/抗凝剂,或多处出血/瘀斑
    action: immediate_er_or_toxin_path
    stop_questioning: true
    source_claim_ids: [bld_010, bld_011, emg_008]
  - id: bld_rf_object
    user_signal: 深插异物或胸腹部有突出物
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [bld_005]

triage_questions:
  - id: bld_q_control_shock
    ask: 血现在还在流吗?用干净纱布/布持续按压后能止住吗?牙龈是粉红还是发白,呼吸和精神怎么样?
    why: 止不住出血和休克信号决定是否立即急诊。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 按压 10-15 分钟仍止不住: red
      - 牙龈白/呼吸快/虚弱: red
      - 已停止且状态正常: green_or_yellow
    source_claim_ids: [bld_002, bld_003, bld_004]
  - id: bld_q_location
    ask: 血是从伤口、鼻子、嘴巴/呕吐物、便便、尿里,还是其它地方来的?
    why: 不同来源对应不同急症路径。
    priority: 2
    multi_select: false
    changes_decision_by:
      - 呕血/咖啡渣样/黑便: red_or_yellow
      - 鼻血不止或呼吸异常: red
      - 尿血: 转泌尿路径并排尿闭
      - 小伤口已止住: green_or_yellow
    source_claim_ids: [bld_007, bld_008, bld_012]
  - id: bld_q_trauma_toxin
    ask: 有没有打架咬伤、摔伤车撞、深插异物,或可能吃到鼠药/不明药物?
    why: 内出血、深部伤和抗凝鼠药都不能在家处理。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 外伤/深插异物: red
      - 鼠药/抗凝剂可能: red
      - 都没有: 结合出血来源继续分级
    source_claim_ids: [bld_005, bld_006, bld_010, bld_011]

severity_scale:
  mild:
    definition: 指甲或浅表小伤少量出血,直接按压后 5-10 分钟停止,牙龈粉红、呼吸精神正常。
    likely_tier: green
    action: 观察伤口、防舔咬,给止不住/肿胀/精神差升级条件。
  moderate:
    definition: 小到中等开放伤、鼻血已止、少量便血/尿血但精神尚可,无休克和呼吸异常。
    likely_tier: yellow
    action: 当天联系兽医或门诊。
  severe:
    definition: 止不住、大量、苍白牙龈、虚弱/呼吸快、内出血风险、呕血黑便、鼠药或深插异物。
    likely_tier: red
    action: 立即急诊。

tier_rules:
  red:
    if_any:
      - bld_rf_uncontrolled matched
      - bld_rf_shock matched
      - bld_rf_internal matched
      - bld_rf_toxin matched
      - bld_rf_object matched
      - nosebleed_with_breathing_difficulty
    action: 停止常规追问,建议立即急诊;外部出血路上持续按压。
  yellow:
    if_any:
      - open_wound_not_severe
      - nosebleed_stopped_but_unknown_cause
      - small_blood_in_stool_or_urine_without_red_flags
      - bite_wound_or_fight_history
    action: 当天联系兽医或门诊。
  green:
    only_if_all:
      - bleeding_small_and_external
      - stopped_with_pressure
      - gums_pink
      - breathing_normal
      - energy_normal
      - no_trauma_toxin_deep_wound
    action: 短期观察,防舔咬,出现升级条件立刻就医。
  unknown:
    default: 不能确定来源、量或是否止住时按 yellow_or_red。

host_risk_profile:
  lower_risk_features:
    - 成年健康猫
    - 出血点明确且浅表
    - 已经止住
    - 牙龈粉红、呼吸精神正常
  higher_risk_features:
    - 幼猫、老年猫、慢病猫或正在用药
    - 外伤、坠落、车祸、打架咬伤
    - 可能接触鼠药或抗凝剂
    - 苍白牙龈、虚弱、呼吸快、多个部位出血
  risk_modifier_rules:
    - if: uncontrolled_bleeding_or_shock
      effect: immediate_red
    - if: rodenticide_possible
      effect: immediate_red_or_toxin_path

analysis_policy:
  if_context_sufficient:
    output:
      - 当前风险档
      - 判断依据
      - 现在该做什么
      - 就医前安全处理
      - 还不能确定的部分
  if_context_insufficient:
    ask_next:
      select_questions_by:
        - 是否止得住
        - 牙龈/呼吸/精神
        - 血的来源
        - 外伤/鼠药/深插异物
  uncertainty_policy:
    if_user_cannot_answer: 按更高风险处理
    if_conflicting_answers: 建议立刻联系兽医

home_care:
  allowed:
    - action: 外部出血用干净纱布/布持续直接按压
      applies_to: external_bleeding
      source_claim_ids: [bld_003, bld_004]
    - action: 小指甲/爪部出血可用止血粉;没有时临时用玉米淀粉/面粉辅助
      applies_to: minor_nail_bleeding
      source_claim_ids: [bld_003]
    - action: 鼻血保持安静,隔布冷敷鼻梁,观察呼吸
      applies_to: nosebleed_without_breathing_distress
      source_claim_ids: [bld_007]
    - action: 防止舔咬伤口,必要时伊丽莎白圈
      applies_to: open_wound
      source_claim_ids: [bld_009]
  forbidden:
    - action: 拔出深插异物或胸腹突出物
      reason: 可能加重出血和组织损伤
      source_claim_ids: [bld_005]
    - action: 往鼻孔塞棉签、纸巾或棉球
      reason: 鼻血处理不应填塞鼻孔
      source_claim_ids: [bld_007]
    - action: 用酒精、双氧水、肥皂、洗发水、草本、茶树油或药膏处理开放伤
      reason: 可能刺激伤口或延误处理
      source_claim_ids: [bld_009]
    - action: 自行喂维生素 K、止血药、人用止痛药或抗生素
      reason: 鼠药和伤口用药需要兽医判断
      source_claim_ids: [bld_011, bld_013]

medicine_policy:
  status: emergency_restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - styptic_powder
    - vitamin_k1
    - antibiotics
    - analgesics
    - fluid_or_transfusion_support
  user_safe_message: 止不住、牙龈发白、虚弱或怀疑鼠药时不要靠药试;外部出血先持续按压并立刻去急诊。

response_style:
  must_say:
    - 我先判断是不是止不住或有失血风险
    - 外部出血先持续按压,不要反复揭开
    - 牙龈发白、呼吸快或虚弱要急诊
  avoid_terms:
    - 一点血没事
    - 吃点止血药
    - 自己处理伤口就行
  forbidden_phrases:
    - 拔出来看看
    - 鼻孔塞住
    - 喂维生素 K
    - 用双氧水消毒

source_claim_ids:
  - bld_001
  - bld_002
  - bld_003
  - bld_004
  - bld_005
  - bld_006
  - bld_007
  - bld_008
  - bld_009
  - bld_010
  - bld_011
  - bld_012
  - bld_013
```
