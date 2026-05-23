# 证据 · iCatCare —— 尿道阻塞(Urethral obstruction in cats)

> **来源:** International Cat Care, <https://icatcare.org/articles/urethral-obstruction-in-cats>
> **抓取:** 2026-05-22 · 通用爬虫被站点 403 拒绝,**用 curl + 真实浏览器 UA 取到 HTTP 200 全文**(85 KB)。Wayback Machine 也有同期归档(2025-05-15)。
> **iCatCare 标注:** First published 17 Jun 2024 · Updated 26 Sep 2025
> **状态:** 草稿。已与 v0.2 §2.3 已有的 VCA / Merck / Cornell 交叉印证。**仍需执业兽医审核后方可入产品。**
> **关系到 v0.2:** **直接补回** v0.2 §2.3 标 🔍「iCatCare 403 无法核对」的两条(尿道阻塞、阻塞 vs 未阻塞 FLUTD 区分)。

---

## 一、关键事实(可直接用于分诊 / 报告)

- **几乎只发生在公猫(包括绝育公猫)。**
  原文:_"a problem that occurs almost exclusively in male cats"_

- **2–3 天即可致命。**
  原文:_"Without treatment, it can cause kidney failure and can be fatal within 2-3 days."_
  → 这是 iCatCare 对时间窗口的明确表述。v0.2 §2.3 同时引到 Cornell 的「不足 24-48 小时」 —— **两者并存,统一表述为「数小时到数天可致命」最稳。**

- **必须按急症处理。**
  原文:_"must be treated as an emergency"_
  原文:_"Contact your vet immediately if you think your cat may have an obstructed urethra, as this is an emergency."_

- **极度疼痛 + 反复尝试排尿却完全排不出。**
  原文:_"It is also incredibly painful, and your cat will make repeated attempts to urinate without being able to pass anything."_

- **底层常见诱因:** **feline idiopathic cystitis(FIC,猫特发性膀胱炎)** 或 **urolithiasis(尿石症)**;**应激(stress)** 在发病中起重要作用。

---

## 二、典型表现(给追问问卷 / 报告 escalate 用)

iCatCare 列的「常见迹象」:

- 反复尝试排尿、却排不出任何东西
- 用力排尿时哭叫 / 表现痛苦
- 在猫砂盆**外**排尿(原文配图:窗台上的尿)
- 烦躁、坐立不安
- 舔舐生殖器周围
- 拒食、神情萎靡 / 沮丧
- 呕吐

**阻塞前几天的征兆(prodrome):**

> _"In the days prior to these signs, you may have noticed your cat urinating more frequently, straining, appearing uncomfortable and possibly passing blood in their urine."_

→ 频率增加、用力、不舒服、可能血尿 —— 取决于潜在病因。**这一段对应「黄档」场景(尚未完全堵)。**

---

## 三、病因(为什么会堵)

- **「尿栓 plug」** —— 蛋白、细胞、结晶、碎屑在膀胱里聚成栓子,卡住尿道。
- **结石(uroliths)** —— 在膀胱形成,可能卡进尿道。
- **尿道炎症 + 痉挛** —— 膀胱 / 尿道炎症 → 肿胀;炎症、疼痛、刺激 → 周围肌肉痉挛 → 猫无法放松肌肉 → 阻塞。

---

## 四、**关键区分:完全阻塞 vs 未阻塞 FLUTD**

iCatCare 明确给出 **可操作的分诊分流:**

- **完全阻塞**(出现上面那组征兆)→ **立刻急诊**。
- **能排尿、但有 FLUTD 其它征兆** → **尽快预约门诊**(非急诊):

  > _"If your cat can pass urine but has any other signs associated with feline lower urinary tract disease (FLUTD), contact your veterinary team as soon as possible for an appointment."_

**这正好对齐当前 `peeFlow` 的 Q1 设计:**

- `几乎尿不出,或只有几滴` → redFlag → 红档
- `尿得出,但比平时少 / 次数多` 或 `尿得出但不舒服 / 带血` → weight 2 → 黄档

→ 流程不用改,但**报告文案应该按 iCatCare 这种分流来差异化**(目前 pee 跟 breath/blood/noeat 共用一套 urgent-yellow 文案,丢了「能排尿 = 约门诊」「完全不能 = 立刻急诊」这层关键差异)。

---

## 五、兽医怎么处理(给「这边到医院后会发生什么」预期)

- **诊断:** 体检触诊会摸到充盈而疼痛的膀胱;X 光 / 超声;血尿检。
- **解除阻塞:** 重度镇静 / 全麻 → 定位阻塞物;**通常需要插导尿管**疏通;少数靠按摩可解。
- **后续:** 排空膀胱;严重病例**留置导尿管几天**,持续排尿,同时治疗潜在病因。
- **其它治疗:** 影响肾脏 → **静脉输液(drip)**;**抗炎、止痛、解痉药**视情况。

⚠️ **「按摩可解」是兽医在镇静下做的操作。** 文案里**绝不能**让用户理解成「在家可以按摩 / 挤压膀胱」 —— 家庭挤压有膀胱破裂风险。

---

## 六、长期护理(预防复发)

- **特殊饮食处方:** 预防尿结石 / 结晶。
- **增加饮水量:** 鼓励频繁排尿。
- **降低应激(stress reduction):** FIC 与应激紧密相关。
- iCatCare 自家延伸资源:「How to encourage your cat to drink」、「Stress in cats」、「FIC in cats」、「FLUTD」。

---

## 七、预后

> _"Providing your cat receives treatment quickly and measures are put in place to prevent them from blocking again, the outlook is good. Left untreated, urethral obstruction is life-threatening. It is important to consider the underlying cause to prevent recurrence."_

→ **及时治疗 + 防复发 = 预后好;不治 = 危及生命。复发风险存在,**所以兽医可能要求随访时带尿样。

iCatCare 还给了**居家取尿样**的步骤(非吸水猫砂 + 吸管 + 收集瓶)。若产品做术后跟进 / 提醒,这部分可以纳入。

---

## 八、对接产品的具体改造建议

### A. 报告页:把 `pee` 从 `urgent` 组拆出来,独立成 `urethra` 组

理由:它和 `urgent` 其它三个症状(呼吸 / 出血 / 不吃东西)的家庭照护空间、兽医操作、急迫程度都不同 —— **共用文案会丢失关键差异**。

- `urethra.red`(完全尿不出):
  - 点出 **「公猫尤其」+ 「2-3 天可致命」+ 「别在家按摩 / 挤压膀胱」**(这是 iCatCare 独家强调)
  - 路上注意事项 + 地图深链
- `urethra.yellow`(能排尿但 FLUTD 不适):
  - **直接对应 iCatCare 「contact for an appointment」**
  - 强调 FLUTD 概念、底层病因(FIC / 结石)、应激诱发
  - 在家可做的事:多放清水、流动水机、减少应激;**别**自己挤膀胱、**别**喂人药
  - 升级触发点:完全尿不出 / 嚎叫 / 不吃 / 呕吐 / 牙龈变色

### B. 三层防护一致性检查(代码层面)

- `lib/triage.ts` 的 `NO_GREEN_SYMPTOMS` 包含 `pee` → 不变,绿档继续封掉。
- `report/page.tsx` 的 `resolveTier` 当前只对 `urgent` 组做 green→yellow 强转 → **需要扩展到 `urethra` 组**(防御层面:即便 URL 被人工构造 `?tier=green&symptom=pee` 也安全)。

### C. 用户教育(可选,看产品要不要做)

- 解释什么是 FLUTD / FIC、为什么应激会导致(给一段长内容,放在「了解更多」入口)。
- 公猫养护者的预防清单:水、饮食、应激。

---

## 九、待执业兽医核对

1. **时间窗 2-3 天**(iCatCare) vs **< 24-48 小时**(Cornell,见 v0.2 §2.3) —— 文案该用哪个,需要兽医定夺;目前保守表述「数小时到数天可致命」。
2. **「按摩可解阻塞」一节** —— 务必确认文案不会被用户理解成「在家可以按摩膀胱」。
3. **FLUTD「能排尿 + 不适」是否真的可以「黄档:约门诊」、不必当夜冲急诊** —— 看国内急诊接诊节奏 / 兽医建议。
4. **预防侧的「应激减压」具体建议** —— 是否需要从 iCatCare 的「Stress in cats」专题进一步取材;那篇本次没爬。
5. **居家取尿样的指引** —— 国内非吸水猫砂的可得性、家长接受度。
