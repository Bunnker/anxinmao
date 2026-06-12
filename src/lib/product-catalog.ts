import type { UserRegionContext } from "@/lib/request-region";

export type ProductCatalogEntry = {
  id: string;
  appliesToEntryIds: string[];
  brand: string;
  productName: string;
  productType:
    | "oral_toothpaste_or_brush"
    | "oral_water_additive"
    | "oral_dental_chew"
    | "oral_dental_treat_or_diet"
    | "probiotic_supplement"
    | "cat_flea_tick_product"
    | "hairball_food_or_support";
  useStage:
    | "daily_care"
    | "support_only"
    | "vet_label_guided"
    | "after_vet_check";
  evidenceLevel: "L1-product" | "official-brand" | "regulator-safety" | "clinical-practical";
  availabilityCN: "known_cn_official" | "cn_channel_check_required" | "unknown_cn";
  chinaPriority:
    | "cn_official_first"
    | "cn_verified_channel"
    | "global_known_channel_check"
    | "not_cn_priority";
  marketStatus:
    | "cn_official_source_active"
    | "global_official_source_active"
    | "channel_check_required"
    | "unknown_cn_channel";
  reviewStatus: "content_reviewed_needs_vet_review" | "vet_reviewed";
  lastVerifiedAt: string;
  recommendationBoundary: string;
  cnVerification: string[];
  sourceUrls: string[];
};

type ProductCatalogSeed = Omit<
  ProductCatalogEntry,
  "chinaPriority" | "marketStatus" | "reviewStatus" | "lastVerifiedAt"
> &
  Partial<
    Pick<
      ProductCatalogEntry,
      "chinaPriority" | "marketStatus" | "reviewStatus" | "lastVerifiedAt"
    >
  >;

const DEFAULT_LAST_VERIFIED_AT = "2026-06-08";

function defaultChinaPriority(
  availability: ProductCatalogEntry["availabilityCN"],
): ProductCatalogEntry["chinaPriority"] {
  if (availability === "known_cn_official") return "cn_official_first";
  if (availability === "cn_channel_check_required") return "global_known_channel_check";
  return "not_cn_priority";
}

function defaultMarketStatus(
  availability: ProductCatalogEntry["availabilityCN"],
): ProductCatalogEntry["marketStatus"] {
  if (availability === "known_cn_official") return "cn_official_source_active";
  if (availability === "cn_channel_check_required") return "channel_check_required";
  return "unknown_cn_channel";
}

function normalizeProduct(product: ProductCatalogSeed): ProductCatalogEntry {
  return {
    ...product,
    chinaPriority: product.chinaPriority ?? defaultChinaPriority(product.availabilityCN),
    marketStatus: product.marketStatus ?? defaultMarketStatus(product.availabilityCN),
    reviewStatus: product.reviewStatus ?? "content_reviewed_needs_vet_review",
    lastVerifiedAt: product.lastVerifiedAt ?? DEFAULT_LAST_VERIFIED_AT,
  };
}

const PRODUCT_CATALOG_SEED: ProductCatalogSeed[] = [
  {
    id: "oral_virbac_cet_toothpaste_kit",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Virbac C.E.T.",
    productName: "C.E.T复合酶牙膏 / C.E.T.复合酶牙膏套装 猫用/犬用",
    productType: "oral_toothpaste_or_brush",
    useStage: "daily_care",
    evidenceLevel: "official-brand",
    availabilityCN: "known_cn_official",
    lastVerifiedAt: "2026-06-12",
    recommendationBoundary:
      "维克中国官方口腔护理产品;可作为国内日常刷牙训练优先候选。牙龈红肿、疼痛、流口水或出血时不要先硬刷。",
    cnVerification: [
      "核对维克中国官方产品名、猫用/犬猫适用和可吞咽说明",
      "核对成分表,避开人用牙膏、酒精、精油和不明来源仿品",
      "优先正规宠物医院、宠物医疗渠道或维克官方指向渠道",
    ],
    sourceUrls: [
      "https://cn.virbac.com/products/dental/cet-enzymatic-toothpaste",
      "https://cn.virbac.com/products/dental/4.2-cet-dental-kit",
      "https://us.virbac.com/home/our-products/pagecontent/product-selector/cet-enzymatic-toothpaste-dog-cat.html",
    ],
  },
  {
    id: "oral_virbac_intellident_cat_bite",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Virbac 怡粒多",
    productName: "怡粒多™口腔护理咀嚼粒（猫用 INTELLIDENT™ Cat Bite）",
    productType: "oral_dental_chew",
    useStage: "daily_care",
    evidenceLevel: "official-brand",
    availabilityCN: "known_cn_official",
    lastVerifiedAt: "2026-06-12",
    recommendationBoundary:
      "维克中国官方猫用口腔护理咀嚼粒;只能作为日常洁齿辅助,不能治疗牙龈红肿、口炎、牙周病或口腔疼痛。",
    cnVerification: [
      "核对猫用 INTELLIDENT Cat Bite 和官方渠道",
      "作为洁齿辅助时仍优先刷牙训练,不要替代口腔检查",
      "口腔疼痛、掉食、出血或不愿咀嚼时不要靠咀嚼粒处理",
    ],
    sourceUrls: ["https://cn.virbac.com/products/dental/intellident-cat-bite"],
  },
  {
    id: "oral_virbac_vet_aquadent",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Virbac 益口清",
    productName: "益口清™饮水洁牙液 VET AQUADENT™",
    productType: "oral_water_additive",
    useStage: "after_vet_check",
    evidenceLevel: "official-brand",
    availabilityCN: "known_cn_official",
    lastVerifiedAt: "2026-06-12",
    recommendationBoundary:
      "维克中国官方饮水洁牙液;只作为日常口腔护理补充。涉及饮水量异常、肾病、挑水、口腔疼痛或成分顾虑时先问兽医,不要把它当治疗。",
    cnVerification: [
      "核对 VET AQUADENT 官方产品说明和稀释说明",
      "不要把人用漱口水、含酒精/精油口腔产品类比给猫",
      "如果猫本来喝水少或有泌尿/肾脏问题,先问兽医再考虑饮水添加类产品",
    ],
    sourceUrls: ["https://cn.virbac.com/products/dental/vet-aquadent"],
  },
  {
    id: "oral_healthymouth_cat_products",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Healthymouth",
    productName: "Healthymouth Toothpaste/Brush Kit / Topical Gel / Water Additive for Cats",
    productType: "oral_toothpaste_or_brush",
    useStage: "daily_care",
    evidenceLevel: "L1-product",
    availabilityCN: "unknown_cn",
    recommendationBoundary:
      "VOHC 猫用 plaque 控制候选;只能用于日常口腔护理,不治疗当前牙龈红肿或口炎。",
    cnVerification: [
      "中国可得性不确定,需核验正规渠道",
      "按产品说明使用,不要替代兽医口腔检查",
    ],
    sourceUrls: ["https://vohc.org/accepted-products/"],
  },
  {
    id: "oral_feline_greenies_dental_treats",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Feline Greenies",
    productName: "Feline Dental Treats",
    productType: "oral_dental_treat_or_diet",
    useStage: "daily_care",
    evidenceLevel: "L1-product",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "VOHC 猫用 tartar 控制候选;作为日常洁齿零食,不能替代刷牙、洁牙或治疗红肿疼痛。",
    cnVerification: [
      "核对猫用标签、热量和每日喂量",
      "肥胖、肠胃敏感或处方饮食猫先问兽医",
    ],
    sourceUrls: ["https://vohc.org/accepted-products/"],
  },
  {
    id: "oral_purina_dentalife_cat_treats",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Purina DentaLife",
    productName: "DentaLife Daily Oral Care Cat Treats",
    productType: "oral_dental_treat_or_diet",
    useStage: "daily_care",
    evidenceLevel: "L1-product",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "VOHC 猫用 tartar 控制候选;只作为日常洁齿零食,不要说成治疗口腔疾病。",
    cnVerification: [
      "核对猫用标签、热量、批号和正规渠道",
      "已有口腔疼痛或不吃硬物时不要靠洁齿零食处理",
    ],
    sourceUrls: ["https://vohc.org/accepted-products/"],
  },
  {
    id: "oral_royal_canin_feline_dental",
    appliesToEntryIds: ["cat_oral_toothpaste_toothbrush"],
    brand: "Royal Canin",
    productName: "Feline Dental Diet / 口腔护理成猫全价粮",
    productType: "oral_dental_treat_or_diet",
    useStage: "daily_care",
    evidenceLevel: "L1-product",
    availabilityCN: "known_cn_official",
    recommendationBoundary:
      "可作为日常口腔护理饮食候选;不治疗牙龈红肿、牙周病或口炎。",
    cnVerification: [
      "中国有官方产品页,购买仍需核对正规渠道",
      "处方粮/特殊饮食猫先问兽医",
    ],
    sourceUrls: [
      "https://vohc.org/accepted-products/",
      "https://www.royalcanin.com.cn/index.php/cats/products/2549",
    ],
  },
  {
    id: "probiotic_purina_fortiflora_feline",
    appliesToEntryIds: ["digestive_probiotic_support"],
    brand: "Purina FortiFlora",
    productName: "Pro Plan Veterinary Supplements FortiFlora Feline",
    productType: "probiotic_supplement",
    useStage: "support_only",
    evidenceLevel: "official-brand",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "知名宠物益生菌补充剂;只用于轻微软便支持,不能替代排查猫瘟、寄生虫、血便或持续腹泻。",
    cnVerification: [
      "核对猫用/犬猫适用、批号、保存方式和正规渠道",
      "软便超过 24-48 小时、血便、呕吐或精神差要就医",
    ],
    sourceUrls: ["https://www.purina.com/pro-plan-vet/supplements/fortiflora"],
  },
  {
    id: "probiotic_protexin_pro_kolin_cat",
    appliesToEntryIds: ["digestive_probiotic_support"],
    brand: "Protexin Pro-Kolin",
    productName: "Pro-Kolin Advanced for Cats",
    productType: "probiotic_supplement",
    useStage: "support_only",
    evidenceLevel: "official-brand",
    availabilityCN: "unknown_cn",
    recommendationBoundary:
      "英国/欧洲常见兽医肠胃支持品牌;中国可得性不确定,不作为国内优先购买结论。",
    cnVerification: [
      "中国购买需核验正规渠道和中文标签",
      "不要替代腹泻病因检查",
    ],
    sourceUrls: ["https://www.protexinvet.com/products/pro-kolin-advanced-for-cats-anz/"],
  },
  {
    id: "probiotic_visbiome_vet_gi",
    appliesToEntryIds: ["digestive_probiotic_support"],
    brand: "Visbiome Vet",
    productName: "Visbiome Vet Advanced GI Care",
    productType: "probiotic_supplement",
    useStage: "support_only",
    evidenceLevel: "official-brand",
    availabilityCN: "unknown_cn",
    recommendationBoundary:
      "美国常见高浓度宠物益生菌品牌;中国可得性不确定,需要正规渠道核验。",
    cnVerification: [
      "核对冷链/保存要求、猫适用说明和正规渠道",
      "不要替代就医或处方治疗",
    ],
    sourceUrls: ["https://visbiomevet.com/"],
  },
  {
    id: "flea_bravocto_cat",
    appliesToEntryIds: ["flea_tick_cat_only_label"],
    brand: "Bravecto",
    productName: "Bravecto topical solution for cats / Bravecto Plus",
    productType: "cat_flea_tick_product",
    useStage: "vet_label_guided",
    evidenceLevel: "regulator-safety",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "知名猫用外驱候选;必须按猫用标签、体重段、年龄和兽医建议核验,不提供剂量或频率。",
    cnVerification: [
      "核对猫用标签、体重段、年龄禁忌、批准/进口信息和追溯码",
      "有抽搐史、神经症状、孕猫、幼猫、病猫先问兽医",
    ],
    sourceUrls: [
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/fact-sheet-pet-owners-and-veterinarians-about-potential-adverse-events-associated-isoxazoline-flea?lv=true",
    ],
  },
  {
    id: "flea_credelio_cat",
    appliesToEntryIds: ["flea_tick_cat_only_label"],
    brand: "Credelio",
    productName: "Credelio CAT / Credelio tablets for dogs and cats",
    productType: "cat_flea_tick_product",
    useStage: "vet_label_guided",
    evidenceLevel: "regulator-safety",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "知名外驱候选;只能作为猫用标签核验对象,不要让用户把犬用或不同体重段产品折算给猫。",
    cnVerification: [
      "核对猫用标签和体重段",
      "病猫、幼猫、孕猫或神经系统病史先问兽医",
    ],
    sourceUrls: [
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/fact-sheet-pet-owners-and-veterinarians-about-potential-adverse-events-associated-isoxazoline-flea?lv=true",
    ],
  },
  {
    id: "flea_nexgard_combo_cat",
    appliesToEntryIds: ["flea_tick_cat_only_label"],
    brand: "NexGard Combo",
    productName: "NexGard Combo topical solution for cats",
    productType: "cat_flea_tick_product",
    useStage: "vet_label_guided",
    evidenceLevel: "regulator-safety",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "知名猫用外用候选;中国可得性和适用性需宠物医院/正规渠道核验,不展示用量。",
    cnVerification: [
      "核对猫用标签、体重段、批准/进口信息和追溯码",
      "多猫家庭防互舔",
    ],
    sourceUrls: [
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/fact-sheet-pet-owners-and-veterinarians-about-potential-adverse-events-associated-isoxazoline-flea?lv=true",
    ],
  },
  {
    id: "flea_revolution_plus_cat",
    appliesToEntryIds: ["flea_tick_cat_only_label"],
    brand: "Revolution Plus",
    productName: "Revolution Plus topical solution for cats",
    productType: "cat_flea_tick_product",
    useStage: "vet_label_guided",
    evidenceLevel: "regulator-safety",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "知名猫用外用候选;有神经系统不良反应提示,病猫/幼猫/孕猫/有抽搐史先问兽医。",
    cnVerification: [
      "核对猫用标签、体重段和正规渠道",
      "出现流口水、抽搐、走路异常等反应立刻联系兽医",
    ],
    sourceUrls: [
      "https://www.fda.gov/animal-veterinary/animal-health-literacy/fact-sheet-pet-owners-and-veterinarians-about-potential-adverse-events-associated-isoxazoline-flea?lv=true",
    ],
  },
  {
    id: "hairball_purina_pro_plan_indoor_hairball",
    appliesToEntryIds: ["hairball_support_products"],
    brand: "Purina Pro Plan Indoor + Hairball",
    productName: "Indoor + Hairball adult cat food",
    productType: "hairball_food_or_support",
    useStage: "daily_care",
    evidenceLevel: "official-brand",
    availabilityCN: "cn_channel_check_required",
    recommendationBoundary:
      "知名猫粮品牌的毛球管理配方;适合日常饮食管理,不是呕吐治疗。",
    cnVerification: [
      "核对猫粮适用年龄、批号、正规渠道和换粮过渡",
      "反复呕吐、不吃、便秘或腹痛不要靠毛球粮处理",
    ],
    sourceUrls: [
      "https://www.purina.com/cats/shop/pro-plan-specialized-nutrition-indoor-care-turkey-rice-dry-cat-food",
    ],
  },
  {
    id: "hairball_tomlyn_laxatone_cat",
    appliesToEntryIds: ["hairball_support_products"],
    brand: "Tomlyn Laxatone",
    productName: "Laxatone Hairball Remedy Gel for Cats",
    productType: "hairball_food_or_support",
    useStage: "after_vet_check",
    evidenceLevel: "clinical-practical",
    availabilityCN: "unknown_cn",
    recommendationBoundary:
      "毛球凝胶类支持产品;应在兽医指导下使用,不作为反复呕吐、便秘或疑似梗阻的自行处理。",
    cnVerification: [
      "中国可得性不确定,需核验正规渠道",
      "不要把单独矿物油/液体石蜡当家庭处理方案",
    ],
    sourceUrls: [
      "https://vcahospitals.com/know-your-pet/digestive-lubricants-and-hairball-gels",
      "https://www.vetoquinolpetsusa.com/products/tomlyn-laxatone-hairball-remedy-maple-flavored-gel-for-cats-4-25-oz",
    ],
  },
];

const PRODUCT_CATALOG: ProductCatalogEntry[] = PRODUCT_CATALOG_SEED.map(normalizeProduct);

function cnAvailabilityRank(availability: ProductCatalogEntry["availabilityCN"]): number {
  if (availability === "known_cn_official") return 0;
  if (availability === "cn_channel_check_required") return 1;
  return 2;
}

function chinaPriorityRank(priority: ProductCatalogEntry["chinaPriority"]): number {
  if (priority === "cn_official_first") return 0;
  if (priority === "cn_verified_channel") return 1;
  if (priority === "global_known_channel_check") return 2;
  return 3;
}

function regionSortedProducts(
  products: ProductCatalogEntry[],
  region: UserRegionContext,
): ProductCatalogEntry[] {
  if (region.countryCode !== "CN") return products;
  return [...products].sort((a, b) => {
    const priorityDiff = chinaPriorityRank(a.chinaPriority) - chinaPriorityRank(b.chinaPriority);
    if (priorityDiff !== 0) return priorityDiff;
    const availabilityDiff =
      cnAvailabilityRank(a.availabilityCN) - cnAvailabilityRank(b.availabilityCN);
    if (availabilityDiff !== 0) return availabilityDiff;
    return products.indexOf(a) - products.indexOf(b);
  });
}

function regionalPriorityLabel(region: UserRegionContext): string {
  if (region.countryCode === "CN") {
    return "CN-first(known_cn_official -> cn_channel_check_required -> unknown_cn)";
  }
  if (!region.countryCode) {
    return "unknown-region(original_order; ask location if local purchase matters)";
  }
  return `${region.countryCode}-context(original_order; verify local veterinary channel)`;
}

export function productCatalogContextForEntry(
  entryId: string,
  region: UserRegionContext,
): string[] {
  const products = regionSortedProducts(
    PRODUCT_CATALOG.filter((product) =>
      product.appliesToEntryIds.includes(entryId),
    ),
    region,
  );
  if (products.length === 0) {
    return ["本地产品资料库: (none; 只能给选购标准,不要编具体品牌)"];
  }

  return [
    "本地产品资料库:",
    `regional_priority: ${regionalPriorityLabel(region)}`,
    ...products.flatMap((product) => [
      `- product_id: ${product.id}`,
      `  brand: ${product.brand}`,
      `  product_name: ${product.productName}`,
      `  product_type: ${product.productType}`,
      `  use_stage: ${product.useStage}`,
      `  evidence_level: ${product.evidenceLevel}`,
      `  availability_cn: ${product.availabilityCN}`,
      `  china_priority: ${product.chinaPriority}`,
      `  market_status: ${product.marketStatus}`,
      `  review_status: ${product.reviewStatus}`,
      `  last_verified_at: ${product.lastVerifiedAt}`,
      `  recommendation_boundary: ${product.recommendationBoundary}`,
      `  cn_verification: ${product.cnVerification.join(" / ")}`,
      `  sources: ${product.sourceUrls.join(" | ")}`,
    ]),
  ];
}
