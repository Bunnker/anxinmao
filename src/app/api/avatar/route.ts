// 卡通头像生成 API —— 服务端调 DashScope wanx2.1-turbo,密钥不进浏览器。
//
// 输入:用户在 onboarding 给的「这只猫长什么样」自由文本描述。
// 输出:base64 dataURL,前端直接塞 localStorage 的 cat.avatar 即可显示。
//
// 边界(护栏):docs/product/AI生成形象-实施说明.md §二 ——
// 这里生成的形象只用于头像 / 伴侣角色,前端调用方不应将返回值用于症状示意图。
// 服务端不强制(无法判断调用方意图),但产品红线写在了 CLAUDE.md。

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const API_BASE = "https://dashscope.aliyuncs.com/api/v1";
const MODEL = "wanx2.1-t2i-turbo";

// 风格 token —— 头像专属(圆形构图、暖米色,与 app 主题一致)。
// 强调"close-up portrait" 让 model 出头像而不是全身场景。
const STYLE_SUFFIX =
  "Cute cartoon cat avatar portrait, head and shoulders close-up centered, " +
  "warm beige background, flat illustration style, children's picture book quality, " +
  "gentle peaceful expression, soft warm lighting, no text, no watermark.";

type ReqBody = {
  description?: string;
  name?: string;
};

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "服务端没配置 DASHSCOPE_API_KEY,头像生成暂不可用。" },
      { status: 503 },
    );
  }

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const description = (body.description ?? "").trim().slice(0, 200);
  if (!description) {
    return Response.json(
      { error: "需要先描述一下这只猫长什么样(毛色 / 特征都行)。" },
      { status: 400 },
    );
  }

  // 用户描述放前面 —— wanx 对 prompt 前几句更敏感。
  const prompt = `${description}. ${STYLE_SUFFIX}`;

  try {
    const taskId = await submitTask(apiKey, prompt);
    const url = await pollTask(apiKey, taskId);
    const dataUrl = await downloadAsDataUrl(url);
    return Response.json({ dataUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `生成失败 —— ${msg}。再试一次或换个描述。` },
      { status: 502 },
    );
  }
}

async function submitTask(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: MODEL,
        input: { prompt },
        parameters: {
          // 头像 512×512 够用,生成更快、占 localStorage 也更小。
          size: "512*512",
          n: 1,
          prompt_extend: true,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`submit ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const taskId = data?.output?.task_id;
  if (!taskId) throw new Error("submit 返回里没拿到 task_id");
  return taskId;
}

async function pollTask(apiKey: string, taskId: string): Promise<string> {
  const maxMs = 120000;
  const intervalMs = 1500;
  const start = Date.now();
  while (true) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(
        `poll ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    const data = await res.json();
    const status = data?.output?.task_status as string | undefined;
    if (status === "SUCCEEDED") {
      const url = data?.output?.results?.[0]?.url;
      if (!url) throw new Error("SUCCEEDED 但没拿到图 URL");
      return url;
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      throw new Error(`task ${status}`);
    }
    if (Date.now() - start > maxMs) {
      throw new Error(`轮询超时(${status})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function downloadAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "image/png";
  return `data:${ct};base64,${buf.toString("base64")}`;
}
