import {
  AUTHORITY_WEB_DOMAINS,
  buildAgentRetrievalContext,
  type AgentRetrievalResult,
  type AgentToolTrace,
} from "@/lib/agent-retrieval";
import type { BehaviorIntentDecision } from "@/lib/behavior-intent";
import { buildCareKnowledgeContext } from "@/lib/care-knowledge";
import { chat, type ChatMessage } from "@/lib/llm";
import type { UserRegionContext } from "@/lib/request-region";
import type { RiskTier } from "@/types/cat";

type AgentToolName =
  | "care_recall"
  | "local_medical_recall"
  | "authority_web_search";

type AgentToolCall = {
  name: AgentToolName;
  query: string;
};

export type BehaviorAgentPlan = {
  mode: "model_tool_planner_live";
  source:
    | "model_tool_planner"
    | "dry_run_policy_preview"
    | "policy_fallback"
    | "planner_failed_fallback";
  reason: string;
  allowedTools: AgentToolName[];
  toolCalls: AgentToolCall[];
};

type CareToolTrace = {
  name: "care_recall";
  status: "used" | "skipped" | "failed";
  reason?: string;
  query?: string;
  cardIds?: string[];
  results?: AgentRetrievalResult[];
};

export type BehaviorAgentToolTrace = CareToolTrace | AgentToolTrace;

export type BehaviorAgentInput = {
  query: string;
  intent: BehaviorIntentDecision;
  region: UserRegionContext;
  medical: {
    symptom?: string;
    tier?: RiskTier;
    claimIds?: string[];
  };
  recent: ChatMessage[];
  memo?: string;
  dryRun?: boolean;
  maxChars?: number;
};

export type BehaviorAgentResult = {
  prompt: string;
  carePrompt: string;
  retrievalPrompt: string;
  careCardIds: string[];
  tools: BehaviorAgentToolTrace[];
  plan: BehaviorAgentPlan;
};

function allowedToolsFor(intent: BehaviorIntentDecision): AgentToolName[] {
  if (intent.intent === "emergency") return [];
  const tools: AgentToolName[] = [];
  if (intent.useCareKnowledge) tools.push("care_recall");
  if (intent.useMedicalRecall) tools.push("local_medical_recall");
  if (intent.allowAuthorityWebSearch) tools.push("authority_web_search");
  return tools;
}

function defaultCallsFor(
  intent: BehaviorIntentDecision,
  query: string,
): AgentToolCall[] {
  if (intent.intent === "emergency") return [];
  if (intent.intent === "daily_care") return [{ name: "care_recall", query }];
  if (intent.intent === "product_or_medicine") {
    return [
      { name: "local_medical_recall", query },
      { name: "authority_web_search", query },
    ];
  }
  if (intent.intent === "medical_general" || intent.intent === "triage_followup") {
    return [{ name: "local_medical_recall", query }];
  }
  return [];
}

function sanitizeCalls(
  calls: AgentToolCall[],
  allowedTools: AgentToolName[],
  fallbackQuery: string,
): AgentToolCall[] {
  const allowed = new Set(allowedTools);
  const seen = new Set<AgentToolName>();
  const out: AgentToolCall[] = [];
  for (const call of calls) {
    if (!allowed.has(call.name) || seen.has(call.name)) continue;
    seen.add(call.name);
    out.push({
      name: call.name,
      query: (call.query || fallbackQuery).slice(0, 240),
    });
  }
  return out.slice(0, 3);
}

function parsePlannerJson(raw: string): { reason?: string; tool_calls?: AgentToolCall[] } | null {
  const text = raw.trim();
  const candidate = text.startsWith("{")
    ? text
    : (text.match(/\{[\s\S]*\}/)?.[0] ?? "");
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as {
      reason?: unknown;
      tool_calls?: unknown;
    };
    if (!Array.isArray(parsed.tool_calls)) return null;
    const toolCalls: AgentToolCall[] = [];
    for (const rawCall of parsed.tool_calls) {
      if (!rawCall || typeof rawCall !== "object") continue;
      const name = (rawCall as { name?: unknown }).name;
      const query = (rawCall as { query?: unknown }).query;
      if (
        name !== "care_recall" &&
        name !== "local_medical_recall" &&
        name !== "authority_web_search"
      ) {
        continue;
      }
      toolCalls.push({
        name,
        query: typeof query === "string" ? query : "",
      });
    }
    return {
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
      tool_calls: toolCalls,
    };
  } catch {
    return null;
  }
}

async function planWithModel(input: BehaviorAgentInput): Promise<BehaviorAgentPlan> {
  const allowedTools = allowedToolsFor(input.intent);
  const fallbackCalls = defaultCallsFor(input.intent, input.query);
  if (allowedTools.length === 0) {
    return {
      mode: "model_tool_planner_live",
      source: "policy_fallback",
      reason: input.intent.instruction,
      allowedTools,
      toolCalls: [],
    };
  }

  const recentText = input.recent
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 2400);
  const plannerMessages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是猫咪问答系统的工具规划器。只输出 JSON,不要 Markdown,不要解释。",
        "你要根据本轮意图决定是否调用工具。工具只用于给最终回答补充资料,不直接回复用户。",
        "",
        `intent: ${input.intent.intent}`,
        `intent_instruction: ${input.intent.instruction}`,
        `allowed_tools: ${allowedTools.join(", ") || "(none)"}`,
        "",
        "工具说明:",
        "- care_recall: 查询本地日常养育资料库,用于行为、喂养、训练、环境。",
        "- local_medical_recall: 查询本地医学资料库,用于健康症状、分诊追问、风险解释。",
        "- authority_web_search: 联网搜索白名单权威网站,只在用品/品牌/最新资料或本地资料不足时使用。",
        "",
        "规则:",
        "- emergency 不调用工具。",
        "- medical_general / triage_followup 至少调用 local_medical_recall。",
        "- daily_care 通常调用 care_recall。",
        "- product_or_medicine 通常调用 local_medical_recall 和 authority_web_search。",
        "- 不要调用 allowed_tools 之外的工具。",
        "",
        '输出格式: {"reason":"一句话原因","tool_calls":[{"name":"care_recall","query":"检索词"}]}',
      ].join("\n"),
    },
    {
      role: "user",
      content: [`用户问题: ${input.query}`, input.memo ? `更早摘要: ${input.memo}` : "", recentText].filter(Boolean).join("\n\n"),
    },
  ];

  try {
    const raw = await chat(plannerMessages, {
      temperature: 0,
      maxTokens: 260,
      timeoutMs: 8000,
    });
    const parsed = parsePlannerJson(raw);
    const modelCalls = sanitizeCalls(
      parsed?.tool_calls ?? [],
      allowedTools,
      input.query,
    );
    const toolCalls = modelCalls.length > 0 ? modelCalls : fallbackCalls;
    return {
      mode: "model_tool_planner_live",
      source: parsed ? "model_tool_planner" : "planner_failed_fallback",
      reason: parsed?.reason ?? "planner_output_unparseable_fallback",
      allowedTools,
      toolCalls: sanitizeCalls(toolCalls, allowedTools, input.query),
    };
  } catch (e) {
    return {
      mode: "model_tool_planner_live",
      source: "planner_failed_fallback",
      reason: e instanceof Error ? e.message.slice(0, 120) : "planner_failed",
      allowedTools,
      toolCalls: sanitizeCalls(fallbackCalls, allowedTools, input.query),
    };
  }
}

function dryRunPlan(input: BehaviorAgentInput): BehaviorAgentPlan {
  const allowedTools = allowedToolsFor(input.intent);
  return {
    mode: "model_tool_planner_live",
    source: "dry_run_policy_preview",
    reason: "dryRun 不调用模型 planner;展示 live 请求会交给模型规划的受控工具策略。",
    allowedTools,
    toolCalls: sanitizeCalls(
      defaultCallsFor(input.intent, input.query),
      allowedTools,
      input.query,
    ),
  };
}

function skippedCareTrace(query: string, reason: string): CareToolTrace {
  return {
    name: "care_recall",
    status: "skipped",
    reason,
    query,
    results: [],
    cardIds: [],
  };
}

function skippedMedicalTrace(query: string, reason: string): AgentToolTrace {
  return {
    name: "local_medical_recall",
    status: "skipped",
    reason,
    query,
    results: [],
  };
}

function skippedWebTrace(query: string, reason: string): AgentToolTrace {
  return {
    name: "authority_web_search",
    status: "skipped",
    reason,
    allowedDomains: AUTHORITY_WEB_DOMAINS,
    query,
    results: [],
  };
}

function carePromptToResult(prompt: string, cardId: string): AgentRetrievalResult {
  return {
    path: `docs/care/ai-cards/${cardId}.care-card.md`,
    title: cardId,
    excerpt: prompt.slice(0, 900),
  };
}

export async function runBehaviorAgentTools(
  input: BehaviorAgentInput,
): Promise<BehaviorAgentResult> {
  const plan = input.dryRun ? dryRunPlan(input) : await planWithModel(input);
  const callNames = new Set(plan.toolCalls.map((call) => call.name));
  const careCall = plan.toolCalls.find((call) => call.name === "care_recall");
  const medicalQuery =
    plan.toolCalls.find((call) => call.name === "local_medical_recall")?.query ??
    input.query;
  const webQuery =
    plan.toolCalls.find((call) => call.name === "authority_web_search")?.query ??
    input.query;

  let carePrompt = "";
  let careCardIds: string[] = [];
  let careTrace: CareToolTrace = skippedCareTrace(
    input.query,
    callNames.has("care_recall") ? "care_recall_no_result" : "not_selected_by_agent",
  );
  if (careCall) {
    try {
      const care = await buildCareKnowledgeContext(
        careCall.query || input.query,
        Math.min(input.maxChars ?? 6000, 6000),
      );
      carePrompt = care.prompt;
      careCardIds = care.cardIds;
      careTrace = {
        name: "care_recall",
        status: care.cardIds.length > 0 ? "used" : "skipped",
        reason: care.cardIds.length > 0 ? "query_matched_care_docs" : "no_care_match",
        query: careCall.query || input.query,
        cardIds: care.cardIds,
        results: care.cardIds.map((id) => carePromptToResult(care.prompt, id)),
      };
    } catch (e) {
      careTrace = {
        name: "care_recall",
        status: "failed",
        reason: e instanceof Error ? e.message.slice(0, 120) : "unknown_error",
        query: careCall.query || input.query,
        results: [],
        cardIds: [],
      };
    }
  }

  const wantsLocal = callNames.has("local_medical_recall");
  const wantsWeb = callNames.has("authority_web_search");
  const retrieval = await buildAgentRetrievalContext({
    query: wantsWeb && !wantsLocal ? webQuery : medicalQuery,
    ...input.medical,
    dryRun: input.dryRun,
    region: input.region,
    allowLocalMedicalRecall: wantsLocal,
    allowAuthorityWebSearch: wantsWeb,
    forceAuthorityWebSearch: wantsWeb,
    maxChars: input.maxChars ?? 9000,
  });
  const localTrace =
    retrieval.tools.find((tool) => tool.name === "local_medical_recall") ??
    skippedMedicalTrace(input.query, "not_selected_by_agent");
  const webTrace =
    retrieval.tools.find((tool) => tool.name === "authority_web_search") ??
    skippedWebTrace(input.query, "not_selected_by_agent");

  const usefulSections = [
    carePrompt
      ? ["## tool: care_recall", `status: ${careTrace.status}`, carePrompt].join("\n")
      : "",
    retrieval.prompt,
  ].filter(Boolean);
  const prompt =
    usefulSections.length > 0
      ? [
          "【Agent 主动工具执行上下文】",
          `planner_mode: ${plan.mode}`,
          `planner_source: ${plan.source}`,
          `tool_calls: ${plan.toolCalls.map((call) => call.name).join(", ") || "(none)"}`,
          "使用边界:",
          "- 这些工具由模型先规划、服务端受控执行;不要向用户暴露工具名、内部路径或搜索过程。",
          "- 若工具结果与系统安全边界冲突,以系统安全边界为准。",
          "",
          ...usefulSections,
        ]
          .join("\n\n")
          .slice(0, input.maxChars ?? 12000)
      : "";

  return {
    prompt,
    carePrompt,
    retrievalPrompt: retrieval.prompt,
    careCardIds,
    tools: [careTrace, localTrace, webTrace],
    plan,
  };
}
