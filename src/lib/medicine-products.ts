import type { UserRegionContext } from "@/lib/request-region";
import { productCatalogContextForEntry } from "@/lib/product-catalog";

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
  itemType:
    | "care_product"
    | "support_supplement"
    | "external_vet_product"
    | "prescription_drug"
    | "human_drug_forbidden"
    | "emergency_no_product";
  category:
    | "护理用品"
    | "补充剂"
    | "外用驱虫药"
    | "处方药"
    | "禁用人药"
    | "急症禁推荐";
  policy: MedicinePolicy;
  recommendationMode:
    | "recommend_category_and_selection_criteria"
    | "recommend_label_vet_guided_only"
    | "vet_visit_only_no_purchase"
    | "forbid_and_escalate";
  cnAvailability: string;
  globalAvailability: string;
  prescriptionBoundary: string;
  cnVerification: string[];
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
    itemType: "care_product",
    category: "护理用品",
    policy: "direct_care_product",
    recommendationMode: "recommend_category_and_selection_criteria",
    cnAvailability:
      "中国通常能买到猫专用牙膏、指套牙刷、软毛宠物牙刷;本地产品资料库没有可推荐候选时只给选购标准。",
    globalAvailability:
      "海外可参考 VOHC Accepted Products for Cats 和兽医牙科护理建议,但 VOHC 不等于中国渠道真伪保证。",
    prescriptionBoundary:
      "非药品护理用品;牙龈红肿、疼痛、流口水、掉食、出血或牙齿松动时先检查,不要把刷牙当治疗。",
    cnVerification: [
      "正规宠物医院、宠物医疗渠道或品牌旗舰店",
      "核对猫用、可吞咽、成分表和适用年龄",
      "避免木糖醇、氟化物、精油、酒精、人用口腔产品",
    ],
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
      "不要编造具体品牌排行榜;本地产品资料库没有可推荐候选时,给选购标准而不是硬凑牌子。",
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
    itemType: "care_product",
    category: "护理用品",
    policy: "direct_care_product",
    recommendationMode: "recommend_category_and_selection_criteria",
    cnAvailability:
      "中国常见独立小支装无菌生理盐水;只能作为外部清洁用品,不是眼药或鼻腔治疗。",
    globalAvailability:
      "全球通用低风险清洁用品;出现眼痛、脓性分泌物或呼吸问题时不靠清洁拖延。",
    prescriptionBoundary:
      "非处方清洁护理;抗生素眼药、激素眼药、抗病毒药和喷鼻治疗都需兽医判断。",
    cnVerification: [
      "选无菌、无添加、无防腐剂优先",
      "优先独立小支装,开封后避免反复污染",
      "只擦外部可见分泌物,不冲洗眼球深处、不强行喷鼻",
    ],
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
    itemType: "prescription_drug",
    category: "处方药",
    policy: "ask_vet_about_rx",
    recommendationMode: "vet_visit_only_no_purchase",
    cnAvailability:
      "国内抗生素、人用药 off-label 和宠物处方药都必须由兽医结合体重、检查和处方决定;用户端不展示品牌、剂量或疗程。",
    globalAvailability:
      "国际资料可说明兽医可能考虑抗菌/抗病毒/眼鼻治疗类别,但不能转成用户自行购药建议。",
    prescriptionBoundary:
      "处方药边界:只整理复诊问题和资料准备,不推荐具体药名、剂量、疗程或购买渠道。",
    cnVerification: [
      "带 PCR 报告、处方、药盒、用药天数和漏服记录复诊",
      "若医生开兽药,由医生/医院核对批准文号、追溯码和标签适用动物",
      "若涉及人药 off-label,只由执业兽医决定",
    ],
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
    itemType: "human_drug_forbidden",
    category: "禁用人药",
    policy: "forbidden",
    recommendationMode: "forbid_and_escalate",
    cnAvailability:
      "人用止痛/退烧药在中国很容易买到,但不能给猫自行使用;可得性越高越需要强拦截。",
    globalAvailability:
      "全球一致高风险边界:猫的止痛退烧必须由兽医按病因、肝肾状态和体重处理。",
    prescriptionBoundary:
      "禁用/急诊边界:已经吃到或疑似吃到,按误食人药尽快联系动物医院。",
    cnVerification: [
      "不要按儿童剂量、半片或体重自行折算",
      "保留药盒、成分、吃到时间和估计量给医生",
    ],
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
    itemType: "human_drug_forbidden",
    category: "禁用人药",
    policy: "forbidden",
    recommendationMode: "forbid_and_escalate",
    cnAvailability:
      "人用眼药、人牙膏、人漱口水和刺激性消毒用品在中国很容易买到,但不适合作为猫的家庭用药方案。",
    globalAvailability:
      "全球一致禁用边界:眼科和口腔症状要先确认角膜/牙龈/黏膜状态,不能靠人用产品试药。",
    prescriptionBoundary:
      "禁用边界:眼药、抗生素、激素、口腔消毒药都不能由用户自行给猫使用。",
    cnVerification: [
      "看成分里是否有人用抗生素、激素、木糖醇、酒精、精油",
      "眼睛疼、眯眼、角膜变色、口腔疼痛时直接转兽医检查",
    ],
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
    itemType: "support_supplement",
    category: "补充剂",
    policy: "direct_care_product",
    recommendationMode: "recommend_category_and_selection_criteria",
    cnAvailability:
      "中国常见宠物专用益生菌/肠胃补充剂;本地产品资料库没有可推荐候选时只给猫/犬猫适用、正规渠道和成分保存标准。",
    globalAvailability:
      "全球作为短期肠胃支持补充剂使用;不能替代诊断寄生虫、猫瘟、食物不耐受或炎症性疾病。",
    prescriptionBoundary:
      "非处方补充剂;血便、黑便、呕吐、精神差、幼猫或未免疫猫不靠补充剂观察。",
    cnVerification: [
      "选猫/犬猫适用,成分、批号、保存方式清楚",
      "正规宠物医疗渠道或品牌旗舰店",
      "不要混用人用止泻药、抗生素或人用益生菌剂量",
    ],
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
    itemType: "external_vet_product",
    category: "外用驱虫药",
    policy: "label_vet_guided_product",
    recommendationMode: "recommend_label_vet_guided_only",
    cnAvailability:
      "中国可买到多类猫用外驱产品,但必须核对猫用标签、体重段、批准/进口信息和追溯信息;不在本地产品资料库外编品牌。",
    globalAvailability:
      "海外产品同样要看标签监管信息;FDA/EPA 均强调按标签和物种使用,犬用产品不可给猫折算。",
    prescriptionBoundary:
      "高风险标签产品:只讲猫用、体重段、标签和禁忌;不推荐具体药名、商品名、用量或频率。",
    cnVerification: [
      "优先宠物医院或正规渠道",
      "核对猫用、体重段、年龄、孕病禁忌、批准文号/进口注册/追溯码",
      "多猫家庭使用后隔离至干燥,避免互舔",
    ],
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
    itemType: "prescription_drug",
    category: "处方药",
    policy: "ask_vet_about_rx",
    recommendationMode: "vet_visit_only_no_purchase",
    cnAvailability:
      "国内耳药/洗耳液/杀耳螨药品和护理品混杂,未确认鼓膜和病因前不建议用户自行购买。",
    globalAvailability:
      "全球通用边界:耳螨、细菌/真菌外耳炎、中耳问题外观相似,要耳镜和分泌物检查后用药。",
    prescriptionBoundary:
      "处方/兽医指导边界:不推荐具体耳药、驱虫药、滴数或疗程。",
    cnVerification: [
      "复诊时让医生做耳镜和耳道分泌物检查",
      "若医生开药,核对猫可用、鼓膜安全、批准/进口和追溯信息",
      "疼痛、头歪、走路不稳、耳血肿或大量脓臭分泌物要尽快就医",
    ],
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
    itemType: "care_product",
    category: "护理用品",
    policy: "direct_care_product",
    recommendationMode: "recommend_category_and_selection_criteria",
    cnAvailability:
      "中国常见无菌生理盐水、干净纱布和伊丽莎白圈/防舔圈;外用药膏或消毒药不进入用户自行推荐。",
    globalAvailability:
      "全球作为表浅伤口临时护理用品;咬伤、深伤口、持续出血或感染迹象需要兽医处理。",
    prescriptionBoundary:
      "非处方护理用品;止痛、抗生素、外用药膏、缝合和清创都不由用户自行处理。",
    cnVerification: [
      "选无菌生理盐水、干净纱布、合适尺寸防舔圈",
      "不要反复用双氧水、酒精或刺激性消毒剂",
      "外用药使用前先问兽医,避免舔入",
    ],
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
  {
    id: "hairball_support_products",
    match: [/毛球|化毛|化毛膏|猫草|吐毛|吐.*毛/],
    region: "global",
    itemType: "support_supplement",
    category: "补充剂",
    policy: "direct_care_product",
    recommendationMode: "recommend_category_and_selection_criteria",
    cnAvailability:
      "中国常见猫草和猫用化毛产品;本地产品资料库没有可推荐候选时只推荐类别和选购标准,不编排行榜。",
    globalAvailability:
      "全球都应把梳毛和饮食管理放在前面,化毛产品只是支持护理,不是止吐药或治疗药。",
    prescriptionBoundary:
      "非处方支持用品;反复呕吐、吐不出、便秘、不吃、精神差、腹痛或幼猫不靠化毛产品观察。",
    cnVerification: [
      "选猫用化毛产品或猫草,看清适用猫、成分、批号和保存方式",
      "优先正规宠物医疗渠道或品牌旗舰店",
      "避免人用泻药、单独矿物油/液体石蜡、强刺激通便产品和不明成分偏方",
    ],
    title: "猫草/猫用化毛产品",
    say: [
      "可以推荐增加梳毛频率、猫草或猫用化毛产品作为毛球支持护理。",
      "要说清楚:猫用化毛产品不是止吐药,不能治疗持续呕吐或胃肠道疾病。",
      "如果反复呕吐、吐不出、便秘、不吃、精神差、腹部疼痛或幼猫呕吐,建议尽快就医。",
      "用户在中国时,给选购标准:猫用、成分清楚、正规渠道、别买不明成分或宣称包治呕吐的产品。",
    ],
    doNotSay: [
      "不要推荐单独矿物油/液体石蜡、人用泻药、开塞露或强行灌服。",
      "不要把化毛膏说成能治疗呕吐、便秘或肠梗阻。",
    ],
    sourceUrls: [
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/hairballs",
      "https://vcahospitals.com/know-your-pet/hairballs-in-cats",
    ],
  },
  {
    id: "urinary_antibiotics_rx_only",
    match: [/尿频|尿血|尿少|尿路|泌尿|膀胱|尿闭|尿不出|消炎药|抗生素|利尿|排石/],
    region: "global",
    itemType: "prescription_drug",
    category: "处方药",
    policy: "ask_vet_about_rx",
    recommendationMode: "vet_visit_only_no_purchase",
    cnAvailability:
      "国内泌尿抗生素、止痛、解痉、利尿或排石相关药物都不能由用户自行选择;需尿检/影像/触诊后决定。",
    globalAvailability:
      "国际资料一致强调尿闭是急症;能尿但异常也需要检查病因,不能靠消炎药覆盖。",
    prescriptionBoundary:
      "处方药边界:不推荐抗生素、利尿药、止痛药、排石药、用量或购买渠道。",
    cnVerification: [
      "尿不出、频繁蹲猫砂盆但无尿、疼叫或精神差:急诊",
      "带尿液照片/猫砂团大小、排尿次数、饮水和既往泌尿病史就诊",
      "若医生开兽药,由医院核对批准文号、追溯码和猫适用标签",
    ],
    title: "泌尿异常用药边界",
    say: [
      "尿频、尿血、尿少时可以说需要尿检、影像和医生触诊判断;不要自行使用抗生素、利尿药或排石药。",
      "尿不出、频繁蹲猫砂盆但没有尿、疼叫、呕吐或精神差时,按尿闭风险处理,建议急诊。",
      "能尿但异常时也建议尽快预约检查,因为膀胱炎、结晶/结石、堵塞早期和应激相关问题处理完全不同。",
    ],
    doNotSay: [
      "不要说可以买消炎药、抗生素、利尿药或排石药先试。",
      "不要建议多喝水冲一下就行,也不要让用户等到完全尿不出再去。",
    ],
    sourceUrls: [
      "https://icatcare.org/advice/feline-lower-urinary-tract-disease-flutd/",
      "https://icatcare.org/advice/urethral-obstruction-in-cats/",
      "http://www.ivdc.org.cn/",
    ],
  },
  {
    id: "vomiting_antiemetic_rx_only",
    match: [/止吐|胃药|奥美拉唑|胃复安|吐了|呕吐|一直吐|频繁吐/],
    region: "global",
    itemType: "prescription_drug",
    category: "处方药",
    policy: "ask_vet_about_rx",
    recommendationMode: "vet_visit_only_no_purchase",
    cnAvailability:
      "国内止吐药、胃药和人用胃药都不进入用户自行推荐;猫呕吐要先判断频率、年龄、精神食欲和误食风险。",
    globalAvailability:
      "国际临床资料把止吐、补液、影像和病因处理归为兽医判断;家庭自行压症状可能掩盖异物/中毒/猫瘟。",
    prescriptionBoundary:
      "处方药边界:不推荐止吐药、胃药、剂量或购买;只给就医窗口和资料准备。",
    cnVerification: [
      "记录呕吐次数、内容物、是否进食饮水、精神、排便和可能误食",
      "幼猫、频繁呕吐、带血、腹痛、精神差、不吃或疑似误食:尽快就医",
      "若医生开药,由医院核对药品来源、标签和猫适用性",
    ],
    title: "呕吐止吐/胃药边界",
    say: [
      "猫呕吐时不要自行买止吐药或胃药先压症状,先判断频率、精神食欲、年龄和误食风险。",
      "幼猫、频繁呕吐、吐血/咖啡色、腹痛、不吃、精神差或疑似误食时,建议尽快就医。",
      "精神食欲都好、偶发一次且没有红旗时,可以短时间观察并记录呕吐物照片、次数和排便。",
    ],
    doNotSay: [
      "不要推荐具体止吐药、胃药、人用胃药、剂量或几天疗程。",
      "不要说先吃胃药压一压。",
    ],
    sourceUrls: [
      "https://www.merckvetmanual.com/cat-owners/digestive-disorders-of-cats/vomiting-in-cats",
      "https://vcahospitals.com/know-your-pet/vomiting-in-cats",
      "http://www.ivdc.org.cn/",
    ],
  },
  {
    id: "anorexia_appetite_stimulant_rx_only",
    match: [/不吃|食欲差|食欲刺激|食欲促进|营养膏|强喂|灌食|厌食/],
    region: "global",
    itemType: "prescription_drug",
    category: "处方药",
    policy: "ask_vet_about_rx",
    recommendationMode: "vet_visit_only_no_purchase",
    cnAvailability:
      "国内营养膏常见但只能算短期能量支持;食欲刺激剂、止吐、补液等需兽医判断,不能自行买。",
    globalAvailability:
      "国际资料强调猫不吃可能很快出问题;食欲刺激剂只在明确病因和状态后由兽医决定。",
    prescriptionBoundary:
      "处方药边界:不推荐食欲刺激剂、止吐药或剂量;营养膏不能替代找病因。",
    cnVerification: [
      "记录多久没吃、是否喝水、精神、体重变化、呕吐腹泻和尿量",
      "成年猫接近或超过 24 小时不吃、幼猫更短时间不吃、精神差或呕吐:尽快就医",
      "营养膏只看作短期辅助,不能靠它顶几天",
    ],
    title: "不吃饭/食欲刺激剂边界",
    say: [
      "不吃饭时不要自行买食欲刺激剂;这类药要兽医先判断脱水、恶心、疼痛、发热和基础病。",
      "营养膏可以作为短期能量辅助,但不能替代吃正餐,也不能靠它拖几天。",
      "成年猫接近或超过 24 小时不吃、幼猫不吃、精神差、呕吐或明显疼痛时,建议尽快就医。",
    ],
    doNotSay: [
      "不要推荐具体食欲刺激剂、止吐药、剂量或购买渠道。",
      "不要说靠营养膏顶几天就行,不要建议强喂或灌食。",
    ],
    sourceUrls: [
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/anorexia",
      "https://vcahospitals.com/know-your-pet/anorexia-in-cats",
      "http://www.ivdc.org.cn/",
    ],
  },
  {
    id: "skin_human_topical_forbidden",
    match: [/皮炎平|红霉素|百多邦|莫匹罗星|达克宁|克霉唑|激素药膏|人用药膏|软膏|皮肤红|皮肤痒|瘙痒|猫癣/],
    region: "global",
    itemType: "human_drug_forbidden",
    category: "禁用人药",
    policy: "forbidden",
    recommendationMode: "forbid_and_escalate",
    cnAvailability:
      "人用抗生素、激素、抗真菌软膏在中国很容易买到,但猫会舔入,且皮肤病因未明时容易掩盖或加重。",
    globalAvailability:
      "全球通用禁用边界:猫皮肤问题需区分寄生虫、过敏、细菌/真菌、外伤和猫癣等,外用药要兽医判断。",
    prescriptionBoundary:
      "禁用边界:不推荐人用软膏、激素药、抗生素药膏、抗真菌药膏或涂抹频率。",
    cnVerification: [
      "戴伊丽莎白圈只能防舔,不是治疗",
      "拍照记录范围、掉毛、结痂、渗出和是否传染人/其它猫",
      "有扩散、化脓、强烈瘙痒、幼猫/多猫家庭或疑似猫癣时预约检查",
    ],
    title: "皮肤人用软膏/激素药禁用",
    say: [
      "不要自行使用皮炎平、红霉素软膏、百多邦、达克宁或其它人用外用药膏。",
      "原因是猫会舔入,而且皮肤红痒可能是寄生虫、过敏、细菌/真菌、猫癣或外伤,用错会掩盖病情。",
      "可以先戴伊丽莎白圈防舔、拍照记录,再尽快让兽医做皮肤检查。",
    ],
    doNotSay: [
      "不要说可以抹皮炎平、红霉素软膏或其它人用药膏试试。",
      "不要给涂几次、涂几天或稀释比例。",
    ],
    sourceUrls: [
      "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/ringworm",
      "https://www.merckvetmanual.com/cat-owners/skin-disorders-of-cats/ringworm-dermatophytosis-in-cats",
    ],
  },
];

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function hasProductOrMedicationIntent(query: string): boolean {
  return /牌子|品牌|哪款|购买|买|哪里买|怎么买|怎么选|推荐|能不能用|可以用|能用|能不能刷|可以刷|用什么|买什么|牙膏|牙刷|刷牙|洁齿|漱口|喷剂|凝胶|化毛膏|猫草|营养膏|益生菌|外驱|滴剂|洗耳|耳药|止吐|胃药|尿路药|皮炎平|红霉素|软膏|药|消炎|止痛|抗生素|剂量|用量|处方|布洛芬|对乙酰氨基酚|双氧水|酒精|生理盐水|海盐水|伊丽莎白圈|食欲刺激剂/.test(
    query,
  );
}

function entryApplies(entry: MedicineEntry, query: string): boolean {
  return entry.match.some((pattern) => pattern.test(query));
}

function regionNote(region: UserRegionContext): string {
  if (region.countryCode === "CN") {
    return "地区提示:用户疑似在中国大陆。涉及兽药真伪/批准信息时,提醒优先核对正规宠物医院、产品说明书、兽药批准文号/追溯码;本地产品资料库没有可推荐候选时不要编品牌。";
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
  if (!hasProductOrMedicationIntent(q)) return "";
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
    "- 中国地区核验只给路径:正规宠物医院/正规渠道、产品说明书、批准文号/进口注册、追溯码或国家兽药综合查询;本地产品资料库没有可推荐候选时不编品牌。",
    "- 涉及具体产品/品牌时,只能依据下面“本地产品资料库”召回结果回答;没有产品资料库记录的条目只能给选购标准,不能编牌子。",
    "- 本地产品资料库里的 vet_label_guided / support_only / after_vet_check 不是让用户自行买药或自行用药,只能作为“知名候选 + 需要标签/兽医核验”的回答。",
    "- 禁用项要明确拦截;如果用户已经使用/误食,按急诊或尽快联系动物医院处理。",
    ...matches.flatMap((entry, index) => [
      "",
      `## ${index + 1}. ${entry.title}`,
      `id: ${entry.id}`,
      `region: ${entry.region}`,
      `category: ${entry.category}`,
      `policy: ${entry.policy}(${policyLabel(entry.policy)})`,
      "结构化字段:",
      `- item_type: ${entry.itemType}`,
      `- recommendation_mode: ${entry.recommendationMode}`,
      `- cn_availability: ${entry.cnAvailability}`,
      `- global_availability: ${entry.globalAvailability}`,
      `- prescription_boundary: ${entry.prescriptionBoundary}`,
      `- cn_verification: ${entry.cnVerification.join(" / ")}`,
      ...productCatalogContextForEntry(entry.id, region),
      "可以说:",
      ...entry.say.map((line) => `- ${line}`),
      "不要说:",
      ...entry.doNotSay.map((line) => `- ${line}`),
      `sources: ${entry.sourceUrls.join(" | ")}`,
    ]),
  ].join("\n");
}
