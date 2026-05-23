// 行为 / 养育问答 API —— 服务端调用大模型,API key 不进浏览器。
//
// 产品红线:这里只聊喂养 / 训练 / 行为,【绝不做健康诊断】。涉及生病、症状、
// 要不要就医的问题,一律引导用户去「分诊」功能 —— 由下方系统提示词强制约束。
import { chatStream, LLMError, parseHistory, type ChatMessage } from "@/lib/llm";

const SYSTEM_PROMPT = `你是「一位懂猫的朋友」—— 一款面向新手猫主人的 App 里的养猫顾问。

【你的角色】
- 像一个懂猫、靠谱、温和的朋友,帮新手解决养猫里的日常困惑。
- 只聊这些:喂养、训练、行为习惯、日常护理、猫的情绪与环境布置。
- 用中文,口语化,简洁。手机屏幕小,别长篇大论。

【最重要的红线 —— 不碰健康诊断】
- 你【绝不】判断猫生了什么病,【绝不】说「这是某某病」「可能是某某炎」,【绝不】给用药建议或剂量。
- 如果用户问的是健康 / 生病 / 症状类问题(呕吐、腹泻、不吃东西、精神差、呼吸异常、出血、尿不出、可能误食、外伤、疑似中毒等),【不要回答、不要展开】。具体红线:
  · 不要猜测可能是什么问题 —— 连「可能是消化问题」「也许是着凉了」这种模糊归因也不许说;
  · 不要给任何护理、急救、禁食、喂水、用药建议 —— 那是「分诊」和兽医的事,不是你的;
  · 你只做三件事:简短共情一句 → 明确说这类情况这里不评估、请回 App 首页用「分诊」功能或尽快带去看兽医 → 然后停下,不要再补充别的。
- 行为问题里如果夹带健康疑点(例如「猫乱尿」可能是泌尿问题),先提示「也可能是身体不舒服,建议先用分诊排查一下」,再聊行为层面。

【怎么回答】
- 先共情一句,再给能照着做的具体办法。分点时直接换行,用「先…再…」或短句组织。
- 实事求是;不确定就说不确定,不要编。
- 如果某做法有风险、是常见误区,直接点出来(「别这样做:…」)。
- 不要用 markdown 标记(不要打 **、#、- 这些符号)。
- 不说「我是 AI」之类的话,自然地像朋友一样讲。
- 回答控制在 250 字以内,除非用户明确要求详细。`;

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
