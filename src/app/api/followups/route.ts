// 追问建议 API —— 根据当前问答,生成 2-3 个「用户可能想继续点的追问」。
// 非流式、轻量;独立于主问答提示词(不污染医疗安全规则)。任何失败都安静降级:
// 返回空数组,前端不显示追问,不影响主流程。有效请求仍走 chat 限流,避免公开
// LLM 接口被单独刷额度。
import { chat, LLMError, parseHistory } from "@/lib/llm";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

const FOLLOWUP_SYSTEM = `你在给「养猫问答助手」生成「用户可能想继续点的追问」。
下面是用户和助手的最近对话(有时助手还没开始回答用户的最新问题)。站在【用户(猫主人)】的角度,想出 2-3 个用户接下来最可能点的追问。

要求:
- 用户口吻的问题(第一人称、口语),是用户要问的,不是助手要说的。
- 短:每条不超过 15 个字,手机上一行能看完。
- 往深一层或相关方向延伸,承接上文;别空泛(不要「还有吗」「其它呢」这类)。
- 别和用户刚问过的问题重复,别诱导确诊或开药。
- 如果话题涉及尽快就医 / 急诊,追问要围绕就医准备(带什么资料、路上注意什么),不要给拖延就医的居家追问。
- 只输出一个 JSON 字符串数组,例如:["追问一","追问二","追问三"]。不要输出任何别的文字、解释或代码块。`;

function parseFollowups(raw: string): string[] {
  if (!raw) return [];
  // 去掉可能的 ```json 代码围栏,截出第一个 [ ... ] 片段再解析。
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);

  let arr: unknown;
  try {
    arr = JSON.parse(s);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const q = item.trim().replace(/\s+/g, " ");
    if (!q || q.length > 30) continue;
    if (seen.has(q)) continue;
    seen.add(q);
    out.push(q);
    if (out.length >= 3) break;
  }
  return out;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ followups: [] });
  }

  const b = body as { messages?: unknown };
  const messages = parseHistory(b.messages);
  if (!messages || messages.length === 0) return Response.json({ followups: [] });

  // 省 token:生成追问只需最近一两轮,不带猫档案 / 摘要(猫名等在对话正文里本来就有)。
  // 注:常在助手回答前就并行调用(末条是用户问题),所以不强制末条是助手,只要有用户消息即可。
  const recent = messages.slice(-4);
  if (!recent.some((m) => m.role === "user")) {
    return Response.json({ followups: [] });
  }

  const rl = checkAndConsume(getClientIp(req), "chat");
  if (!rl.ok) {
    return Response.json(
      {
        followups: [],
        error: rateLimitMessage(rl.kind, rl.scope),
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  const convo = recent
    .map((m) => (m.role === "user" ? "用户:" : "助手:") + m.content)
    .join("\n");
  const userContent = `【最近对话】\n${convo}`;

  try {
    const out = await chat(
      [
        { role: "system", content: FOLLOWUP_SYSTEM },
        { role: "user", content: userContent },
      ],
      { temperature: 0.6, maxTokens: 1000 }, // 推理模型留余量;实际输出很短
    );
    return Response.json({ followups: parseFollowups(out) });
  } catch (e) {
    // 任何失败都安静降级:不显示追问。
    void (e instanceof LLMError);
    return Response.json({ followups: [] });
  }
}
