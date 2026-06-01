// 病情说明小抄 API —— 把分诊/问诊上下文整理成主人能复制给兽医的说明。
// 只做红/黄档,不生成正式病例,不保存到服务器。
import { catProfileContext, type CatProfilePayload } from "@/lib/cat-profile-context";
import { chat, LLMError, parseHistory, type ChatMessage } from "@/lib/llm";
import {
  buildMedicalKnowledgeContext,
  normalizeClaimIds,
  parseRiskTier,
} from "@/lib/medical-knowledge";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";
import { SYMPTOM_LABELS } from "@/lib/triage";
import type { RiskTier } from "@/types/cat";

type CaseNoteTier = Exclude<RiskTier, "green">;

type CaseNoteInput = {
  symptom?: unknown;
  tier?: unknown;
  claimIds?: unknown;
  handoff?: unknown;
  chatHistory?: unknown;
  memo?: unknown;
  cat?: unknown;
  extraAnswer?: unknown;
  finalizeNow?: unknown;
  dryRun?: unknown;
};

type HandoffInput = {
  report?: string;
  qa?: string;
};

const FORBIDDEN_NOTE_LINES = [
  "不构成诊断",
  "不能替代兽医",
  "最终以兽医",
  "仅供参考",
];

function str(raw: unknown, max = 1200): string | undefined {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : undefined;
}

function parseCaseTier(raw: unknown): CaseNoteTier | null {
  const tier = parseRiskTier(raw);
  return tier === "red" || tier === "yellow" ? tier : null;
}

function handoffFrom(raw: unknown): HandoffInput {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return {
    report: str(r.report, 600),
    qa: str(r.qa, 1000),
  };
}

function chatText(raw: unknown): string {
  const parsed = parseHistory(raw);
  if (!parsed) return "";
  return parsed
    .slice(-12)
    .map((m) => `${m.role === "user" ? "主人" : "安心猫"}:${m.content}`)
    .join("\n")
    .slice(0, 3000);
}

function symptomLabel(symptom: string | undefined): string {
  return (symptom && SYMPTOM_LABELS[symptom]) || "这次情况";
}

function combinedContext(input: {
  handoff: HandoffInput;
  chatHistory?: unknown;
  memo?: string;
  extraAnswer?: string;
}): string {
  return [
    input.handoff.report ? `报告:${input.handoff.report}` : "",
    input.handoff.qa ? `分诊问答:${input.handoff.qa}` : "",
    input.memo ? `较早问诊摘要:${input.memo}` : "",
    chatText(input.chatHistory),
    input.extraAnswer ? `主人补充:${input.extraAnswer}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
}

function hasTimeAnchor(text: string): boolean {
  return /(\d+\s*(分钟|小时|天|周|个月|月)|半小时|一会儿|昨天|今天|刚才|刚刚|早上|中午|晚上|凌晨|开始|持续|前)/.test(
    text,
  );
}

function hasTrend(text: string): boolean {
  return /(更|加重|减轻|好转|严重|变|越来越|比昨天|比刚才|稳定|没变化|恶化)/.test(text);
}

function hasTreatment(text: string): boolean {
  return /(用药|喂药|吃药|刷牙|换粮|处理|清洁|擦|洗|催吐|没用药|没有用药|暂未用药|没处理|没有处理)/.test(
    text,
  );
}

function followUpQuestion(text: string): string | null {
  if (!hasTimeAnchor(text)) {
    return "兽医通常会先问这个,提前想好能省你现场解释时间:这个情况大概从什么时候开始的?";
  }
  if (!hasTrend(text)) {
    return "兽医通常会关心变化速度:今天比昨天更重、更轻,还是差不多?";
  }
  if (!hasTreatment(text)) {
    return "兽医通常会问你已经做过什么:有没有用药、刷牙、换粮,或做过其它处理?";
  }
  return null;
}

function formatCat(cat: unknown): string {
  if (!cat || typeof cat !== "object") return "未填写/暂不清楚";
  const c = cat as Partial<CatProfilePayload>;
  const bits: string[] = [];
  if (typeof c.name === "string" && c.name.trim()) bits.push(c.name.trim());
  if (typeof c.ageMonths === "number") bits.push(`${c.ageMonths} 月龄`);
  if (typeof c.sex === "string" && c.sex) bits.push(c.sex);
  if (typeof c.weight === "number") bits.push(`${Number(c.weight.toFixed(2))}kg`);
  if (typeof c.neutered === "string" && c.neutered) bits.push(`绝育:${c.neutered}`);
  if (Array.isArray(c.vaccines) && c.vaccines.length > 0) bits.push("有疫苗记录");
  if (typeof c.deworm === "string" && c.deworm) bits.push(`最近驱虫:${c.deworm}`);
  return bits.length > 0 ? bits.join(", ") : "未填写/暂不清楚";
}

function catName(cat: unknown): string {
  if (!cat || typeof cat !== "object") return "猫猫";
  const name = str((cat as Record<string, unknown>).name, 40);
  return name || "猫猫";
}

function careFocus(symptom: string | undefined, tier: CaseNoteTier): string {
  if (symptom === "mouth") return "想请医生重点看口腔检查、牙龈、牙结石、牙吸收或口炎方向,以及是否需要牙片或洁牙。";
  if (symptom === "breath") return "想请医生重点看呼吸状态、缺氧风险和是否需要急诊处理。";
  if (symptom === "eat") return "想请医生重点确认误食风险、是否需要急诊处理,以及到院前还有什么不能做。";
  if (tier === "red") return "想请医生重点判断当前急症风险和下一步处理。";
  return "想请医生重点判断是否需要进一步检查,以及接下来怎么照顾。";
}

function fallbackNote(input: {
  symptom?: string;
  tier: CaseNoteTier;
  handoff: HandoffInput;
  chatHistory?: unknown;
  memo?: string;
  cat?: unknown;
  extraAnswer?: string;
}): string {
  const context = combinedContext(input);
  const label = symptomLabel(input.symptom);
  const name = catName(input.cat);
  const urgent = input.tier === "red" ? "我们正在准备联系/前往动物医院。" : "";
  const knownDetails = context || "暂未说明";
  const timeTrend = input.extraAnswer || (hasTimeAnchor(context) || hasTrend(context) ? context : "暂未说明");

  return [
    `医生您好,${urgent}我家猫${name}目前主要是:${label}。已知情况:${knownDetails}`,
    `持续时间/变化:${timeTrend || "暂未说明"}。`,
    "目前精神吃喝、排尿排便:请以主人现场补充为准,未提到的部分暂未说明。",
    `已做处理:${hasTreatment(context) ? "见上面的主人描述。" : "暂未说明。"} `,
    `猫咪信息:${formatCat(input.cat)}。`,
    careFocus(input.symptom, input.tier),
  ]
    .join("\n\n")
    .slice(0, 1200);
}

function cleanNote(raw: string): string {
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !FORBIDDEN_NOTE_LINES.some((word) => line.includes(word)));
  return lines.join("\n\n").slice(0, 1400).trim();
}

function promptFor(input: {
  symptom?: string;
  tier: CaseNoteTier;
  handoff: HandoffInput;
  chatHistory?: unknown;
  memo?: string;
  cat?: unknown;
  extraAnswer?: string;
  medicalPrompt?: string;
}): ChatMessage[] {
  const context = combinedContext(input);
  const profile = catProfileContext(input.cat);
  return [
    {
      role: "system",
      content: `你是「安心猫」的病情说明整理器。输出给主人复制给兽医看的中文说明,不是医生病历。

硬规则:
- 只整理已知情况,不要诊断,不要写“确诊/高度怀疑/就是某病”。
- 不写具体病原诊断,不要写 FCV/FHV、支原体感染、衣原体感染。
- 不写药品名、剂量、购买建议。
- 不生成【体格检查】【实验室检查】【诊断】【医嘱】这些正式病历字段。
- 不要输出免责声明或“仅供参考/不能替代兽医”,页面底部会固定显示。
- red 档必须保持急迫语气,不能说“不是急诊/黄色预警/先观察”。
- 缺资料用“暂未说明”或“暂不清楚”,不要编。

内容包含:主要症状、持续时间/变化、精神吃喝、排尿排便、伴随表现、已处理方式、猫咪基础信息、想请医生看的重点。
长度 120-250 字,像主人对兽医说话。`,
    },
    ...(input.medicalPrompt ? [{ role: "system" as const, content: input.medicalPrompt }] : []),
    ...(profile ? [{ role: "system" as const, content: profile }] : []),
    {
      role: "user",
      content: [
        `当前档位:${input.tier}`,
        `症状:${symptomLabel(input.symptom)}`,
        `上下文:\n${context || "暂未说明"}`,
        `猫咪信息:${formatCat(input.cat)}`,
      ].join("\n\n"),
    },
  ];
}

export async function POST(req: Request): Promise<Response> {
  const rl = checkAndConsume(getClientIp(req), "chat");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: CaseNoteInput;
  try {
    body = (await req.json()) as CaseNoteInput;
  } catch {
    return Response.json({ error: "请求格式不对。", code: "BAD_REQUEST" }, { status: 400 });
  }

  const tier = parseCaseTier(body.tier);
  if (!tier) {
    return Response.json(
      { error: "只有红档或黄档才会生成给兽医看的病情说明。", code: "UNSUPPORTED_TIER" },
      { status: 400 },
    );
  }

  const symptom = str(body.symptom, 40);
  const claimIds = normalizeClaimIds(body.claimIds);
  const handoff = handoffFrom(body.handoff);
  const extraAnswer = str(body.extraAnswer, 800);
  const memo = str(body.memo, 2000);
  const finalizeNow = body.finalizeNow === true;
  const forceNote = finalizeNow || Boolean(extraAnswer);
  const context = combinedContext({
    handoff,
    chatHistory: body.chatHistory,
    memo,
    extraAnswer,
  });
  const question = forceNote ? null : followUpQuestion(context);
  const medical = await buildMedicalKnowledgeContext({
    symptom,
    tier,
    claimIds,
    maxChars: 9000,
  });

  if (question) {
    return Response.json({
      dryRun: body.dryRun === true ? true : undefined,
      mode: "follow_up",
      question,
      evidence: {
        claimIds: medical.claimIds,
        cardIds: medical.cardIds,
      },
    });
  }

  if (body.dryRun === true && process.env.NODE_ENV !== "production") {
    return Response.json({
      dryRun: true,
      mode: "note",
      note: fallbackNote({
        symptom,
        tier,
        handoff,
        chatHistory: body.chatHistory,
        memo,
        cat: body.cat,
        extraAnswer,
      }),
      evidence: {
        claimIds: medical.claimIds,
        cardIds: medical.cardIds,
      },
    });
  }

  try {
    const note = await chat(
      promptFor({
        symptom,
        tier,
        handoff,
        chatHistory: body.chatHistory,
        memo,
        cat: body.cat,
        extraAnswer,
        medicalPrompt: medical.prompt,
      }),
      { temperature: 0.25, maxTokens: 600, timeoutMs: 30000 },
    );
    return Response.json({
      mode: "note",
      note: cleanNote(note),
      evidence: {
        claimIds: medical.claimIds,
        cardIds: medical.cardIds,
      },
    });
  } catch (e) {
    if (e instanceof LLMError) {
      const status = e.code === "no_provider" ? 503 : 502;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    return Response.json(
      { error: "病情说明整理失败,请稍后重试。", code: "CASE_NOTE_FAILED" },
      { status: 500 },
    );
  }
}
