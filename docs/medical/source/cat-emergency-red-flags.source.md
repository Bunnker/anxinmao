# 病情资料:猫通用急诊红旗

## 0. 元信息

- `condition_id`: `cat_emergency_red_flags`
- 中文名:猫通用急诊红旗
- 英文名:Emergency signs in cats
- 对应 triage symptom:cross-cutting / all
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-emergency-red-flags.ai-card.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| anicira_emergency_10 | Anicira, 10 signs your cat is having a veterinary emergency | https://anicira.org/resources/10-signs-your-cat-is-having-a-veterinary-emergency/ | L3 | 已在 `docs/product/证据-anicira-急诊10信号.md` 整理 | 急诊信号、家庭自评 |
| avma_13_emergencies | AVMA, 13 animal emergencies | https://www.avma.org/resources/pet-owners/emergencycare/13-animal-emergencies-require-immediate-veterinary-consultation-andor-care | L1 | 已在 v0.2 引用 | 通用急症和中毒 |
| vca_emergencies_cats | VCA, Emergencies in cats | https://vcahospitals.com/know-your-pet/emergencies-in-cats | L2 | 已在 v0.2 引用 | 用户解释、路上处理 |
| merck_urinary | Merck Veterinary Manual, noninfectious urinary disease in cats | https://www.merckvetmanual.com/cat-owners/kidney-and-urinary-tract-disorders-of-cats/noninfectious-diseases-of-the-urinary-system-of-cats | L1 | 已在 v0.2 引用 | 尿闭急症 |

## 2. 给产品的一句话

通用红旗的作用不是诊断,而是让 AI 和分诊流程在危险信号出现时立即停止追问,把用户导向急诊或最近动物医院。

## 3. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `rf_dyspnea` | 呼吸急促、张口喘、呼吸费力、牙龈/舌头发紫 | 立刻急诊 | `emg_001`, `emg_002` |
| `rf_bleeding` | 大量出血,或吐血、便血、尿血,或压迫 10-15 分钟仍止不住 | 立刻急诊 | `emg_003`, `emg_004` |
| `rf_seizure_neuro` | 反复抽搐、单次抽搐持续较久、发作间不恢复、站不稳或意识不清 | 立刻急诊 | `emg_005` |
| `rf_collapse` | 瘫软、叫不醒、无法站立 | 立刻急诊 | `emg_006` |
| `rf_urinary_blockage` | 频繁蹲砂但尿不出或只有几滴,尤其公猫 | 立刻急诊 | `emg_007` |
| `rf_toxin` | 怀疑或确知误食百合、人药、鼠药、防冻液等有毒物 | 立刻联系兽医/急诊 | `emg_008` |
| `rf_pale_gums_dehydration` | 牙龈白/黄/紫,皮肤回弹慢,眼窝凹陷,明显脱水 | 立刻就医 | `emg_009` |
| `rf_back_leg_dragging` | 后腿突然拖行、瘫软、大声叫 | 立刻急诊 | `emg_010` |
| `rf_no_eat_24h` | 不正常进食或不喝水接近/超过 24 小时,尤其幼猫、肥胖猫、慢病猫 | 立即联系兽医 | `emg_012` |

## 4. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 没有通用红旗,症状短暂,精神食欲呼吸排尿正常 | 继续进入具体症状问诊 | `emg_011` |
| moderate | 无红旗但有持续症状、轻度精神/食欲变化、宿主风险高 | 进入具体症状 yellow 规则 | `emg_011` |
| severe | 命中任一通用红旗 | 停止追问,直接 red | `emg_001`-`emg_012` |

## 5. 宿主风险画像

高风险宿主不一定自动红档,但会缩短观察窗口,并把不确定情况向更高一级处理:

- 幼猫、老年猫。
- 未免疫或疫苗不完整。
- 新到家、救助、多猫环境。
- 已知慢性病、心脏病、肾病、糖尿病、免疫抑制。
- 体重很轻、明显消瘦、长期不吃。

## 6. 就医前护理

### 可以做

- 保持安静、减少搬动和挣扎。
- 把猫放进航空箱或用厚毛巾保护,避免再次受伤。
- 记录开始时间、症状变化、是否误食、拍照/拍视频。
- 出血时用干净布料持续按压,不要反复揭开查看。

### 绝对不要做

- 不要自行喂人药、止痛药、抗生素、镇静药。
- 不要自行催吐,尤其误食不明物时。
- 不要挤压膀胱。
- 不要拉出口腔或肛门露出的线/绳。
- 不要因为猫安静或躲起来就判定没事;呼吸困难的猫可能反而安静。

## 7. 药品 / 补充剂 / 器械

通用红旗场景下不向用户推荐药品。AI 只允许说明“需要兽医处理/急诊处理”,不允许提供药品名、商品名或剂量。

## 8. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 抽搐时长 | Anicira 支持单次短暂抽搐且恢复后不一定急诊,但产品基调需要更保守 | 面向用户:反复抽搐、持续较久、恢复不完全直接急诊;单次短暂也建议尽快咨询兽医 | 是否在绿档里明确“单次短暂可观察” |
| 脱水自测 | 皮肤回弹对长毛/老年/消瘦猫可靠性有限 | 作为家庭辅助检查,不能作为排除严重问题的唯一依据 | 中文文案如何避免过度依赖 |

## 9. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `emg_001` | 猫出现呼吸困难、张口喘、发绀等表现应作为急诊处理。 | Anicira / VCA / Cornell dyspnea via v0.2 | L1/L2/L3 | red flag | draft |
| `emg_002` | 猫呼吸困难时可能安静、躲藏,不一定表现为明显挣扎。 | Anicira | L3 | report explanation | draft |
| `emg_003` | 严重失血或伤口、口腔、呕吐物、腹泻中的血可构成急诊。 | Anicira / VCA | L2/L3 | red flag | draft |
| `emg_004` | 外部出血持续压迫 10-15 分钟仍止不住应急诊。 | VCA via v0.2 | L2 | red flag | draft |
| `emg_005` | 反复抽搐、持续较久或发作间不恢复属于急诊信号。 | Anicira | L3 | red flag | draft |
| `emg_006` | 猫无法站立、瘫倒可能涉及心肺脑或循环问题,应急诊。 | Anicira | L3 | red flag | draft |
| `emg_007` | 猫频繁尝试排尿却尿不出是尿道阻塞疑似表现,需立刻就医。 | Merck / Cornell / iCatCare via source docs | L1 | red flag | draft |
| `emg_008` | 怀疑或确知误食有毒物应立即联系兽医或急诊,不要等待症状出现。 | AVMA / ASPCA / Cornell via v0.2 | L1 | red flag | draft |
| `emg_009` | 牙龈异常颜色、皮肤回弹慢、意识差等家庭自评异常提示急症风险。 | Anicira | L3 | home self-check | draft |
| `emg_010` | 后腿突然拖行、疼痛叫喊可提示血栓等严重问题,应急诊。 | Anicira | L3 | red flag | draft |
| `emg_011` | 没有红旗时仍需结合症状持续时间、精神食欲、年龄和免疫状态判断观察窗口。 | 产品综合规则 | internal | triage control | needs vet review |
| `emg_012` | 猫不正常进食或不喝水接近/超过约 24 小时应立即联系兽医,幼猫、肥胖猫和慢病猫观察窗口更短。 | VCA Recognizing Illness / Lethargy source | L2/internal | red/yellow shared flag | draft |

## 10. 待兽医审核

- 通用红旗是否遗漏国内急诊常见场景。
- 抽搐场景是否应全部导向急诊,还是区分单次短暂恢复。
- 牙龈/皮肤回弹是否适合给中国用户作为家庭自评。
- “后腿拖行”是否需要从通用红旗升级成独立症状入口。
- “24 小时不正常吃喝”在产品中作为 red 急停还是 high-yellow 立即联系兽医,需由兽医确认。
