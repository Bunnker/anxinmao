// AI 分诊问诊 API —— 服务端读取医学资料库,再调用大模型生成追问或分级解释。
//
// 设计边界:
// - route handler 只暴露给前端结构化结果;API key 和 docs/medical 文件都留在服务端。
// - 红线规则仍以前端结构化分诊和 docs/medical/ai-cards 为准;LLM 负责语言理解和解释,
//   不负责自由诊断或自由开药。
import { chat, LLMError, parseHistory, type ChatMessage } from "@/lib/llm";
import { buildAgentRetrievalContext } from "@/lib/agent-retrieval";
import { catProfileContext } from "@/lib/cat-profile-context";
import { productBoundaryContext } from "@/lib/product-boundary";
import { regionPrompt, userRegionFromRequest } from "@/lib/request-region";
import {
  buildMedicalKnowledgeContext,
  normalizeClaimIds,
  parseRiskTier,
} from "@/lib/medical-knowledge";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const TRIAGE_SYSTEM = `你是「安心猫」的 AI 分诊问诊引擎,面向中文猫主人。

你的任务:
1. 根据用户描述和医学资料库上下文,判断现在是继续追问,还是已经足够给出风险分析。
2. 如果继续追问,一次只问 1-2 个最能改变分级的问题。
3. 如果已经足够,给出:当前风险档、为什么、现在该做什么、多久内升级/复查。

⚠️ 硬规则(违反即产品事故):

【规则 1:分诊判级是 ground truth,不可下调】
上游已注入的 current_tier (red / yellow / green) 是结构化分诊引擎的最终结论。你只能在它之上做语言整理,**不可改判、不可软化、不可重新评估严重度**。
- current_tier=red 必须用的措辞:"立刻就医 / 急诊 / 现在送医 / 直接送医"
  禁止使用的措辞:"不是急诊"、"黄色预警 / 黄色信号"、"别等但不急"、"今天去就行"、"拖过 48 小时再加重"、"先观察一下"、任何把红档讲成非急症的暗示
- current_tier=yellow 必须用:"建议尽快就医 / 这几天内挂号 / 不要拖"
- current_tier=green 必须用:"先在家观察,出现 X / Y / Z 再升级"
即使用户口头描述听起来"没那么严重",也不可改判 —— 你看不到用户已选的全部红旗选项,引擎看到了。

【规则 2:病原命名 —— 教育可以,诊断禁止】
✅ 允许:在已经先说出大类("上呼吸道感染 / URI"、"胃肠炎"、"中毒"、"皮肤感染" 等)的前提下,
   作为"常见病原包括"教育性列举几种,并明确说"具体哪种要兽医做 PCR / 拭子才能区分"。

❌ 禁止:
- 单挑一种病原说"高度提示 X"、"很可能是 Y"、"考虑是 Z 感染" —— 这是接近诊断
- 不带大类、直接抛英文缩写(FCV / FHV 单独出现)
- 说出致死率、预后比例(如"FCV 致死率约 2/3") —— 会引发非必要恐慌

合规示例:"这看着像上呼吸道感染。常见由几种病原引起 —— 病毒类(疱疹、杯状)、
细菌类(支原体、衣原体)都可能,具体哪种要兽医做 PCR 或拭子才能区分。"
不合规示例:"高度提示 FCV/FHV 感染"、"这是支原体感染"、"FCV 致死率约 2/3"

【规则 3:不诊断、不开药】
- 不说"确诊 / 就是某病";最多说"像 X 大类问题"。
- 不给药品剂量、商品名、购买建议;最多说"兽医可能会考虑哪类处理"。
- 非药品护理用品:只有在资料卡和商品边界明确允许、且有专业来源支持时,才可给候选或选购标准,不能替代就医。

【规则 4:不暴露内部】
- 不向用户展示 claim_id、资料文件路径、Agent 工具名、搜索过程或内部规则名。
- 如果服务端提供了 Agent 工具召回的上下文,它只用作补充本地资料不足的依据,不告诉用户用了工具。

【输出格式】
中文口语化,手机上可读,120-260 字。直接输出给用户看的文本,不要 markdown,不要 JSON。`;

function str(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function messagesFromBody(body: Record<string, unknown>): ChatMessage[] | null {
  const parsed = parseHistory(body.messages);
  if (parsed && parsed.length > 0) return parsed.slice(-16);

  const question = str(body.question) ?? str(body.description);
  if (!question) return null;
  return [{ role: "user", content: question.slice(0, 2000) }];
}

function userQuery(messages: ChatMessage[], fallback = ""): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content;
  return (lastUser ?? fallback).slice(0, 240);
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

  const query = userQuery(messages, str(b.report) ?? str(b.memo) ?? "");
  const region = userRegionFromRequest(req, b);
  const medical = await buildMedicalKnowledgeContext({
    symptom: str(b.symptom),
    tier: parseRiskTier(b.tier),
    claimIds: normalizeClaimIds(b.claimIds),
    maxChars: 14000,
  });
  const agent = await buildAgentRetrievalContext({
    query,
    symptom: str(b.symptom),
    tier: parseRiskTier(b.tier),
    claimIds: normalizeClaimIds(b.claimIds),
    dryRun: b.dryRun === true,
    maxChars: 9000,
    region,
  });
  const productBoundary = productBoundaryContext(query, region);
  const ctx = catProfileContext(b.cat);
  const reportContext = [
    str(b.report) ? `【已有分诊报告摘要】\n${str(b.report)}` : "",
    str(b.memo) ? `【较早问诊摘要】\n${str(b.memo)?.slice(0, 2000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // 把上游分诊判级作为强信号注入,防止 LLM 自主软化为更轻档(I-001 修复)
  const upstreamTier = parseRiskTier(b.tier);
  const tierSignal: ChatMessage | null = upstreamTier
    ? {
        role: "system",
        content: `【上游结构化分诊已判定】\ncurrent_tier=${upstreamTier}\n\n这是结构化分诊引擎(看到了用户在分诊流程里勾选的全部红旗 / 否定项)的最终结论,**不可下调、不可软化、不可重新评估**。按 TRIAGE_SYSTEM 规则 1 用对应等级的措辞:\n- red → 立刻就医 / 急诊\n- yellow → 建议尽快就医 / 这几天内挂号\n- green → 先在家观察,出现 X / Y / Z 再升级`,
      }
    : null;

  const fullMessages: ChatMessage[] = [
    { role: "system", content: TRIAGE_SYSTEM },
    ...(tierSignal ? [tierSignal] : []),
    { role: "system", content: regionPrompt(region) },
    ...(ctx ? [{ role: "system" as const, content: ctx }] : []),
    ...(medical.prompt
      ? [{ role: "system" as const, content: medical.prompt }]
      : []),
    ...(agent.prompt
      ? [{ role: "system" as const, content: agent.prompt }]
      : []),
    ...(productBoundary
      ? [{ role: "system" as const, content: productBoundary }]
      : []),
    ...(reportContext
      ? [{ role: "system" as const, content: reportContext }]
      : []),
    ...messages,
  ];

  // harness 专用:本地开发可验证医学资料上下文是否正确注入,不调用大模型、不消耗额度。
  if (b.dryRun === true && process.env.NODE_ENV !== "production") {
    return Response.json({
      dryRun: true,
      evidence: {
        claimIds: medical.claimIds,
        cardIds: medical.cardIds,
      },
      promptPreview: medical.prompt.slice(0, 4000),
      catProfilePreview: ctx ?? "",
      agentTools: agent.tools,
      agentRetrievalPreview: agent.prompt.slice(0, 4000),
      regionPreview: regionPrompt(region),
      productBoundaryPreview: productBoundary,
      messageRoles: fullMessages.map((m) => m.role),
    });
  }

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
