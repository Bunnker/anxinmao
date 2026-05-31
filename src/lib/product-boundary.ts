import type { UserRegionContext } from "@/lib/request-region";

function isProductQuery(query: string): boolean {
  return /牌子|品牌|推荐|买|购买|哪里|牙膏|牙刷|洁齿|漱口|喷剂|凝胶|药|消炎|止痛|抗生素|用品|产品/.test(
    query,
  );
}

function isOralCareQuery(query: string): boolean {
  return /牙|牙龈|口腔|口臭|刷牙|牙膏|牙刷|洁齿|牙黄|牙结石|流口水|抓嘴|挠嘴|掉食|下巴肿|脸肿|白斑|白膜|咂嘴|口干/.test(query);
}

function isDrugProductQuery(query: string): boolean {
  return /药|消炎|止痛|抗生素|剂量|用量|处方/.test(query);
}

function countryLabel(region: UserRegionContext): string {
  return region.countryCode ?? "(unknown)";
}

export function productBoundaryContext(
  query: string,
  region: UserRegionContext,
): string {
  if (!isProductQuery(query)) return "";
  const oralCare = isOralCareQuery(query);
  const drugProduct = isDrugProductQuery(query);
  const isChina = region.countryCode === "CN";

  return [
    "【地区化商品/护理用品推荐边界】",
    `detected_country: ${countryLabel(region)}`,
    `country_source: ${region.source}`,
    "通用规则:",
    "- 用户问品牌/牌子/购买时,不要凭常识编品牌;如果工具上下文提供了专业来源,可以直接给候选品牌/产品类型,并说明适用阶段和核验方式。",
    "- 地区只影响购买可得性核验,不是拒绝推荐的理由;不要用地区作为挡板式拒绝回答。",
    "- 如果专业来源只证明安全/有效类别,但没有证明本地可买,可以先给来源支持的候选,再提醒用户在本地正规宠物医疗渠道核验。",
    drugProduct
      ? "- 涉及药品、消炎、止痛、抗生素或处方药时,不能给商品名、剂量或让用户自行购买;只能说需要兽医面诊后决定。"
      : "- 非药品护理用品可以推荐,但不能把用品说成治疗当前症状的替代方案。",
    isChina
      ? "- 用户地区为 CN 时,优先推荐专业来源支持、且用户可在中国正规渠道核验的候选;如果联网工具召回 VOHC/Cornell/VCA 等专业来源,可直接列出候选或选购标准。"
      : "- 如果地区不是 CN,按检测地区给购买核验提醒;地区不确定时先问用户所在地,但不要回避专业来源已经支持的通用选择标准。",
    oralCare
      ? "- 口腔护理用品要区分“当前症状处理”和“日常护理”:牙龈红肿、明显疼痛、流口水、拒食硬粮、牙齿松动或口腔出血时,先建议兽医检查,不要让用户先刷牙硬处理。"
      : "",
    oralCare
      ? "- 兽医确认不疼或症状缓解后的日常护理阶段,可以直接推荐猫专用、可吞咽牙膏和软毛/指套/宠物牙刷;绝不能用人牙膏。"
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
