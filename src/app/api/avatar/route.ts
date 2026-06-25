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

import { withCors, preflight } from "@/lib/cors";
import type { NextRequest } from "next/server";
import { checkAndConsume, getClientIp, rateLimitMessage } from "@/lib/ratelimit";

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

// 头像 prompt 的目标:
//   - 可爱度靠具体视觉 token 拉动:圆脸、脸颊、小鼻梁、湿润大眼、爪子、轻微歪头
//   - 识别度靠视觉特征放在 prompt 最前面:毛色、花纹、眼睛、耳朵、脸型
//   - 成品像 app 头像贴纸,不是写实宠物照或普通儿童插画
const STYLE_SUFFIX_CN =
  "把这只猫画成治愈系超可爱猫咪头像贴纸,幼态 Q 版比例但保留原猫身份特征," +
  "圆脸、饱满脸颊、短小鼻梁、小三角耳、亮晶晶湿润大眼睛、微微笑的嘴角、软软绒毛," +
  "头大身体小,前爪轻轻露出,姿势乖巧,轻微歪头,像让人想摸摸的小猫。" +
  "严格保留原猫的毛色、花纹、眼睛颜色、耳朵形状和明显五官特征。" +
  "构图为居中头像,完整头部和上半身,轮廓干净,暖奶油色纯背景,柔和自然光,细腻绘本质感。" +
  "不要写实凶脸、不要瘦长脸、不要尖锐线条、不要冷漠表情、不要夸张怪异表情、不要文字、不要水印";

const STYLE_SUFFIX_EN =
  "Healing kawaii cat avatar sticker, irresistibly cute kitten-like chibi proportions while preserving the cat identity, " +
  "round face, soft chubby cheeks, tiny nose bridge, small triangular ears, glossy sparkling big eyes, subtle smiling mouth, fluffy fur, " +
  "big head and small body, tiny front paws visible, gentle slight head tilt, cozy and affectionate expression. " +
  "Centered app avatar composition with full head and upper body, clean silhouette, warm cream plain background, soft natural light, delicate picture-book illustration. " +
  "No realistic angry face, no long narrow face, no sharp harsh lines, no cold expression, no weird exaggerated expression, no text, no watermark.";

// ----- 类型 ----- //

type ReqBody = {
  description?: string;
  photoDataUrl?: string;
  name?: string;
  dryRun?: boolean;
  debugVisionFeatures?: string;
};

type VisionResult = {
  is_cat: boolean;
  confidence: number;
  features: string;
};

// ----- POST handler ----- //

export async function OPTIONS(req: Request) { return preflight(req); }

export async function POST(req: NextRequest): Promise<Response> {
  const origin = req.headers.get("origin");
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return withCors(Response.json({ error: "请求体不是合法 JSON。" }, { status: 400 }), origin);
  }

  const description = (body.description ?? "").trim().slice(0, 200);
  const photo = body.photoDataUrl?.trim();

  if (!photo && !description) {
    return withCors(
      Response.json({ error: "需要照片或文字描述至少一项。" }, { status: 400 }),
      origin,
    );
  }

  if (body.dryRun === true && process.env.NODE_ENV !== "production") {
    const visionFeatures = photo
      ? (body.debugVisionFeatures ?? "橘白短毛猫,圆脸小耳朵,金色眼睛,表情放松")
          .trim()
          .slice(0, 200)
      : "";
    const prompt = buildAvatarPrompt({
      visionFeatures,
      userDescription: description,
      stylePrompt: photo ? STYLE_SUFFIX_CN : STYLE_SUFFIX_EN,
    });
    return withCors(
      Response.json({
        providerPath: photo ? "ark-seedream-i2i" : "wanx-t2i",
        promptPreview: prompt,
        stylePromptPreview: photo ? STYLE_SUFFIX_CN : STYLE_SUFFIX_EN,
      }),
      origin,
    );
  }

  // 限流:生图是主要花费(~¥0.3/张),扣 image 额度。放在输入校验后、
  // 真正调用视觉检测 / Seedream 之前,避免无效请求白扣。
  const rl = checkAndConsume(getClientIp(req), "image");
  if (!rl.ok) {
    return withCors(
      Response.json(
        { error: rateLimitMessage(rl.kind, rl.scope), code: "RATE_LIMITED" },
        { status: 429 },
      ),
      origin,
    );
  }

  try {
    if (photo) {
      // 视觉预检 —— 严格守门:必须是猫才生图
      const check = await visionCheckCat(photo);
      if (!check.is_cat || check.confidence < 0.6) {
        return withCors(
          Response.json(
            {
              error: `上传的照片看着不像是猫(置信度 ${check.confidence.toFixed(2)})。换一张猫的照片再试,或者用默认头像。`,
              code: "NOT_A_CAT",
            },
            { status: 422 },
          ),
          origin,
        );
      }
      const dataUrl = await arkSeedreamI2I(photo, description, check.features);
      return withCors(
        Response.json({
          dataUrl,
          provider: "ark-seedream-5.0-lite",
          features: check.features, // 调试用,前端不展示
        }),
        origin,
      );
    } else {
      const dataUrl = await wanxT2I(description);
      return withCors(Response.json({ dataUrl, provider: "wanx-t2i" }), origin);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return withCors(
      Response.json(
        { error: `生成失败 —— ${msg}。再试一次或换张照片。` },
        { status: 502 },
      ),
      origin,
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
    `{\n  "is_cat": true/false,\n  "confidence": 0-1 之间的小数,\n  "features": "如果 is_cat 为 true,用一句中文精确描述毛色、花纹、毛长、脸型、耳朵形状、眼睛颜色、表情和最明显识别特征;不要编不存在的配饰;否则空字符串"\n}\n` +
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
  const prompt = buildAvatarPrompt({
    visionFeatures,
    userDescription,
    stylePrompt: STYLE_SUFFIX_CN,
  });

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

  const prompt = buildAvatarPrompt({
    visionFeatures: "",
    userDescription: description,
    stylePrompt: STYLE_SUFFIX_EN,
  });
  const taskId = await wanxSubmit(apiKey, prompt);
  const url = await wanxPoll(apiKey, taskId);
  return await downloadAsDataUrl(url);
}

function buildAvatarPrompt({
  visionFeatures,
  userDescription,
  stylePrompt,
}: {
  visionFeatures: string;
  userDescription: string;
  stylePrompt: string;
}): string {
  return [visionFeatures, userDescription, stylePrompt]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("。");
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
