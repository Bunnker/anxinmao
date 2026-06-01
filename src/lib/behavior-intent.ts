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
  /张口喘|呼吸困难|喘不过气|舌头.*(紫|蓝)|牙龈.*(白|紫|蓝)|抽搐|尿不出|憋尿|大量出血|止不住血|百合|巧克力|葡萄|人药|鼠药|中毒|瘫软|叫不醒|昏迷|严重外伤/;

const PRODUCT_OR_MEDICINE_RE =
  /牌子|品牌|哪款|购买|哪里买|怎么买|推荐.*(牙膏|牙刷|猫砂|猫粮|罐头|益生菌|驱虫|用品|产品)|牙膏|牙刷|洁齿|漱口|喷剂|凝胶|药|消炎|止痛|抗生素|剂量|用量|处方/;

const CLEAR_DAILY_CARE_RE =
  /半夜|夜里|凌晨|扒门|跑酷|咬手|扑腿|抱脚|咬人玩|新猫|到家|躲床底|不亲人|怕人|挑食|换粮|不埋屎|带砂|猫砂盆|梳毛|毛球|毛结|陪玩|玩耍|无聊|剪指甲|刷牙训练/;

const MEDICAL_RE =
  /打喷嚏|鼻涕|眼屎|流泪|咳嗽|呕吐|吐|拉稀|腹泻|软便|便血|黑便|不吃|食欲|精神差|嗜睡|尿频|尿血|尿少|乱尿|排尿|耳朵|甩头|挠耳|眼睛|眯眼|皮肤|掉毛|瘙痒|牙龈|牙齿发黄|口臭|流口水|掉食|跛|瘸|摔|出血|误食|发烧|疼|痛/;

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

  if (PRODUCT_OR_MEDICINE_RE.test(query)) {
    return {
      intent: "product_or_medicine",
      confidence: "high",
      reason: "product_or_medicine_terms",
      useCareKnowledge: false,
      useMedicalKnowledge: false,
      useMedicalRecall: true,
      allowAuthorityWebSearch: true,
      instruction:
        "用户在问药品、用品、品牌或购买;先使用本地药品/用品边界,资料不足时才允许白名单权威站补充。",
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
