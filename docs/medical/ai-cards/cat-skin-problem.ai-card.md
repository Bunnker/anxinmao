# AI 分诊知识卡:猫皮肤问题 / 猫癣

```yaml
condition_id: cat_skin_problem
source_document: docs/medical/source/cat-skin-problem.source.md
status: draft
entry_symptoms:
  - 皮肤痒
  - 掉毛
  - 脱毛
  - 皮屑
  - 结痂
  - 红肿
  - 圆形脱毛区
  - 过度抓挠舔毛
user_synonyms:
  - 一块一块掉毛
  - 秃了一块
  - 圆圈秃
  - 老是挠
  - 一直舔毛
  - 起皮屑
  - 长痂
  - 皮肤发红
  - 黑色小颗粒
  - 我自己身上也起了红圈

ai_task:
  primary_goal: 把皮肤问题当作慢病/专科风险入口,先排严重继发感染、伴全身症状、外伤化脓和疑似跳蚤的极度虚弱幼猫等红旗,再把典型皮肤病导向兽医确诊,并一开始就讲清猫癣会传染给人。
  never_do:
    - 不点名诊断是不是猫癣或哪种皮肤病,只判断风险和下一步
    - 不替用户判断“看着像癣就是癣、自己抹点药就行”
    - 不推荐具体药膏、灭蚤产品、抗生素或抗真菌商品名,不显示任何剂量
    - 不建议用人用抗真菌药,不建议自行剃毛
    - 不把“等它自己好”当作合理选项
    - 不让多发开放性溃疡流脓、皮肤问题伴萎靡不吃发热、外伤化脓或疑似跳蚤的极度虚弱幼猫在家观察

questioning_boundary:
  goal: 第一轮排除多发开放性溃疡/严重继发感染、皮肤问题伴全身症状、外伤化脓、疑似跳蚤的极度虚弱幼猫,并确认家人/其它宠物是否出现红痒圈。
  ask_style: 皮肤问题入口用组合问题快速收敛主要表现、人畜共患暴露和全身状况;命中红旗立即评估,不要追问到诊断确定。
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
      - 主要表现(局部脱毛皮屑 / 全身痒 / 有伤口 / 仅毛糙皮屑)
      - 是否有开放性溃疡、流脓、红肿热痛
      - 家人或其它宠物皮肤是否出现红痒圈
      - 是否见跳蚤或黑色蚤粪、是否剧烈抓挠尾背
      - 是否伴萎靡、不吃、发热感
      - 年龄、疫苗、是否长毛、是否新到家/多猫环境
  stop_and_assess_when:
    - 多发开放性溃疡、流脓、皮肤红肿热痛
    - 皮肤问题同时伴萎靡、不吃或发热感
    - 咬伤/外伤后皮肤化脓
    - 疑似跳蚤且幼猫极度虚弱、牙龈苍白
    - 皮肤问题之外还出现塌陷或呼吸异常
    - 已能区分 red/yellow/green
    - 已问满 3 轮仍不清楚
  continue_asking_when:
    - 用户只说“掉毛/痒”但未说明部位、是否破溃、是否伴全身症状
    - 家人/其它宠物是否出现红痒圈尚不清楚
    - 年龄/免疫/毛长/新到家/多猫环境信息会改变观察窗口

red_flags:
  - id: skin_rf_severe_infection
    user_signal: 多发开放性溃疡、流脓、皮肤红肿热痛
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [skin_010, skin_015]
  - id: skin_rf_systemic
    user_signal: 皮肤问题同时伴萎靡、不吃或发热感
    action: urgent_vet_or_er
    stop_questioning: true
    source_claim_ids: [skin_004, skin_017]
  - id: skin_rf_wound_pus
    user_signal: 咬伤或外伤后皮肤化脓、红肿热痛
    action: urgent_vet
    stop_questioning: false
    source_claim_ids: [skin_015]
  - id: skin_rf_kitten_flea_weak
    user_signal: 疑似跳蚤且幼猫极度虚弱、牙龈苍白
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [skin_014, emg_009]
  - id: skin_rf_collapse
    user_signal: 皮肤问题之外还出现叫不醒、瘫软、不能站立
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [emg_006]
  - id: skin_rf_breathing
    user_signal: 皮肤问题之外还出现张口喘、呼吸费力、舌头/牙龈发蓝发紫
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [skin_017, emg_001]

triage_questions:
  - id: skin_q_pattern_severity
    ask: 它主要是什么样?是局部一块脱毛带皮屑、全身都在痒、有伤口,还是只是毛糙起皮屑?有没有破溃、流脓、红肿热痛?
    why: 主要表现和是否破溃流脓决定走向,开放性溃疡/严重感染是皮肤入口的红旗。
    priority: 1
    multi_select: true
    changes_decision_by:
      - 多发开放性溃疡/流脓/红肿热痛: red
      - 典型圆形脱毛/断毛/皮屑结痂: yellow
      - 仅轻微毛糙皮屑: 支持 green
      - 有伤口: 继续判断是否化脓和全身症状
    source_claim_ids: [skin_008, skin_010, skin_021]
  - id: skin_q_human_contact_flea
    ask: 家里人或其它宠物皮肤有没有出现红痒圈、脱皮?有没有看到跳蚤或毛根黑色小颗粒,它是不是拼命挠尾巴和背?
    why: 家人出现红痒圈强提示真菌癣(人畜共患),跳蚤/蚤粪指向蚤过敏。
    priority: 2
    multi_select: true
    changes_decision_by:
      - 家人/其它宠物出现红痒圈: 强提示真菌、家人去皮肤科并保守升级
      - 见跳蚤或黑色蚤粪+剧烈抓挠尾背: yellow,幼猫极度虚弱则 red
      - 都没有: 支持按表现和时长判断
    source_claim_ids: [skin_003, skin_014, skin_015]
  - id: skin_q_systemic_host
    ask: 它精神、食欲怎么样,有没有萎靡、不吃、发热感或呼吸不对?它多大、疫苗完整吗、是不是长毛或新到家/多猫环境?
    why: 伴全身症状要升级,年龄/免疫/毛长/环境会缩短观察窗口。
    priority: 3
    multi_select: true
    changes_decision_by:
      - 伴萎靡/不吃/发热感: red
      - 呼吸异常: red
      - 幼猫/长毛/未免疫/新到家或多猫环境: 保守升级、缩短观察窗口
      - 成年免疫完整且无全身症状: 支持 green_or_yellow
    source_claim_ids: [skin_004, skin_009, skin_017]

severity_scale:
  mild:
    definition: 仅轻微毛糙、皮屑,局部小范围,无破溃流脓,精神食欲正常,家中没有人或其它宠物出现红痒圈。
    likely_tier: green
    action: 短期观察并查饮食/洗澡频率/季节性;扩大、破溃、家人出现红痒圈或伴全身症状立即转黄/红。
  moderate:
    definition: 典型皮肤病表现(圆形脱毛、断毛、皮屑结痂、持续抓挠舔毛)或疑似跳蚤/过敏,无红旗。
    likely_tier: yellow
    action: 去兽医做真菌培养/镜检确诊,不做家庭短期自治,环境清洁隔离;家人有红痒圈则去人医皮肤科。
  severe:
    definition: 多发开放性溃疡/流脓/红肿热痛,或皮肤问题伴萎靡不吃发热,或外伤化脓,或疑似跳蚤的极度虚弱幼猫。
    likely_tier: red
    action: 立即就医或急诊。

tier_rules:
  red:
    if_any:
      - skin_rf_severe_infection matched
      - skin_rf_systemic matched
      - skin_rf_kitten_flea_weak matched
      - skin_rf_collapse matched
      - skin_rf_breathing matched
      - wound_with_pus
    action: 停止常规问诊,建议立即就医或急诊。
  yellow:
    if_any:
      - typical_ringworm_or_skin_disease_pattern
      - circular_hair_loss_or_scaling_crusting
      - persistent_scratching_or_overgrooming
      - suspected_flea_or_allergy_without_red_flags
      - human_or_other_pet_has_itchy_ring
      - kitten_or_longhair_or_unvaccinated_or_multicat
    action: 去兽医确诊(真菌培养/镜检),明确反对家庭短期自治,环境清洁隔离。
  green:
    only_if_all:
      - only_mild_dull_coat_or_dandruff
      - no_ulcer_pus_or_inflammation
      - appetite_and_energy_normal
      - breathing_normal
      - no_human_or_pet_itchy_ring
      - no_obvious_flea_or_parasite
      - adult_vaccinated_low_risk
    action: 短期观察并查饮食/洗澡频率/季节性,明确升级条件。
  unknown:
    default: 皮肤问题信息不足时至少 yellow;不能确认是否破溃、是否伴全身症状或家人是否出现红痒圈时保守升级。

host_risk_profile:
  lower_risk_features:
    - 成年免疫完整
    - 无慢病、营养良好
    - 皮肤问题局部轻微、无破溃流脓
    - 精神食欲呼吸正常
    - 家中没有人或其它宠物出现红痒圈
  higher_risk_features:
    - 幼猫,免疫尚未发育成熟,最易感猫癣也最怕跳蚤致贫血
    - 长毛猫,感染更持久、易泛发
    - 未免疫或疫苗不完整
    - 新到家、救助、收容所、多猫家庭或繁育猫舍
    - 免疫差、营养差、应激中、有慢病或正在用药
    - 家中有儿童、老人或免疫低人群
  risk_modifier_rules:
    - if: kitten_and_suspected_flea_and_severe_weakness
      effect: green_to_red
    - if: skin_problem_with_systemic_signs
      effect: green_to_red_or_high_yellow
    - if: kitten_or_longhair_or_unvaccinated_or_multicat
      effect: shorten_observation_window
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
        - 主要表现和是否破溃流脓
        - 家人/其它宠物是否出现红痒圈、是否见跳蚤
        - 是否伴全身症状
        - 年龄疫苗毛长和新到家/多猫环境
  uncertainty_policy:
    if_user_cannot_answer: 按 yellow_or_red 保守处理
    if_conflicting_answers: 解释不确定性并建议更高一级处理

home_care:
  allowed:
    - action: 记录皮损开始时间、部位、是否扩大、有无破溃流脓、抓挠舔毛频率和精神食欲变化,能安全拍清晰照片就拍
      applies_to: all_tiers
      source_claim_ids: [skin_008, skin_021]
    - action: 怀疑传染性皮肤病时把患猫与其它猫、与儿童/老人/免疫低人群适度隔离,接触后洗手
      applies_to: yellow_or_unclear
      source_claim_ids: [skin_003, skin_013]
    - action: 猫接触的床品/玩具/猫窝热水洗烘干或更换,梳子/指甲剪/食盆水盆单独使用并消毒,提醒猫不可直接接触消毒剂、清洁后通风
      applies_to: yellow
      source_claim_ids: [skin_013]
    - action: 提醒家人若皮肤出现红痒圈/脱皮去人医皮肤科而不是兽医
      applies_to: yellow_or_unclear
      source_claim_ids: [skin_003]
  forbidden:
    - action: 自己买药膏(如克霉唑等)给猫乱涂
      reason: 未确诊可能用错药、治疗不彻底反复,并掩盖病情
      source_claim_ids: [skin_019]
    - action: 给猫用人用抗真菌药
      reason: 浓度剂型未必适合猫,误食可能中毒
      source_claim_ids: [skin_019]
    - action: 把“等它自己好”当作合理选项
      reason: 猫癣不治可能 9 个月到 1 年才自愈,期间持续掉毛、皮肤暴露、家人持续暴露、环境孢子持续散播
      source_claim_ids: [skin_004]
    - action: 因为掉毛就自行给猫剃毛
      reason: 是否剃毛由兽医决定
      source_claim_ids: [skin_012]

medicine_policy:
  status: restricted
  ai_can_mention_categories: true
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - topical_antifungal
    - oral_antifungal
    - flea_control
    - antibiotics
    - environmental_disinfection
  user_safe_message: 皮肤问题看着都很像,但猫癣、跳蚤过敏、过敏、寄生虫要靠兽医做真菌培养/镜检才能分清,不能凭看着像就自己买药膏抹;猫癣会传染给人,家人若也长红痒圈要去皮肤科。需要哪种抗真菌或灭蚤治疗、用多少,都要兽医按确诊和国内可得情况决定。

response_style:
  must_say:
    - 皮肤问题先看有没有破溃流脓、化脓或伴全身症状这些急症信号
    - 看着像不等于就是,要兽医做真菌培养/镜检才能分清
    - 猫癣会传染给人和狗,家人若也长红痒圈要去人医皮肤科
    - 规范治疗通常要 6 周以上,家庭短期自治在医学上是错的
  avoid_terms:
    - 一看就是癣
    - 抹点药就好
    - 小问题
  forbidden_phrases:
    - 自己买药膏抹一下
    - 两天 20 元搞定
    - 用人用抗真菌药
    - 等它自己好
    - 直接给它剃毛

source_claim_ids:
  - skin_001
  - skin_002
  - skin_003
  - skin_004
  - skin_005
  - skin_006
  - skin_007
  - skin_008
  - skin_009
  - skin_010
  - skin_011
  - skin_012
  - skin_013
  - skin_014
  - skin_015
  - skin_016
  - skin_017
  - skin_018
  - skin_019
  - skin_020
  - skin_021
```
