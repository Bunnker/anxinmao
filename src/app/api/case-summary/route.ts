import { chat, LLMError } from "@/lib/llm";
import {
  buildCaseSummaryPrompt,
  isHealthCaseSummaryCandidate,
  normalizeCaseSummaryBody,
  parseCaseSummaryOutput,
  renderCaseSummaryCopyText,
  type CaseSummaryOutput,
} from "@/lib/case-summary";
import { validateCaseSummaryOutput } from "@/lib/case-summary-safety";
import { userRegionFromRequest } from "@/lib/request-region";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const SYSTEM = `你是整理病情说明的助手。
只整理用户提供的事实和需要问医生的问题。
不要下诊断,不要给处方药剂量,不要推荐购买处方药。
只输出 JSON,字段必须是: userSummary, doctorNote, doctorQuestions, dontDo。`;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const region = userRegionFromRequest(req, b);
  const input = normalizeCaseSummaryBody(b, region);

  if (!isHealthCaseSummaryCandidate(input)) {
    return Response.json(
      { error: "这个功能只用于健康/分诊相关内容。" },
      { status: 400 },
    );
  }

  const prompt = buildCaseSummaryPrompt(input);

  if (b.dryRun === true && process.env.NODE_ENV !== "production") {
    return Response.json({
      dryRun: true,
      input,
      promptPreview: prompt.slice(0, 5000),
    });
  }

  const rl = checkAndConsume(getClientIp(req), "chat");
  if (!rl.ok) {
    return Response.json(
      {
        error: rateLimitMessage(rl.kind, rl.scope),
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  try {
    const raw = await chat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      { temperature: 0.25, maxTokens: 1800 },
    );
    const parsed = parseCaseSummaryOutput(raw);
    if (!parsed) {
      return Response.json(
        { error: "病情说明生成失败,请再试一次。", code: "BAD_SUMMARY_JSON" },
        { status: 502 },
      );
    }

    const safety = validateCaseSummaryOutput(parsed);
    if (!safety.ok) {
      return Response.json(
        {
          error: "这版说明里出现了不适合直接给用户的医疗表述,请重试。",
          code: "SUMMARY_SAFETY_BLOCKED",
          violations: safety.violations,
        },
        { status: 502 },
      );
    }

    const output: CaseSummaryOutput = {
      ...parsed,
      copyText: renderCaseSummaryCopyText(parsed),
    };

    return Response.json({ summary: output });
  } catch (e) {
    if (e instanceof LLMError) {
      const status = e.code === "no_provider" ? 503 : 502;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    return Response.json(
      { error: "病情说明生成失败,请稍后重试。" },
      { status: 500 },
    );
  }
}
