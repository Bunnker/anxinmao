# 病情资料:猫跛行 / 走路异常

## 0. 元信息

- `condition_id`:`cat_limping`
- 中文名:猫跛行 / 走路异常
- 英文名:Limping / lameness in cats
- 对应 triage symptom:`limp`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-31
- 上次人工核对:2026-05-31
- 关联 AI card:`docs/medical/ai-cards/cat-limping.ai-card.md`
- 原始抓取:`docs/medical/raw/batch4-chronic-specialty/cat-limping/`、`docs/medical/raw/batch4-chronic-specialty/shared/vca-aortic-thromboembolism/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| merck_joint_disorders | Merck Veterinary Manual, Joint Disorders in Cats(Joseph Harari, MS, DVM, DACVS) | https://www.merckvetmanual.com/cat-owners/bone-joint-and-muscle-disorders-of-cats/joint-disorders-in-cats | L1 | 2026-05-30 HTTP 200 | 骨关节炎、脱位、骨折、败血性/免疫性关节炎、创伤 |
| vca_limping_first_aid | VCA, First Aid for Limping Cats | https://vcahospitals.com/know-your-pet/first-aid-for-limping-cats | L2 | 2026-05-30 HTTP 200 | 急救边界、家庭评估、肉垫异物、限制活动、转运 |
| vca_aortic_thromboembolism | VCA, Aortic Thromboembolism in Cats(ATE) | https://vcahospitals.com/know-your-pet/aortic-thromboembolism-in-cats | L2 | 2026-05-30 HTTP 200 | 主动脉血栓栓塞急症、HCM 风险、后腿瘫软识别 |
| fda_acetaminophen | FDA / Merck 人用止痛药对猫毒性(经底稿 v0.2 §3.2 引述) | `docs/product/证据-cat-limp-跛行问题.md` | L1 | 已在底稿声明 | 对乙酰氨基酚/NSAID 对猫致命边界 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则、ATE/骨折交叉引用 |

## 2. 给产品的一句话

跛行是「从局部小伤到致命急症」的入口,不是具体诊断;AI 要先排主动脉血栓栓塞(后腿突然瘫软 + 大叫 + 后腿冰凉)、骨折/脱位(完全不能用腿、肿胀畸形开放伤口)、近期创伤和「跛行 + 发热/不吃/萎靡」的全身感染,再决定老年骨关节炎和软组织小伤是否能短期观察。

## 3. 症状/病情概述

猫腿、关节、骨、肌肉、神经、肌腱、韧带或皮肤任一部分受伤或退化都会跛行。骨折和脱位常有肿胀、肢体角度异常;关节/神经/韧带损伤可能没有外在迹象。大多数跛行需要兽医处理,但少数轻微情况可先在家急救观察。最容易被忽视的两端是:一端是主动脉血栓栓塞(ATE)这类几小时窗口的真急症,常见于有肥厚性心肌病的猫;另一端是老年猫骨关节炎——猫善于藏疼痛、病程进展慢,主人常误以为「老了不爱动」,实际是关节在疼。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `limp_rf_ate` | 后腿突然瘫软/拖行 + 大叫疼痛 + 后腿冰凉/摸不到脉搏 + 脚垫发紫或苍白 | 立即急诊,几小时窗口 | `limp_010`, `limp_011`, `emg_010` |
| `limp_rf_nonweightbear` | 完全不能用某条腿、提着腿走、三条腿走 | 立即就医 | `limp_004`, `emg_006` |
| `limp_rf_deformity` | 腿部明显肿胀、角度畸形或有开放伤口 | 立即就医 | `limp_003`, `limp_004` |
| `limp_rf_trauma` | 刚高处坠落/车祸/打架/被门夹被踩后跛行,即使看着能走 | 当天就医排除内伤 | `limp_012`, `limp_013` |
| `limp_rf_systemic` | 跛行同时发热、不吃、萎靡、关节肿胀拒触 | 立即就医 | `limp_006`, `limp_007` |
| `limp_rf_polyarthritis` | 多个关节同时痛/肿 + 发热 + 反复发作 | 当天就医 | `limp_008` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 偶尔瘸一下、几分钟到几小时自行恢复,能正常负重,无肿胀畸形伤口,无全身症状 | 绿/黄边界:限制活动观察几天,给升级条件 | `limp_001`, `limp_014` |
| moderate | 持续/反复一瘸一拐超过约 24 小时无急症信号,或老年猫跳跃减少、起身慢,或肉垫异物/指甲问题 | 黄档:这几天内约门诊,兽医体检 + X 光 | `limp_002`, `limp_005`, `limp_009` |
| severe | ATE、完全不能负重、肿胀畸形开放伤口、近期创伤后跛行、跛行伴发热/不吃/萎靡、多关节痛 | 红档:立即就医 | `limp_003`, `limp_004`, `limp_006`, `limp_010`, `limp_012` |

## 6. 宿主风险画像

低风险特征:

- 成年、健康、无已知心脏病。
- 仍能正常负重,只是偶尔瘸一下且很快恢复。
- 无肿胀、畸形、开放伤口,无发热/不吃/萎靡。
- 有明确低风险原因,如幼猫高强度玩耍后短暂跛但很快恢复。

高风险特征:

- 老年猫(尤其 > 10 岁),跳跃减少、起身慢、不爱上下跳——骨关节炎高度可能。
- 已知或可疑肥厚性心肌病(HCM)等心脏病——ATE 风险显著升高。
- 近期高处坠落、车祸、打架、被门夹/被踩等创伤史。
- 跛行伴发热、食欲下降、萎靡、关节肿胀拒触等全身或感染征象。

规则:年龄/心脏病/创伤史只用于缩短观察窗口。老年、心脏病猫窗口更短;任何命中红旗的情况不能因为「老了不爱动很正常」而降级,也不能把骨折/脱位/ATE 当成「熬一熬」。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `limp_q_ate` | 后腿突然瘫软 + 大叫 + 冰凉是几小时窗口的真急症,必须最先排 | 命中即 red 并急停 | `limp_010`, `limp_011` |
| `limp_q_weightbear` | 能否负重是骨折/脱位的关键区分,大多数猫不会用断腿/脱位腿走 | 完全不能负重/提着走为 red | `limp_004` |
| `limp_q_deformity_trauma` | 肿胀畸形开放伤口、近期创伤史提示骨折/严重外伤 | 肿胀畸形/伤口或近期创伤为 red | `limp_003`, `limp_012`, `limp_013` |
| `limp_q_systemic` | 发热、不吃、萎靡、多关节痛提示败血性/免疫性关节炎等全身问题 | 跛行 + 全身症状为 red | `limp_006`, `limp_007`, `limp_008` |
| `limp_q_chronic_local` | 病程、年龄、肉垫/指甲决定黄/绿与观察窗口 | 老年慢性跛/异物为 yellow;偶发即好为 green | `limp_002`, `limp_005`, `limp_009`, `limp_014` |

## 8. 就医前护理

### 可以做

- 观察猫怎么走:哪条腿、是提着走还是能站着负重、是否短步、是否完全不沾地;记录开始时间、是突然还是逐渐、有无外伤。
- 限制活动,把猫关在小房间或大笼子里,不让它跳上跳下。
- 看得到且容易取的肉垫异物(刺、玻璃、草籽)可取出,用温水/盐水清洁小伤口。
- 怀疑骨折/脱位时用毛巾包裹支撑患肢,放进航空箱、患肢朝上转运,支撑头部和臀部。
- 怀疑 ATE(后腿瘫 + 大叫 + 冰凉/发紫)时尽量减少搬动患肢,立即送医。

### 不建议做

- 不要在猫剧烈疼痛时强行检查或弯折关节;太疼就停。
- 不要把老年猫「不爱跳、起身慢」当成单纯衰老而长期拖着。
- 不要让跛行的猫继续跳高/高强度活动,即使它「看着没事」。

### 绝对不要做

- 绝不给猫吃任何人用止痛药:对乙酰氨基酚(扑热息痛/泰诺)一片即可对猫致命,布洛芬/萘普生/阿司匹林对猫剧毒。
- 不要在家给疑似骨折/脱位的腿「正位」或拉直,可能加重损伤、压迫血管神经。
- 命中红旗时不要继续在家观察或尝试家庭药品。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 人用止痛药 | 对乙酰氨基酚一片可对猫致命,布洛芬/萘普生/阿司匹林剧毒 | 明确禁止,任何档位都反对自行喂人药 | `limp_015` |
| 猫用 NSAID / 止痛药 | 美乐昔康、罗贝考昔等 NSAID 及加巴喷丁、丁丙诺啡等用于急性/慢性疼痛,均需兽医处方 | 只说有处方止痛方案、需兽医开,不推荐商品名、不显示剂量 | `limp_016` |
| 骨关节炎专药 | Frunevetmab(猫 OA 单抗)在美国已批准;国内可及性未知 | 不点名产品,提示「问兽医有无对症方案」 | `limp_005`, `limp_016` |
| 关节保健 / 补充剂 | omega-3 等可能辅助关节,关节液修饰剂证据有限 | 不推荐具体产品,先就医明确病因 | `limp_005` |
| 国内药品可得性 | 所有药品卡需查国内批准和兽医审核 | AI 不展示剂量 | `limp_017` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 持续跛行就医阈值 | VCA 给「跛行超过 24 小时就就医」,但产品想区分黄/绿 | 偶发即好为绿短观察;持续超约 24 小时为黄;任何急症信号直接红 | 绿档观察窗口设几天是否合适 |
| 老年「不爱跳」 | 主人常视作衰老,Merck 强调 60-90% 老猫有 OA 且常被忽视 | 老年跳跃减少/起身慢一律按 OA 可能进黄档评估 | 是否建议老年猫年度 X 光筛查 |
| ATE 用户文案 | ATE 预后差、措辞易引发恐慌 | 只点「几小时窗口、立刻送医」与路上少搬动,不展开预后 | 中文文案如何既紧迫又不吓崩用户 |
| 关节专药点名 | Frunevetmab 等国内可及性未知 | 一律不点名,交兽医 | 国内是否已可及、可否黄档提示 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `limp_001` | 跛行是腿的关节、骨、肌肉、神经、肌腱、韧带或皮肤受伤或退化所致;部分原因明显(骨折/脱位常有肿胀和肢体角度异常),关节、神经、韧带损伤可能没有外在迹象。 | VCA First Aid for Limping Cats | L2 | overview/question | draft |
| `limp_002` | 评估跛行先看猫怎么走:是哪条腿、是提着走还是能站着负重、是否短步、是否完全不沾地,并确定起始时间、是突然还是逐渐、有无外伤。 | VCA First Aid for Limping Cats | L2 | question/triage control | draft |
| `limp_003` | 骨折或脱位的腿常有肿胀,肢体可能停在异常角度;关节骨折和脱位是创伤性急症。 | VCA First Aid / Merck Joint Disorders | L2/L1 | red flag | draft |
| `limp_004` | 大多数猫不会用骨折、韧带断裂或关节脱位的腿走路;完全不能负重、提着腿走提示严重损伤,应立即就医。 | VCA First Aid for Limping Cats | L2 | red flag | draft |
| `limp_005` | 约 60% 到 90% 的老年猫有骨关节炎(退行性关节病),但因猫善于隐藏疼痛常被忽视;表现包括跛行、关节肿胀、肌肉萎缩,处理含体重管理、控制活动、必要时兽医用止痛抗炎药及 frunevetmab 等。 | Merck Joint Disorders in Cats | L1 | yellow/host risk/medicine | draft |
| `limp_006` | 败血性关节炎多由细菌经血流、穿透性伤口或手术进入关节,表现为跛行、关节肿胀疼痛、发热、精神沉郁、食欲下降和僵硬,需抗生素等治疗。 | Merck Joint Disorders in Cats | L1 | red flag | draft |
| `limp_007` | 跛行伴发热、食欲下降、萎靡、关节肿胀拒触提示感染性或全身性关节问题,应尽快兽医评估。 | Merck Joint Disorders in Cats | L1 | red flag/question | draft |
| `limp_008` | 免疫介导性关节炎通常累及多个关节,表现为多关节跛行、疼痛肿胀、发热、全身不适和持续食欲下降,症状常反复发作,需 X 光、血检和关节穿刺等诊断。 | Merck Joint Disorders in Cats | L1 | red flag/question | draft |
| `limp_009` | 局部跛行原因包括肉垫内异物(刺、玻璃、草籽)、肉垫割伤刺伤、指甲断裂或甲床感染;看得到且易取的异物可取出并清洁,脓肿等需就医。 | VCA First Aid for Limping Cats | L2 | yellow/home care | draft |
| `limp_010` | 主动脉血栓栓塞(ATE)最常见表现是后腿突然瘫痪和疼痛,也可见无力或跛行;后腿可能脉搏减弱或摸不到,脚垫和甲床发紫或苍白,体温偏低,猫常因疼痛大叫并显得焦虑。 | VCA Aortic Thromboembolism in Cats | L2 | red flag | draft |
| `limp_011` | ATE 患猫常有肥厚性心肌病等基础心脏病(很多发作前无任何征兆),多见于 8-12 岁,公猫风险更高;预后差,属需立即处理的急症。 | VCA Aortic Thromboembolism in Cats | L2 | red flag/host risk | draft |
| `limp_012` | 创伤(高处坠落、车祸、打架、被门夹或踩到)是急性跛行常见原因,可造成骨折、关节脱位、韧带断裂或软组织损伤,即使外表能走也应排除内伤。 | Merck Joint Disorders / VCA First Aid | L1/L2 | red flag | draft |
| `limp_013` | 关节脱位/骨折不应在家自行复位或拉直,搬动受伤的猫可能加重损伤;转运时用航空箱并支撑头部和臀部,患肢朝上。 | VCA First Aid for Limping Cats | L2 | home care/red flag | draft |
| `limp_014` | 与扭伤、挫伤或肌腱炎相关的轻度肿胀可冰敷约 15 分钟并咨询兽医;跛行持续超过约 24 小时应就医,期间限制活动。 | VCA First Aid for Limping Cats | L2 | green/yellow/home care | draft |
| `limp_015` | 绝不给猫使用人用止痛药:对乙酰氨基酚(扑热息痛/泰诺)一片即可对猫致命,布洛芬、萘普生、阿司匹林对猫剧毒。 | FDA / Merck via 底稿 v0.2 §3.2 | L1 | medicine boundary/forbidden | needs vet review |
| `limp_016` | 猫的疼痛可用兽医处方药物缓解,如 NSAID(美乐昔康、罗贝考昔)、加巴喷丁、丁丙诺啡等,均须在兽医指导下使用;不应自行给药或参照剂量。 | VCA First Aid for Limping Cats | L2 | medicine boundary | draft |
| `limp_017` | 国内相关药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 偶发轻微跛行绿档观察窗口设为几天是否合适,何时升级。
- 老年猫「不爱跳、起身慢」是否一律进黄档,是否建议年度 X 光筛查 OA。
- ATE 红档中文文案如何在传达「几小时窗口、立刻送医」的同时不让用户崩溃,是否给「就诊预期」(超声查 HCM、抗血小板药、预后差)。
- `limp_015`(对乙酰氨基酚一片可致命)出处为底稿声明的 FDA / Merck(v0.2 §3.2),需执业兽医确认引用与等级。
- Frunevetmab 及关节保健品在国内的可及性,是否值得在黄档点名。
