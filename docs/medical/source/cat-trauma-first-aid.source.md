# 病情资料:猫创伤 / 急救 / 安全转运

## 0. 元信息

- `condition_id`:`cat_trauma_first_aid`
- 中文名:猫创伤急救与安全转运
- 英文名:Trauma and first aid in cats
- 对应 triage symptom:补充资料,可由 `other`、`blood`、`limp`、`breath` 入口转入
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-06-17
- 上次人工核对:待审核
- 关联 AI card:`docs/medical/ai-cards/cat-trauma-first-aid.ai-card.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 用途 |
|---|---|---|---:|---|
| avma_first_aid | AVMA, First aid tips for pet owners | https://www.avma.org/resources-tools/pet-owners/emergencycare/first-aid-tips-pet-owners | L1 | 宠物急救原则、出血/休克/窒息识别 |
| merck_emergency | Merck Veterinary Manual, What to Do in a Dog or Cat Emergency | https://www.merckvetmanual.com/special-pet-topics/emergencies/what-to-do-in-a-dog-or-cat-emergency | L1 | 立即就医场景、电话联系兽医、安全转运 |
| vca_first_aid_cats | VCA, First Aid for Cats: Shock, Rescue Breathing, and CPR | https://vcahospitals.com/know-your-pet/first-aid-for-cats | L2 | 保持安静、少搬动、联系医院 |
| vca_open_wounds | VCA, Care of Open Wounds in Cats | https://vcahospitals.com/know-your-pet/care-of-open-wounds-in-cats | L2 | 开放伤口清洁与禁忌 |
| vca_bleeding | VCA, First Aid for Bleeding Cats | https://vcahospitals.com/know-your-pet/first-aid-for-bleeding-cats | L2 | 出血按压和转运 |
| vca_falls | VCA, First Aid for Falls in Cats | https://vcahospitals.com/know-your-pet/first-aid-for-falls-in-cats | L2 | 坠落后开放伤口/骨折保护 |

## 2. 给产品的一句话

创伤急救的目标不是在家处理完,而是识别需要立即就医的信号、避免二次伤害、控制明显出血、保护伤口并安全转运。

## 3. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `tra_rf_breath_airway` | 窒息、噎住、呼吸困难、张口喘 | 急诊 | `tra_001`, `emg_001` |
| `tra_rf_bleeding` | 严重或控制不住的出血 | 直接按压并急诊 | `tra_002`, `emg_003` |
| `tra_rf_fracture_fall` | 车撞、坠楼、疑似骨折、肢体不能动 | 少搬动,急诊 | `tra_003` |
| `tra_rf_eye_burn_electric` | 眼外伤、烧烫伤、触电 | 急诊 | `tra_004` |
| `tra_rf_shock_neuro` | 倒下、意识不清、抽搐、牙龈苍白、极度虚弱 | 急诊 | `tra_005`, `emg_005` |

## 4. 就医前处理边界

可以做:

- 先保护人:受伤疼痛的猫可能抓咬。
- 立即电话联系医院,说明发生了什么、时间、呼吸、出血、意识和是否能站。
- 尽量让猫安静、保暖,少搬动;高温中暑除外。
- 出血时用干净布料或纱布持续直接按压。
- 开放伤口可用干净水或生理盐水冲洗小碎屑,覆盖干净敷料后转运。
- 疑似骨折或坠落时不要强行复位,尽量平稳放入硬底猫包/箱子。

不建议:

- 不要自行喂人药、止痛药、抗生素或镇静药。
- 不要用酒精、双氧水、精油、茶树油、人用药膏处理开放伤口。
- 不要反复掀开看出血是否停,会影响凝血。
- 不要给窒息、抽搐、意识不清的猫强行喂水或食物。
- 不要拖着观察车撞、坠楼、触电、烧伤、眼伤或疑似骨折。

## 5. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `tra_001` | 呼吸困难、窒息或气道问题属于需要立即兽医处理的急症。 | merck_emergency / avma_first_aid | L1 | red | draft |
| `tra_002` | 严重或无法控制的出血需要直接按压并尽快就医。 | merck_emergency / vca_bleeding / avma_first_aid | L1/L2 | red/home care | draft |
| `tra_003` | 疑似骨折、肢体不能动、坠落或严重创伤需要少搬动并尽快就医。 | merck_emergency / vca_falls | L1/L2 | red | draft |
| `tra_004` | 眼外伤、烧烫伤、触电等创伤应按急诊处理。 | merck_emergency / avma_first_aid | L1 | red | draft |
| `tra_005` | 休克、意识异常、抽搐或极度虚弱提示生命风险,需要急诊。 | avma_first_aid / merck_emergency | L1 | red | draft |
| `tra_006` | 开放伤口清洁以水/生理盐水和防舔为主,不要自行使用酒精、双氧水、精油或人用外用药。 | vca_open_wounds | L2 | forbidden | draft |
| `tra_007` | 急救通常从电话联系兽医开始,并按医院建议做现场处理和安全转运。 | merck_emergency | L1 | response style | draft |

## 6. 待兽医审核

- 是否把“创伤急救”单独接入前端症状入口。
- 国内常见急诊电话/就近医院查询是否由产品层另行提供。
