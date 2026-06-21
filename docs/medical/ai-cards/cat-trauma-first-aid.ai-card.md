# AI 分诊知识卡:猫创伤 / 急救 / 安全转运

```yaml
condition_id: cat_trauma_first_aid
source_document: docs/medical/source/cat-trauma-first-aid.source.md
status: draft
entry_symptoms:
  - 摔了
  - 坠楼
  - 车撞
  - 打架受伤
  - 咬伤
  - 烧伤
  - 烫伤
  - 触电
  - 噎住
  - 窒息
user_synonyms:
  - 外伤
  - 急救
  - 伤口
  - 骨折
  - 流血
  - 眼睛受伤

ai_task:
  primary_goal: 识别创伤急症,给就医前安全处理和转运边界。
  never_do:
    - 不建议在家观察车撞、坠楼、触电、烧伤、眼伤或疑似骨折
    - 不推荐人用止痛药、抗生素、镇静药或剂量
    - 不指导复位、缝合、包扎复杂伤口或自行 CPR 细节
    - 不用酒精、双氧水、精油或人用药膏处理开放伤口

questioning_boundary:
  goal: 先确认呼吸、出血、意识、坠落/车撞/触电/烧伤/眼伤和是否能站。
  ask_style: 疑似急症时只问关键问题,确认后立即给行动建议。
  max_rounds_before_assessment: 1
  minimum_context_for_assessment:
    universal:
      - 发生了什么
      - 发生多久
      - 呼吸是否异常
      - 是否大量出血
      - 是否能站立/走路
      - 是否意识异常或抽搐
    condition_specific: []
  stop_and_assess_when:
    - 命中任一创伤红旗
    - 用户无法判断呼吸/意识/出血
    - 车撞、坠楼、触电、烧伤、眼伤、疑似骨折

red_flags:
  - id: tra_rf_breath_airway
    user_signal: 窒息、噎住、呼吸困难、张口喘
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [tra_001, emg_001]
  - id: tra_rf_bleeding
    user_signal: 严重出血、压不住、血流不止
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [tra_002, emg_003]
  - id: tra_rf_fracture_fall
    user_signal: 车撞、坠楼、疑似骨折、肢体不能动
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [tra_003]
  - id: tra_rf_eye_burn_electric
    user_signal: 眼外伤、烧烫伤、触电
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [tra_004]
  - id: tra_rf_shock_neuro
    user_signal: 倒下、意识不清、抽搐、牙龈苍白、极度虚弱
    action: immediate_er
    stop_questioning: true
    source_claim_ids: [tra_005, emg_005]

triage_questions:
  - id: tra_q_event
    ask: 它是怎么受伤的?有车撞、坠楼、触电、烧烫伤、眼伤或被咬吗?
    why: 这些事件本身就足以升级为急诊。
    priority: 1
    source_claim_ids: [tra_003, tra_004]
  - id: tra_q_abc
    ask: 现在呼吸、意识、出血和站立怎么样?
    why: 创伤急救先判断气道、呼吸、循环和神经状态。
    priority: 2
    multi_select: true
    source_claim_ids: [tra_001, tra_002, tra_005]

tier_rules:
  red:
    if_any:
      - any red_flag matched
      - user cannot rule out breathing/bleeding/consciousness problem
      - major_trauma_event
    action: 立即联系动物医院/急诊,同时做安全转运。
  yellow:
    if_any:
      - small_wound_without_red_flags
      - mild_limp_after_minor_event
      - bite_wound_without_systemic_signs
    action: 当天联系兽医,伤口清洁覆盖,防舔,观察升级。
  green:
    only_if_all:
      - no_major_trauma
      - breathing_normal
      - no_bleeding_or_only_tiny_surface_scratch
      - walking_normal
      - energy_appetite_normal
    action: 短期观察并给升级条件。
  unknown:
    default: 创伤信息不清时保守升级。

home_care:
  allowed:
    - action: 电话联系医院,说明事件、时间、呼吸、出血、意识、能否站立
      applies_to: red_or_yellow
      source_claim_ids: [tra_007]
    - action: 出血时用干净布料持续直接按压
      applies_to: red_or_yellow
      source_claim_ids: [tra_002]
    - action: 开放伤口用干净水或生理盐水轻柔冲洗小碎屑并覆盖,防舔
      applies_to: yellow
      source_claim_ids: [tra_006]
    - action: 保持安静、少搬动、平稳放入硬底猫包或箱子
      applies_to: red_or_yellow
      source_claim_ids: [tra_003, tra_007]
  forbidden:
    - action: 喂人用止痛药、抗生素、镇静药
      reason: 猫对多种人药敏感,且创伤需要医生评估
      source_claim_ids: [tra_006]
    - action: 用酒精、双氧水、精油、茶树油、人用药膏处理伤口
      reason: 可能刺激组织、延误愈合或中毒
      source_claim_ids: [tra_006]
    - action: 自行复位骨折、深部探查伤口、复杂包扎
      reason: 可能造成二次损伤
      source_claim_ids: [tra_003]

medicine_policy:
  status: prohibited
  ai_can_mention_categories: false
  ai_can_recommend_product: false
  ai_can_show_dose: false
  requires_region_check: true
  requires_vet_review: true
  related_categories:
    - minor_wound_saline_collar

source_claim_ids:
  - tra_001
  - tra_002
  - tra_003
  - tra_004
  - tra_005
  - tra_006
  - tra_007
```
