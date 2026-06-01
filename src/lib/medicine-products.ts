import type { UserRegionContext } from "@/lib/request-region";

type MedicinePolicy =
  | "direct_care_product"
  | "label_vet_guided_product"
  | "ask_vet_about_rx"
  | "forbidden"
  | "urgent_no_product";

type MedicineEntry = {
  id: string;
  match: RegExp[];
  region: "global" | "CN" | "US";
  category:
    | "护理用品"
    | "补充剂"
    | "外用驱虫药"
    | "处方药"
    | "禁用人药"
    | "急症禁推荐";
  policy: MedicinePolicy;
  title: string;
  say: string[];
  doNotSay: string[];
  sourceUrls: string[];
};

const ENTRIES: MedicineEntry[] = [
  {
    id: "cat_oral_toothpaste_toothbrush",
    match: [/牙膏|牙刷|刷牙|洁齿|牙黄|牙结石|口腔|口臭|牙龈/],
    region: "global",
    category: "护理用品",
    policy: "direct_care_product",
    title: "猫专用牙膏/牙刷",
    say: [
      "可以推荐猫专用牙膏、猫专用牙刷、指套牙刷或超软毛宠物牙刷作为日常护理用品。",
      "用户已经描述牙龈红肿、疼痛、流口水、掉食、拒食硬粮、出血或牙齿松动时,先建议兽医检查;不要让用户硬刷。",
      "无明显疼痛或兽医确认可以护理后,选购标准是:猫专用、可吞咽、无木糖醇/氟化物/精油/酒精、刷头小且软。",
      "要明确提醒不要用人牙膏、人漱口水或人用口腔清洁产品。",
      "可以说这类用品只能帮助日常减少牙菌斑/牙结石堆积,不能治疗已经红肿疼痛的口腔问题。",
      "用户在中国时,建议在正规宠物医疗渠道/品牌旗舰店购买,核对猫用适用说明和成分表。",
    ],
    doNotSay: [
      "不要推荐人牙膏、人漱口水、小苏打、双氧水或酒精漱口产品。",
      "不要把牙膏牙刷说成能治疗牙龈炎、口炎或牙周病。",
      "不要编造具体品牌排行榜;本地库没有品牌白名单时,给选购标准而不是硬凑牌子。",
    ],
    sourceUrls: [
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/dental-disease",
      "https://vcahospitals.com/know-your-pet/brushing-teeth-in-cats",
      "https://vohc.org/accepted-products/",
    ],
  },
  {
    id: "sterile_saline_eye_nose_cleaning",
    match: [/生理盐水|海盐水|眼屎|眼药水|眼睛|流泪|鼻涕|打喷嚏|喷鼻|清洁/],
    region: "global",
    category: "护理用品",
    policy: "direct_care_product",
    title: "无菌生理盐水清洁",
    say: [
      "可以建议无菌生理盐水用于轻柔擦拭眼周/鼻周分泌物,这属于清洁护理。",
      "说清楚:只擦外部可见分泌物,不要冲洗眼睛深处,不要强行喷鼻。",
      "若出现眯眼疼痛、角膜发白/发蓝、黄绿脓性分泌物、血性鼻涕、精神差或食欲下降,建议尽快就医。",
      "用户在中国时,可说选择独立小支装/无防腐剂/无添加的无菌生理盐水,不要用开封很久的大瓶反复接触。",
    ],
    doNotSay: [
      "不要推荐人用眼药水、抗生素眼药、激素眼药或宠物眼药商品名。",
      "不要把清洁护理说成能治疗结膜炎、支原体、疱疹或鼻炎。",
    ],
    sourceUrls: [
      "https://vcahospitals.com/know-your-pet/eye-discharge-or-epiphora-in-cats",
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/respiratory-infections",
    ],
  },
  {
    id: "uri_antibiotics_rx_only",
    match: [/支原体|衣原体|抗生素|消炎药|多西|阿奇|PCR|pcr|吃了.*周|疗程|剂量|用量/],
    region: "global",
    category: "处方药",
    policy: "ask_vet_about_rx",
    title: "上呼吸道/眼鼻处方药",
    say: [
      "涉及支原体、衣原体、抗生素、眼药或疗程时,只能建议带 PCR 报告、处方/药盒和用药记录复诊,让兽医确认药名、剂量、疗程、是否漏服和是否需要复查。",
      "可以建议用户问医生:是否需要复查 PCR/补查 FHV/FCV/衣原体等共感染,是否需要眼鼻/口腔/鼻腔结构检查。",
      "如果用户已经吃完药仍偶尔打喷嚏但精神食欲好,表达为非急诊但建议预约复诊;若呼吸异常、精神差、不吃或脓/血性分泌物则升级。",
    ],
    doNotSay: [
      "不要推荐具体药名、不要比较哪种抗生素更好、不要给剂量、不要给 21 天/28 天等疗程建议。",
      "不要让用户自行购买抗生素、眼药、激素或抗病毒药。",
    ],
    sourceUrls: [
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/respiratory-infections",
      "https://www.merckvetmanual.com/respiratory-system/respiratory-diseases-of-small-animals/feline-respiratory-disease-complex",
    ],
  },
  {
    id: "human_pain_relievers_forbidden",
    match: [/布洛芬|对乙酰氨基酚|扑热息痛|泰诺|阿司匹林|止痛药|退烧药|NSAID|nsaid|人药/],
    region: "global",
    category: "禁用人药",
    policy: "forbidden",
    title: "人用止痛/退烧药",
    say: [
      "明确说禁止给猫自行使用布洛芬、对乙酰氨基酚/扑热息痛、阿司匹林等人用止痛退烧药。",
      "如果已经吃到或疑似吃到,按误食人药处理,建议立即联系动物医院/急诊。",
      "疼痛控制必须由兽医根据体重、脱水、肾肝功能和病因开药。",
    ],
    doNotSay: [
      "不要说少量、半片、儿童剂量、临时吃一次。",
      "不要推荐任何止痛药替代品或家庭剂量。",
    ],
    sourceUrls: [
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/get-facts-about-pain-relievers-pets",
      "https://www.fda.gov/animal-veterinary/product-safety-information/veterinary-nonsteroidal-anti-inflammatory-drugs-nsaids",
    ],
  },
  {
    id: "human_eye_mouth_products_forbidden",
    match: [/人用眼药水|氧氟沙星|氯霉素|妥布霉素|激素眼药|人牙膏|漱口水|木糖醇|双氧水|酒精|碘伏.*嘴/],
    region: "global",
    category: "禁用人药",
    policy: "forbidden",
    title: "人用眼药/口腔用品",
    say: [
      "不要自行使用人用眼药水、抗生素眼药、激素眼药、人牙膏、人漱口水、双氧水或酒精类口腔用品。",
      "眼睛疼、眯眼、角膜发白/发蓝、黄绿脓性分泌物或口腔红肿疼痛时,建议兽医检查后再决定药品。",
    ],
    doNotSay: [
      "不要给具体眼药商品名、抗生素名、滴眼频率或口腔消毒方案。",
    ],
    sourceUrls: [
      "https://vcahospitals.com/know-your-pet/eye-discharge-or-epiphora-in-cats",
      "https://vcahospitals.com/know-your-pet/brushing-teeth-in-cats",
    ],
  },
  {
    id: "digestive_probiotic_support",
    match: [/益生菌|软便|拉稀|腹泻|换粮|肠胃|肠道/],
    region: "global",
    category: "补充剂",
    policy: "direct_care_product",
    title: "宠物专用益生菌/肠胃补充剂",
    say: [
      "精神、食欲正常且只是轻微软便时,可以建议宠物专用益生菌作为短期肠胃支持补充剂。",
      "选购标准:猫/犬猫适用、成分和保存方式清楚、正规宠物医疗渠道或品牌旗舰店、不要混用人用止泻药。",
      "要设置观察窗口:软便持续超过 24-48 小时、越来越稀、血便/黑便、呕吐、精神差、幼猫或未免疫猫,建议尽快就医。",
      "益生菌只能作为支持护理,不能替代排查寄生虫、猫瘟、食物不耐受或其它病因。",
    ],
    doNotSay: [
      "不要推荐诺氟沙星、庆大霉素、蒙脱石散、黄连素或其它人用止泻/抗生素。",
      "不要说人用益生菌就行,也不要给剂量。",
    ],
    sourceUrls: [
      "https://vcahospitals.com/know-your-pet/probiotics-for-dogs-and-cats",
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/gastrointestinal-parasites-cats",
    ],
  },
  {
    id: "flea_tick_cat_only_label",
    match: [/跳蚤|虱|蜱|外驱|驱虫|滴剂|犬用|狗用|菊酯|permethrin/i],
    region: "global",
    category: "外用驱虫药",
    policy: "label_vet_guided_product",
    title: "猫用外驱产品",
    say: [
      "可以建议只选猫用外驱产品,按猫当前体重和产品标签适用范围核验,不要凭感觉减量。",
      "用户在中国时,提醒优先从宠物医院/正规渠道购买,核对产品说明、适用物种、体重段、批准文号/追溯信息。",
      "犬用外驱、狗用滴剂或含高浓度菊酯/permethrin 的产品不要给猫用;不确定成分时先问兽医。",
      "幼猫、孕猫、病猫、多猫同住、皮肤破损或已经出现流口水/抽搐/走路异常时,不要自行处理,联系兽医。",
    ],
    doNotSay: [
      "不要说犬用少量可以、随便减半、按狗的剂量折算。",
      "不要推荐具体外驱药商品名或滴剂用量。",
    ],
    sourceUrls: [
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/safe-use-flea-and-tick-products-pets",
      "https://www.epa.gov/pets/avoid-treating-cats-flea-and-tick-products-designed-dogs",
    ],
  },
  {
    id: "ear_mite_ear_med_rx_only",
    match: [/耳螨|咖啡渣|耳药|滴耳|洗耳|挠耳|甩头|耳朵臭|耳道/],
    region: "global",
    category: "处方药",
    policy: "ask_vet_about_rx",
    title: "耳螨/外耳炎耳药",
    say: [
      "耳朵咖啡渣、挠耳、甩头时,可以说耳螨/外耳炎都可能,但要先让兽医用耳镜和耳道分泌物检查确认。",
      "耳药、洗耳液、杀耳螨药应由兽医根据鼓膜、耳道炎症和病因决定;不要自行买药滴。",
      "如果耳朵疼、头歪、走路不稳、脸部异常、耳血肿或大量脓臭分泌物,建议尽快就医。",
    ],
    doNotSay: [
      "不要推荐具体耳药、伊维菌素/塞拉菌素等药名、滴几滴或滴几天。",
      "不要推荐双氧水、酒精、醋、精油清耳。",
    ],
    sourceUrls: [
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/ear-mites",
      "https://vcahospitals.com/know-your-pet/ear-mites-in-cats-and-dogs",
    ],
  },
  {
    id: "minor_wound_saline_collar",
    match: [/伤口|破皮|擦伤|抓伤|咬伤|流血|结痂|双氧水|酒精|碘伏|伊丽莎白圈/],
    region: "global",
    category: "护理用品",
    policy: "direct_care_product",
    title: "小伤口清洁/防舔用品",
    say: [
      "表浅小伤口可建议无菌生理盐水轻柔冲洗或擦净周围污物,再用干净纱布轻压止血。",
      "可以推荐伊丽莎白圈/防舔圈防止舔咬伤口,这属于护理用品。",
      "咬伤、深伤口、持续出血、化脓、肿胀、疼痛明显、精神差或不确定伤口深度时,建议尽快就医。",
      "使用任何外用药膏/消毒药前先问兽医,避免猫舔入。",
    ],
    doNotSay: [
      "不要建议反复用双氧水、酒精或刺激性消毒剂处理伤口。",
      "不要让用户自行缝合、挤脓、挑开结痂或包扎过紧。",
    ],
    sourceUrls: [
      "https://vcahospitals.com/know-your-pet/care-of-open-wounds-in-cats",
      "https://vcahospitals.com/know-your-pet/first-aid-for-limping-cats",
    ],
  },
];

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function entryApplies(entry: MedicineEntry, query: string): boolean {
  return entry.match.some((pattern) => pattern.test(query));
}

function regionNote(region: UserRegionContext): string {
  if (region.countryCode === "CN") {
    return "地区提示:用户疑似在中国大陆。涉及兽药真伪/批准信息时,提醒优先核对正规宠物医院、产品说明书、兽药批准文号/追溯码;本地库没有中国品牌白名单时不要编品牌。";
  }
  if (!region.countryCode) {
    return "地区提示:用户地区不确定。问到具体购买渠道/本地品牌时,先给通用选购标准,必要时追问所在地。";
  }
  return `地区提示:用户地区为 ${region.countryCode};购买可得性要按当地正规兽医/宠物医疗渠道核验。`;
}

function policyLabel(policy: MedicinePolicy): string {
  if (policy === "direct_care_product") return "可直接推荐护理用品";
  if (policy === "label_vet_guided_product") return "只可按猫用标签/兽医指导选购";
  if (policy === "ask_vet_about_rx") return "只建议问兽医/复诊确认";
  if (policy === "forbidden") return "禁止自行使用";
  return "急症不推荐任何药品";
}

export function medicineProductPolicyContext(
  query: string,
  region: UserRegionContext,
): string {
  const q = compact(query);
  if (!q) return "";
  const matches = ENTRIES.filter((entry) => entryApplies(entry, q)).slice(0, 5);
  if (matches.length === 0) return "";

  return [
    "【medicine_product_policy 本地药品/护理用品资料库】",
    regionNote(region),
    "总规则:",
    "- 只能依据下面命中的条目回答药品/护理用品问题;没有命中的具体药品、品牌、剂量、疗程,一律不要编。",
    "- 护理用品可以推荐类别和选购标准,但不能替代就医或治疗当前病症。",
    "- 猫用外驱等高风险产品只能讲猫用、体重段、标签核验、正规渠道和禁忌,不要给具体药名或用量。",
    "- 处方药、抗生素、止痛药、激素、眼药、耳药:只允许建议带报告/药盒/处方复诊确认,不要推荐具体药名、剂量或疗程。",
    "- 禁用项要明确拦截;如果用户已经使用/误食,按急诊或尽快联系动物医院处理。",
    ...matches.flatMap((entry, index) => [
      "",
      `## ${index + 1}. ${entry.title}`,
      `id: ${entry.id}`,
      `region: ${entry.region}`,
      `category: ${entry.category}`,
      `policy: ${entry.policy}(${policyLabel(entry.policy)})`,
      "可以说:",
      ...entry.say.map((line) => `- ${line}`),
      "不要说:",
      ...entry.doNotSay.map((line) => `- ${line}`),
      `sources: ${entry.sourceUrls.join(" | ")}`,
    ]),
  ].join("\n");
}
