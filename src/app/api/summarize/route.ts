// 对话摘要 API —— 把行为问答里较早的对话压成一段摘要,长对话不丢上下文。
// 由前端在「未摘要的消息」积累过多时调用;非流式(产出一段短摘要即可)。
import { chat, LLMError, parseHistory } from "@/lib/llm";

const SUMMARY_SYSTEM = `你在帮一个「养猫问答助手」压缩对话历史。
用户会给你:可能已有的「上一版摘要」+ 一段较早的问答消息。
请把它们融合成一份新的、简洁的摘要,保留对后续对话有用的信息:
- 用户关心的话题、问过的问题;
- 助手给过的关键建议和结论;
- 关于这只猫的事实(月龄、习惯、已知问题等)。
要求:第三人称陈述,用短句或分条,不超过 200 字;不要寒暄,不要 markdown 符号。只输出摘要正文本身。`;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求格式不对。" }, { status: 400 });
  }

  const b = body as { memo?: unknown; messages?: unknown };
  const messages = parseHistory(b.messages);
  if (!messages || messages.length === 0) {
    return Response.json({ error: "没有要摘要的内容。" }, { status: 400 });
  }
  const prevMemo = typeof b.memo === "string" ? b.memo.trim().slice(0, 2000) : "";

  const convo = messages
    .map((m) => (m.role === "user" ? "用户:" : "助手:") + m.content)
    .join("\n");
  const userContent =
    (prevMemo ? `【上一版摘要】\n${prevMemo}\n\n` : "") +
    `【需要并入摘要的较早对话】\n${convo}`;

  try {
    const memo = await chat(
      [
        { role: "system", content: SUMMARY_SYSTEM },
        { role: "user", content: userContent },
      ],
      { temperature: 0.3, maxTokens: 700 }, // 推理模型留余量:reasoning 会占额度
    );
    return Response.json({ memo });
  } catch (e) {
    if (e instanceof LLMError) {
      const status = e.code === "no_provider" ? 503 : 502;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    return Response.json({ error: "摘要失败,请稍后重试。" }, { status: 500 });
  }
}
