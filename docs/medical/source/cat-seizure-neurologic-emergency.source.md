# 病情资料:猫抽搐 / 癫痫样发作 / 神经急症

## 0. 元信息

- `condition_id`:`cat_seizure_neurologic_emergency`
- 中文名:猫抽搐 / 癫痫样发作 / 神经急症
- 英文名:Seizures and neurologic emergencies in cats
- 对应 triage symptom:补充资料,可由 `other`、`behavior` 或通用红旗转入
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-06-17
- 上次人工核对:待审核
- 关联 AI card:`docs/medical/ai-cards/cat-seizure-neurologic-emergency.ai-card.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 用途 |
|---|---|---|---:|---|
| vca_seizures | VCA, Seizures and Epilepsy in Cats | https://vcahospitals.com/know-your-pet/seizures-and-epilepsy-in-cats | L2 | 发作表现、原因、急症时长、记录问题 |
| merck_emergency | Merck Veterinary Manual, What to Do in a Dog or Cat Emergency | https://www.merckvetmanual.com/special-pet-topics/emergencies/what-to-do-in-a-dog-or-cat-emergency | L1 | 急诊和安全转运 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 抽搐/意识异常急停 |

## 2. 给产品的一句话

猫抽搐、意识异常、倒下或持续神经异常不能当成行为问题;发作超过 5 分钟、短时间多次发作、伴误食/外伤/不恢复都需要急诊。

## 3. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `neu_rf_status` | 抽搐持续超过 5 分钟或发作不停止 | 急诊 | `neu_001` |
| `neu_rf_cluster` | 短时间多次发作、连续发作 | 急诊 | `neu_002` |
| `neu_rf_unconscious` | 叫不醒、意识不清、无法站立、后腿拖行 | 急诊 | `neu_003`, `emg_005` |
| `neu_rf_toxin_trauma` | 抽搐前后有误食、人药、外伤或头部撞击 | 急诊/毒物路径 | `neu_004`, `emg_008` |
| `neu_rf_postictal_severe` | 发作后 24 小时仍明显异常或越来越严重 | 尽快门诊/急诊 | `neu_005` |

## 4. 家庭安全边界

可以做:

- 记录发作开始和结束时间,拍视频给医生。
- 清开周围硬物,防止摔落或撞伤。
- 保持环境安静,不要强行抱紧。
- 发作结束后记录精神、走路、呼吸、是否大小便失禁。

不建议:

- 不要把手或物品伸进猫嘴里;VCA 明确提到猫不会吞舌,这样会增加咬伤和伤害风险。
- 不要强行喂水、喂食或喂药。
- 不要自行突然停用抗癫痫药或调整剂量。
- 不要把抽搐解释为“做梦”后忽略持续或反复发作。

## 5. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `neu_001` | 猫发作超过 5 分钟属于 status epilepticus,需要立即兽医治疗。 | vca_seizures | L2 | red | draft |
| `neu_002` | 短时间多次发作或 cluster seizures 需要治疗和兽医评估。 | vca_seizures | L2 | red | draft |
| `neu_003` | 全身性发作可出现意识丧失、四肢划动、流涎、大小便失禁等表现。 | vca_seizures | L2 | red/question | draft |
| `neu_004` | 猫抽搐原因可包括头部外伤、毒物、感染、肿瘤、肝门体分流等。 | vca_seizures | L2 | question | draft |
| `neu_005` | 发作后阶段可持续 24-48 小时;严重或超过 24 小时应纳入治疗评估。 | vca_seizures | L2 | yellow/red | draft |
| `neu_006` | 记录发作年龄、频率、时长、诱因、伴随症状、药物和毒物暴露有助医生判断。 | vca_seizures | L2 | home record | draft |
| `neu_007` | 不应把手或物品伸入发作猫的嘴里,这不会帮助猫且有咬伤/伤害风险。 | vca_seizures | L2 | forbidden | draft |

## 6. 待兽医审核

- 是否在前端增加“抽搐/意识异常”独立入口。
- 发作后恢复但首次发作时,产品建议门诊时限是否统一为当天联系医院。
