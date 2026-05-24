// 卡通头像生成 API —— 服务端调,密钥不进浏览器。
//
// 流程(有照片时):
//   1. Qwen-VL 视觉预检 —— 判断照片是不是猫 + 提取毛色花纹特征
//   2. 不是猫 → 返 NOT_A_CAT,前端弹「用默认头像」
//   3. 是猫 → 把 vision 提取的特征拼进 prompt 最前面(model 最重视的位置)
//      → ARK Seedream 5 i2i 出图(保留原猫特征 + Q 版萌系)
//
// 无照片时:走 wanx t2i 回退,纯文字描述。
//
// 输出统一:{ dataUrl: "data:image/...;base64,...", provider: "..." }
// 边界:docs/product/AI生成形象-实施说明.md §二

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// ----- 配置 ----- //

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";
const DASHSCOPE_OPENAI_BASE =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_VL_MODEL = "qwen-vl-plus"; // 视觉检测 + 特征提取,便宜快
const WANX_MODEL = "wanx2.1-t2i-turbo";

const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_IMAGE_MODEL = "doubao-seedream-5-0-260128";
const ARK_IMAGE_SIZE = "2K";

// Q 版萌系 + 强保留原猫特征 —— 这一句的关键 token:
//   - 超可爱 Q 版 / 大眼睛 / 圆润萌系 / 治愈 —— 萌系强度
//   - 严格保留原猫的毛色花纹和五官特征 —— 让 model 不要太自由发挥
//   - 胸像构图 + 暖米色 —— 与 app 设计调一致
const STYLE_SUFFIX_CN =
  "把这只猫画成超可爱 Q 版卡通头像,大眼睛,圆润萌系," +
  "严格保留原猫的毛色花纹和五官特征,胸像构图," +
  "暖米色背景,治愈系绘本风格,柔和光线,无文字无水印";

const STYLE_SUFFIX_EN =
  "Cute kawaii chibi cat avatar portrait, big eyes, round and soft, " +
  "head and shoulders close-up centered, warm beige background, " +
  "flat illustration style, children's picture book quality, " +
  "gentle peaceful expression, soft warm lighting, no text, no watermark.";

// ----- 类型 ----- //

type ReqBody = {
  description?: string;
  photoDataUrl?: string;
  name?: string;
};

type VisionResult = {
  is_cat: boolean;
  confidence: number;
  features: string;
};

// ----- POST handler ----- //

export async function POST(req: NextRequest): Promise<Response> {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return Response.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const description = (body.description ?? "").trim().slice(0, 200);
  const photo = body.photoDataUrl?.trim();

  if (!photo && !description) {
    return Response.json(
      { error: "需要照片或文字描述至少一项。" },
      { status: 400 },
    );
  }

  try {
    if (photo) {
      // 视觉预检 —— 严格守门:必须是猫才生图
      const check = await visionCheckCat(photo);
      if (!check.is_cat || check.confidence < 0.6) {
        return Response.json(
          {
            error: `上传的照片看着不像是猫(置信度 ${check.confidence.toFixed(2)})。换一张猫的照片再试,或者用默认头像。`,
            code: "NOT_A_CAT",
          },
          { status: 422 },
        );
      }
      const dataUrl = await arkSeedreamI2I(photo, description, check.features);
      return Response.json({
        dataUrl,
        provider: "ark-seedream-5.0-lite",
        features: check.features, // 调试用,前端不展示
      });
    } else {
      const dataUrl = await wanxT2I(description);
      return Response.json({ dataUrl, provider: "wanx-t2i" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `生成失败 —— ${msg}。再试一次或换张照片。` },
      { status: 502 },
    );
  }
}

// ----- Qwen-VL 视觉预检 ----- //

async function visionCheckCat(photoDataUrl: string): Promise<VisionResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未配置,无法做视觉检测");

  const sysPrompt =
    "你是图像内容判别助手。看用户传的图,严格判断是不是「猫」(必须以家猫为主体,真实照片或卡通画都算;狗、其它动物、人、风景、物品都不算)。" +
    "只返 JSON,字段:\n" +
    `{\n  "is_cat": true/false,\n  "confidence": 0-1 之间的小数,\n  "features": "如果 is_cat 为 true,用一句中文精确描述毛色 + 花纹 + 眼睛颜色 + 表情;否则空字符串"\n}\n` +
    "不要任何其它文字。";

  const res = await fetch(`${DASHSCOPE_OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: QWEN_VL_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: photoDataUrl } },
            { type: "text", text: "判断这张图,按要求返 JSON。" },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`vision check ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data?.choices?.[0]?.message?.content ?? "";
  // qwen-vl 偶尔会包 ```json``` 代码块,剥掉
  const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<VisionResult>;
    return {
      is_cat: parsed.is_cat === true,
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0,
      features:
        typeof parsed.features === "string" ? parsed.features.slice(0, 200) : "",
    };
  } catch {
    throw new Error(`vision 返回不是合法 JSON: ${cleaned.slice(0, 100)}`);
  }
}

// ----- ARK Seedream 5 i2i ----- //

async function arkSeedreamI2I(
  photoDataUrl: string,
  userDescription: string,
  visionFeatures: string,
): Promise<string> {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("ARK_API_KEY 未配置");

  // Prompt 拼接顺序(从前往后,model attention 递减):
  //   vision 提取的特征 → 用户手写描述 → style 收尾
  // vision features 放最前,model 最重视 → 最大化「保留原猫特征」
  const segments = [visionFeatures, userDescription, STYLE_SUFFIX_CN].filter(
    (s) => s && s.trim(),
  );
  const prompt = segments.join("。");

  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ARK_IMAGE_MODEL,
      prompt,
      image: photoDataUrl,
      seed: -1,
      response_format: "b64_json",
      size: ARK_IMAGE_SIZE,
      watermark: false,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.text()).slice(0, 300);
    throw new Error(`ARK ${res.status}: ${errBody}`);
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = data?.data?.[0];
  if (item?.b64_json) {
    return `data:image/jpeg;base64,${item.b64_json}`;
  }
  if (item?.url) {
    return await downloadAsDataUrl(item.url);
  }
  throw new Error(`ARK 返回里没拿到图: ${JSON.stringify(data).slice(0, 200)}`);
}

// ----- wanx t2i(无照片回退) ----- //

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
