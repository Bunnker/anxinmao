import type { CaseSummaryOutput } from "@/lib/case-summary";

export type CaseSummarySafetyViolation =
  | "diagnosisCertainty"
  | "prescriptionDosage"
  | "drugPurchase";

export type CaseSummarySafetyResult = {
  ok: boolean;
  violations: CaseSummarySafetyViolation[];
};

const CERTAIN_DISEASE_RE = /猫瘟|支原体|疱疹|杯状|肾病|糖尿病|鼻炎|肺炎|口炎|肠胃炎|过敏/;
const DIAGNOSIS_CERTAINTY_RE =
  /确诊|一定是|已经得了|百分百|肯定是|已经诊断(?:为|是)|就是.{0,12}(?:猫瘟|支原体|疱疹|杯状|肾病|糖尿病|鼻炎|肺炎|口炎|肠胃炎|过敏)/;
const DIRECT_DIAGNOSIS_RE = /诊断(?:为|是)/u;
const DIAGNOSIS_CONFIRMATION_QUESTION_RE =
  /(?:请医生|请问医生|问医生).{0,12}(?:确认|判断|评估|判定)?.{0,8}(?:是否|能否|可否|能不能|是不是).{0,8}诊断(?:为|是)|诊断(?:为|是).{0,12}(?:吗|么|？|\?)/u;
const DOSAGE_UNIT_RE =
  /\d+(?:\.\d+)?\s*(?:mg|毫克|ml|毫升|片|粒|颗|袋)|按体重.{0,8}(?:吃|用|喂)|连用.{0,6}天|疗程.{0,6}天|(?:剂量|用量).{0,8}(?:为|是|按|每次|每天|每日|一日|\d+(?:\.\d+)?\s*(?:mg|毫克|ml|毫升|片|粒|颗|袋))/iu;
const DRUG_CONTEXT_RE =
  /多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药|药物|药|用药|喂药|服用|口服|滴眼|滴耳/iu;
const DOCTOR_DOSAGE_QUESTION_RE =
  /(?:请问医生|请医生|问医生|医生确认|医生.{0,6}确定).{0,24}(?:剂量|用量)|(?:剂量|用量).{0,16}(?:请问医生|请医生|问医生|医生确认|医生.{0,6}确定)/u;
const CONCRETE_DOSAGE_RE =
  /\d+(?:\.\d+)?\s*(?:mg|毫克|ml|毫升|片|粒|颗|袋)|(?:半|一|二|两|三|四|五|六|七|八|九|十)\s*(?:片|粒|颗|袋|滴|ml|毫升|mg|毫克)|每次|每天|每日|一日|每(?:早|晚|晨|夜).{0,4}(?:一|1)\s*次|(?:每|每隔)\s*\d+\s*(?:小时|h)|早晚各一次|q\d+h|qxh|\b(?:qd|sid|tid|bid|qod)\b/iu;
const PRESCRIPTION_AMOUNT_RE =
  /每次\s*(?:半|一|二|两|三|四|五|六|七|八|九|十|\d+).{0,4}(?:片|粒|颗|袋|滴|ml|毫升|mg|毫克)/iu;
const PRESCRIPTION_BARE_AMOUNT_RE =
  /(?:半|一|二|两|三|四|五|六|七|八|九|十|\d+(?:\.\d+)?)\s*(?:片|粒|颗|袋|滴|ml|毫升|mg|毫克)/iu;
const PRESCRIPTION_DURATION_RE =
  /连用\s*(?:一|二|两|三|四|五|六|七|八|九|十|\d+)\s*(?:天|周|月)/iu;
const FREQUENCY_RE =
  /(?:一天|一日|每日|每天).{0,8}(?:\d+|[一二两三四五六七八九十]+)\s*次|每(?:早|晚|晨|夜).{0,4}(?:一|1)\s*次|(?:每|每隔)\s*\d+\s*(?:小时|h)(?:\s*(?:一|1)\s*次)?|早晚各一次|q\d+h|qxh|\b(?:qd|sid|tid|bid|qod)\b/iu;
const LINK_OR_SHOP_DRUG_PURCHASE_RE =
  /(?:链接|店铺).{0,8}(?:购买|买|下单).{0,8}(?:多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药)/u;
const DRUG_PURCHASE_RE =
  /(?:购买|自行买|买点?|下单|用药|喂药).{0,16}(?:多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药)|(?:多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药).{0,16}(?:购买|自行买|买点?|下单|用药|喂药)|药店买|网上买|网上购买|网上下单/;
const MIXED_UNSAFE_DRUG_PURCHASE_RE =
  /(?:不(?:要|可|建议)?自行用药|(?:不(?:要|可|建议)|请勿)自行购买(?:抗生素|处方药|药物|药)).{0,20}(?:购买|买点?|自行买|网上购买|网上买).{0,8}(?:多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药)/u;
const PROTECTIVE_DRUG_TEXT_RE =
  /不(?:要|可|建议)?自行用药|不要用药|避免自行用药|禁止自行用药|(?:不(?:要|可|建议)|请勿).{0,8}(?:购买|买).{0,12}(?:多西|阿奇|抗生素|消炎药|止痛药|止吐药|处方药|眼药水|耳药)|(?:不(?:要|建议)|请勿).{0,4}(?:网上购买|网上买|药店买)/u;

function collectText(output: CaseSummaryOutput | Omit<CaseSummaryOutput, "copyText">): string {
  const copyText = "copyText" in output ? output.copyText : "";
  return [
    output.userSummary,
    output.doctorNote,
    output.doctorQuestions.join("\n"),
    output.dontDo.join("\n"),
    copyText,
  ].join("\n");
}

function hasDiagnosisCertainty(text: string): boolean {
  return text.split(/[。！？!?；;\n]/).some((clause) => {
    if (DIRECT_DIAGNOSIS_RE.test(clause) && !DIAGNOSIS_CONFIRMATION_QUESTION_RE.test(clause)) {
      return true;
    }

    return DIAGNOSIS_CERTAINTY_RE.test(clause) || /就是/.test(clause) && CERTAIN_DISEASE_RE.test(clause);
  });
}

function hasPrescriptionDosage(text: string): boolean {
  const clauses = text.split(/[。！？!?；;\n]/);
  return clauses.some((clause) => {
    if (
      DOCTOR_DOSAGE_QUESTION_RE.test(clause) &&
      !(DRUG_CONTEXT_RE.test(clause) && CONCRETE_DOSAGE_RE.test(clause))
    ) {
      return false;
    }

    if (DOSAGE_UNIT_RE.test(clause)) return true;

    return (
      DRUG_CONTEXT_RE.test(clause) &&
      (PRESCRIPTION_AMOUNT_RE.test(clause) ||
        PRESCRIPTION_BARE_AMOUNT_RE.test(clause) ||
        PRESCRIPTION_DURATION_RE.test(clause) ||
        FREQUENCY_RE.test(clause))
    );
  });
}

function hasDrugPurchase(text: string): boolean {
  return text
    .split(/[。！？!?；;\n，,]/)
    .some(
      (clause) =>
        MIXED_UNSAFE_DRUG_PURCHASE_RE.test(clause) ||
        !PROTECTIVE_DRUG_TEXT_RE.test(clause) &&
          (LINK_OR_SHOP_DRUG_PURCHASE_RE.test(clause) || DRUG_PURCHASE_RE.test(clause)),
    );
}

export function validateCaseSummaryOutput(
  output: CaseSummaryOutput | Omit<CaseSummaryOutput, "copyText">,
): CaseSummarySafetyResult {
  const text = collectText(output);
  const violations: CaseSummarySafetyViolation[] = [];

  if (hasDiagnosisCertainty(text)) violations.push("diagnosisCertainty");
  if (hasPrescriptionDosage(text)) violations.push("prescriptionDosage");
  if (hasDrugPurchase(text)) violations.push("drugPurchase");

  return {
    ok: violations.length === 0,
    violations,
  };
}
