// 问诊 / 养育问答 API —— 服务端调用大模型,API key 不进浏览器。
//
// 产品红线(CLAUDE.md):可以聊健康,但【绝不诊断】、【绝不开药】;红旗症状立即
// 急停送医;每条健康相关回答都带「不能替代兽医」。养育 / 行为问题正常聊。
// 限流:per-IP + 全局日额度,保护试用期 API 额度。
import { chatStream, LLMError, parseHistory, type ChatMessage } from "@/lib/llm";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const SYSTEM_PROMPT = `你是「一位懂猫的朋友」—— 面向新手猫主人的养猫顾问。养育问题和健康疑问都能聊。

【角色】
- 懂猫、靠谱、温和的朋友。中文,口语化,简洁(手机屏幕小,别长篇大论)。
- 不用 markdown 符号(别打 **、#、- 这些)。不说「我是 AI」,自然地像朋友讲话。

【健康问题的铁律 —— 绝不诊断、绝不开药】
- 你【绝不】下诊断:不说「得了 X 病」「是某某炎」「确定是…」。能说「这种情况看着像…的方向」。
- 你【绝不】开药、给剂量、推荐具体药物。涉及用药只说「这需要兽医面诊后开方」。
- 你能做的:帮判断「要不要就医、有多急」+ 给有依据的居家护理方向 + 始终提醒「不能替代兽医」。

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
判断要保守 —— 拿不准就偏向建议就医。每条健康相关回答结尾带一句「这是参考,不能替代兽医」。

【养育 / 行为问题】
喂养、训练、行为习惯、日常护理、环境布置 —— 直接给能照着做的具体办法。先共情一句再给办法。
有常见误区直接点出来(「别这样做:…」)。行为问题如夹带健康疑点(如乱尿可能是泌尿问题),
先提示可能是身体不舒服、建议排查,再聊行为层面。

【通用】
- 实事求是;不确定就说不确定,不要编。
- 健康类回答控制在 200 字内,养育类 250 字内,除非用户明确要详细。`;

// 把猫档案压成一句上下文,让回答能贴合这只猫(月龄等)。
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
  if (bits.length === 0) return null;
  return `(供参考的用户猫咪情况,不必每次都提:${bits.join("、")}。)`;
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

  const b = body as { messages?: unknown; cat?: unknown; memo?: unknown };
  const messages = parseHistory(b.messages);
  if (!messages || messages.length === 0) {
    return Response.json({ error: "没有收到问题。" }, { status: 400 });
  }
  // 防御性上限:正常情况下前端已把更早的对话压成 memo 摘要传来,这里只是
  // 兜底,避免异常请求塞入过长上下文。
  const recent = messages.slice(-24);
  if (recent[recent.length - 1].role !== "user") {
    return Response.json(
      { error: "最后一条应该是用户的问题。" },
      { status: 400 },
    );
  }

  // memo:前端传来的「更早对话摘要」,接在系统提示词后,让长对话不丢上下文。
  const memo = typeof b.memo === "string" ? b.memo.trim().slice(0, 2000) : "";
  const ctx = catContext(b.cat);
  const fullMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(ctx ? [{ role: "system" as const, content: ctx }] : []),
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

  try {
    const stream = await chatStream(fullMessages, {
      temperature: 0.6,
      maxTokens: 900,
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
