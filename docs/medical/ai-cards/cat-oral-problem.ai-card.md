# AI 分诊知识卡:猫口腔问题

```yaml
condition_id: cat_oral_problem
source_document: docs/medical/source/cat-oral-problem.source.md
status: draft
entry_symptoms:
  - 口臭
  - 流口水
  - 单边咀嚼偏头吃
  - 拒食硬粮
  - 嘴里红肿出血溃疡
  - 牙齿松动掉牙
  - 抚摸嘴巴抗拒
user_synonyms:
  - 嘴臭
  - 口水多
  - 滴口水
  - 歪头吃饭
  - 不啃硬粮
  - 牙龈红肿
  - 牙出血
  - 牙松了
  - 掉牙
  - 嘴里有溃疡
  - 舌头底下有线
  - 咬电线了
  - 下巴有包
  - 不让碰嘴

ai_task:
  primary_goal: 把口腔问题当作高度被低估的入口,先排舌下线异物、口腔灼伤、气道风险肿块、可疑肿瘤和未排除狂犬病的流口水等急症,再把典型牙病导向兽医镇静下完整检查。
  never_do:
    - 不诊断或点名具体疾病,只判断风险和下一步是否就医
    - 不因为“只是口臭”或“看着没事”就判定没问题
    - 不推荐人用止痛药、抗生素、镇静药,也不给任何剂量
    - 不让舌下线异物、口腔灼伤、气道风险肿块、可疑肿瘤或未排除狂犬病的流口水在家观察
    - 不建议自己拔牙、自己刮牙结石或用人牙膏

questioning_boundary:
  goal: 第一轮排除舌下/口内线异物、口腔灼伤、颌下肿块(气道风险)、可疑肿瘤、未排除狂犬病的流口水和完全拒食。
  ask_style: 口腔入口用组合问题快速收敛;命中硬急症立即评估,不追问到诊断确定。
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
      - 主要表现是口臭/流口水/偏头咀嚼还是溃疡出血
      - 是否看到舌下或口内卡着线/绳
      - 是否刚咬电线、接触化学品或烫水
      - 是否有颌下/咽喉肿块、面部肿胀、吞咽或呼吸困难
      - 是否完全拒食或接近食物又嘶叫跑开
      - 是否大量流口水,疫苗是否完整、有无流浪动物撕咬接触史
      - 年龄、慢病(肾病/糖尿病/FIV/FeLV)、是否换牙期
  stop_and_assess_when:
    - 看到舌下/口内线异物
    - 刚咬电线/接触化学品/烫水
    - 颌下肿块伴吞咽困难或呼吸费力
    - 口内不愈合、易出血肿物或面部肿胀
    - 大量流口水且未免疫加撕咬接触史
    - 完全无法进食或接近-躲避反应
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 用户只说“口臭/流口水”但未说明进食、肿块和接触史
    - 年龄/慢病/换牙期信息会改变观察窗口
    - 需要区分典型牙病(yellow)与幼猫换牙(green)

red_flags:
  - id: oral_rf_string
    user_signal: 舌头底下或嘴里卡着线、绳、丝带
    action: immediate_vet
    stop_questioning: true
    source_claim_ids: [oral_010]
  - id: oral_rf_burn
    user_signal: 刚咬电线、接触化学品或烫水后嘴痛、流口水、口腔红肿溃烂
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [oral_011]
  - id: oral_rf_mass_airway
    user_signal: 颌下或咽喉有肿块,伴吞咽困难或呼吸费力
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [oral_012, oral_021, emg_001]
  - id: oral_rf_tumor
    user_signal: 口腔内不愈合、易出血或溃烂的肿物,面部肿胀
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [oral_013]
  - id: oral_rf_rabies
    user_signal: 突发大量流口水,且未免疫或近期有流浪动物/猫撕咬接触史
    action: immediate_vet
    stop_questioning: true
    source_claim_ids: [oral_014]
  - id: oral_rf_cannot_eat
    user_signal: 看着食物哆嗦、接近又嘶叫跑开、完全无法进食
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [oral_007, oral_006]
  - id: oral_rf_collapse_breath
    user_signal: 同时叫不醒、瘫软或呼吸困难、牙龈发白发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [emg_001, emg_006, emg_009]

triage_questions:
  - id: oral_q_main_sign
    ask: 它现在最主要的表现是什么?口臭/少量流口水,还是明显流口水加单边咀嚼,还是嘴里能看到红肿溃疡出血,还是看着食物哆嗦、靠近又嘶叫跑开完全不吃?
    why: 主要表现区分典型牙病和进食极度疼痛的严重情况。
    priority: 1
    multi_select: false
    changes_decision_by:
      - 看食物哆嗦/接近又躲开/完全拒食: red
      - 嘴里溃疡红肿出血: red_or_high_yellow
      - 明显流口水加单边咀嚼: yellow
      - 只有轻微口臭: 支持 green_or_yellow
    source_claim_ids: [oral_004, oral_007]
  - id: oral_q_emergency
    ask: 有没有这些情况?舌头底下或嘴里卡着线/绳;刚咬过电线或接触化学品/烫水;下巴或咽喉摸到肿块、吞咽或呼吸费力;嘴里有不愈合、易出血的肿物。
    why: 线异物、灼伤、气道风险肿块和可疑肿瘤是口腔入口的硬急症。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 舌下/口内线异物: red
      - 咬电线/化学/烫水: red
      - 肿块伴吞咽或呼吸困难: red
      - 不愈合易出血肿物: red
      - 都没有: 继续判断流口水与宿主风险
    source_claim_ids: [oral_010, oral_011, oral_012, oral_013, oral_021]
  - id: oral_q_drool_host
    ask: 它有没有突然大量流口水?疫苗打全了吗、最近有没有被流浪猫或别的动物咬过?另外它多大、有没有肾病/糖尿病等慢性病,是不是正在换牙?
    why: 流口水需先排除狂犬病;年龄、慢病和换牙期决定观察窗口。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 大量流口水且未免疫加撕咬接触史: red
      - 老年或慢病猫: 保守升级
      - 幼猫换牙期牙龈微红渗血且无其它: 支持 green
    source_claim_ids: [oral_014, oral_005, oral_016, oral_020]

severity_scale:
  mild:
    definition: 轻微口臭或幼猫换牙期牙龈发红、少量渗血,仍正常吃喝、精神正常,无流口水/肿块/线异物/灼伤接触史。
    likely_tier: green
    action: 开始定期口腔检查和训练每日刷牙,记录口臭、流口水和食量变化;出现升级条件立即转黄/红。
  moderate:
    definition: 口臭加重、流口水、吃饭偏头或单边咀嚼、拒食硬粮、牙龈红肿出血或牙松动,但无硬红旗。
    likely_tier: yellow
    action: 约门诊,由兽医在镇静下做完整口腔检查 + 牙片 + 排除全身病。
  severe:
    definition: 舌下线异物、口腔灼伤、颌下肿块(气道风险)、可疑肿瘤、未排除狂犬病的流口水或完全拒食/接近-躲避。
    likely_tier: red
    action: 急诊或立即联系兽医。

tier_rules:
  red:
    if_any:
      - oral_rf_string matched
      - oral_rf_burn matched
      - oral_rf_mass_airway matched
      - oral_rf_tumor matched
      - oral_rf_rabies matched
      - oral_rf_collapse_breath matched
      - complete_food_refusal_or_approach_avoidance
    action: 停止常规问诊,建议急诊或立即联系兽医,只给立刻就医和路上安全处理。
  yellow:
    if_any:
      - halitosis_worsening
      - drooling_without_red_flags
      - chewing_one_side_or_head_tilt_eating
      - refuses_dry_food
      - gum_redness_swelling_or_bleeding
      - loose_tooth_or_tooth_loss
      - senior_or_chronic_disease
    action: 约门诊,由兽医镇静下完整检查、牙片并排除全身病。
  green:
    only_if_all:
      - only_mild_halitosis_or_kitten_teething
      - eating_and_drinking_normal
      - no_string_foreign_body
      - no_oral_burn_exposure
      - no_submandibular_or_throat_mass
      - no_ulcerated_or_bleeding_mass
      - no_excessive_drooling_with_rabies_risk
      - adult_healthy_low_risk_or_normal_teething
    action: 开始定期口腔检查与训练刷牙,明确升级条件。
  unknown:
    default: 口腔信息不足时至少 yellow;不能确认是否有线异物/灼伤/肿块/流口水接触史时保守升级。

host_risk_profile:
  lower_risk_features:
    - 成年免疫完整
    - 无慢病
    - 只是轻度口臭或幼猫换牙
    - 仍正常吃喝、精神正常
    - 无流口水、无肿块、无线异物、无灼伤接触史
  higher_risk_features:
    - 老年猫尤其 10 岁以上
    - 慢病猫:肾病、糖尿病、FIV/FeLV 感染者
    - 幼猫换牙期咬电线或误碰化学品/烫水
    - 户外猫、多猫家庭打架致嘴部外伤
    - 未免疫或有流浪动物撕咬接触史
    - 完全拒食、明显消瘦、流口水带血
  risk_modifier_rules:
    - if: unvaccinated_and_excessive_drooling_with_bite_exposure
      effect: green_to_red
    - if: senior_or_chronic_disease and oral_signs
      effect: green_to_yellow
    - if: any_hard_red_flag
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
        - 主要表现是口臭/流口水还是溃疡出血
        - 是否有线异物/灼伤/肿块/可疑肿瘤
        - 流口水与疫苗及撕咬接触史
        - 年龄、慢病、是否换牙期
  uncertainty_policy:
    if_user_cannot_answer: 按 yellow_or_red 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 记录口臭、流口水、食量、单边咀嚼、牙龈颜色和体重变化,能安全拍照/拍视频就拍
      applies_to: all_tiers
      source_claim_ids: [oral_004, oral_008]
    - action: 改喂软食或温水泡软减轻进食疼痛,先维持进食和饮水
      applies_to: yellow_or_unclear
      source_claim_ids: [oral_004, oral_006]
    - action: 怀疑狂犬病暴露时先隔离、做好防护并尽快就医
      applies_to: rabies_risk
      source_claim_ids: [oral_014]
    - action: 用专为猫设计的牙刷牙膏开始训练每日刷牙
      applies_to: green
      source_claim_ids: [oral_009, oral_018]
  forbidden:
    - action: 用人牙膏或人漱口水
      reason: 人用产品对猫有毒
      source_claim_ids: [oral_009]
    - action: 看到舌下或口内的线/绳自行拉出
      reason: 线性异物拉扯会造成严重内部损伤,需兽医处理
      source_claim_ids: [oral_010]
    - action: 自己用金属器械刮牙结石或自己给猫拔牙
      reason: 会伤到猫、留下划痕加速菌斑,正规牙科需全麻
      source_claim_ids: [oral_017]
    - action: 用手强行扒开疼痛的猫的嘴检查或挤压颌下肿块
      reason: 加重恐惧、自伤或被抓咬,肿块需兽医穿刺鉴别
      source_claim_ids: [oral_008, oral_021]
    - action: 给人用止痛药、抗生素或镇静药
      reason: 药物风险高且会掩盖病情
      source_claim_ids: [oral_019]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - cat_specific_toothpaste
    - antibiotics
    - pain_control
    - anti_inflammatory_or_immunomodulator
    - dental_home_care_products
  user_safe_message: 口腔问题的原因很多,药不能先试,人牙膏更是绝对不能用;严重牙龈口炎等可能需要兽医在麻醉下检查后处理。是否用药、用哪种,要由兽医判断,我不会给剂量。

response_style:
  must_say:
    - 猫很会藏口腔疼痛,看着没事不等于真没事
    - 口腔问题需要兽医在镇静或麻醉下完整检查加牙片
    - 看到舌下有线、咬电线、下巴肿块或不愈合肿物要立刻就医
  avoid_terms:
    - 上火
    - 没事过两天就好
    - 忍忍
  forbidden_phrases:
    - 用人牙膏
    - 自己给猫拔牙
    - 啃硬粮自然清洁就行
    - 只是口臭不用管
    - 看到嘴里的线拉出来

source_claim_ids:
  - oral_001
  - oral_002
  - oral_003
  - oral_004
  - oral_005
  - oral_006
  - oral_007
  - oral_008
  - oral_009
  - oral_010
  - oral_011
  - oral_012
  - oral_013
  - oral_014
  - oral_015
  - oral_016
  - oral_017
  - oral_018
  - oral_019
  - oral_020
  - oral_021
  - emg_001
  - emg_006
  - emg_009
```
