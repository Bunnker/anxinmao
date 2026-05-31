# 来源登记与抓取策略

> 状态:初版。用于指导后续爬取、claim 抽取和兽医审核。抓取日期默认记录到具体 source 文档。

## 一线学术 / 临床权威

| 源 | 域名 | 权威等级 | 用途 | 抓取备注 |
|---|---|---:|---|---|
| Cornell Feline Health Center | `vet.cornell.edu` | L1 | 猫专科知识、症状表现、预防、owner-facing 解释 | `curl -A 'Mozilla/5.0'` 可取 HTTP 200。 |
| Merck / MSD Veterinary Manual | `merckvetmanual.com` | L1 | 临床标准、鉴别、急症、病因和治疗方向 | 站点由 Next.js 生成,页面较大,适合先保存 HTML 再抽正文。 |
| VCA Hospitals | `vcahospitals.com` | L2 | 就医前处理、急诊提示、用户可懂话术 | 反爬/WAF 较强,使用真实 UA;不要单独作为规则锚点。 |

## 专科 / 专题权威

| 源 | 域名 | 权威等级 | 用途 | 抓取备注 |
|---|---|---:|---|---|
| International Cat Care / ISFM | `icatcare.org` | L1 | 猫专科、尿闭/FLUTD、腹泻、不吃、猫瘟等 | 真实 UA 可取 HTTP 200;历史上通用爬虫会 403。 |
| ASPCA / APCC | `aspca.org` | L1 | 中毒、家庭危险物、人药/植物/食物风险 | 中毒类主源。 |
| AVMA | `avma.org` | L1 | 急症标准、行业政策、动物健康公共信息 | 适合通用急症、误食、政策边界。 |
| Anicira | `anicira.org` | L3 | 通用急诊 10 信号、家庭自评、用户话术 | 非体系源,但急症清单很实用。 |
| Veterinary Oral Health Council | `vohc.org` | L1-product | 口腔护理产品 plaque/tartar 控制背书、猫用产品候选 | 只证明按指示使用时的口腔护理有效性,不证明本地可买或能治疗当前牙龈红肿。 |
| AAHA / WSAVA Dental Guidelines | `aaha.org` / `wsava.org` | L1 | 牙科基础医疗、全麻洁牙、牙片、居家刷牙边界 | 适合口腔问题和护理用品边界;产品候选仍以 VOHC 或兽医审核为准。 |

## 普及类辅助源

| 源 | 域名 | 权威等级 | 使用边界 |
|---|---|---:|---|
| PetMD | `petmd.com` | L3 | 只用于牙龈苍白、抽搐等单点辅助验证;不进核心规则。 |
| Petplan UK | `petplan.co.uk` | L3 | 只在找不到更好来源时补充便秘/尿堵等用户解释;不单独定规则。 |

## 国内药品与本地化来源

| 源 | 域名/入口 | 类型 | 用途 | 抓取/使用备注 |
|---|---|---|---|---|
| 中国兽医药品监察所 / 中国兽药信息网 | `http://www.ivdc.org.cn/` | 官方/药品 | 国内兽药批准、进口注册、监管信息入口 | HTTPS 证书域名不匹配,HTTP 可访问。 |
| 国家兽药查询 / 国家兽药综合查询 | 农业农村部公告与 App | 官方/药品 | 查询兽药基础信息、批准文号、进口注册、追溯信息 | Web 入口可能变动;source 文档应记录实际查询方式。 |
| 农业农村部畜牧兽医局 | `moa.gov.cn` | 官方/政策 | 动物防疫、狂犬病、兽药监管政策 | 不适合写猫病处理细节。 |
| 国内高校动物医院 | 如中国农业大学动物医院、南京农业大学教学动物医院 | 临床/本地化 | 中文表达、国内就诊路径、专家背书 | 作为本地化补强,不替代 L1 医学源。 |
| 中国兽医协会 / BJSAVA / WESAVC | 行业协会/会议 | 行业/专家网络 | 找国内审核兽医、临床课程、专家署名 | 不作为疾病百科主源。 |

## 药品资料使用原则

国际源决定“医学上可能怎么用”,国内源决定“中国有没有合法/现实可得产品”,兽医审核决定“能不能给用户看”。

药品 claim 必须包含:

- `active_ingredient`: 成分名,不要先按商品名建主键。
- `region`: CN/US/UK/EU/unknown。
- `availability`: approved_vet_drug / imported_vet_drug / human_off_label / not_found / unknown。
- `species_on_label`: 标签是否写猫/犬猫/犬/其它。
- `contraindications`: 禁忌或高风险条件。
- `dose_visible_to_user`: 默认 false。
- `review_required`: 默认 true。

## 抓取行为边界

- 不抓取付费内容全文,例如 Plumb's、BSAVA Formulary。只记录书目/订阅入口,由兽医审核时查阅。
- 不把搜索引擎摘要当来源。
- 不把小红书、知乎、贴吧、问答站、个人博客作为医学依据。它们只能用于收集用户怎么描述症状。
- 每次抓取保留 URL、抓取日期、HTTP 状态和是否人工核对。

## 已执行抓取

| batch | manifest | 命令 | 结果 | 备注 |
|---|---|---|---|---|
| `batch2-core-risk` | `docs/medical/source-manifest.json` | `npm run medical:fetch -- --batch batch2-core-risk` | 27/27 已取到正文或 PDF;单次 VCA 瞬时失败后重试成功 | 覆盖呕吐、腹泻、不吃、误食/中毒、呼吸困难和国内药品可得性入口 |
| `batch3-sensory-emergency` | `docs/medical/source-manifest.json` | `npm run medical:fetch -- --batch batch3-sensory-emergency` | 15/15 已取到正文;AVMA 网页被 Incapsula 空页拦截后已移出本批,仍使用 batch2 AVMA 急救 PDF 作为通用急救源 | 覆盖眼睛、耳朵、出血、精神差及猫瘟/牙龈苍白/鼠药等共享风险 |
| `batch4-chronic-specialty` | `docs/medical/source-manifest.json` | `npm run medical:fetch -- --batch batch4-chronic-specialty` | 12/12 已取到正文;初次 `vca_flea_allergy_dermatitis` 404,改用 VCA Allergies in Cats(`vca_allergies_cats`)后取到 | 覆盖皮肤/猫癣、口腔/牙病、行为突变、跛行/关节与主动脉血栓栓塞(ATE) |
