# 病情资料:猫便秘 / 排便用力

## 0. 元信息

- `condition_id`:`cat_constipation_straining`
- 中文名:猫便秘 / 排便用力
- 英文名:Constipation and straining in cats
- 对应 triage symptom:补充资料,可由 `other`、`diarrhea` 或 `vomit` 入口转入
- 适用物种:猫
- 资料状态:draft
- 生成日期:2026-06-17
- 上次人工核对:待审核
- 关联 AI card:`docs/medical/ai-cards/cat-constipation-straining.ai-card.md`

## 1. 来源清单

| source_id | 来源 | URL | 权威等级 | 用途 |
|---|---|---|---:|---|
| cornell_constipation | Cornell Feline Health Center, Constipation | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/constipation | L1 | 便秘表现、风险、就医边界 |
| cornell_health_topics | Cornell Feline Health Topics | https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics | L1 | 巨结肠、胃肠主题范围 |
| aaha_life_stage | AAHA/AAFP Feline Life Stage Guidelines | https://www.aaha.org/resources/2021-aaha-aafp-feline-life-stage-guidelines/ | L1 | 老年/慢病宿主风险 |
| cat_urethral_obstruction | 本资料库尿闭资料 | `docs/medical/source/cat-urethral-obstruction.source.md` | internal | 排便用力 vs 尿不出鉴别 |
| cat_vomiting | 本资料库呕吐资料 | `docs/medical/source/cat-vomiting.source.md` | internal | 便秘伴呕吐/腹痛升级 |

## 2. 给产品的一句话

用户说“拉不出来”时必须先区分是在用力排便还是尿不出;便秘伴呕吐、腹痛、精神差、完全不排便或幼老慢病猫需要尽快就医,不能直接推荐泻药。

## 3. 红旗信号

| red_flag_id | 表现 | 处理 | claim_id |
|---|---|---|---|
| `con_rf_urinary_confusion` | 频繁蹲砂但不确定是尿不出还是拉不出 | 先按尿闭风险处理,尽快联系医院 | `con_001`, `uo_001` |
| `con_rf_vomit_pain` | 便秘/排便用力伴呕吐、腹痛、精神差、不吃 | 急诊或当天门诊 | `con_002`, `vom_005` |
| `con_rf_no_stool_persistent` | 多日未排便、干硬小球、反复用力无结果 | 尽快门诊评估 | `con_003` |
| `con_rf_high_risk_host` | 幼猫、老年猫、慢病猫、脱水或近期手术后便秘 | 缩短观察窗口 | `con_004` |

## 4. 家庭处理边界

可以做:

- 记录最后一次正常排便时间、粪便形状、排便姿势和是否有尿团。
- 确认猫砂盆里尿团是否正常,避免把尿闭误认为便秘。
- 对低风险轻度便秘,可以先增加饮水机会、湿粮比例和安静猫砂盆环境。

不建议:

- 不要自行给人用泻药、灌肠剂、矿物油或剂量。
- 不要反复按压肚子或挤压膀胱。
- 不要在伴随呕吐、腹痛、精神差时继续只靠化毛膏观察。

## 5. Claims

| claim_id | claim | 来源 | 权威等级 | 用途 | 审核状态 |
|---|---|---|---:|---|---|
| `con_001` | 猫砂盆频繁用力可能是排便问题,也可能是尿闭;无法区分时应优先排除尿不出。 | cat_urethral_obstruction / cornell_constipation | internal/L1 | red | draft |
| `con_002` | 便秘伴呕吐、腹痛、精神差或不吃提示风险升级。 | cornell_constipation / cat_vomiting | L1/internal | red/yellow | draft |
| `con_003` | 多日未排便、反复用力和干硬粪便需要兽医评估便秘程度和病因。 | cornell_constipation | L1 | yellow | draft |
| `con_004` | 老年、脱水、慢病、术后或活动少的猫便秘风险和观察风险更高。 | cornell_constipation / aaha_life_stage | L1 | risk modifier | draft |
| `con_005` | 家庭策略以饮水、饮食和猫砂盆环境为主,不应自行使用人用泻药或灌肠。 | cornell_constipation | L1 | home care | draft |

## 6. 待兽医审核

- 低风险便秘的观察窗口是否允许 24 小时。
- 是否允许提及“增加湿粮/纤维”以及具体示例。
- 国内常见化毛膏/乳果糖等内容是否进入药品边界库,不放在本卡直接推荐。
