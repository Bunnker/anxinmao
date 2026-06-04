// 大模型客户端 —— 仅服务端使用(读取 API key,绝不可被前端代码 import)。
//
// 支持 deepseek / qwen 两个 provider,均走 OpenAI 兼容接口,Bearer Token 鉴权。
// 按 .env.local 里填了哪个 key 自动选用;可设 LLM_PROVIDER=deepseek|qwen 强制指定。

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProviderId = "deepseek" | "qwen";

type Provider = {
  id: ProviderId;
  label: string;
  baseURL: string;
  model: string;
  apiKey: string | undefined;
};

function providers(): Record<ProviderId, Provider> {
  return {
    deepseek: {
      id: "deepseek",
      label: "DeepSeek",
      baseURL: "https://api.deepseek.com",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY,
    },
    qwen: {
      id: "qwen",
      label: "通义千问",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: process.env.QWEN_MODEL || "qwen-plus",
      apiKey: process.env.DASHSCOPE_API_KEY,
    },
  };
}

// 选用哪个 provider:LLM_PROVIDER 显式指定优先;否则按 key 存在自动挑(deepseek > qwen)。
export function resolveProvider(): Provider | null {
  const all = providers();
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase() as ProviderId | undefined;
  if (forced && forced in all) {
    return all[forced].apiKey ? all[forced] : null;
  }
  if (all.deepseek.apiKey) return all.deepseek;
  if (all.qwen.apiKey) return all.qwen;
  return null;
}

export class LLMError extends Error {
  code: "no_provider" | "upstream" | "timeout" | "bad_response";
  constructor(code: LLMError["code"], message: string) {
    super(message);
    this.name = "LLMError";
    this.code = code;
  }
}

// 一次性(非流式)对话补全。返回模型回答文本;失败抛 LLMError。
export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const provider = resolveProvider();
  if (!provider || !provider.apiKey) {
    throw new LLMError(
      "no_provider",
      "还没配置大模型 —— 请把 .env.example 复制成 .env.local,填入 DEEPSEEK_API_KEY 或 DASHSCOPE_API_KEY。",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);

  let res: Response;
  try {
    res = await fetch(`${provider.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 900,
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new LLMError("timeout", "大模型响应超时了,请再试一次。");
    }
    throw new LLMError("upstream", "连不上大模型服务,检查下网络再试。");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LLMError(
      "upstream",
      `大模型接口返回 ${res.status}${detail ? ` —— ${detail.slice(0, 160)}` : ""}`,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new LLMError("bad_response", "大模型返回了无法解析的内容。");
  }

  const content = (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new LLMError("bad_response", "大模型没有给出有效回答,请重试。");
  }
  return content.trim();
}

// 把上游的 SSE 流(每行 data: {...})解析成纯文本增量流。
function sseToText(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // 末行可能不完整,留到下次
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "" || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // 非预期的行,跳过
        }
      }
    },
  });
}

// 流式对话补全 —— 返回纯文本增量的 ReadableStream。
// 失败在「首字节之前」抛 LLMError(路由层据此仍能用普通 JSON 返回错误)。
export async function chatStream(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<ReadableStream<Uint8Array>> {
  const provider = resolveProvider();
  if (!provider || !provider.apiKey) {
    throw new LLMError(
      "no_provider",
      "还没配置大模型 —— 请把 .env.example 复制成 .env.local,填入 DEEPSEEK_API_KEY 或 DASHSCOPE_API_KEY。",
    );
  }

  // 超时只守「拿到响应头」这一段;正文开始流式后不再设硬超时。
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);

  let res: Response;
  try {
    res = await fetch(`${provider.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 900,
        stream: true,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new LLMError("timeout", "大模型响应超时了,请再试一次。");
    }
    throw new LLMError("upstream", "连不上大模型服务,检查下网络再试。");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new LLMError(
      "upstream",
      `大模型接口返回 ${res.status}${detail ? ` —— ${detail.slice(0, 160)}` : ""}`,
    );
  }
  if (!res.body) {
    throw new LLMError("bad_response", "大模型没有返回流式内容。");
  }

  return res.body.pipeThrough(sseToText());
}

// 校验并裁剪前端传来的对话消息(只允许 user / assistant 两种角色)。
// behavior / summarize 两个路由共用。
export function parseHistory(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const role = (m as ChatMessage).role;
    const content = (m as ChatMessage).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim() === "") return null;
    out.push({ role, content: content.slice(0, 2000) });
  }
  return out;
}
