import type { RiskTier } from "@/types/cat";

export type BehaviorIntent =
  | "daily_care"
  | "medical_general"
  | "triage_followup"
  | "product_or_medicine"
  | "emergency";

export type BehaviorIntentInput = {
  query: string;
  symptom?: string;
  tier?: RiskTier;
  claimIds?: string[];
  report?: string;
  qa?: string;
};

export type BehaviorIntentDecision = {
  intent: BehaviorIntent;
  confidence: "high" | "medium";
  reason: string;
  useCareKnowledge: boolean;
  useMedicalKnowledge: boolean;
  useMedicalRecall: boolean;
  allowAuthorityWebSearch: boolean;
  instruction: string;
};

const EMERGENCY_RE =
  /张口喘|呼吸困难|喘不过气|舌头.*(紫|蓝)|牙龈.*(白|紫|蓝)|抽搐|癫痫|发作不止|尿不出|憋尿|大量出血|止不住血|百合|巧克力|葡萄|人药|鼠药|中毒|瘫软|叫不醒|昏迷|严重外伤|车撞|坠楼|触电|烧伤|烫伤|噎住|窒息/;

// 用户明确请求「整理一段给医生 / 兽医看的说明」。命中后短路到 daily_care +
// care_recall,LLM planner 会调 care_recall 召回 vet-summary 卡片并按卡输出。
// 即使带 tier=red / yellow 也优先满足 —— 整理需求本就服务于就医动作,
// 卡片内含红 / 黄档语气规则,不会软化判级。
const VET_SUMMARY_RE =
  /整理.*(给|发|送).*(医生|兽医)|帮.*整理.*(给|发|送).*(医生|兽医)|写.*给.*(医生|兽医)|给(医生|兽医).*(发|看|说)|给(医生|兽医)看的(话|说明|描述)|带去医院.*(说|描述|讲)|病情说明|准备.*(就医|去医院).*(说|描述)|出.*(就医|医院).*说明/;

const PRODUCT_BUYING_RE =
  /牌子|品牌|哪款|购买|买|哪里买|怎么买|怎么选|推荐|能不能用|可以用|能用|能不能刷|可以刷/;

const CARE_PRODUCT_RE =
  /牙膏|牙刷|刷牙|洁齿|漱口|喷剂|凝胶|生理盐水|海盐水|益生菌|驱虫|化毛膏|猫草|营养膏|外驱|滴剂|洗耳|耳药|猫用化毛|洁耳|眼部清洁|伤口清洁/;

const DRUG_PRODUCT_RE =
  /止吐|胃药|尿路药|皮炎平|红霉素|软膏|药|消炎|止痛|抗生素|剂量|用量|处方|食欲刺激剂|布洛芬|对乙酰氨基酚|多西|阿奇|氧氟沙星|氯霉素|妥布霉素/;

const CLEAR_DAILY_CARE_RE =
  /半夜|夜里|凌晨|扒门|跑酷|咬手|扑腿|抱脚|咬人玩|新猫|到家|躲床底|不亲人|怕人|挑食|换粮|不埋屎|带砂|猫砂盆|梳毛|毛球|毛结|陪玩|玩耍|无聊|剪指甲|刷牙训练|疫苗|免疫|猫三联|妙三多|狂犬|驱虫|外驱|内驱|跳蚤|寄生虫|减肥|肥胖|体重|体况|生骨肉|自制粮|抓沙发|抓家具|抓墙|猫包|航空箱|去医院|坐车|多猫|哈气|追咬|绝育|术后|戴圈|喂药|老年猫|慢病|复查|肾病|糖尿病|甲亢|高血压|关节炎|行动慢|跳不上|发情|怀孕|生产|分娩|新生|奶猫|手养|孤儿猫/;

const APPETITE_MEDICAL_RE =
  /完全不吃|拒食|厌食|不想吃|没胃口|胃口差|不(太|怎么|咋|大)?爱吃(饭|东西)?|吃得(很)?少|吃很少|食量(下降|变少|少)|饭量(下降|变少|少)/;

const APPETITE_CARE_CONTEXT_RE =
  /挑食|换粮|新粮|旧粮|罐头|干粮|冻干|零食|粮/;

const APPETITE_RISK_CONTEXT_RE =
  /要不要.*(医院|就医|看医生|急诊)|要去(医院|看医生)|去医院|就医|要紧|严重|突然|超过|小时|精神|呕吐|吐|腹泻|拉稀|不喝|体重|消瘦|瘦/;

const MEDICAL_RE =
  /打喷嚏|鼻涕|眼屎|流泪|咳嗽|呕吐|吐|拉稀|腹泻|软便|便血|黑便|不吃|食欲|没胃口|胃口差|拒食|厌食|不想吃|精神差|嗜睡|尿频|尿血|尿少|乱尿|排尿|耳朵|甩头|挠耳|眼睛|眯眼|皮肤|掉毛|瘙痒|牙龈|牙齿发黄|口臭|流口水|掉食|跛|瘸|摔|出血|误食|发烧|疼|痛/;

function isAppetiteMedicalQuestion(query: string): boolean {
  if (!APPETITE_MEDICAL_RE.test(query)) return false;
  return !APPETITE_CARE_CONTEXT_RE.test(query) || APPETITE_RISK_CONTEXT_RE.test(query);
}

function hasStructuredMedicalContext(input: BehaviorIntentInput): boolean {
  return Boolean(
    input.symptom ||
      input.tier ||
      (input.claimIds && input.claimIds.length > 0) ||
      input.report ||
      input.qa,
  );
}

export function classifyBehaviorIntent(
  input: BehaviorIntentInput,
): BehaviorIntentDecision {
  const query = input.query.trim();

  // 短路:用户明确请求整理给医生 / 兽医看的说明。即使在红 / 黄档分诊上下文
  // 里,也优先满足整理需求(vet-summary 卡片内已含各档语气规则,不会软化)。
  if (VET_SUMMARY_RE.test(query)) {
    const tierHint =
      input.tier === "red"
        ? " 上游 tier=red,语气保持「立刻就医 / 急诊」级别。"
        : input.tier === "yellow"
          ? " 上游 tier=yellow,语气用「这几天内挂号 / 尽快就医」。"
          : "";
    return {
      intent: "daily_care",
      confidence: "high",
      reason: "vet_summary_request_short_circuit",
      useCareKnowledge: true,
      useMedicalKnowledge: hasStructuredMedicalContext(input),
      useMedicalRecall: false,
      allowAuthorityWebSearch: false,
      instruction:
        "用户请求整理一段给医生 / 兽医看的中文说明。调用 care_recall 召回 vet-summary 卡片,严格按卡内 content_order / hard_rules 输出,不要再追问已知信息。" +
        tierHint,
    };
  }

  if (input.tier === "red" || EMERGENCY_RE.test(query)) {
    return {
      intent: "emergency",
      confidence: "high",
      reason: input.tier === "red" ? "upstream_red_tier" : "red_flag_terms",
      useCareKnowledge: false,
      useMedicalKnowledge: hasStructuredMedicalContext(input),
      useMedicalRecall: false,
      allowAuthorityWebSearch: false,
      instruction:
        "疑似红旗急症,优先立刻联系动物医院/急诊;不要等待联网搜索,不要继续常规追问。",
    };
  }

  if (hasStructuredMedicalContext(input)) {
    return {
      intent: "triage_followup",
      confidence: "high",
      reason: "structured_triage_context_present",
      useCareKnowledge: false,
      useMedicalKnowledge: true,
      useMedicalRecall: true,
      allowAuthorityWebSearch: false,
      instruction:
        "用户带着分诊上下文追问,按 symptom/tier/claimIds 精准延续,不要重复问已回答内容。",
    };
  }

  if (
    DRUG_PRODUCT_RE.test(query) ||
    (CARE_PRODUCT_RE.test(query) && PRODUCT_BUYING_RE.test(query))
  ) {
    return {
      intent: "product_or_medicine",
      confidence: "high",
      reason: DRUG_PRODUCT_RE.test(query)
        ? "drug_or_high_risk_product_terms"
        : "care_product_terms_with_purchase_intent",
      useCareKnowledge: false,
      useMedicalKnowledge: false,
      useMedicalRecall: true,
      allowAuthorityWebSearch: true,
      instruction:
        "用户在问药品、用品、品牌或购买;先使用本地药品/用品边界,资料不足时才允许白名单权威站补充。",
    };
  }

  if (isAppetiteMedicalQuestion(query)) {
    return {
      intent: "medical_general",
      confidence: "high",
      reason: "appetite_loss_health_terms",
      useCareKnowledge: false,
      useMedicalKnowledge: false,
      useMedicalRecall: true,
      allowAuthorityWebSearch: false,
      instruction:
        "用户在问食欲下降/不爱吃是否需要就医;优先召回本地不吃/食欲下降医学资料,询问持续时间、进食量、精神和伴随症状,不要被“去医院”误分到猫包训练。",
    };
  }

  if (CLEAR_DAILY_CARE_RE.test(query) && !/突然.*(不吃|精神差|疼|痛|乱尿|尿频|尿血|呕吐|腹泻|拉稀)/.test(query)) {
    return {
      intent: "daily_care",
      confidence: "high",
      reason: "clear_daily_care_terms",
      useCareKnowledge: true,
      useMedicalKnowledge: false,
      useMedicalRecall: false,
      allowAuthorityWebSearch: false,
      instruction:
        "明确日常行为、喂养、训练或环境问题;使用日常资料库,只在出现健康信号时切回分诊。",
    };
  }

  if (MEDICAL_RE.test(query)) {
    return {
      intent: "medical_general",
      confidence: "high",
      reason: "health_symptom_terms",
      useCareKnowledge: false,
      useMedicalKnowledge: false,
      useMedicalRecall: true,
      allowAuthorityWebSearch: false,
      instruction:
        "普通健康问题只走本地医学资料和追问边界;默认不在首 token 前联网搜索。",
    };
  }

  return {
    intent: "daily_care",
    confidence: "medium",
    reason: "no_health_or_product_terms",
    useCareKnowledge: true,
    useMedicalKnowledge: false,
    useMedicalRecall: false,
    allowAuthorityWebSearch: false,
    instruction:
      "日常行为、喂养、训练或环境问题;回答要具体可执行,只在出现健康信号时切回分诊。",
  };
}
