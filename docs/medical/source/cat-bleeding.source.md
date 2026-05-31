# 病情资料:猫出血 / 看到血

## 0. 元信息

- `condition_id`:`cat_bleeding`
- 中文名:猫出血 / 看到血
- 英文名:Bleeding / blood seen in cats
- 对应 triage symptom:`blood`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-30
- 上次人工核对:2026-05-30
- 关联 AI card:`docs/medical/ai-cards/cat-bleeding.ai-card.md`
- 原始抓取:`docs/medical/raw/batch3-sensory-emergency/cat-bleeding/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| vca_first_aid_bleeding | VCA, First Aid for Bleeding Cats | https://vcahospitals.com/know-your-pet/first-aid-for-bleeding-cats | L2 | 2026-05-30 HTTP 200, text 13206 bytes | 外部出血急救、止不住红旗、休克信号 |
| vca_epistaxis | VCA, Nose Bleeds or Epistaxis in Cats | https://vcahospitals.com/know-your-pet/nose-bleeds-or-epistaxis-in-cats | L2 | 2026-05-30 HTTP 200, text 13280 bytes | 鼻出血处理、追问依据 |
| vca_open_wounds | VCA, Care of Open Wounds in Cats | https://vcahospitals.com/know-your-pet/care-of-open-wounds-in-cats | L2 | 2026-05-30 HTTP 200, text 12128 bytes | 开放伤护理、家庭禁忌 |
| vca_rodenticide_warfarin | VCA, Rodenticide Warfarin Poisoning in Cats | https://vcahospitals.com/know-your-pet/rodenticide-warfarin-poisoning-in-cats | L2 | 2026-05-30 HTTP 200, text 12824 bytes | 抗凝鼠药出血风险 |
| merck_gi_disorders | Merck Veterinary Manual, GI Disorders in Cats | https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/disorders-of-the-stomach-and-intestines-in-cats | L1 | 2026-05-30 HTTP 200, text 22517 bytes | 呕血/黑便/GI 出血 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 药品地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则 |

## 2. 给产品的一句话

“看到血”不是一个疾病,AI 要先定位血从哪里来、量多少、是否还在流、有没有休克/贫血/呼吸异常、是否外伤或误食鼠药;能压住的小伤口和内出血/消化道出血/止不住出血的处理完全不同。

## 3. 症状/病情概述

猫出血可能来自皮肤伤口、指甲、口鼻、呕吐物、粪便、尿液、生殖道或内部出血。外部出血可用持续按压做就医前急救;内部出血、消化道出血、抗凝鼠药、苍白牙龈、快速呼吸和虚弱需要急诊。AI 不应只问“血多吗”,还要问是否能止住、黏膜颜色、呼吸和精神状态。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `bld_rf_uncontrolled` | 持续按压 10-15 分钟仍止不住,或大量/喷射样出血 | 立即急诊 | `bld_003`, `bld_004`, `emg_004` |
| `bld_rf_shock` | 牙龈苍白/白、呼吸快、虚弱、瘫软、意识差 | 立即急诊 | `bld_002`, `emg_006`, `emg_009` |
| `bld_rf_internal` | 怀疑胸腹内部出血、被车撞/高处坠落、腹部膨大、无明显外伤但虚弱 | 急诊,家庭无法止血 | `bld_001`, `bld_006` |
| `bld_rf_gi` | 呕血、咖啡渣样呕吐、黑便/柏油样便、便血伴精神差 | 急诊/当天门诊 | `bld_012`, `emg_003` |
| `bld_rf_nose_breath` | 鼻血止不住或伴呼吸困难 | 立即联系兽医/急诊 | `bld_007`, `emg_001` |
| `bld_rf_toxin` | 怀疑误食鼠药/抗凝剂,或多处出血/瘀斑 | 急诊/毒物路径 | `bld_010`, `bld_011`, `emg_008` |
| `bld_rf_object` | 深插异物或胸腹部有突出物 | 不要拔出,立即急诊 | `bld_005` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 指甲少量出血或浅表小伤,按压后 5-10 分钟停止,精神/牙龈/呼吸正常 | 绿/黄边界:继续观察伤口,防舔咬,给升级条件 | `bld_003`, `bld_009` |
| moderate | 小到中等开放伤、鼻血已止、少量血便/尿血但精神尚可,无休克和呼吸异常 | 黄档:当天联系兽医或门诊 | `bld_007`, `bld_009`, `bld_012` |
| severe | 止不住、量大、苍白牙龈/虚弱/呼吸快、内出血风险、消化道出血、鼠药、深部异物 | 红档:立即急诊 | `bld_002`, `bld_004`, `bld_006`, `bld_010`, `bld_012` |

## 6. 宿主风险画像

低风险特征:

- 成年健康猫。
- 出血点明确、浅表、很少量,持续按压后停止。
- 牙龈粉红、呼吸正常、精神食欲正常。

高风险特征:

- 幼猫、老年猫、慢病猫、正在用药或凝血异常史。
- 外伤、高处坠落、车祸、打架咬伤、深伤口。
- 可能接触鼠药、抗凝药、杀虫剂或不明毒物。
- 苍白/白牙龈、虚弱、呼吸快、出血不止、多个部位出血。

规则:年龄和抵抗力不能用来解释或观察止不住出血;高风险宿主的轻微血迹也应更快咨询兽医。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `bld_q_location` | 血的来源决定是外伤、鼻血、消化道、泌尿或毒物路径 | 呕血/黑便/尿血/鼻血止不住支持 yellow/red | `bld_007`, `bld_012` |
| `bld_q_amount_control` | 是否能被持续按压止住是核心分级点 | 10-15 分钟仍流为 red | `bld_003`, `bld_004` |
| `bld_q_shock` | 苍白牙龈、呼吸快、虚弱提示休克/内出血 | 是则 red | `bld_002`, `bld_006` |
| `bld_q_trauma_object` | 深伤、胸腹突出物和外伤不能家庭处理 | 是则 red | `bld_005`, `bld_006` |
| `bld_q_toxin` | 抗凝鼠药出血可延迟且常不明显 | 可能接触则 red/toxin path | `bld_010`, `bld_011` |

## 8. 就医前护理

### 可以做

- 外部出血:用干净纱布/布料持续按压,不要频繁揭开查看。
- 爪/指甲少量出血:可用止血粉;没有时可临时用玉米淀粉/面粉辅助。
- 鼻血:保持安静,可用冰袋隔布冷敷鼻梁,同时观察呼吸。
- 开放伤:防止舔咬,必要时伊丽莎白圈;尽快联系兽医。
- 拍照片,记录出血开始时间、量、颜色、是否按压后停止。

### 不建议做

- 不要给人用止痛药、止血药、抗生素或消炎药。
- 不要在伤口上涂抹药膏、消毒剂或粉末,除非兽医指导。
- 不要因为鼻血后出现黑便/吐血就自行判断来源,应告诉兽医。

### 绝对不要做

- 不要拔出深插异物或胸腹部突出物。
- 不要向鼻孔塞棉签/纸巾/棉球。
- 不要用酒精、双氧水、肥皂、洗发水、草本制剂、茶树油处理开放伤。
- 怀疑鼠药时不要自行催吐或喂维生素 K/止血药。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 止血粉/按压材料 | 小指甲/爪部出血可用止血粉或临时粉类辅助,但止不住要急诊 | 可作为器械/急救材料提示,不替代就医 | `bld_003`, `bld_004` |
| 维生素 K1 | 抗凝鼠药中毒可用处方维生素 K1,严重者需住院 | 只说“兽医可能用解毒/支持治疗”,不推荐购买/剂量 | `bld_011` |
| 抗生素/止痛药 | 开放伤或咬伤是否用药需兽医判断 | 不推荐任何人药或剂量 | `bld_009`, `bld_013` |
| 国内药品可得性 | 止血、解毒、抗生素/止痛相关药品必须查国内批准和标签 | 药品卡必须 CN 可得性 + 兽医审核 | `bld_013` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 小伤口是否绿档 | VCA 给出家庭按压/防舔护理,但开放伤常需兽医评估 | 小且止住可绿/黄边界;咬伤、深伤、持续出血为黄/红 | 咬伤是否一律当天门诊 |
| 鼻血处理 | VCA 允许冷敷鼻梁,但不塞鼻孔 | 产品展示冷敷和安静,同时给升级条件 | 是否建议所有鼻血当天门诊 |
| 鼠药维生素 K1 | 来源明确治疗,但用户自行用药风险高 | 只做红档和兽医处方边界 | 是否在用户端提“维生素 K1” |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `bld_001` | 外部出血可见但内部胸腹出血更危险,可能不易被用户发现。 | VCA First Aid for Bleeding | L2 | overview/red | draft |
| `bld_002` | 牙龈苍白/白、呼吸快速、虚弱等可提示休克或严重失血,需要紧急处理。 | VCA First Aid for Bleeding / Anicira / PetMD | L2/L3 | red flag | draft |
| `bld_003` | 外部出血应先用干净纱布/布料持续直接按压;爪/指甲出血通常 5-10 分钟可停止。 | VCA First Aid for Bleeding | L2 | home care | draft |
| `bld_004` | 外部出血持续按压 10-15 分钟仍止不住应去急诊医院。 | VCA First Aid for Bleeding | L2 | red flag | draft |
| `bld_005` | 不应拔出深插异物或胸腹部突出物,也不要把绷带缠得过紧。 | VCA First Aid for Bleeding | L2 | forbidden | draft |
| `bld_006` | 内部出血无法在家止血,应尽快就医。 | VCA First Aid for Bleeding | L2 | red flag | draft |
| `bld_007` | 猫鼻血可先保持安静并冷敷鼻梁;不要往鼻孔塞材料,止不住或呼吸困难应立即就医。 | VCA Epistaxis | L2 | home/red | draft |
| `bld_008` | 鼻血被吞下后可能导致黑便或吐出血样内容物,不一定代表原发胃肠出血。 | VCA Epistaxis | L2 | explanation | draft |
| `bld_009` | 开放伤可先直接按压和防舔咬,但不应自行涂抹药膏、消毒剂、酒精、双氧水、草本或茶树油等。 | VCA Open Wounds | L2 | home/forbidden | draft |
| `bld_010` | 抗凝鼠药可导致延迟 3-7 天出现出血,且出血常为内部、不明显;怀疑接触应立即联系兽医或毒物热线。 | VCA Rodenticide Warfarin | L2 | toxin/red | draft |
| `bld_011` | 抗凝鼠药中毒的维生素 K1 是处方治疗,严重病例可能需要住院;不应在家自行催吐。 | VCA Rodenticide Warfarin | L2 | medicine boundary | draft |
| `bld_012` | 呕吐鲜血/咖啡渣样内容物、黑色柏油样便或苍白牙龈可提示消化道出血或溃疡,严重时可危及生命。 | Merck GI Disorders | L1 | red flag | draft |
| `bld_013` | 国内止血、解毒、抗生素或止痛相关药品展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |

## 12. 待兽医审核

- 小伤口/指甲出血是否允许绿档,以及观察窗口。
- 鼻血是否一律当天门诊。
- 是否在用户端出现“维生素 K1”这个药名。
- 咬伤/开放伤是否需要默认抗生素相关提醒,以及如何避免用户自行买药。
