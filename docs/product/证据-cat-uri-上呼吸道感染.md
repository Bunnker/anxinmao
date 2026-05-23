# 证据 · 猫上呼吸道感染(URI / FRDC)

> **来源:** Cornell Feline Health Center, <https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/respiratory-infections>(Updated June 2018)+ Merck Veterinary Manual, <https://www.merckvetmanual.com/respiratory-system/respiratory-diseases-of-small-animals/feline-respiratory-disease-complex>
> **抓取:** 2026-05-23 · 通用爬虫被 VCA 拦,Cornell 与 Merck 用 curl + 真实浏览器 UA 取到 HTTP 200 全文。
> **状态:** 草稿。已与 v0.2 §3.3 通用红旗、§2.1 呼吸异常交叉印证。**仍需执业兽医审核后方可入产品。**
> **关系:** **补 v0.2 完全没覆盖的 URI 一族(打喷嚏 / 流鼻涕 / 眼鼻分泌物)。** 用户反馈:其家小猫被确诊为支原体感染,而当前 9 个症状卡片里没有这一路。

---

## 一、关键事实(可直接用于分诊 / 报告)

- **猫 URI 总称 FRDC(Feline Respiratory Disease Complex),不是单一疾病。**
  Merck 原文:_"Feline respiratory disease complex includes those illnesses typified by rhinosinusitis, conjunctivitis, lacrimation, salivation, and oral ulcerations."_

- **主要病原 5 种,App 不诊断、只引导兽医:**
  Merck 原文:_"The principal diseases, feline viral rhinotracheitis (FVR; feline herpesvirus type 1), feline calicivirus (FCV), Chlamydia felis, Mycoplasma felis, or combinations of these infections..."_
  + Bordetella bronchiseptica(Cornell 单列)。

- **FHV + FCV ≈ 90% 的急性 URI;支原体常作为并发或独立感染。**
  Merck 原文:_"Most acute feline upper respiratory infections are caused by FVR virus, although FCV may be more prevalent in some populations. ... Other organisms such as C felis, Mycoplasma spp, and reoviruses are believed to account for most of the remaining infections or further complicate FVR or FCV infection."_

- **病原只能由兽医 PCR / 拭子 / 培养确诊。**
  Cornell(对 FHV):_"polymerase chain reaction (PCR), which identifies viral DNA, and virus isolation tests that detect herpes by culturing the virus from clinical samples."_

- **治疗方向取决于病原,App 不能开药也不能推药。**
  - 支原体 / 衣原体 / Bordetella → 抗生素(强力霉素 doxycycline 常用,Cornell + Merck 都点名)
  - FHV → 抗病毒药 + 支持性护理;眼角膜溃疡需眼科治疗
  - FCV → 支持性护理为主;系统性 FCV 致死率约 2/3
  - 所有 → 继发细菌感染时加抗生素

- **FHV 终身潜伏 + 应激复发**(Cornell):_"Once infected, cats carry the infection for life and may experience recurring bouts... up to 80% of exposed cats... up to 45% will periodically shed the virus, usually when stressed."_
  - 解释了**很多猫一应激(搬家 / 洗澡 / 新成员)就「感冒」**的现象。

---

## 二、典型临床表现

Cornell 上呼吸道感染表现:

> _"Symptoms of upper respiratory tract infections include clear or colored discharge from the eyes or nose, coughing, sneezing, swelling of the mucous membranes around the eyes (conjunctivitis), ulcers in the mouth, lethargy, and anorexia. In rare cases, cats may have trouble breathing."_

按病原区分(可作分诊 / 报告参考,但 **App 不要直接告诉用户「这是 X」**):

| 病原 | 典型表现差异(来源原文要点)|
|---|---|
| **FHV-1**(疱疹)| _"FHV infections were most often associated with sneezing"_ + 角膜溃疡(keratitis)+ 反复性结膜炎(尤其应激诱发)|
| **FCV**(杯状)| 口腔溃疡为典型;可能扩散到下呼吸道致肺炎;**系统性 FCV** 罕见但严重,致死率约 2/3 |
| **Chlamydia felis**(衣原体)| 主要是结膜炎:_"eye discharge that is initially clear, but later contains mucous and has a yellowish, pus-like appearance"_ |
| **Mycoplasma felis**(支原体)| Merck 原文:_"Mycoplasma spp may infect the eyes and upper respiratory passages, characteristically producing severe edema of the conjunctiva and a less severe rhinitis."_ — **结膜重度水肿 + 鼻炎相对轻** 是支原体的特征性表现 |
| **Bordetella bronchiseptica**| 从轻微咳嗽 / 喷嚏 / 眼分泌物 →(严重时)呼吸困难、发绀、致死性肺炎 |

---

## 三、谁高发

- **幼猫和青少年猫** 最易感(Cornell 多次提及,尤其 FHV、FCV、Chlamydia、Bordetella)
- **多猫家庭、收容所、繁育猫舍**:接触感染源密集
  Cornell 例(FCV):_"Approximately 10% of cats housed in small groups are infected, while up to 90% of those housed in more crowded conditions, such as in shelters and breeding catteries, may be infected."_
- **应激状态的猫**:搬家、新成员、洗澡、手术 → FHV 复发常见诱因
- **新到家的猫**(刚领养、刚救助):一来就发病很常见,需要隔离
- **未接种疫苗的猫**

---

## 四、诊断 —— App 不做,只交给兽医

Cornell + Merck 一致:**确诊需要兽医做 PCR / 培养 / 拭子 / 染色细胞学**。
- 病原检测样本来源:口咽 / 鼻 / 结膜分泌物拭子
- Mycoplasma + Chlamydia:**结膜拭子做 PCR** 是首选(Cornell)
- 临床表现(打喷嚏 + 眼鼻分泌物 + 口腔溃疡)只能提示「URI」,**不能区分病原**;治疗方向不同,所以必须实验室确诊

---

## 五、治疗 / 居家支持性护理

### 兽医做的(不在 App 范围)
- 针对病原的抗微生物治疗(抗生素 / 抗病毒)
- 二次细菌感染时加抗生素
- 严重病例:住院输液、雾化、饲管喂食
- 眼科治疗(角膜溃疡 / 慢性结膜炎)

### 主人可在家做的(支持性护理,要在兽医诊治期间配合)

**Cornell 原文摘要 +(Merck 一致)**:

- **「Supportive care, including assurance of adequate hydration and nutrition, is vital.」** —— 充分饮食饮水是关键。
- **清理鼻腔:** Cornell(FCV)_"the nasal passages should be cleared using drugs to break down mucous, nebulization with saline, and regular wiping with a saline solution"_。**家用版:** 用生理盐水浸湿的棉签 / 毛巾**轻擦**眼角和鼻子的分泌物;保持环境加湿(加湿器、温热毛巾)。
- **食欲管理:** _"painful lesions in the mouth may make eating and drinking uncomfortable, and congested nasal passages can block the perception of food odors that stimulate the appetite"_ —— 鼻塞 → 闻不到食物 → 拒食。**家用对策:** 食物加热到接近体温让香气出来;试罐头、肉泥等更易消化、气味更浓的食物。
- **减少应激:** Cornell(FHV 复发):_"limiting stress caused by crowded living conditions, surgeries, the introduction of new cats, or moving"_ —— 别洗澡、别带出门、别带新成员进家、别频繁挪猫窝。
- **多猫家庭隔离:** URI 高度传染 —— 隔离病猫、分喂、分猫砂盆、洗手再摸其它猫。

### 主人**不能**做

- **不要自己开抗生素**(病原不同治法不同;有些"感冒药"对猫有毒)
- **不要给人药**(对乙酰氨基酚 / 布洛芬 / 减充血剂对猫剧毒,见 v0.2 §3.2)
- **不要给眼药水**(没确诊就用药可能掩盖或加重)
- **lysine 补剂**(Cornell)_"controversial. Several studies suggest that lysine supplementation is not effective and may actually worsen symptoms and promote shedding of the virus"_ —— **赖氨酸补剂不再推荐**,反而可能加重。这点值得在 App 里提醒,因为国内宠物圈对赖氨酸推崇度仍高。

---

## 六、何时升级到「立刻就医」(red 路径)

综合 Cornell + Merck + v0.2 §3.3:

- **呼吸困难、张口喘、嘴唇发紫(发绀)** —— 已发展到下呼吸道感染 / 肺炎 / 严重 FCV
- **嘴里大面积溃疡、流口水、不愿吃硬粮** —— 强烈提示 FCV
- **完全不吃 / 不喝超过 24 小时** —— v0.2 §1.3 红旗
- **明显瘫软、躲起来叫不醒** —— 可能系统性 FCV / 已严重脱水
- **鼻涕变成黄绿脓性、或带血** —— 严重继发感染或 Cryptococcus / 鼻部破坏性疾病
- **极小幼猫**(尤其 < 4 周):免疫尚未发育,任何 URI 都更危险

---

## 七、预后 / 慢性化

- **多数轻症 URI 7-14 天恢复**(对症 + 支持性护理 + 如需抗生素)
- **FHV 终身潜伏**,应激复发,但复发通常较初发轻
- **FCV 多数恢复良好**;系统性 FCV 致死率约 2/3
- **Chlamydia / 支原体 / Bordetella** 一般抗生素治疗预后良好(Cornell:_"The prognosis for infected cats that are appropriately diagnosed and treated is generally good."_)
- **Cryptococcus**(隐球菌)早期诊断预后较好,治疗可能数月到数年

---

## 八、预防

- **疫苗:**核心疫苗含 FVR + FCV;C. felis 疫苗可选(高密度饲养场景推荐);Bordetella 鼻喷疫苗用于高密度环境(< 4 周龄禁用)
- **新猫隔离:**多猫家庭引入新猫前隔离观察 1-2 周
- **减少应激:**稳定的生活环境是 FHV 不复发的关键
- **室内饲养:**Cornell(Cryptococcus):_"keeping cats indoors minimizes the risk of infection"_

---

## 九、对接产品的具体改造

### 加新症状 `sneeze`(完整轨道)

1. **`SYMPTOM_LABELS`** 加 `sneeze: "打喷嚏 / 流鼻涕"`
2. **`symptoms/page.tsx`** 加卡片(tier: `"common"`,在 `lethargy` 后、`eat` 前)
3. **`triage.ts`** 加 `sneezeFlow` 3 题(频率 + 伴随征兆 + 持续时间);**Q2 伴随征兆中:** 嘴里溃疡 / 完全不吃 / 张口喘 → redFlag(对应严重 FCV / 严重感染 / 下呼吸道)
4. **`report/page.tsx`** 加 `sneeze` 组,红黄绿三档:
   - **red:** 严重并发症 / 系统性 FCV / 下呼吸道感染 —— 立刻就医
   - **yellow:** 典型 URI —— 这周内约门诊 + 居家支持性护理(擦分泌物 / 加湿 / 加热食物 / 隔离新猫 / 减少应激);**强调"具体什么病原要 PCR 才知道"**
   - **green:** 偶发喷嚏无其它 —— 在家留意;检查环境刺激物(粉尘、香薰、清洁剂)
5. `NO_GREEN_GROUPS` **不**加 sneeze —— 健康猫偶尔打喷嚏是正常的

### 文案要点

- **绝不诊断病原** —— 即使 Mycoplasma 的特征(重度结膜水肿 + 轻鼻炎)很典型,App 也只能说"这像猫常见的 URI,具体哪种要兽医做 PCR 确诊"
- **明确点出兽医会做 PCR 拭子** —— 让用户对就诊有预期
- **强调隔离新猫 + 减少应激** —— 这是普通用户不知道的关键预防 / 复发管理点
- **明确反对赖氨酸补剂** —— Cornell 直言可能加重;国内宠物店常推
- **明确反对自行用人药(感冒药、减充血剂、对乙酰氨基酚)** —— 都对猫有毒

---

## 十、待执业兽医核对

1. 「赖氨酸补剂可能加重」这一说法在国内兽医圈接受度 —— Cornell 引用研究明确这点,但需国内兽医确认是否要在 App 用户面前直接劝阻。
2. **强力霉素(doxycycline)** 对幼猫食道狭窄(esophageal stricture)的风险,本文档没展开 —— 兽医临床实际给药策略(液体剂型 vs 胶囊)需要核对。
3. 「< 4 周龄」幼猫 URI 是否所有情况都按急诊处理 —— 本文档默认偏保守,需兽医核。
4. 「家庭加湿、热毛巾蒸气、洗澡间蒸气」 —— 这些常见家庭做法 Cornell / Merck 没明确背书(只支持「加湿空气 + 盐水擦拭」),国内宠物圈常推,需兽医明确哪些可推、哪些不推。
5. 国内常见误区:"猫感冒了喝点葡萄糖水 / 给妈咪爱 / 喂阿莫西林" —— 是否要做成「常见误区」清单写进 yellow 文案,需兽医校对。
