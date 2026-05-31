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
| cornell_dental_disease | Cornell Feline Health Center, Feline Dental Disease | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feline-dental-disease | L1 | 2026-05-30 HTTP 200 OK | 牙病流行率、三大牙病、牙吸收、系统病因、刷牙与人牙膏毒性 |
| merck_mouth_disorders | Merck Veterinary Manual, Disorders of the Mouth in Cats | https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/disorders-of-the-mouth-in-cats | L1 | 2026-05-30 HTTP 200 OK | FCGS 拔牙、接近-躲避、舌下线异物、口腔灼伤、咽部囊肿、口腔肿瘤、流口水、口干、真菌性口炎鉴别 |
| vca_dental_disease_cats | VCA Hospitals, Dental Disease in Cats | https://vcahospitals.com/know-your-pet/dental-disease-in-cats | L2 | 2026-05-30 HTTP 200 OK | 临床信号、掉食/抓嘴/甩头/牙齿打颤、麻醉下口腔检查与牙片、幼猫换牙、勿自行刮结石、洁齿产品与刷牙 |
| vca_plaque_tartar_cats | VCA Hospitals, Plaque and Tartar Prevention in Cats | https://vcahospitals.com/know-your-pet/plaque-and-tartar-prevention-in-cats | L2 | 2026-05-31 web verified | 牙菌斑/牙结石形成、牙黄解释、专业清洁后居家护理 |
| vohc_accepted_cats | Veterinary Oral Health Council, Accepted Products for Cats | https://vohc.org/accepted-products/ / https://vohc.org/wp-content/uploads/2026/03/VOHCAcceptedProductsTable_Cats-3-18-26.pdf | L1-product | 2026-05-31 web verified | 猫口腔护理产品背书、猫用洁齿产品类别与示例 |
| aaha_pet_dental_care | AAHA, Dog & cat dental disease: signs, professional cleanings, anesthesia, and home care | https://www.aaha.org/resources/your-pets-dental-care/ | L1 | 2026-05-31 web verified | 麻醉洁牙、牙片、每日刷牙、VOHC seal、居家护理边界 |
| aaha_dental_guidelines | AAHA, 2019 Dental Care Guidelines for Dogs and Cats | https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/guidelines-summary/ | L1 | 2026-05-31 web verified | 牙科作为基础医疗、全麻牙片、疼痛管理与居家口腔卫生 |
| wsava_dental_guidelines | WSAVA, Global Dental Guidelines | https://wsava.org/global-guidelines/dental-guidelines/ | L1 | 2026-05-31 web verified | 牙科疾病高发、全球最佳实践、刷牙资源 |
| cornell_gingivostomatitis | Cornell Feline Health Center, Gingivostomatitis | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/gingivostomatitis | L1 | 2026-05-31 web verified | 严重牙龈口炎疼痛、刷牙禁忌、健康猫刷牙收益 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则、呼吸困难/塌陷/牙龈苍白交叉引用 |

## 2. 给产品的一句话

口腔问题是“被严重低估的常见入口”:50-90% 的成年猫有牙病却因猫藏疼痛而被忽视;AI 要先排舌下线异物、口腔灼伤、颌下肿块(气道风险)、可疑肿瘤、未排除狂犬病的流口水等急症,再把典型牙病导向兽医镇静下完整检查。非药品护理用品可以基于 VOHC/AAHA 等专业来源推荐候选或选购标准,但不能把牙膏牙刷说成治疗当前牙龈红肿/疼痛的办法。

## 3. 症状/病情概述

猫极擅长隐藏口腔疼痛,很多有牙病的猫主人看不出异常。常见信号不只是口臭和流口水,还包括口水带血、吃饭偏头或单边咀嚼、掉食/漏食、吞咽困难、牙齿打颤或下颌抖、甩头、用爪子抓嘴、拒食硬粮偏好软食、抚摸嘴巴抗拒、张嘴或打哈欠会叫、牙龈红肿出血、牙齿松动掉牙、牙面粉红小洞或缺损、脸/下巴肿胀或流脓口、嘴里白色斑块/白膜、咂嘴伸舌像口干,以及体重下降。三大最常见牙病是牙龈炎(可逆)、牙周炎(一旦发展不可逆)和牙吸收(猫掉牙最常见原因,病因不明且可非常疼)。牙龈炎不只是“没刷牙”,也可能由 FeLV、FIV、杯状病毒、严重肾病、糖尿病和自身免疫病等系统性疾病引发。诊断必须由兽医做完整口腔检查,多数需要镇静或全麻加牙片 X 光。牙齿发黄常见于牙菌斑矿化成牙结石:刷牙主要预防牙菌斑,已变硬的牙结石通常需要兽医专业洁牙处理,不能自己刮。真正危险的是舌下线异物、口腔灼伤、可阻塞气道的颌下/咽喉肿块、可疑牙源性脓肿或面部/下巴流脓、易溃疡出血的恶性肿瘤,以及未排除狂犬病的流口水,这些要急停或至少当天就医。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `oral_rf_string` | 舌下或口内卡着线/绳/丝带 | 立即就医,绝对不要拉 | `oral_010` |
| `oral_rf_burn` | 刚咬电线、接触化学品或烫水后嘴痛、流口水、口腔红肿溃烂 | 立即急诊 | `oral_011` |
| `oral_rf_mass_airway` | 颌下/咽喉肿块,伴吞咽困难或呼吸费力 | 立即急诊 | `oral_012`, `oral_021`, `emg_001` |
| `oral_rf_tumor` | 口腔内不愈合、易出血或溃烂的肿物,面部肿胀 | 当天/急诊就医 | `oral_013` |
| `oral_rf_rabies` | 突发大量流口水,且未免疫或近期有流浪猫/动物撕咬接触史 | 立即就医并隔离防护 | `oral_014` |
| `oral_rf_cannot_eat` | 看着食物哆嗦、接近又嘶叫跑开、完全无法进食 | 立即联系兽医 | `oral_007`, `oral_006` |
| `oral_rf_face_abscess` | 面部、眼下、下巴肿胀或有流脓口,伴疼痛/拒食/精神差 | 当天就医,若呼吸/吞咽受影响则急诊 | `oral_031` |
| `oral_rf_collapse_breath` | 同时叫不醒、瘫软或呼吸困难、牙龈发白发紫 | 立即急诊 | `emg_001`, `emg_006`, `emg_009` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 轻微口臭、轻微牙黄或幼猫换牙期牙龈发红/少量渗血,仍正常吃喝、无其它异常 | 绿/黄边界:开始定期口腔检查 + 训练刷牙,可用 VOHC 背书护理用品做日常预防 | `oral_004`, `oral_016`, `oral_022`, `oral_024` |
| moderate | 口臭加重、黄色/棕色硬牙结石、流口水/口水带血、抓嘴/甩头/牙齿打颤、掉食、吃饭偏头/单边咀嚼、拒食硬粮、牙龈红肿出血、牙面粉红小洞/缺损、嘴里白斑/白膜、口干咂嘴伸舌或牙松动,但无硬红旗 | 黄档:约门诊,兽医镇静下完整检查 + 牙片 + 排除全身病;不要靠牙膏牙刷硬处理 | `oral_001`, `oral_002`, `oral_004`, `oral_008`, `oral_025`, `oral_026`, `oral_027`, `oral_029`, `oral_030`, `oral_033`, `oral_034` |
| severe | 舌下线异物、口腔灼伤、颌下肿块(气道风险)、可疑肿瘤、未排除狂犬病的流口水、面部/下巴肿胀流脓伴疼痛或精神差、完全拒食 | 红档:急诊或立即联系兽医 | `oral_010`, `oral_011`, `oral_012`, `oral_013`, `oral_014`, `oral_031` |

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
- 面部/眼下/下巴肿胀或流脓,提示可能已有牙源性脓肿或深部问题。
- 口腔白色斑块/白膜伴免疫抑制、长期抗生素、慢病或食欲下降。
- 老年肾病猫出现口干、咂嘴、伸舌、想吃又退开。

规则:年龄、慢病、免疫状态只用于缩短观察窗口。老年、慢病、幼猫窗口更短;任何情况下都不把舌下线异物、灼伤、气道风险肿块、可疑肿瘤或未排除狂犬病的流口水降级成“熬一熬”。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `oral_q_main_sign` | 主要表现决定典型牙病还是急症 | 完全拒食/接近-躲避为 red,溃疡出血为高黄 | `oral_004`, `oral_007` |
| `oral_q_emergency` | 线异物、灼伤、肿块、肿瘤是硬急症 | 命中任一为 red 并急停 | `oral_010`, `oral_011`, `oral_012`, `oral_013` |
| `oral_q_drool_rabies` | 流口水需先排除狂犬病 | 未免疫+撕咬接触史为 red | `oral_014` |
| `oral_q_hidden_pain` | 抓嘴、甩头、牙齿打颤、掉食、张嘴叫痛常提示隐藏口腔疼痛 | 命中则至少 yellow,完全拒食/接近-躲避为 red | `oral_004`, `oral_007`, `oral_029`, `oral_032` |
| `oral_q_tooth_surface` | 牙黄、牙结石、粉红小洞/缺损用于区分日常护理、牙结石和牙吸收/牙周病 | 硬牙结石/粉红洞/缺损为 yellow;轻微黄垢且无痛可 green | `oral_025`, `oral_030` |
| `oral_q_face_swelling_or_plaque` | 脸/下巴肿胀流脓、嘴里白斑/白膜、咂嘴伸舌口干提示脓肿/真菌/口干等非普通牙垢问题 | 脸肿流脓为当天就医;白斑/口干伴慢病为 yellow | `oral_031`, `oral_033`, `oral_034` |
| `oral_q_host_context` | 年龄、慢病、换牙期决定窗口 | 老年/慢病更保守,幼猫换牙支持 green | `oral_005`, `oral_016`, `oral_020` |
| `oral_q_care_product_stage` | 用户问牙膏牙刷/品牌时先区分“当前症状处理”还是“日常护理” | 正在牙龈红肿/疼/流口水/拒食时先就医;无疼痛或兽医确认后才推荐日常护理用品 | `oral_018`, `oral_022`, `oral_023`, `oral_024`, `oral_028` |

## 8. 就医前护理

### 可以做

- 记录口臭、流口水、口水是否带血、食量、掉食/吞咽、单边咀嚼、抓嘴/甩头、牙龈颜色、面部/下巴肿胀和体重变化开始时间,能安全拍照/拍视频就拍给兽医看。
- 改喂软食或温水泡软,减轻进食疼痛,先维持进食和饮水。
- 怀疑狂犬病暴露(未免疫+流浪动物撕咬)时先隔离、做好防护并尽快就医。
- 开始用专为猫设计的牙刷牙膏训练每日刷牙(仅限无明显口腔疼痛、未命中红旗时)。
- 用户追问品牌/购买时,可优先推荐 VOHC Accepted Products for Cats 里的猫用产品类别或候选,并提醒核验中国正规渠道和适用猫。
- 牙齿轻微发黄但不疼、不红肿时,刷牙、牙科饮食、洁齿零食/水添加剂等只能作为日常减 plaque/tartar 的辅助;若已经是硬牙结石,应约兽医评估专业洁牙。

### 不建议做

- 不要因为“只是口臭”或“看着没事”就判定没问题,猫会藏口腔疼痛。
- 不要用手强行扒开疼痛的猫的嘴检查,会加重恐惧、自伤或被抓咬。
- 不要相信“啃硬粮/咬骨头自然清洁就行”能替代刷牙和兽医检查。
- 不要把非麻醉洁牙/美容店刮牙当作正规牙科处理;它通常只处理可见表面,不能替代牙片和龈下清洁。

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
| 猫用牙膏/牙刷/洁齿产品 | 须用专为猫设计且可吞咽的产品;VOHC seal 表示产品按指示使用时达到 plaque/tartar 控制标准 | 可点名非药品护理候选或产品类别,但需说明适用日常护理、不是治疗当前红肿疼痛 | `oral_009`, `oral_017`, `oral_022`, `oral_023`, `oral_024` |
| VOHC 猫用候选示例 | 2026-03 VOHC 猫产品清单包括 Hill's/Science Diet/Royal Canin/Purina 等牙科处方或消费级饮食,HealthyMouth 牙膏刷套装/水添加剂/凝胶/喷雾/擦巾,ProDen/CEVA PlaqueOff 粉,Feline Greenies/Whiskas Dentabites/Purina DentaLife 等洁齿零食 | 若用户问“什么牌子”,可作为专业来源候选列出,并提醒 vet-only 产品需兽医渠道、国内购买需核验真伪与适用猫 | `oral_023` |
| 国内药品可得性 | 所有药品卡需查国内批准和兽医审核 | AI 不展示剂量 | `oral_019` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 牙病流行率 | Cornell 给 50-90%(>4 岁),VCA 给“半数以上(>3 岁)” | 面向用户用“大半成年猫有牙病、且常被忽视”的保守表述 | 中文文案数字是否引用 |
| 洁齿骨/洁齿粉 | 国内宠物圈常用,临床对硬物洁齿有争议(可能牙断) | 不点名推荐,强调刷牙 + 兽医检查,洁齿产品看 VOHC 与兽医建议 | 国内常见产品是否可信 |
| 牙膏牙刷品牌 | VOHC 猫用清单可作为“有效性证据”,但不证明中国一定可买或正品 | 可推荐 VOHC 猫用候选 + 本地正规渠道核验;若没有 VOHC/专业来源,只给选择标准 | 国内渠道白名单待补 |
| 牙齿发黄 | 用户常把“黄牙”当美容问题 | 若是软垢/轻微黄可日常护理;若是硬黄棕牙结石或伴牙龈红肿/口臭/疼痛,导向兽医牙科检查 | 中文如何让用户不被“全麻洁牙”吓退 |
| 牙吸收/粉红小洞 | 用户常以为是牙断、牙缺一块或牙龈盖住牙 | 作为疼痛性牙病入口,不诊断,建议牙片评估 | 中文如何描述“牙吸收”不吓人 |
| 脸肿/下巴流脓 | 可能被用户当皮肤病或外伤 | 口腔 flow 要兜住,引导当天兽医口腔/牙片检查 | 是否纳入皮肤 flow 交叉召回 |
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
| `oral_022` | VOHC 的职责是按标准评估宠物口腔产品在按指示使用时控制牙菌斑和牙结石的有效性;获得 seal 的产品可作为用户选择洁齿用品的重要依据,但仍建议定期兽医口腔检查。 | VOHC | L1-product | product boundary | draft |
| `oral_023` | 2026-03 VOHC 猫产品清单覆盖牙科饮食、水添加剂/口腔凝胶/喷雾/牙膏刷套装、擦巾、粉剂和洁齿零食;示例包括 Science Diet Oral Care for Cats、Purina Pro Plan Veterinary Diets DH Feline、Royal Canin Feline Dental Diet、Healthymouth Toothpaste/Brush Kit for Cats、Feline Greenies、Purina DentaLife 等。 | VOHC Accepted Products for Cats | L1-product | product examples | draft |
| `oral_024` | AAHA 建议每日刷牙是减少牙菌斑堆积的最佳居家方式,应使用软毛宠物牙刷和宠物专用牙膏,不要用人牙膏;洁齿零食可优先选择带 VOHC seal 的产品。 | AAHA Pet Dental Care | L1 | home care/product | draft |
| `oral_025` | 牙菌斑会在进食后数小时内形成,约 24-48 小时开始矿化并变成粗糙多孔的牙结石;牙结石可在牙龈上下形成并促进细菌生长、牙龈炎、疼痛和牙周病。 | VCA Plaque and Tartar Prevention / VCA Dental Disease | L2 | yellow teeth/severity | draft |
| `oral_026` | 正规牙科清洁需要在全麻/镇静下移除牙龈上下的牙菌斑和牙结石并抛光;非麻醉洁牙通常只能处理可见牙面,不能清洁龈下或发现深层问题,容易造成安全假象。 | AAHA / VCA | L1/L2 | forbidden home action | draft |
| `oral_027` | 牙齿超过一半结构位于牙龈下方,许多看起来正常的猫牙也可能只有在全麻下口内牙片才能发现有临床意义的病变。 | AAHA Dental Guidelines / AAHA Pet Dental Care | L1 | analysis | draft |
| `oral_028` | Cornell 口炎资料强调患有严重牙龈口炎的猫刷牙会非常疼痛,不建议刷牙;健康猫则可通过刷牙获益。 | Cornell Gingivostomatitis | L1 | product stage boundary | draft |
| `oral_029` | 牙病有可见信号时可能表现为抓嘴、甩头、牙齿/下颌打颤、咀嚼痛、掉食、吞咽困难、过度流口水、口水带血、口臭、挑食、偏好湿粮和体重下降。 | VCA Dental Disease / Cornell Dental Disease / Merck Mouth Disorders | L1/L2 | symptoms/question | draft |
| `oral_030` | 猫牙吸收可能先看到牙龈线附近粉红色缺损,病变可非常疼,猫可能不愿吃、流口水、偏头吃饭或易怒,通常需要兽医口腔检查和牙片判断是否拔牙。 | Cornell Feline Dental Disease / VCA Dental Disease | L1/L2 | symptoms/severity | draft |
| `oral_031` | 严重牙周病可能导致牙根外露、牙松动/脱落、口鼻瘘、颌骨骨折、脓肿或在口腔/面部/下巴形成流脓通道;细菌进入血液还可能与心肝肾病变相关。 | VCA Dental Disease / Cornell Feline Dental Disease | L1/L2 | red flag/severity | draft |
| `oral_032` | 猫慢性牙龈口炎可累及口腔、牙龈和上咽喉,导致张嘴、打哈欠或叼食时痛叫/跳开,并伴口臭、过度流口水、吞咽困难、接近食物又跑开和消瘦。 | Merck Mouth Disorders | L1 | symptoms/red flag | draft |
| `oral_033` | 真菌性口炎虽少见,但可表现为舌头或口腔黏膜红、溃疡、出血、奶油样白色斑块/白膜、口臭、过度流口水和食欲下降,常与其它口腔病、长期抗生素或免疫抑制相关。 | Merck Mouth Disorders | L1 | symptoms/host risk | draft |
| `oral_034` | 口干可让猫想吃却又像食物不好吃一样转开,进食时咂嘴、频繁伸舌,口腔黏膜干燥且牙面常有厚菌斑;老年肾衰猫风险更高。 | Merck Mouth Disorders | L1 | symptoms/host risk | draft |

## 12. 待兽医审核

- 牙病流行率中文文案是否直接引用 50-90% 这一数字,避免吓到新手。
- 国内常见“猫用洁齿骨/洁齿粉/洁牙凝胶”的有效性与安全性,App 是否可点名某些类型可信。
- 国内宠物医院猫口腔 X 光 + 全麻洗牙的可及性与价格区间,用户对成本恐惧而拖延如何引导。
- 狂犬病作为流口水鉴别在中国实操层面是否需要 App 更主动提示。
- 幼猫换牙期(3-6 月)正常出血与需就医的临界点。
- “全口拔牙”预后(60-80% 改善)是否在 red 文案预先告知,让用户对兽医方案不被吓到。
- VOHC 产品示例里哪些在中国有稳定正规渠道,是否需要给“中国可买优先清单”。
