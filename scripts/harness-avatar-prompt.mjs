#!/usr/bin/env node
// 猫头像 prompt harness
//
// 验证目标:
// 1. /api/avatar dryRun 能暴露实际喂给生图模型的 prompt,不用消耗生图额度。
// 2. 照片 i2i prompt 把视觉识别出的原猫特征放在前面,再追加萌系头像风格。
// 3. 文生图 t2i prompt 包含明确的幼态、圆脸、爪子、贴纸头像和负向约束。

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

function fail(message, detail) {
  console.error(`❌ ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function assert(condition, message, detail) {
  if (!condition) fail(message, detail);
}

function includesAll(text, words, label) {
  for (const word of words) {
    assert(text.includes(word), `${label}:缺少「${word}」`, text);
  }
}

async function postAvatar(body) {
  const res = await fetch(`${BASE}/api/avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) fail(`/api/avatar ${res.status}`, text);
  return data;
}

async function main() {
  console.log("══ 猫头像 prompt harness ══");
  console.log(`服务:${BASE}\n`);

  const textOnly = await postAvatar({
    dryRun: true,
    description: "一只两岁橘虎斑猫,白肚皮,眼睛圆圆的",
  });
  const textPrompt = textOnly.promptPreview ?? "";
  assert(textOnly.providerPath === "wanx-t2i", "纯文字 dryRun providerPath 不正确", JSON.stringify(textOnly, null, 2));
  includesAll(
    textPrompt,
    [
      "kawaii",
      "kitten-like chibi proportions",
      "round face",
      "chubby cheeks",
      "tiny front paws",
      "avatar sticker",
      "No realistic angry face",
      "no text",
      "no watermark",
    ],
    "t2i prompt",
  );
  console.log("  ✓ 文生图 prompt 有明确萌系头像约束");

  const imageToImage = await postAvatar({
    dryRun: true,
    photoDataUrl: "data:image/jpeg;base64,AAAA",
    description: "画得更软萌一点",
    debugVisionFeatures: "橘白短毛猫,圆脸小耳朵,金色眼睛,表情放松",
  });
  const imagePrompt = imageToImage.promptPreview ?? "";
  assert(imageToImage.providerPath === "ark-seedream-i2i", "照片 dryRun providerPath 不正确", JSON.stringify(imageToImage, null, 2));
  assert(
    imagePrompt.startsWith("橘白短毛猫,圆脸小耳朵,金色眼睛,表情放松。画得更软萌一点。"),
    "i2i prompt 应先放视觉特征,再放用户补充",
    imagePrompt,
  );
  includesAll(
    imagePrompt,
    [
      "头像贴纸",
      "幼态 Q 版比例",
      "圆脸",
      "饱满脸颊",
      "小三角耳",
      "亮晶晶湿润大眼睛",
      "前爪轻轻露出",
      "轻微歪头",
      "严格保留原猫",
      "不要写实凶脸",
      "不要瘦长脸",
      "不要文字",
      "不要水印",
    ],
    "i2i prompt",
  );
  console.log("  ✓ 图生图 prompt 兼顾原猫特征和可爱度");

  console.log("\n✅ 通过 —— 猫头像 prompt 已满足当前质量边界。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
