# 病情资料:猫口腔问题

## 0. 元信息

- `condition_id`:`cat_oral_problem`
- 中文名:猫口腔问题
- 英文名:Oral and dental problems in cats
- 对应 triage symptom:`mouth`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-31
- 上次人工核对:2026-05-31
- 关联 AI card:`docs/medical/ai-cards/cat-oral-problem.ai-card.md`
- 原始抓取:`docs/medical/raw/batch4-chronic-specialty/cat-oral-problem/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_dental_disease | Cornell Feline Health Center, Feline Dental Disease | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-dental-disease | L1 | 2026-05-30 HTTP 200 OK | 牙病流行率、三大牙病、系统病因、刷牙与人牙膏毒性 |
| merck_mouth_disorders | Merck Veterinary Manual, Disorders of the Mouth in Cats | https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/disorders-of-the-mouth-in-cats | L1 | 2026-05-30 HTTP 200 OK | FCGS 拔牙、接近-躲避、舌下线异物、口腔灼伤、咽部囊肿、口腔肿瘤、流口水鉴别 |
| vca_dental_disease_cats | VCA Hospitals, Dental Disease in Cats | https://vcahospitals.com/know-your-pet/dental-disease-in-cats | L2 | 2026-05-30 HTTP 200 OK | 临床信号、麻醉下口腔检查与牙片、幼猫换牙、勿自行刮结石、洁齿产品与刷牙 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则、呼吸困难/塌陷/牙龈苍白交叉引用 |

## 2. 给产品的一句话

口腔问题是“被严重低估的常见入口”:50-90% 的成年猫有牙病却因猫藏疼痛而被忽视;AI 要先排舌下线异物、口腔灼伤、颌下肿块(气道风险)、可疑肿瘤、未排除狂犬病的流口水等急症,再把典型牙病导向兽医镇静下完整检查,不做诊断、不点名疾病、不给剂量。

## 3. 症状/病情概述

猫极擅长隐藏口腔疼痛,很多有牙病的猫主人看不出异常。常见信号是口臭、流口水、吃饭偏头或单边咀嚼、拒食硬粮偏好软食、抚摸嘴巴抗拒、牙龈红肿出血、牙齿松动掉牙和体重下降。三大最常见牙病是牙龈炎(可逆)、牙周炎(一旦发展不可逆)和牙吸收(猫掉牙最常见原因,病因不明)。牙龈炎不只是“没刷牙”,也可能由 FeLV、FIV、杯状病毒、严重肾病、糖尿病和自身免疫病等系统性疾病引发。诊断必须由兽医做完整口腔检查,多数需要镇静或全麻加牙片 X 光。真正危险的是舌下线异物、口腔灼伤、可阻塞气道的颌下肿块、易溃疡出血的恶性肿瘤,以及未排除狂犬病的流口水,这些要急停直跳红档。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `oral_rf_string` | 舌下或口内卡着线/绳/丝带 | 立即就医,绝对不要拉 | `oral_010` |
| `oral_rf_burn` | 刚咬电线、接触化学品或烫水后嘴痛、流口水、口腔红肿溃烂 | 立即急诊 | `oral_011` |
| `oral_rf_mass_airway` | 颌下/咽喉肿块,伴吞咽困难或呼吸费力 | 立即急诊 | `oral_012`, `oral_021`, `emg_001` |
| `oral_rf_tumor` | 口腔内不愈合、易出血或溃烂的肿物,面部肿胀 | 当天/急诊就医 | `oral_013` |
| `oral_rf_rabies` | 突发大量流口水,且未免疫或近期有流浪猫/动物撕咬接触史 | 立即就医并隔离防护 | `oral_014` |
| `oral_rf_cannot_eat` | 看着食物哆嗦、接近又嘶叫跑开、完全无法进食 | 立即联系兽医 | `oral_007`, `oral_006` |
| `oral_rf_collapse_breath` | 同时叫不醒、瘫软或呼吸困难、牙龈发白发紫 | 立即急诊 | `emg_001`, `emg_006`, `emg_009` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 轻微口臭或幼猫换牙期牙龈发红、少量渗血,仍正常吃喝、无其它异常 | 绿/黄边界:开始定期口腔检查 + 训练刷牙,记录变化 | `oral_004`, `oral_016` |
| moderate | 口臭加重、流口水、吃饭偏头/单边咀嚼、拒食硬粮、牙龈红肿出血或牙松动,但无红旗 | 黄档:约门诊,兽医镇静下完整检查 + 牙片 + 排除全身病 | `oral_001`, `oral_002`, `oral_004`, `oral_008` |
| severe | 舌下线异物、口腔灼伤、颌下肿块(气道风险)、可疑肿瘤、未排除狂犬病的流口水、完全拒食 | 红档:急诊或立即联系兽医 | `oral_010`, `oral_011`, `oral_012`, `oral_013`, `oral_014` |

## 6. 宿主风险画像

低风险特征:

- 成年、免疫完整、无慢病。
- 只是轻度口臭或幼猫换牙,仍正常吃喝、精神正常。
- 无流口水、无肿块、无线异物、无灼伤接触史。

高风险特征:

- 老年猫,尤其 10 岁以上,口腔肿瘤风险显著上升。
- 慢性病猫:肾病、糖尿病、FIV/FeLV 感染者。
- 幼猫换牙期咬电线、误碰化学品/烫水。
- 户外猫、多猫家庭打架致嘴部外伤;未免疫或有流浪动物撕咬接触史。
- 完全拒食、明显消瘦、流口水带血。

规则:年龄、慢病、免疫状态只用于缩短观察窗口。老年、慢病、幼猫窗口更短;任何情况下都不把舌下线异物、灼伤、气道风险肿块、可疑肿瘤或未排除狂犬病的流口水降级成“熬一熬”。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `oral_q_main_sign` | 主要表现决定典型牙病还是急症 | 完全拒食/接近-躲避为 red,溃疡出血为高黄 | `oral_004`, `oral_007` |
| `oral_q_emergency` | 线异物、灼伤、肿块、肿瘤是硬急症 | 命中任一为 red 并急停 | `oral_010`, `oral_011`, `oral_012`, `oral_013` |
| `oral_q_drool_rabies` | 流口水需先排除狂犬病 | 未免疫+撕咬接触史为 red | `oral_014` |
| `oral_q_host_context` | 年龄、慢病、换牙期决定窗口 | 老年/慢病更保守,幼猫换牙支持 green | `oral_005`, `oral_016`, `oral_020` |

## 8. 就医前护理

### 可以做

- 记录口臭、流口水、食量、单边咀嚼、牙龈颜色和体重变化开始时间,能安全拍照/拍视频就拍给兽医看。
- 改喂软食或温水泡软,减轻进食疼痛,先维持进食和饮水。
- 怀疑狂犬病暴露(未免疫+流浪动物撕咬)时先隔离、做好防护并尽快就医。
- 开始用专为猫设计的牙刷牙膏训练每日刷牙(仅限无明显口腔疼痛、未命中红旗时)。

### 不建议做

- 不要因为“只是口臭”或“看着没事”就判定没问题,猫会藏口腔疼痛。
- 不要用手强行扒开疼痛的猫的嘴检查,会加重恐惧、自伤或被抓咬。
- 不要相信“啃硬粮/咬骨头自然清洁就行”能替代刷牙和兽医检查。

### 绝对不要做

- 绝不用人牙膏或人漱口水,对猫有毒。
- 看到舌下或口内的线/绳绝对不要拉出来,立即就医。
- 不要自己用金属器械刮牙结石,也不要自己给猫拔牙。
- 不要给人用止痛药、抗生素或镇静药。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 抗生素 | 抗生素单用治牙龈炎无效;细菌感染存在时才在兽医方案中使用 | 只说明类别需兽医判断,不推荐商品名或剂量 | `oral_015` |
| 止痛/抗炎/免疫调节 | 严重牙吸收、FCGS 需止痛及抗炎/免疫调节,方案个体化 | 只展示治疗方向,不给剂量 | `oral_006` |
| 猫用牙膏/牙刷/洁齿产品 | 须用专为猫设计且可吞咽的产品;洁齿产品有效性由 VOHC 评估,具体由兽医建议 | 只说要用猫专用、避免人牙膏,不点名商品 | `oral_009`, `oral_017` |
| 国内药品可得性 | 所有药品卡需查国内批准和兽医审核 | AI 不展示剂量 | `oral_019` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 牙病流行率 | Cornell 给 50-90%(>4 岁),VCA 给“半数以上(>3 岁)” | 面向用户用“大半成年猫有牙病、且常被忽视”的保守表述 | 中文文案数字是否引用 |
| 洁齿骨/洁齿粉 | 国内宠物圈常用,临床对硬物洁齿有争议(可能牙断) | 不点名推荐,强调刷牙 + 兽医检查,洁齿产品看 VOHC 与兽医建议 | 国内常见产品是否可信 |
| 全口拔牙预期 | 新手家长第一次听会震惊 | red 文案预先告知早拔 60-80% 改善,让用户对兽医方案不要慌 | 中文如何避免吓退用户 |
| 狂犬病鉴别 | 中国强制免疫,但流浪/未免疫仍需注意 | 仅在未免疫 + 撕咬接触史时主动提示 | 实操层面是否更主动提示 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `oral_001` | 牙病在猫极常见,50-90% 的 4 岁以上猫有某种牙病,但最常见类型大多可通过预防牙科护理与监测来预防或治疗。 | Cornell Feline Dental Disease | L1 | overview | draft |
| `oral_002` | 猫三大最常见牙病是牙龈炎、牙周炎和牙吸收;牙龈炎通常可逆,牙周炎一旦发展则不可逆。 | Cornell Feline Dental Disease | L1 | overview/severity | draft |
| `oral_003` | 牙吸收是猫掉牙最常见原因,30-70% 的猫出现这种破坏过程,病因不明,疼痛时常需拔牙。 | Cornell Feline Dental Disease | L1 | overview | draft |
| `oral_004` | 牙病的猫可能口臭、流口水、唾液带血、吃饭时偏头或单边咀嚼、掉食、吞咽困难、抓挠嘴巴、拒食硬粮偏好软食、食欲下降和体重下降。 | Cornell / VCA / Merck | L1/L2 | question/severity | draft |
| `oral_005` | 牙龈炎可由系统性或感染性疾病引发,包括猫白血病病毒、猫免疫缺陷病毒、杯状病毒、严重肾病、糖尿病和自身免疫病,此时常伴口腔黏膜炎症或溃疡(口炎)。 | Cornell Feline Dental Disease | L1 | host risk/analysis | draft |
| `oral_006` | 严重猫慢性牙龈口炎(FCGS)目前唯一被证明有效的治疗是手术拔除全部前臼齿和臼齿(必要时全口拔牙);早期拔牙可使 60-80% 的猫显著改善或完全缓解,延迟拔牙效果差。 | Merck Disorders of the Mouth | L1 | severity/medicine | draft |
| `oral_007` | FCGS 的猫常出现“接近-躲避”反应:饿着接近食物,靠近后却嘶叫、跳开或跑开,提示进食极度疼痛,开口或打哈欠时可能呜咽大叫。 | Merck Disorders of the Mouth | L1 | red flag/question | draft |
| `oral_008` | 口腔疾病在猫多隐匿,完整口腔检查多因疼痛与不配合需要镇静或全麻,并需牙片 X 光评估牙根,必要时活检鉴别炎症与肿瘤。 | VCA / Cornell / Merck | L1/L2 | analysis | draft |
| `oral_009` | 预防牙病应用专为猫设计、可吞咽的牙膏每日刷牙,绝不能用人牙膏或人漱口水,人用产品对猫有毒。 | Cornell / VCA / Merck | L1/L2 | home care/medicine | draft |
| `oral_010` | 线、绳或其它异物可能卡在猫的舌头下方,引起流口水和拒食,属于需要立即就医的情况,绝不可自行拉出。 | Merck Disorders of the Mouth | L1 | red flag | draft |
| `oral_011` | 猫咬电线、接触化学品或热烫可造成口腔烧伤;任何口腔烧伤都应评估并治疗其它身体系统损伤,某些情况可危及生命。 | Merck Disorders of the Mouth | L1 | red flag | draft |
| `oral_012` | 咽部(咽喉)唾液囊肿等颌下/咽喉肿块可阻塞气道导致呼吸困难,属于危及生命的急症。 | Merck Disorders of the Mouth | L1 | red flag | draft |
| `oral_013` | 猫的口腔肿瘤多为恶性,鳞状细胞癌最常见,常累及牙龈和舌头、易溃疡出血、面部可肿胀,预后较差,早诊断早治疗是关键。 | Merck Disorders of the Mouth | L1 | red flag | draft |
| `oral_014` | 流口水(过度流涎)最严重的原因是狂犬病,兽医会首先排除;未免疫或有流浪动物撕咬接触史的猫尤需警惕。 | Merck Disorders of the Mouth | L1 | red flag | draft |
| `oral_015` | 仅用抗生素治疗牙龈炎几乎没有证据证明有效,需结合洁牙、牙周治疗和病因处理。 | Cornell Feline Dental Disease | L1 | medicine boundary | draft |
| `oral_016` | 幼猫出牙时牙龈发红(出牙性牙龈炎)是正常现象,应随发育消退;若超出出牙期持续不退可能是幼年性牙龈炎,需兽医评估。 | VCA Dental Disease in Cats | L2 | green | draft |
| `oral_017` | 不要自行用任何金属器械刮除牙结石,可能伤到猫或在牙面留下划痕加速菌斑形成;正规牙科处理需全麻。 | VCA Dental Disease in Cats | L2 | home care | draft |
| `oral_018` | 猫有严重牙龈炎时刷牙会相当疼痛,刷牙前应先咨询兽医。 | Cornell Feline Dental Disease | L1 | home care | draft |
| `oral_019` | 国内相关药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |
| `oral_020` | 没有红旗时仍需结合年龄、系统性疾病、症状持续时间和进食情况判断观察窗口与是否就医。 | VCA / 产品综合 | L2/internal | triage control | needs vet review |
| `oral_021` | 颌下或颈部缓慢增大的肿块可能是唾液囊肿、脓肿、囊肿或肿瘤,兽医可用穿刺抽液鉴别,不可自行挤压或挑破。 | Merck Disorders of the Mouth | L1 | red flag/home care | draft |

## 12. 待兽医审核

- 牙病流行率中文文案是否直接引用 50-90% 这一数字,避免吓到新手。
- 国内常见“猫用洁齿骨/洁齿粉/洁牙凝胶”的有效性与安全性,App 是否可点名某些类型可信。
- 国内宠物医院猫口腔 X 光 + 全麻洗牙的可及性与价格区间,用户对成本恐惧而拖延如何引导。
- 狂犬病作为流口水鉴别在中国实操层面是否需要 App 更主动提示。
- 幼猫换牙期(3-6 月)正常出血与需就医的临界点。
- “全口拔牙”预后(60-80% 改善)是否在 red 文案预先告知,让用户对兽医方案不被吓到。
