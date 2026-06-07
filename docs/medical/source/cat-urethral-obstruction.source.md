# 病情资料:猫尿道阻塞 / 尿不出

## 0. 元信息

- `condition_id`: `cat_urethral_obstruction`
- 中文名:猫尿道阻塞 / 尿不出
- 英文名:Feline urethral obstruction
- 对应 triage symptom:`pee`(尿不出/尿闭),`urine`(小便不对劲 —— FLUTD 入口卡复用本底稿:黄档 `uo_006`/`uo_007`,撞尿闭信号升红 `uo_001`~`uo_005`)
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-urethral-obstruction.ai-card.md`
- 现有底稿:`docs/product/证据-icatcare-尿道阻塞.md`, `docs/product/分诊证据-草稿-v0.2.md` §2.3

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| icatcare_urethral_obstruction | International Cat Care, Urethral obstruction in cats | https://icatcare.org/articles/urethral-obstruction-in-cats | L1 | 2026-05-30 curl UA 返回 HTTP 200;已有本地证据整理 | 急症时间窗、完全阻塞 vs 未阻塞 |
| cornell_flutd | Cornell Feline Health Center, Feline Lower Urinary Tract Disease | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-lower-urinary-tract-disease | L1 | 已在 v0.2 引用 | 表现、风险、公猫 |
| merck_urinary | Merck Veterinary Manual, Noninfectious diseases of urinary system in cats | https://www.merckvetmanual.com/cat-owners/kidney-and-urinary-tract-disorders-of-cats/noninfectious-diseases-of-the-urinary-system-of-cats | L1 | 已在 v0.2 引用 | 毒素蓄积、电解质/死亡风险 |
| vca_emergencies | VCA, Emergencies in cats | https://vcahospitals.com/know-your-pet/emergencies-in-cats | L2 | 已在 v0.2 引用 | 用户可懂急症信号 |

## 2. 给产品的一句话

尿不出是猫分诊里最硬的急症之一。AI 的目标不是判断病因,而是快速区分“完全/近乎完全尿不出”与“还能尿但异常”,前者立即急诊,后者尽快门诊且不给绿档。

## 3. 症状/病情概述

猫尿道阻塞几乎只发生在公猫,包括绝育公猫。典型表现是反复进猫砂盆、用力、哭叫,但几乎没有尿或只有几滴。完全阻塞可在数小时到数天内危及生命,需要兽医急诊解除阻塞。

能排尿但频率增多、血尿、疼痛或尿在猫砂盆外,更像未完全阻塞的 FLUTD 方向,仍需尽快门诊,但处理急迫程度与完全尿不出不同。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `uo_rf_no_output` | 频繁蹲砂用力但几乎尿不出或只有几滴 | 立刻急诊 | `uo_001`, `uo_002` |
| `uo_rf_pain_crying` | 在猫砂盆里嚎叫、疼痛大叫 | 立刻急诊 | `uo_003` |
| `uo_rf_systemic` | 不吃、呕吐、精神沉郁、不愿活动、脱水 | 立刻急诊 | `uo_004` |
| `uo_rf_male_cat` | 公猫尿不出 | 立刻急诊,高危宿主 | `uo_005` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 本病情不设真正绿档;如果确认正常排尿且只是主人担心,可退出尿闭流程转其它症状 | 不给“尿闭绿档”;建议继续观察排尿并记录 | `uo_006` |
| moderate | 尿得出,但比平时少/次数多/疼痛/带血/尿在猫砂盆外 | 黄档:尽快门诊,注意升级条件 | `uo_006`, `uo_007` |
| severe | 几乎尿不出、只有几滴、疼痛嚎叫、呕吐/不吃/精神差 | 红档:立刻急诊 | `uo_001`, `uo_002`, `uo_004` |

## 6. 宿主风险画像

高风险:

- 公猫,包括绝育公猫。
- 有 FLUTD/FIC/结石史。
- 最近应激、环境变化、多猫冲突。
- 喝水少、肥胖、室内活动少。

规则:只要“公猫 + 尿不出/几滴”即按红档。年龄、精神尚可不能降低红档,因为早期可能看起来还没有完全崩溃。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `uo_q_output` | 这是区分完全阻塞 vs 未阻塞 FLUTD 的核心问题 | 几乎尿不出/几滴 => red;能排尿但异常 => yellow | `uo_001`, `uo_006` |
| `uo_q_sex` | 公猫风险显著更高 | 公猫 + 尿少/尿不出提高急迫度 | `uo_005` |
| `uo_q_pain_systemic` | 疼痛、呕吐、不吃、精神差提示病情已影响全身 | 命中即 red | `uo_003`, `uo_004` |
| `uo_q_duration` | 时间影响危及生命风险 | 持续越久越危险,但即使刚开始也不能等 | `uo_002` |

## 8. 就医前护理

### 可以做

- 立刻联系最近动物医院/急诊,直说“猫可能尿道阻塞,尿不出来”。
- 记录最后一次正常排尿时间、猫砂盆里有没有尿团、是否疼痛嚎叫。
- 运输时保持安静,减少挣扎。

### 不建议做

- 不要因为还能挤出几滴就等到明天。
- 不要先在家喂“消炎药/止痛药/利尿药”。

### 绝对不要做

- 不要在家挤压或按摩膀胱。
- 不要强行灌水。
- 不要给人用止痛药或抗生素。

## 9. 药品 / 补充剂 / 器械

尿道阻塞红档场景下不展示药品。兽医可能使用镇静/麻醉、导尿、输液、止痛、抗炎、解痉等,但这些都必须在医院完成。

对于 yellow 场景(能排尿但异常),AI 可以说明“可能需要尿检、影像、止痛/抗炎等兽医处理”,不能推荐具体药或剂量。

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 致命时间窗 | iCatCare 写 2-3 天;Cornell/v0.2 提到可不足 24-48 小时 | 面向用户表述“数小时到数天可致命,不能等” | 国内兽医偏好用哪个时间表述 |
| 能排尿但异常 | iCatCare 说尽快预约门诊;产品当前不设绿档 | yellow,尽快门诊;出现尿不出/疼痛/系统症状升级 red | 夜间是否必须急诊 |
| 家庭取尿样 | iCatCare 提到居家取尿样 | 当前不放到急性分诊;未来术后/复诊资料再加 | 是否适合中国用户 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `uo_001` | 反复尝试排尿却无法排出或仅几滴是尿道阻塞典型急症表现。 | iCatCare / Cornell / VCA | L1/L2 | red flag | draft |
| `uo_002` | 未治疗的尿道阻塞可在数小时到数天内危及生命。 | iCatCare / Cornell / Merck | L1 | red explanation | draft |
| `uo_003` | 排尿用力时哭叫/痛苦提示严重疼痛,需急诊评估。 | iCatCare / Merck | L1 | red flag | draft |
| `uo_004` | 阻塞进展可出现精神沉郁、厌食、呕吐、脱水等全身征象。 | iCatCare / Merck | L1 | red flag | draft |
| `uo_005` | 尿道阻塞几乎只发生在公猫,包括绝育公猫。 | iCatCare / Cornell | L1 | host risk | draft |
| `uo_006` | 能排尿但有 FLUTD 征象时应尽快联系兽医预约,与完全尿不出不同。 | iCatCare | L1 | yellow rule | draft |
| `uo_007` | 未阻塞 FLUTD 可表现为频繁排尿、用力、不适、血尿或猫砂盆外排尿。 | iCatCare / Cornell | L1 | yellow question | draft |
| `uo_008` | 兽医可能需要镇静/麻醉下导尿、影像、血尿检、输液和止痛/解痉等处理。 | iCatCare | L1 | user expectation | draft |

## 12. 待兽医审核

- “能排尿但血尿/疼痛”在国内是否全部建议当日门诊,夜间是否需要急诊。
- 是否应该在分诊问题里先问性别,还是先问有没有尿。
- “几滴”这个表述是否足够清楚,是否要加“猫砂里没有正常尿团”。
- 是否给用户解释 FIC/应激,还是报告页保持短。
