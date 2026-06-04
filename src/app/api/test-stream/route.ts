// 临时诊断路由 —— 直接测 chatStream 是否工作
// 部署后访问 POST /api/test-stream, 确认后删掉
export const runtime = "nodejs";
import { chatStream, LLMError } from "@/lib/llm";

export async function POST(): Promise<Response> {
  try {
    const stream = await chatStream(
      [{ role: "user", content: "用一句话说你好" }],
      { temperature: 0.6, maxTokens: 50 },
    );
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    const msg = e instanceof LLMError ? e.message : String(e);
    return Response.json({ error: msg }, { status: 502 });
  }
}
