// 卡通头像生成 API —— 服务端调,密钥不进浏览器。
//
// 两个 provider 自动选:
//   - 有照片 → 火山引擎 ARK 平台 Doubao-Seedream-5.0-lite i2i
//     (`doubao-seedream-5-0-lite-260128` · bearer auth · image_url 字段)
//     效果接近用户家猫的卡通版,质量明显比 wanx 强一档。
//     注意:Seedream 5 lite 强制输出 ≥ 1920×1920,所以用 2048×2048。
//   - 无照片 → DashScope wanx2.1-turbo t2i(回退路径,纯文字描述)
//
// 输出统一:{ dataUrl: "data:image/png;base64,..." , provider: "..." }
//
// 边界(护栏):docs/product/AI生成形象-实施说明.md §二 ——
// 生成的形象只用于头像 / 伴侣角色,前端调用方不应将返回值用于症状示意图。

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";
const WANX_MODEL = "wanx2.1-t2i-turbo";

const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";
// Seedream 5 (canonical id 不含 -lite-,虽然控制台显示叫「lite」)。
// 官方 OpenAI 兼容示例用 size="2K" / image 字段 / response_format=url。
// 我们 size="2K"(等价 2048x2048,Seedream 5 强制 ≥ 1920),
// response_format=b64_json(省一次下载往返,直接返回 base64)。
const ARK_IMAGE_MODEL = "doubao-seedream-5-0-260128";
const ARK_IMAGE_SIZE = "2K";

const STYLE_SUFFIX_EN =
  "Cute cartoon cat avatar portrait, head and shoulders close-up centered, " +
  "warm beige background, flat illustration style, children's picture book quality, " +
  "gentle peaceful expression, soft warm lighting, no text, no watermark.";

const STYLE_SUFFIX_CN =
  "把这只猫画成可爱卡通头像,胸像构图,暖米色背景,扁平插画风格," +
  "儿童绘本质感,温柔表情,柔和光线,无文字无水印";

type ReqBody = {
  description?: string;
  photoDataUrl?: string; // "data:image/png;base64,..."
  name?: string;
};

export async function POST(req: NextRequest): Promise<Response> {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const description = (body.description ?? "").trim().slice(0, 200);
  const photo = body.photoDataUrl?.trim();

  // 没照片也没描述 → 没法做
  if (!photo && !description) {
    return Response.json(
      { error: "需要照片或文字描述至少一项。" },
      { status: 400 },
    );
  }

  try {
    if (photo) {
      const dataUrl = await arkSeedreamI2I(photo, description);
      return Response.json({ dataUrl, provider: "ark-seedream-5.0-lite" });
    } else {
      const dataUrl = await wanxT2I(description);
      return Response.json({ dataUrl, provider: "wanx-t2i" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `生成失败 —— ${msg}。再试一次或换个描述。` },
      { status: 502 },
    );
  }
}

// ----- ARK Seedream 5.0 lite i2i ----- //

async function arkSeedreamI2I(
  photoDataUrl: string,
  description: string,
): Promise<string> {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("ARK_API_KEY 未配置");

  const prompt = description
    ? `${description}。${STYLE_SUFFIX_CN}`
    : STYLE_SUFFIX_CN;

  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ARK_IMAGE_MODEL,
      prompt,
      // 字段名 image(对齐官方 OpenAI 兼容示例),接受 base64 dataURL 或 HTTPS URL。
      image: photoDataUrl,
      seed: -1,
      response_format: "b64_json",
      size: ARK_IMAGE_SIZE,
      // 关掉默认「AI生成」水印 —— 头像角落带水印影响视觉。
      // 国内合规要求生成内容标注 AI,UI 层用「AI 出图」文字声明替代水印。
      watermark: false,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.text()).slice(0, 300);
    throw new Error(`ARK ${res.status}: ${errBody}`);
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
    error?: { message?: string };
  };
  const item = data?.data?.[0];
  if (item?.b64_json) {
    // Seedream 实测返回 JPEG(b64 开头是 /9j/),不是 PNG
    return `data:image/jpeg;base64,${item.b64_json}`;
  }
  if (item?.url) {
    return await downloadAsDataUrl(item.url);
  }
  throw new Error(`ARK 返回里没拿到图: ${JSON.stringify(data).slice(0, 200)}`);
}

// ----- wanx t2i(DashScope,无照片时回退) ----- //

async function wanxT2I(description: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未配置");

  const prompt = `${description}。${STYLE_SUFFIX_EN}`;
  const taskId = await wanxSubmit(apiKey, prompt);
  const url = await wanxPoll(apiKey, taskId);
  return await downloadAsDataUrl(url);
}

async function wanxSubmit(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: WANX_MODEL,
        input: { prompt },
        parameters: { size: "512*512", n: 1, prompt_extend: true },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`wanx submit ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const taskId = data?.output?.task_id;
  if (!taskId) throw new Error("wanx submit 没拿到 task_id");
  return taskId;
}

async function wanxPoll(apiKey: string, taskId: string): Promise<string> {
  const maxMs = 120000;
  const intervalMs = 1500;
  const start = Date.now();
  while (true) {
    const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`wanx poll ${res.status}`);
    const data = await res.json();
    const status = data?.output?.task_status as string | undefined;
    if (status === "SUCCEEDED") {
      const url = data?.output?.results?.[0]?.url;
      if (!url) throw new Error("wanx SUCCEEDED 但没拿到图 URL");
      return url;
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      throw new Error(`wanx task ${status}`);
    }
    if (Date.now() - start > maxMs) throw new Error(`wanx 轮询超时(${status})`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ----- 工具 ----- //

async function downloadAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "image/png";
  return `data:${ct};base64,${buf.toString("base64")}`;
}
