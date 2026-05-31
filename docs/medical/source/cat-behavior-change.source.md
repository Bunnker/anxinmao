# 病情资料:猫行为突变 / 行为问题

## 0. 元信息

- `condition_id`:`cat_behavior_change`
- 中文名:猫行为突变 / 行为问题
- 英文名:Behavior change / behavior problems in cats
- 对应 triage symptom:`behavior`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-31
- 上次人工核对:2026-05-31
- 关联 AI card:`docs/medical/ai-cards/cat-behavior-change.ai-card.md`
- 原始抓取:`docs/medical/raw/batch4-chronic-specialty/cat-behavior-change/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| merck_behavior_problems | Merck Veterinary Manual, Behavior Problems in Cats(作者 Gary M. Landsberg DVM, DACVB) | https://www.merckvetmanual.com/cat-owners/behavior-of-cats/behavior-problems-in-cats | L1 | 2026-05-30 HTTP 200, 已抓取 | 全局图谱:攻击/排泄/发声/强迫/过敏感/CDS、先排除医学原因 |
| cornell_behavior_aggression | Cornell Feline Health Center, Feline Behavior Problems: Aggression | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-behavior-problems-aggression | L1 | 2026-05-30 HTTP 200, 已抓取 | 攻击分型、先排除医学原因、惩罚反作用、攻击安全处理 |
| vca_aggression_cats | VCA, Play and Predatory Aggression in Cats(作者 Debra Horwitz DVM / Gary Landsberg DVM) | https://vcahospitals.com/know-your-pet/aggression-in-cats | L2 | 2026-05-30 HTTP 200, 已抓取 | 玩耍/捕猎性攻击辅助支撑、惩罚致痛加重攻击 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则(呼吸/塌陷/抽搐/出血等) |

## 2. 给产品的一句话

行为突变不是「脾气」也不是具体诊断,而是「身体疼痛 / 疾病的隐性表达入口」;AI 要先排触碰激发的疼痛攻击、行为变化合并躯体症状、神经异常等红旗,再把任何突然或持续的行为变化导向兽医先做体检 + 血尿检排除医学原因,绝不把「突然变坏」当成「只是脾气坏」。

## 3. 症状/病情概述

猫会隐藏疼痛和疾病,很多「行为问题」其实是身体出问题的间接表现。兽医共识是:任何突然或持续的行为变化都要先排除医学原因,再当行为问题处理(Merck 对攻击、乱排泄、过敏感综合征反复强调先排除疼痛/疾病)。最值得警惕的是疼痛攻击——之前温顺、现在被摸某个部位就嚎叫/咬/抓,那个部位很可能在疼(关节、口腔、外伤、肿瘤)。老年猫(>10 岁)的行为变化要优先排除认知功能障碍(CDS,类似阿尔茨海默:迷失方向、躁动、记忆丧失、性格改变、白天睡多晚上叫)、甲亢和高血压。常见类型包括攻击、排泄异常(最常见行为问题)、过度发声、强迫行为和过敏感综合征。只有先排除红/黄信号,才能把发情、青春期喷尿、短期应激、品种特征、幼猫高能期等归为正常差异。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `beh_rf_pain_aggression` | 之前温顺、现在被摸某个部位就嚎叫/咬/抓/躲闪,该部位很可能在疼 | 立即就医评估疼痛来源 | `beh_006`, `beh_007` |
| `beh_rf_somatic` | 行为变化同时合并躯体症状:不吃、呕吐、腹泻、张口喘、流口水 | 立即就医 | `beh_008` |
| `beh_rf_neuro` | 突然走路不稳、转圈、撞东西、意识异常 | 立即急诊 | `beh_009`, `emg_005`, `emg_006` |
| `beh_rf_breathing` | 行为异常同时张口喘、呼吸费力、牙龈/舌头发紫 | 立即急诊 | `beh_008`, `emg_001` |
| `beh_rf_shutdown` | 完全拒食 + 躲起来不动 + 看着痛苦 | 立即联系兽医 | `beh_008`, `beh_010` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 有明确低风险原因(发情、青春期喷尿、短期应激、品种特征、幼猫高能期),无任何躯体症状/疼痛/神经信号,精神食欲排泄正常 | 绿/黄边界:先排红黄,给环境调整与关注变化 | `beh_011`, `beh_012`, `beh_013`, `beh_014` |
| moderate | 任何突然或持续的行为变化,无硬红旗;乱排泄但能排尿;强迫/过敏感持续;老年猫行为变化 | 黄档:这周内约门诊,兽医先体检 + 血尿检排除医学原因 | `beh_001`, `beh_004`, `beh_015`, `beh_016`, `beh_017` |
| severe | 触碰激发疼痛攻击;行为变化合并躯体症状;神经异常;完全拒食躲起不动 | 红档:立即就医或急诊 | `beh_006`, `beh_008`, `beh_009`, `beh_010` |

## 6. 宿主风险画像

低风险特征:

- 成年、无慢病,行为变化有明确低风险触发(发情、搬家/新成员等短期应激)。
- 仍能正常走动、回应、吃喝和排尿排便。
- 没有躯体症状、没有疼痛信号、没有神经异常。
- 触发因素消失后几天到一两周逐渐恢复。

高风险特征:

- 老年猫,尤其 >10 岁(优先排除 CDS、甲亢、高血压、慢性疼痛)。
- 行为变化合并躯体症状(不吃、吐、拉、喘、流口水)或神经异常。
- 触碰某部位即攻击/嚎叫,提示局部疼痛。
- 有慢病、近期外伤或骨关节问题。

规则:年龄/慢病只用于缩短观察窗口、把不确定情况向更高一级处理。老年、合并躯体症状的猫窗口更短;绝不把命中红旗的行为变化降级成「熬一熬」或「只是脾气坏」。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `beh_q_pain_touch` | 触碰激发攻击是疼痛攻击的关键信号 | 之前温顺、现在被摸就嚎叫/咬为 red | `beh_006`, `beh_007` |
| `beh_q_somatic_neuro` | 合并躯体或神经症状提示全身性/急症问题 | 不吃/吐/拉/喘/流口水或走路不稳/转圈/撞东西为 red | `beh_008`, `beh_009` |
| `beh_q_change_type` | 变化类型决定追问与认知方向 | 攻击/乱排泄/过度发声/强迫各有医学排除重点 | `beh_001`, `beh_002`, `beh_004`, `beh_005` |
| `beh_q_age_senior` | 老年猫行为变化要优先排除 CDS/甲亢/高血压 | >10 岁伴迷失方向/夜叫/性格改变升级保守 | `beh_017` |
| `beh_q_context_duration` | 应激触发与时长决定是否可能为正常差异 | 明确低风险触发且短期、无红旗支持 green | `beh_013`, `beh_015` |

## 8. 就医前护理

### 可以做

- 记录行为变化开始时间、出现场景、是否有触发因素,以及是否合并躯体症状。
- 在猫不表现时拍视频给兽医看(到医院可能不复现)。
- 攻击性猫先隔离到独立房间(配独立猫砂盆、水、食物、藏身处)保护自己和其它猫。
- 被咬抓伤后清洗伤口并就医,猫咬抓伤有感染风险。
- 怀疑发情或短期应激时,提供房间内独享资源并给几天到一两周适应期。

### 不建议做

- 不要把突然变得脾气坏当成「只是脾气坏」而拖延医学排除。
- 不要强行触碰或抱起会因疼痛攻击的猫。
- 不要在未排除医学原因前就只按「行为训练」处理。

### 绝对不要做

- 不要打猫、体罚或用喷水恐吓(会让猫怕人、破坏信任并加重攻击)。
- 不要给猫喂人用的镇静药或抗焦虑药(剂量错误可致命)。
- 命中红旗(疼痛攻击、合并躯体/神经症状)时不要继续在家观察或自行用药。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 行为/抗焦虑药物 | 行为问题的药物只能与行为及环境调整联合使用,且必须由兽医处方 | 只说明可能需要兽医评估是否用药,不推荐商品名或剂量 | `beh_018`, `beh_019` |
| 疼痛管理 | 疼痛攻击需兽医制定有效的镇痛方案 | 只提示需就医镇痛,不给人药、不给剂量 | `beh_007` |
| 费洛蒙/环境产品 | 费洛蒙等环境辅助可在兽医建议下用于焦虑/标记 | 不点名推荐产品,作为兽医可建议的方向 | `beh_020` |
| 国内药品可得性 | 所有药品展示前需查国内批准和兽医审核 | AI 不展示剂量 | `beh_021` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 噪音/喷水驱赶 | Cornell/VCA 提到非接触噪音(嘶声/压缩空气)可打断玩耍攻击,但喷水易致恐惧 | 面向用户只强调「不打不喷水恐吓」;非接触打断作为兽医指导下的进阶手段,不写进自助文案 | 中文文案是否完全不提任何驱赶 |
| 转诊路径命名 | Merck 推荐 board-certified veterinary behaviorist,国内可能无此证书 | 文案写「找有资质的动物行为咨询师 + 兽医联合处理」 | 国内行为咨询体系如何命名 |
| 绿档边界 | 用户易把行为变化当正常,Merck 强调先排除医学原因 | 只有先排除红/黄、且有明确低风险触发才归绿 | 发情/应激绿档观察窗口具体天数 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `beh_001` | 行为问题在猫身上常受医学因素影响,任何突然或持续的行为变化都应先由兽医排除医学原因再当行为问题处理。 | Merck / Cornell Behavior | L1 | overview/yellow | draft |
| `beh_002` | 猫对人的攻击可由恐惧、玩耍或捕猎本能引起;有些猫在抚摸、休息、进食时会咬人以阻止被触碰。 | Merck Behavior | L1 | question | draft |
| `beh_003` | 攻击前兆包括瞳孔放大、尾巴抽动或来回甩动、耳朵向后压,出现时应停止互动。 | Merck / Cornell / VCA | L1/L2 | question/home care | draft |
| `beh_004` | 排泄异常是猫最常见的行为问题;喷尿是站立、尾巴竖起颤抖向垂直面排尿,绝育可使约 90% 的猫减少或消除喷尿。 | Merck Behavior | L1 | question/green | draft |
| `beh_005` | 强迫行为(如过度梳理舔毛、咬毛/布/塑料/纸板/线)常源于应激或焦虑,暹罗及类似品种咬布有遗传倾向。 | Merck Behavior | L1 | question/yellow | draft |
| `beh_006` | 疼痛攻击是猫疼痛时的防御反应,常在猫预期被移动或触碰时发生;疾病也可导致攻击,因此兽医会先排除攻击的医学原因。 | Merck / Cornell Behavior | L1 | red flag | draft |
| `beh_007` | 疼痛的猫可能在被触碰、移动某部位时嘶叫、咬或抓以避免疼痛(如骨关节炎猫拒绝被碰关节);需兽医制定镇痛方案。 | Cornell Behavior | L1 | red flag / medicine | draft |
| `beh_008` | 行为变化合并躯体症状(不吃、呕吐、腹泻、呼吸异常等)提示全身性疾病,需立即就医评估。 | Merck Behavior / 产品综合 | L1/internal | red flag | needs vet review |
| `beh_009` | 突然走路不稳、转圈、撞东西或意识异常等神经表现属于急症,应立即就医。 | 产品综合 + Emergency source | internal | red flag | needs vet review |
| `beh_010` | 完全拒食、躲起来不动、看着痛苦是综合性恶化信号,应立即联系兽医。 | 产品综合 + Lethargy source | internal | red flag | needs vet review |
| `beh_011` | 玩耍性攻击多见于幼猫和 2 岁以下、无其它猫伴的猫,常表现为潜伏、扑咬,属可管理的正常发育/精力问题。 | VCA / Merck Behavior | L1/L2 | green/question | draft |
| `beh_012` | 满足猫的进食(狩猎)、饮水、排泄、安全、玩耍探索、攀爬栖息、抓挠等正常行为需求,有助于预防和改善行为问题。 | Merck Behavior | L1 | home care/green | draft |
| `beh_013` | 害怕的猫在短期内应被隔离远离引发恐惧的对象,给独立房间配猫砂、玩具、垫子和食物,稳定后再逐步重新引入。 | Merck Behavior | L1 | home care/green | draft |
| `beh_014` | 母猫攻击是母猫对人或其它猫的过度攻击,通常在断奶后小猫独立时消退。 | Merck Behavior | L1 | green | draft |
| `beh_015` | 处理乱排泄前兽医会先排除医学问题,通常需要血检和尿检,因为多种疾病都会导致猫在猫砂盆外排泄。 | Merck Behavior | L1 | yellow | draft |
| `beh_016` | 过敏感综合征表现为对触碰(尤其沿背部)过度敏感、嚎叫躁动或过度梳理,兽医会先排除疼痛和皮肤病。 | Merck Behavior | L1 | yellow | draft |
| `beh_017` | 老年猫可出现认知功能障碍综合征(类似阿尔茨海默),表现为迷失方向、躁动、焦虑、记忆丧失、乱排泄和性格改变;老年猫行为变化应就医先排除医学原因。 | Merck Behavior | L1 | host risk/yellow | draft |
| `beh_018` | 攻击的处理首先要防止对人和其它猫的进一步伤害;药物可能有帮助,但只能与行为和环境调整联合使用。 | Cornell / Merck Behavior | L1 | medicine boundary | draft |
| `beh_019` | 行为问题的诊断和治疗复杂,需要与有资质的行为专家面对面评估,本资料不能替代专业帮助。 | Merck Behavior | L1 | medicine boundary | draft |
| `beh_020` | 若焦虑或标记是问题的一部分,药物与行为调整联合可显著改善,具体方案由兽医确定。 | Merck Behavior | L1 | medicine boundary | draft |
| `beh_021` | 国内相关药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |
| `beh_022` | 应避免对猫使用任何形式的体罚或喷水恐吓,惩罚会增加猫的恐惧和焦虑、让猫怕人并加重攻击。 | Merck / Cornell / VCA | L1/L2 | home care | draft |

## 12. 待兽医审核

- 行为变化合并躯体症状/神经异常的红档阈值(`beh_008`、`beh_009`、`beh_010` 为产品综合,需兽医确认边界)。
- 国内是否有 board-certified veterinary behaviorist 体系,转诊路径如何命名。
- 老年猫「行为变化 → CDS / 甲亢 / 高血压」筛查在国内宠物医院的可及性,是否在 yellow 文案点名。
- 被咬抓伤后处理(感染、猫抓病、狂犬暴露)是否写进攻击 red 文案。
- 费洛蒙/环境产品是否在用户端点名,以及绿档发情/应激观察窗口具体天数。
