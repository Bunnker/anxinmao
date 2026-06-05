// 问诊 / 养育问答 API —— 服务端调用大模型,API key 不进浏览器。
//
// 产品红线(CLAUDE.md):可以聊健康,但【绝不诊断】、【绝不开药】;红旗症状立即
// 急停送医;健康边界按场景自然提醒。养育 / 行为问题正常聊。
// 限流:per-IP + 全局日额度,保护试用期 API 额度。
import { chatStream, LLMError, parseHistory, type ChatMessage } from "@/lib/llm";
import { runBehaviorAgentTools } from "@/lib/behavior-agent";
import { classifyBehaviorIntent } from "@/lib/behavior-intent";
import { catProfileContext } from "@/lib/cat-profile-context";
import { medicineProductPolicyContext } from "@/lib/medicine-products";
import { productBoundaryContext } from "@/lib/product-boundary";
import { regionPrompt, userRegionFromRequest } from "@/lib/request-region";
import {
  buildMedicalKnowledgeContext,
  normalizeClaimIds,
  parseRiskTier,
} from "@/lib/medical-knowledge";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const SYSTEM_PROMPT = `你是「一位懂猫的朋友」—— 面向新手猫主人的养猫顾问。养育问题和健康疑问都能聊。

【角色】
- 懂猫、靠谱、温和的朋友。中文,口语化,简洁(手机屏幕小,别长篇大论)。
- 像朋友一样先接住用户的担心,再帮用户看轻重和下一步;不要责备用户,不要吓唬用户。
- 多关注小猫本身:优先称呼猫的名字;结合猫咪档案里的月龄、体重、疫苗、驱虫、绝育、既往备注;记住用户补充过的细节、行为习惯和偏好,后续回答要自然接上。
- 使用标准 Markdown 输出:短段落、无序列表、编号列表、加粗关键词都可以用。不要使用表格、代码块或复杂层级,除非用户明确要求。
- 禁止使用 emoji,不要使用表情符号、彩色图标、装饰性符号或花哨编号。用普通 Markdown 列表表达重点。
- 不说「我是 AI」,自然地像朋友讲话。

【健康问题的铁律 —— 绝不诊断、药品/用品只走本地库】
- 你【绝不】下诊断:不说「得了 X 病」「是某某炎」「确定是…」。能说「这种情况看着像…的方向」。
- 你默认不推荐具体药物商品,绝不给剂量或让用户自行购买处方药。涉及用药默认只说「这需要兽医面诊后开方」。
- 如果服务端额外提供 medicine_product_policy 本地药品/护理用品资料库,你必须按其中 policy 执行:
  · direct_care_product:可以推荐护理用品类别和选购标准,但不能说成治疗当前症状;
  · ask_vet_about_rx:只能整理复诊时问兽医的问题,不得推荐具体药名、剂量、疗程或购买;
  · forbidden/urgent_no_product:明确拦截,必要时建议立即联系动物医院。
- 非药品护理用品(如猫牙膏牙刷/洁齿用品)不等于药品;只有本地资料库明确允许时,可以给候选类别或选购标准。
- 如果服务端额外提供了 Agent 工具召回上下文,它只用于补充本地资料不足的依据;不要向用户暴露工具名、文件路径或搜索过程。
- 你能做的:帮判断「要不要就医、有多急」+ 给有依据的居家护理方向。不要每次机械重复免责声明;页面底部已有常驻提示。
- 只有在红旗/急诊、用药、用户要求确诊、或你已经给出完整健康判断时,才自然提醒边界。

【上游分诊判级 —— 是 ground truth,不可下调】
如果上下文里提到 current_tier (red / yellow / green),这是结构化分诊引擎(看到了用户在分诊流程里勾选的全部红旗 / 否定项)的最终结论。你只能在它之上做语言整理,绝不可改判、不可软化、不可重新评估严重度。
- current_tier=red 必须用的措辞:「立刻就医 / 急诊 / 现在送医 / 直接送医」
  禁止使用的措辞:「不是急诊」「黄色预警 / 黄色信号 / yellow flag」「别等但不急」「今天去就行」「拖过 48 小时再加重」「先观察一下」 —— 任何把红档讲成非急症的暗示都不允许
- current_tier=yellow 必须用:「建议尽快就医 / 这几天内挂号 / 不要拖」
- current_tier=green 必须用:「先在家观察,出现 X / Y / Z 再升级」
即使用户口头描述听起来「没那么严重」,也不可改判 —— 你看不到全部红旗选项,引擎看到了。

【病原命名 —— 教育可以,诊断禁止】
允许:在已经先说出大类(上呼吸道感染 / URI、胃肠炎、中毒、皮肤感染 等)的前提下,
   作为「常见病原包括」教育性列举几种,并明确说「具体哪种要兽医做 PCR / 拭子才能区分」。

禁止:
- 单挑一种病原说「高度提示 X」「很可能是 Y」「考虑是 Z 感染」 —— 这是接近诊断
- 不带大类、直接抛英文缩写(FCV / FHV 单独出现)
- 说出致死率、预后比例(如「FCV 致死率约 2/3」、「死亡率高」) —— 会引发非必要恐慌

合规示例:
「这看着像上呼吸道感染。猫的 URI 常见由几种病原引起 —— 病毒类(疱疹、杯状)、
细菌类(支原体、衣原体)都可能,具体哪种要兽医做 PCR 或拭子才能区分,治疗方向也会不同。」

不合规示例:
「高度提示 FCV/FHV 感染」、「这是支原体感染」、「FCV 致死率约 2/3」

【红旗症状 —— 立即送医,不要多轮追问】
用户描述里出现这些之一:呼吸困难 / 张口喘、抽搐、大量出血、尿不出 / 憋尿、
疑似误食(百合 / 巧克力 / 葡萄 / 人药 / 鼠药等)、瘫软 / 叫不醒、严重外伤 / 疑似中毒 ——
立刻、明确让用户停止聊天,马上带去最近的动物医院 / 急诊。不要再追问细节,不要给居家处理。

【非红旗的健康问题 —— 像兽医面诊一样多轮追问】
别一上来就长篇回答。先追问关键信息(一次只问 1-2 个,别一次抛一堆):
- 猫多大月龄?
- 吃、喝、精神、排便正常吗?
- 这情况持续多久了?具体什么表现?
- 最近换粮 / 换环境 / 接触过新猫吗?
信息够了再给判断:这种情况看着像什么方向、要不要就医(以及多急)、能在家观察 / 做什么。
判断要保守 —— 拿不准就偏向建议就医。不要用同一句安全提示固定结尾;需要提醒时,用更自然的话,例如「我先帮你分轻重,真正确诊和用药还是要医生看猫猫本身」。
如果猫咪档案或对话里已有相关信息,不要重复追问;直接引用它,例如「糯米已经 2 岁、疫苗有记录,我先按成年猫来帮你分轻重」。

【养育 / 行为问题】
喂养、训练、行为习惯、日常护理、环境布置 —— 直接给能照着做的具体办法。先共情一句再给办法。
有常见误区直接点出来(「别这样做:…」)。行为问题如夹带健康疑点(如乱尿可能是泌尿问题),
先提示可能是身体不舒服、建议排查,再聊行为层面。

【通用】
- 实事求是;不确定就说不确定,不要编。
- 健康类回答控制在 200 字内,养育类 250 字内,除非用户明确要详细。`;

function str(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function medicalInputFromBody(body: Record<string, unknown>) {
  const nested =
    body.medical && typeof body.medical === "object"
      ? (body.medical as Record<string, unknown>)
      : {};
  return {
    symptom: str(nested.symptom) ?? str(body.symptom),
    tier: parseRiskTier(nested.tier ?? body.tier),
    claimIds: normalizeClaimIds(nested.claimIds ?? body.claimIds),
  };
}

function userQuery(messages: ChatMessage[], fallback = ""): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content;
  return (lastUser ?? fallback).slice(0, 240);
}

export async function POST(req: Request): Promise<Response> {
  // 限流:每条用户消息扣一次 chat 额度,保护试用期 API 额度。
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

  const b = body as {
    messages?: unknown;
    cat?: unknown;
    memo?: unknown;
    medical?: unknown;
    symptom?: unknown;
    tier?: unknown;
    claimIds?: unknown;
    dryRun?: unknown;
    region?: unknown;
    countryCode?: unknown;
    country?: unknown;
    locale?: unknown;
    timeZone?: unknown;
  };
  const parsed = parseHistory(b.messages);
  if (!parsed || parsed.length === 0) {
    return Response.json({ error: "没有收到问题。" }, { status: 400 });
  }
  // 防御性上限:正常情况下前端已把更早的对话压成 memo 摘要传来,这里只是
  // 兜底,避免异常请求塞入过长上下文。
  const recent = parsed.slice(-24);
  if (recent[recent.length - 1].role !== "user") {
    return Response.json(
      { error: "最后一条应该是用户的问题。" },
      { status: 400 },
    );
  }

  // memo:前端传来的「更早对话摘要」,接在系统提示词后,让长对话不丢上下文。
  const memo = typeof b.memo === "string" ? b.memo.trim().slice(0, 2000) : "";
  const query = userQuery(recent, memo);
  const region = userRegionFromRequest(req, b as Record<string, unknown>);
  const ctx = catProfileContext(b.cat);
  const medicalInput = medicalInputFromBody(b);
  // report:报告页带来的分诊结论摘要 —— 让 AI 知道刚才判了什么、为什么,别从头重复问。
  const nestedMedical =
    b.medical && typeof b.medical === "object"
      ? (b.medical as Record<string, unknown>)
      : {};
  const reportSummary = (
    str(nestedMedical.report) ?? str((b as { report?: unknown }).report) ?? ""
  ).slice(0, 600);
  const qaSummary = (str(nestedMedical.qa) ?? "").slice(0, 800);
  const intent = classifyBehaviorIntent({
    query,
    ...medicalInput,
    report: reportSummary,
    qa: qaSummary,
  });
  const medical = intent.useMedicalKnowledge
    ? await buildMedicalKnowledgeContext({
        ...medicalInput,
        maxChars: 12000,
      })
    : { prompt: "", claimIds: medicalInput.claimIds, cardIds: [] };
  const agent = await runBehaviorAgentTools({
    query,
    intent,
    medical: medicalInput,
    dryRun: b.dryRun === true,
    region,
    recent,
    memo,
    maxChars: 12000,
  });
  const productBoundary = productBoundaryContext(query, region);
  const medicineProductPolicy = medicineProductPolicyContext(query, region);

  // 把上游分诊判级作为强信号注入,防止 LLM 自主软化为更轻档(I-001 修复)
  const upstreamTier = parseRiskTier(nestedMedical.tier ?? b.tier);
  const tierSignal: ChatMessage | null = upstreamTier
    ? {
        role: "system" as const,
        content: `【上游结构化分诊已判定】\ncurrent_tier=${upstreamTier}\n\n这是结构化分诊引擎(看到了用户在分诊流程里勾选的全部红旗 / 否定项)的最终结论,不可下调、不可软化、不可重新评估。按 SYSTEM_PROMPT「上游分诊判级」段用对应等级的措辞:\n- red → 立刻就医 / 急诊(禁用「黄色预警 / 不是急诊 / 别等」等降级措辞)\n- yellow → 建议尽快就医 / 这几天内挂号\n- green → 先在家观察,出现 X / Y / Z 再升级`,
      }
    : null;

  const fullMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `【本轮意图分流】\nintent: ${intent.intent}\nreason: ${intent.reason}\nretrieval_policy: care=${intent.useCareKnowledge ? "on" : "off"}, medical_knowledge=${intent.useMedicalKnowledge ? "on" : "off"}, medical_recall=${intent.useMedicalRecall ? "on" : "off"}, authority_web=${intent.allowAuthorityWebSearch ? "allowed_if_needed" : "off"}\ninstruction: ${intent.instruction}`,
    },
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
    ...(medicineProductPolicy
      ? [{ role: "system" as const, content: medicineProductPolicy }]
      : []),
    ...(reportSummary
      ? [
          {
            role: "system" as const,
            content: `【已有分诊报告摘要 —— 用户刚从这份报告点进来追问,延续它、别从头重复问】\n${reportSummary}`,
          },
        ]
      : []),
    ...(qaSummary
      ? [
          {
            role: "system" as const,
            content: `【刚才分诊已经问到的情况 —— 用户已回答过这些,不要重复问】\n${qaSummary}`,
          },
        ]
      : []),
    ...(memo
      ? [
          {
            role: "system" as const,
            content: `【更早对话的摘要,供你延续上下文】\n${memo}`,
          },
        ]
      : []),
    ...recent,
  ];

  if (b.dryRun === true && process.env.NODE_ENV !== "production") {
    return Response.json({
      dryRun: true,
      systemPromptPreview: SYSTEM_PROMPT,
      intentPreview: intent,
      agentPlanPreview: agent.plan,
      catProfilePreview: ctx ?? "",
      careKnowledgePreview: agent.carePrompt.slice(0, 4000),
      careCardIds: agent.careCardIds,
      evidence: {
        claimIds: medical.claimIds,
        cardIds: medical.cardIds,
      },
      medicalKnowledgePreview: medical.prompt.slice(0, 4000),
      agentTools: agent.tools,
      agentExecutionPreview: agent.prompt.slice(0, 4000),
      agentRetrievalPreview: agent.retrievalPrompt.slice(0, 4000),
      regionPreview: regionPrompt(region),
      productBoundaryPreview: productBoundary,
      medicinePolicyPreview: medicineProductPolicy,
      messageRoles: fullMessages.map((m) => m.role),
    });
  }

  try {
    const stream = await chatStream(fullMessages, {
      temperature: 0.6,
      // v4-flash 等推理模型:reasoning token 额外占用,留足余量(防正文被挤空)。
      maxTokens: 3000,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (e instanceof LLMError) {
      const status = e.code === "no_provider" ? 503 : 502;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    return Response.json(
      { error: "出了点问题,请稍后重试。" },
      { status: 500 },
    );
  }
}
