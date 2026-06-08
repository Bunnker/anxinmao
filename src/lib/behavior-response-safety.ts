import type { BehaviorIntent } from "@/lib/behavior-intent";
import type { RiskTier } from "@/types/cat";

type BehaviorReplySafetyContext = {
  intent: BehaviorIntent;
  query: string;
  hasProductBoundary: boolean;
  hasMedicineProductPolicy: boolean;
  tier?: RiskTier;
};

export type BehaviorReplySafetyResult = {
  ok: boolean;
  reasonIds: string[];
  safeText: string;
};

type SafetyRule = {
  id: string;
  pattern: RegExp;
};

const SAFETY_RULES: SafetyRule[] = [
  {
    id: "dosage_pattern",
    pattern:
      /\d+(?:\.\d+)?\s*(?:mg|毫克|ml|毫升|片|粒|滴|单位|iu)\s*(?:\/|每|一天|每日|每天|一日|一次|kg|公斤|千克)/i,
  },
  {
    id: "prescription_or_human_drug_self_use",
    pattern:
      /(?:可以买|可以用|能用|先用|建议用|喂|吃|滴|抹|涂).{0,16}(?:布洛芬|对乙酰氨基酚|多西环素|阿奇霉素|抗生素|消炎药|止痛药|止吐药|胃药|眼药|耳药|皮炎平|红霉素|利尿药|食欲刺激剂)/,
  },
  {
    id: "care_product_as_treatment",
    pattern:
      /(?:牙膏|牙刷|洁齿|益生菌|化毛膏|猫草|营养膏).{0,20}(?:治疗|治好|治愈|替代就医|不用去医院|不用看医生)/,
  },
  {
    id: "red_flag_home_observe",
    pattern: /(?:尿不出|张口喘|呼吸困难|抽搐|大量出血|误食|中毒).{0,24}(?:先观察|在家观察|不用急|不用去医院)/,
  },
];

function shouldCheckSafety(context: BehaviorReplySafetyContext): boolean {
  return (
    context.intent === "product_or_medicine" ||
    context.hasProductBoundary ||
    context.hasMedicineProductPolicy ||
    context.tier === "red"
  );
}

function fallbackText(reasonIds: string[]): string {
  const reasonLine = reasonIds.includes("dosage_pattern")
    ? "这类问题涉及剂量或用药细节,我先把建议收紧。"
    : "这类问题涉及可能需要兽医判断的药品或护理用品,我先把建议收紧。";

  return [
    reasonLine,
    "",
    "- 不自行给猫用处方药、人用药、抗生素、止痛药、止吐药、眼药或耳药,也不要按网上剂量试。",
    "- 日常护理用品只能按本地资料库里明确允许的类别选,不能当成治疗。",
    "- 如果有呼吸困难、尿不出、抽搐、大量出血、误食毒物、不吃不喝超过 24 小时,直接联系动物医院。",
  ].join("\n");
}

export function checkBehaviorReplySafety(
  text: string,
  context: BehaviorReplySafetyContext,
): BehaviorReplySafetyResult {
  if (!shouldCheckSafety(context)) {
    return { ok: true, reasonIds: [], safeText: text };
  }

  const reasonIds = SAFETY_RULES.filter((rule) => rule.pattern.test(text)).map(
    (rule) => rule.id,
  );
  if (reasonIds.length === 0) {
    return { ok: true, reasonIds: [], safeText: text };
  }
  return {
    ok: false,
    reasonIds,
    safeText: fallbackText(reasonIds),
  };
}

export function behaviorReplySafetyPolicyPreview(): string {
  return [
    "【最终回复安全检查】",
    "适用: product_or_medicine / 地区化商品边界 / medicine_product_policy / red tier。",
    "forbidden_patterns:",
    ...SAFETY_RULES.map((rule) => `- ${rule.id}`),
    "处理: 命中后不直出原回复,改用安全兜底文本。",
  ].join("\n");
}
