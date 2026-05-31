// AI 分诊问诊 API —— 服务端读取医学资料库,再调用大模型生成追问或分级解释。
//
// 设计边界:
// - route handler 只暴露给前端结构化结果;API key 和 docs/medical 文件都留在服务端。
// - 红线规则仍以前端结构化分诊和 docs/medical/ai-cards 为准;LLM 负责语言理解和解释,
//   不负责自由诊断或自由开药。
import { chat, LLMError, parseHistory, type ChatMessage } from "@/lib/llm";
import {
  buildMedicalKnowledgeContext,
  normalizeClaimIds,
  parseRiskTier,
} from "@/lib/medical-knowledge";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const TRIAGE_SYSTEM = `你是「安心猫」的 AI 分诊问诊引擎,面向中文猫主人。

你的任务:
1. 根据用户描述和医学资料库上下文,判断现在是继续追问,还是已经足够给出 red/yellow/green 风险分析。
2. 如果继续追问,一次只问 1-2 个最能改变分级的问题。
3. 如果已经足够,给出:当前风险档、为什么、现在该做什么、多久内升级/复查。

硬边界:
- 不诊断具体疾病,不说“确诊/就是某病”。
- 不给药品剂量、商品名、购买建议;资料卡允许时最多说“兽医可能会考虑哪类处理”。
- 命中红旗或 current_tier=red 时,停止普通追问,直接建议立刻联系动物医院/急诊,并给路上安全处理。
- 不向用户展示 claim_id、资料文件路径或内部规则名。
- 中文口语化,手机上可读;输出 120-260 字。

输出格式:
直接输出给用户看的中文文本,不要 markdown,不要 JSON。`;

function str(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function catContext(cat: unknown): string | null {
  if (!cat || typeof cat !== "object") return null;
  const c = cat as Record<string, unknown>;
  const bits: string[] = [];
  if (typeof c.name === "string" && c.name) bits.push(`名字「${c.name}」`);
  if (typeof c.ageMonths === "number" && c.ageMonths >= 0)
    bits.push(`约 ${c.ageMonths} 月龄`);
  if (typeof c.sex === "string" && c.sex) bits.push(`性别${c.sex}`);
  if (typeof c.neutered === "string" && c.neutered)
    bits.push(`绝育情况:${c.neutered}`);
  return bits.length ? `(猫咪情况:${bits.join("、")}。)` : null;
}

function messagesFromBody(body: Record<string, unknown>): ChatMessage[] | null {
  const parsed = parseHistory(body.messages);
  if (parsed && parsed.length > 0) return parsed.slice(-16);

  const question = str(body.question) ?? str(body.description);
  if (!question) return null;
  return [{ role: "user", content: question.slice(0, 2000) }];
}

export async function POST(req: Request): Promise<Response> {
  const rl = checkAndConsume(getClientIp(req), "chat");
  if (!rl.ok) {
    return Response.json(
      { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const messages = messagesFromBody(b);
  if (!messages || messages.length === 0) {
    return Response.json({ error: "没有收到要分诊的描述。" }, { status: 400 });
  }
  if (messages[messages.length - 1].role !== "user") {
    return Response.json(
      { error: "最后一条应该是用户补充的情况。" },
      { status: 400 },
    );
  }

  const medical = await buildMedicalKnowledgeContext({
    symptom: str(b.symptom),
    tier: parseRiskTier(b.tier),
    claimIds: normalizeClaimIds(b.claimIds),
    maxChars: 14000,
  });
  const ctx = catContext(b.cat);
  const reportContext = [
    str(b.report) ? `【已有分诊报告摘要】\n${str(b.report)}` : "",
    str(b.memo) ? `【较早问诊摘要】\n${str(b.memo)?.slice(0, 2000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const fullMessages: ChatMessage[] = [
    { role: "system", content: TRIAGE_SYSTEM },
    ...(ctx ? [{ role: "system" as const, content: ctx }] : []),
    ...(medical.prompt
      ? [{ role: "system" as const, content: medical.prompt }]
      : []),
    ...(reportContext
      ? [{ role: "system" as const, content: reportContext }]
      : []),
    ...messages,
  ];

  try {
    const reply = await chat(fullMessages, {
      temperature: 0.25,
      maxTokens: 700,
      timeoutMs: 30000,
    });
    return Response.json({
      reply,
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
      { error: "分诊分析失败,请稍后重试。" },
      { status: 500 },
    );
  }
}
