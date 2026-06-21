# 小猫咨询类资料库补短板调研归纳

生成日期:2026-06-17

## 目标

当前资料库已经覆盖常见急性症状分诊和一部分日常养育问题。本轮补齐面向“用户会问、但不一定是已经生病”的咨询类问题,重点补预防保健、营养体重、寄生虫、行为环境、就诊前后护理和老年慢病监测。

## 本轮新增范围

### 医学分诊补位

| 类别 | 新增资料 | 解决的问题 |
|---|---|---|
| 通用分诊 | `docs/medical/ai-cards/cat-general-triage.ai-card.md` | 承接“猫不太对劲但说不清”的 `other` 入口 |
| 高温 / 天气 / 家庭安全 | `docs/medical/ai-cards/cat-heatstroke-weather-hazard.ai-card.md` | 补夏季中暑、闷热空间、天气相关急症 |
| 便秘 / 排便用力 | `docs/medical/ai-cards/cat-constipation-straining.ai-card.md` | 补“几天没拉屎/拉不出来/排便疼”的分诊 |

### 日常护理补位

| 类别 | 新增资料 | 解决的问题 |
|---|---|---|
| 疫苗 / 免疫 | `docs/care/ai-cards/care-vaccine-schedule-reactions.care-card.md` | 疫苗节奏、猫三联/狂犬/FeLV 风险评估、疫苗后观察 |
| 寄生虫 / 人畜共患 | `docs/care/ai-cards/care-parasite-prevention-zoonosis.care-card.md` | 驱虫、跳蚤蜱虫、室内猫风险、家庭卫生边界 |
| 营养 / 体重 | `docs/care/ai-cards/care-nutrition-weight-bcs.care-card.md` | 成年/老年猫喂养、体况评分、减重、零食、自制粮边界 |
| 抓家具 | `docs/care/ai-cards/care-scratching-furniture.care-card.md` | 正常抓挠需求、抓板布置、减少沙发墙面破坏 |
| 猫包 / 就诊训练 | `docs/care/ai-cards/care-carrier-vet-visit.care-card.md` | 猫包脱敏、去医院前准备、运输压力 |
| 多猫关系 | `docs/care/ai-cards/care-intercat-introduction-tension.care-card.md` | 新猫引入、多猫资源冲突、哈气追打 |
| 绝育术后 / 喂药 | `docs/care/ai-cards/care-spay-neuter-postop-medication.care-card.md` | 绝育术后观察、戴圈、伤口、喂药执行 |
| 老年猫 / 慢病监测 | `docs/care/ai-cards/care-senior-chronic-monitoring.care-card.md` | 老年猫体检、慢病复查、家庭记录 |
| 慢病专项 | `docs/care/ai-cards/care-chronic-kidney-endocrine-monitoring.care-card.md` | CKD、糖尿病、甲亢、高血压的家庭记录和复诊准备 |
| 关节 / 行动能力 | `docs/care/ai-cards/care-mobility-arthritis-home.care-card.md` | 老年猫行动变慢、跳跃困难、猫砂盆困难和环境改造 |
| 繁殖 / 新生幼猫 | `docs/care/ai-cards/care-reproduction-neonatal-kitten.care-card.md` | 发情、怀孕、分娩、孤儿奶猫、手养和 fading kitten 风险 |

### 急症补位

| 类别 | 新增资料 | 解决的问题 |
|---|---|---|
| 创伤 / 急救 / 安全转运 | `docs/medical/ai-cards/cat-trauma-first-aid.ai-card.md` | 摔伤、车撞、咬伤、烧烫伤、触电、噎住和安全转运 |
| 抽搐 / 神经急症 | `docs/medical/ai-cards/cat-seizure-neurologic-emergency.ai-card.md` | 抽搐、癫痫样发作、意识异常、发作后观察 |

## 资料来源归纳

| 主题 | 关键来源 | 采用结论 |
|---|---|---|
| 生命周期照护 | AAHA/AAFP Feline Life Stage Guidelines | 幼猫到老年猫都需要按生命阶段管理疫苗、寄生虫、营养、绝育、牙科、行为环境和筛查 |
| 疫苗 | AAHA/AAFP Feline Vaccination Guidelines | 区分核心/非核心疫苗;FeLV 对 1 岁以下猫为核心,成年后按风险评估 |
| 营养体重 | WSAVA Global Nutrition Guidelines | 营养评估应包含饮食史、体况评分、肌肉状态、热量和个体化计划 |
| 环境需求 | AAFP/ISFM Environmental Needs Guidelines | 猫需要安全空间、关键资源、捕猎/玩耍、正向互动和嗅觉安全;环境不足会引发压力和行为问题 |
| 多猫关系 | 2024 AAFP Intercat Tension Guidelines | 多猫紧张常见且可很隐蔽;新猫引入和资源分布要逐步管理 |
| 抓挠 | Cat Friendly Homes Scratching | 抓挠是正常需求,重点是合适抓板、位置、奖励和指甲管理,不是惩罚 |
| 高温安全 | Cornell Feline Heat Safety | 虚弱、倒下、喘、流涎、呕吐、腹泻等高温相关信号需要立即联系兽医 |
| 便秘 / 慢病主题 | Cornell Feline Health Topics | 便秘、巨结肠、胃肠寄生虫、心脏病、高血压、甲亢等都属于高频猫健康主题 |
| 寄生虫 | AAHA/AAFP Life Stage parasite control + CAPC Guidelines | 寄生虫预防要按年龄、生活方式、地区暴露和家庭成员风险做计划 |
| 慢病专项 | Cornell Feline Health Center CKD / Diabetes / Hyperthyroidism / Hypertension | 慢病内容只做信号识别、家庭记录和复诊准备,不调整处方 |
| 关节行动 | Cornell Feline Health Center / iCatCare / VCA arthritis material | 行动变慢、跳跃困难和猫砂盆困难可能提示疼痛;家庭改造不能替代兽医止痛评估 |
| 繁殖新生 | iCatCare pregnancy / kitten health + VCA orphaned kittens / parturition | 分娩异常、新生幼猫不吃奶、低体温和体重不增都应尽快联系兽医 |
| 急救创伤 | AVMA first aid + Merck emergency + VCA wound/falls/bleeding | 创伤急救核心是识别急症、直接按压出血、避免二次伤害和安全转运 |
| 抽搐神经 | VCA seizures + Merck emergency | 发作超过 5 分钟、集群发作、意识不恢复、误食/外伤相关发作应急诊 |

## 产品边界

- 这些资料卡不做诊断,只做咨询分类、风险识别、家庭记录和就医边界。
- 疫苗、驱虫、绝育、慢病复查等建议只给“该和兽医确认什么”,不替代处方或免疫程序。
- 药品、剂量、处方粮、处方驱虫药不在日常卡里直接推荐。
- 出现精神食欲异常、疼痛、呕吐腹泻、呼吸异常、排尿异常、出血、误食、人药暴露或高温虚弱时,从护理卡切回医学分诊。

## 待兽医审核

- 疫苗和驱虫卡进入产品前,需要按中国地区实际兽医流程和合规商品边界复核。
- 绝育术后卡需要本地医院常见出院医嘱口径复核。
- 老年慢病卡只能作为监测和复诊准备,不应变成疾病管理方案。
