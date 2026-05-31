# 病情资料:猫皮肤问题(以猫癣 / dermatophytosis 为主)

## 0. 元信息

- `condition_id`:`cat_skin_problem`
- 中文名:猫皮肤问题 / 猫癣
- 英文名:Skin problems in cats / dermatophytosis (ringworm)
- 对应 triage symptom:`skin`
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-05-31
- 上次人工核对:2026-05-31
- 关联 AI card:`docs/medical/ai-cards/cat-skin-problem.ai-card.md`
- 原始抓取:`docs/medical/raw/batch4-chronic-specialty/cat-skin-problem/`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 抓取状态 | 用途 |
|---|---|---|---:|---|---|
| cornell_ringworm | Cornell Feline Health Center, Ringworm: A Serious but Readily Treatable Affliction | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/ringworm-serious-readily-treatable-affliction | L1 | 2026-05-30 HTTP 200 OK | 猫癣本质、人畜共患、自愈时长、疗程、诊断 |
| merck_ringworm | Merck Veterinary Manual, Ringworm (Dermatophytosis) in Cats(宠主版) | https://www.merckvetmanual.com/cat-owners/skin-disorders-of-cats/ringworm-dermatophytosis-in-cats | L1 | 2026-05-30 HTTP 200 OK | 病原比例、易感群体、表现部位、诊断金标准、治疗与环境消毒 |
| vca_allergies_cats | VCA, Allergies in Cats | https://vcahospitals.com/know-your-pet/allergies-in-cats | L2 | 2026-05-30 HTTP 200 OK | 跳蚤/特应性/食物/接触过敏、继发感染、鉴别诊断 |
| medicine_cn_availability | 国家兽药查询 / 中国兽药信息网 | `docs/medical/source-registry.md` | CN-RX | batch 2 已抓取入口 | 抗真菌药地区可得性边界 |
| cat_emergency_red_flags | 本资料库通用红旗 | `docs/medical/source/cat-emergency-red-flags.source.md` | internal | 已生成 | 急停规则交叉引用 |

## 2. 给产品的一句话

皮肤问题是“慢病/专科风险入口”,不是具体诊断;AI 要先排严重继发感染、皮肤问题伴全身症状、外伤化脓和疑似跳蚤的极度虚弱幼猫等红旗,再把典型皮肤病导向兽医确诊,并且一开始就讲清猫癣会传染给人,绝不替用户判断“是不是癣、自己抹点药就行”。

## 3. 症状/病情概述

猫的皮肤问题表现很像、病因很多:猫癣(真菌)、跳蚤/蚤过敏性皮炎、环境/食物/接触过敏、疥螨蠕形螨等寄生虫、打架抓伤等自家伤口、心因性过度舔毛秃,看上去都可能是“痒、掉毛、皮屑、结痂、红肿、圆形脱毛”。其中猫癣约 98% 由 Microsporum canis 引起,是真菌不是虫,会传染给人和狗,是新手家长最焦虑的点,要早讲明讲。轻微毛糙皮屑、无其它症状可以短期观察并查饮食/洗澡频率/季节性;但出现多发开放性溃疡流脓、皮肤问题加上萎靡不吃发热、咬伤外伤后化脓、疑似跳蚤的极度虚弱幼猫,不能在家拖。典型皮肤病一律强调“看着像不等于就是,必须兽医做真菌培养/镜检确诊”,反对“两天 20 元搞定”的家庭短期自治。

## 4. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `skin_rf_severe_infection` | 多发开放性溃疡、流脓、皮肤红肿热痛(严重继发感染) | 立即就医 | `skin_010`, `skin_015` |
| `skin_rf_systemic` | 皮肤问题同时伴萎靡、不吃、发热感(提示全身性问题) | 立即就医 | `skin_004`, `skin_017` |
| `skin_rf_wound_pus` | 咬伤/外伤后皮肤化脓、红肿热痛 | 当天就医或急诊 | `skin_015` |
| `skin_rf_kitten_flea_weak` | 疑似跳蚤且幼猫极度虚弱、牙龈苍白(跳蚤可致幼猫贫血) | 立即急诊 | `skin_014`, `emg_009` |
| `skin_rf_collapse` | 皮肤问题之外还出现叫不醒、瘫软、不能站立 | 立即急诊 | `emg_006` |
| `skin_rf_breathing` | 皮肤问题之外还出现张口喘、呼吸费力、牙龈/舌头发紫(可能严重过敏反应) | 立即急诊 | `skin_017`, `emg_001` |

## 5. 轻 / 中 / 重程度

| severity | 判断条件 | 对应处理 | claim_id |
|---|---|---|---|
| mild | 仅轻微毛糙、皮屑,局部小范围,无破溃流脓,精神食欲正常,无家人皮肤症状 | 绿/黄边界:短期观察并查饮食/洗澡频率/季节性,给升级条件 | `skin_008`, `skin_021` |
| moderate | 典型皮肤病表现(圆形脱毛、断毛、皮屑结痂、持续抓挠舔毛),或疑似跳蚤/过敏,无红旗 | 黄档:兽医确诊(真菌培养/镜检),反对家庭短期自治,环境消毒 | `skin_005`, `skin_006`, `skin_008`, `skin_011`, `skin_016` |
| severe | 多发开放性溃疡/流脓/红肿热痛,或皮肤问题伴萎靡不吃发热,或外伤化脓,或疑似跳蚤的极度虚弱幼猫 | 红档:立即就医或急诊 | `skin_010`, `skin_014`, `skin_015`, `skin_017` |

## 6. 宿主风险画像

低风险特征:

- 成年、免疫完整、无慢病、营养良好。
- 皮肤问题局部、轻微,无破溃流脓。
- 精神、食欲、呼吸正常。
- 家中没有人或其它宠物出现皮肤红痒圈。

高风险特征:

- 幼猫,免疫尚未发育成熟,最易感染猫癣,也最怕跳蚤致贫血。
- 长毛猫(更易藏孢子,感染更持久、易泛发)。
- 新到家、救助、收容所背景、多猫家庭或繁育猫舍。
- 免疫差、营养差、应激中、有慢病或正在用药。
- 家中有儿童、老人或免疫低人群(人畜共患暴露风险更高)。

规则:年龄/免疫/抵抗力只用于缩短观察窗口。幼猫、长毛、未免疫、慢病、新到家/多猫环境窗口更短;成年健康猫也不能在命中红旗时降级成“熬一熬”。

## 7. 分诊追问依据

| question_id | 为什么问 | 哪些答案会改变分级 | claim_id |
|---|---|---|---|
| `skin_q_pattern` | 主要表现决定走向(局部脱毛皮屑 / 全身痒 / 有伤口 / 仅毛糙) | 开放性溃疡/流脓为 red;典型脱毛皮屑为 yellow;仅毛糙皮屑支持 green | `skin_008`, `skin_010`, `skin_021` |
| `skin_q_human_contact` | 家人/其它宠物皮肤是否出现红痒圈,强提示真菌癣 | 家人出现红痒圈 → 强提示真菌、家人去皮肤科,卡片更保守 | `skin_003` |
| `skin_q_flea_parasite` | 是否见跳蚤/黑色蚤粪、剧烈抓挠尾背 | 疑似跳蚤且幼猫极度虚弱为 red;一般疑似跳蚤为 yellow | `skin_014`, `skin_015` |
| `skin_q_systemic` | 是否伴萎靡、不吃、发热、呼吸异常 | 伴全身症状或呼吸异常为 red | `skin_004`, `skin_017` |
| `skin_q_host_duration` | 年龄、免疫、长毛、新到家/多猫环境与时长决定观察窗口 | 幼猫/长毛/未免疫/多猫更保守 | `skin_009`, `skin_021` |

## 8. 就医前护理

### 可以做

- 记录皮损开始时间、部位、是否扩大、有无破溃流脓、抓挠舔毛频率、精神食欲变化,能安全拍清晰照片就拍给兽医看。
- 怀疑猫癣或寄生虫等传染性皮肤病时,先把患猫与其它猫、与儿童/老人/免疫低人群适度隔离,接触后洗手。
- 家中环境:猫接触的床品、玩具、猫窝热水洗烘干或更换,梳子/指甲剪/食盆水盆单独使用并消毒。
- 留意并提醒:如果家人皮肤出现红痒圈/脱皮,应去人医皮肤科,而不是兽医。

### 不建议做

- 不要凭“看着像癣”就自行下结论,也不要因为掉毛慌了就停在自我判断。
- 不要把持续抓挠、舔毛、皮屑解释成“正常换毛/天热”后长期拖延。
- 不要在没确诊前频繁更换宠物店外用药反复涂抹。

### 绝对不要做

- 不要自己买药膏(如克霉唑等)给猫乱涂;没确诊用错药会白治、拖延并掩盖病情。
- 不要给猫用人用抗真菌药;浓度/剂型未必适合猫,误食可能中毒。
- 不要指望“等它自己好”;猫癣不治可能要 9 个月到 1 年才自愈,期间持续掉毛、皮肤暴露、家人持续暴露、环境孢子持续散播。
- 不要因为掉毛就自己直接给猫剃毛;是否剃毛由兽医决定。
- 命中红旗时不要继续在家观察或尝试家庭药品。

## 9. 药品 / 补充剂 / 器械

| 类别 | 资料结论 | AI 面向用户策略 | claim_id |
|---|---|---|---|
| 抗真菌局部治疗 | 猫癣常用抗真菌膏/药浴/全身浴,兽医选定 | 只说明“需要兽医开抗真菌治疗”,不点名商品、不给剂量 | `skin_012` |
| 抗真菌口服治疗 | 泛发或顽固病例常需口服抗真菌药(如伊曲康唑/灰黄霉素/特比萘芬),兽医选定 | 只展示治疗类别,不推荐商品名或剂量 | `skin_012` |
| 跳蚤防治 / 抗生素 | 蚤过敏需严格灭蚤,继发细菌感染需兽医开抗生素 | 提示需兽医处理,不推荐具体灭蚤产品名或抗生素剂量 | `skin_014`, `skin_015` |
| 环境消毒 | Merck 建议稀释漂白水清洁环境 | 给一般家庭清洁/隔离方向,提醒猫不可直接接触消毒剂、清洁后通风 | `skin_013` |
| 自购外用药 / 人用抗真菌药 | 自买药膏乱涂、用人用抗真菌药均有风险 | 明确反对自购乱涂、反对人用抗真菌药 | `skin_019` |
| 国内药品可得性 | 所有药品卡需查国内批准和兽医审核 | AI 不展示剂量 | `skin_020` |

## 10. 来源分歧与采用策略

| topic | 分歧 | 当前采用 | 待兽医确认 |
|---|---|---|---|
| 是否点名抗真菌药 | Cornell/Merck 提到口服抗真菌药类别,但未要求用户自行选药 | 面向用户只说“由兽医选定的抗真菌治疗”,不点商品名、不给剂量 | 国内伊曲康唑/灰黄霉素/特比萘芬可及性与口径 |
| 克霉唑等自购外用药 | 临床常用,但 Cornell/Merck 未特别背书 | 明确提示“不要自己买药膏乱涂”,需兽医确诊后用药 | 是否在文案点名“克霉唑”这一具体词 |
| 等自愈是否可接受 | 猫癣在健康猫可自愈 | 不把“等自愈”作为合理选项:9 个月-1 年、持续掉毛、人持续暴露 | 中文文案如何既不恐吓又不让用户拖 |
| 环境消毒方案 | Merck 给稀释漂白水 | 给方向+安全提醒,不给精确配比作为医嘱 | 适合中国家庭的替代消毒方案 |

## 11. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `skin_001` | 猫癣(feline dermatophytosis)是真菌感染,与虫无关,名字里的“环(ring)”只指病灶常呈环状,“虫(worm)”是误称。 | Cornell Ringworm / Merck Ringworm | L1 | overview | draft |
| `skin_002` | 猫癣约 98% 由真菌 Microsporum canis 引起,在环境中容易传播。 | Merck Ringworm | L1 | overview | draft |
| `skin_003` | 猫癣是人畜共患病,可由感染猫传给接触者(人),也常通过接触感染猫或污染物(家具、梳理工具)传播;人若出现皮肤红痒圈应看人医皮肤科。 | Cornell / Merck Ringworm | L1 | red/yellow/question | draft |
| `skin_004` | 猫癣不治疗在健康猫可能自愈,但通常需要 9 个月到 1 年,其间猫持续掉毛、皮肤暴露,增加皮肤创伤和继发感染风险。 | Cornell Ringworm | L1 | yellow/host risk | draft |
| `skin_005` | 猫癣规范治疗通常需要至少 6 周的重复治疗,有些病例还要更久。 | Cornell Ringworm | L1 | yellow/medicine boundary | draft |
| `skin_006` | 兽医通过真菌培养、紫外灯(Wood's lamp)和毛发/皮屑直接镜检诊断猫癣;真菌培养最准确但可能需要约 3 周出结果。 | Merck / Cornell Ringworm | L1 | yellow/question | draft |
| `skin_007` | 紫外灯阳性可助早期诊断,但结果不总是可靠,需用真菌培养验证;猫癣表现多样,需先排除跳蚤过敏等长得像的皮肤病。 | Merck / Cornell Ringworm | L1 | yellow/question | draft |
| `skin_008` | 猫癣常见表现包括圆形脱毛区、断裂变粗或变色的毛、皮屑结痂、皮肤发红炎症、过度梳理抓挠、甲床感染和明显头皮屑。 | Cornell / Merck Ringworm | L1 | overview/question | draft |
| `skin_009` | 猫癣最常见于脸、耳尖、尾巴和爪子;幼猫最易感,长毛猫感染可能更持久、更泛发。 | Merck Ringworm | L1 | host risk | draft |
| `skin_010` | 泛发性猫癣可出现较大凸起伴开放性溃疡;部分猫表现为发痒的粟粒性皮炎小硬粒。 | Merck Ringworm | L1 | red flag | draft |
| `skin_011` | 多种皮肤病(跳蚤感染、皮肤螨、真菌如猫癣、自身免疫性皮肤病、某些肿瘤)表现相似,需兽医做完整诊断评估,不应自行诊断。 | VCA Allergies / Cornell Ringworm | L1/L2 | yellow/question | draft |
| `skin_012` | 猫癣治疗通常包括局部抗真菌药(药膏/药浴/全身浴)加全身口服抗真菌药,由兽医开具;长毛或泛发病例兽医可能建议剃毛。 | Cornell / Merck Ringworm | L1 | medicine boundary | draft |
| `skin_013` | 猫癣环境需用稀释漂白水彻底清洁;兽医会就避免家人感染给出防护建议。 | Merck Ringworm | L1 | home care | draft |
| `skin_014` | 跳蚤唾液是猫最常见的昆虫过敏原,蚤过敏性皮炎(FAD)的猫被单次叮咬即可剧烈瘙痒,撕咬抓挠造成脱毛和伤口,尤以尾根为甚,头颈部可见粟粒性皮炎小痂。 | VCA Allergies | L2 | yellow/red flag | draft |
| `skin_015` | 皮肤破损处可继发细菌感染,存在继发感染时需兽医开具合适的抗生素。 | VCA Allergies | L2 | red flag/medicine boundary | draft |
| `skin_016` | 猫的过敏(跳蚤叮咬、特应性皮炎、食物、接触)主要表现为皮肤瘙痒和过度梳理脱毛;食物过敏确诊需 8-12 周排除性食谱试验,过敏多需长期管理而非一次治愈。 | VCA Allergies | L2 | overview/yellow | draft |
| `skin_017` | 较严重的过敏反应可引起气道肿胀、呕吐、腹泻甚至休克。 | VCA Allergies | L2 | red flag | draft |
| `skin_018` | 过敏症状可与其它疾病混淆或并存,消化道和呼吸道症状也可由多种其它疾病引起,需完整诊断评估排除其它病因。 | VCA Allergies | L2 | question | draft |
| `skin_019` | 自行购买药膏给猫乱涂或使用人用抗真菌药存在风险:未确诊可能用错药、治疗不彻底反复,人用药浓度剂型未必适合猫且误食可能中毒。 | 证据底稿 / 产品综合 | internal | medicine boundary | needs vet review |
| `skin_020` | 国内相关抗真菌药展示前需查国家兽药查询/中国兽药信息网确认批准、追溯和标签信息。 | MOA / IVDC | CN-RX | medicine boundary | draft |
| `skin_021` | 没有红旗时仍需结合年龄、免疫、毛长、是否新到家/多猫环境、症状持续时间和精神食欲判断观察窗口;仅轻微毛糙皮屑可短期观察并查饮食/洗澡频率/季节性。 | 证据底稿 / 产品综合 | internal | triage control | needs vet review |

## 12. 待兽医审核

- 国内常用抗真菌药(伊曲康唑/灰黄霉素/特比萘芬)的可及性与用药策略,App 是否一律只说“由兽医选定”而不点名。
- 是否在文案明确点出“不要自己买克霉唑就涂”这一具体词。
- “1:10 稀释漂白水”是否给出适合中国家庭的替代消毒方案。
- 跳蚤防治产品在 App 里的提示口径(本轨道未展开,建议补充证据)。
- “人感染癣去皮肤科”是否需点出常用诊断词(体癣/真菌镜检),便于用户挂号更精准。
- 仅轻微毛糙皮屑的绿档观察窗口具体时长,以及幼猫/长毛猫是否一律更短。
