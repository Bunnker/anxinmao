#!/usr/bin/env node
// 用 OpenAI gpt-image-2 生成 /knowledge 的 6 张配图。
//
// 与 generate-knowledge-images.mjs(走 DashScope wanx2.1)互为 A/B 选项:
// gpt-image-2 风格一致性 + 细节遵循度通常更好,但单价更高、需要 OPENAI_API_KEY。
// 边界与策略详见 docs/product/AI生成形象-实施说明.md(医学护栏对 generator 无关)。
//
// 用法:
//   node --env-file=.env.local scripts/generate-knowledge-images-openai.mjs
//   OPENAI_API_KEY=sk-... node scripts/generate-knowledge-images-openai.mjs
//
// 重生某张 → 先 rm public/knowledge/<id>.png(脚本对已存在的图跳过)。
// 全部重生 → rm public/knowledge/*.png

import { writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "knowledge");

// 风格收尾 —— 英文 prompt 对 gpt-image-2 更稳。语义与 wanx 版本保持对齐:
// 暖米色背景、扁平卡通、儿童绘本质感、温柔治愈、无文字。
const STYLE_SUFFIX =
  "Flat cartoon illustration style, warm beige background, gentle and healing mood, " +
  "minimalist composition, children's picture book quality, soft warm lighting, " +
  "generous whitespace, no text, no watermark.";

// 6 张图的 prompt —— 每张通过关联物件 / 关联场景锚定主题,猫主体始终是「放松状态」,
// 绝不画症状细节(护栏:docs/product/AI生成形象-实施说明.md §二)。
const IMAGES = [
  {
    id: "fever",
    prompt:
      "A cute cat lies comfortably on a cool wooden floor. A human hand " +
      "gently rests on the cat's forehead checking its temperature. A small " +
      "cartoon-style digital thermometer is placed on the floor beside the " +
      "cat. The cat looks calm, eyes peacefully closed. " +
      STYLE_SUFFIX,
  },
  {
    id: "bloodInStool",
    prompt:
      "A cute grey-and-white short-haired cat is walking calmly out of its " +
      "litter box. The cat's posture is healthy and natural, tail held " +
      "upright. The litter box is clearly visible on one side. Cozy home " +
      "scene with wooden floor. " +
      STYLE_SUFFIX,
  },
  {
    id: "fightAbscess",
    prompt:
      "A cute orange tabby cat sitting upright in a sunlit room. On the " +
      "cat's cheek there is a very prominent, oversized pink cross-shaped " +
      "cartoon bandaid. The cat looks energetic, alert and happy. Cozy " +
      "home scene. " +
      STYLE_SUFFIX,
  },
  {
    id: "femaleHeat",
    prompt:
      "A female cat lying on her back on a soft rug, body twisting in a " +
      "playful exaggerated pose with tail held high. Through the window in " +
      "the background, a calm moonlit night sky with stars is visible. " +
      "Cozy indoor atmosphere. " +
      STYLE_SUFFIX,
  },
  {
    id: "singleSeizure",
    prompt:
      "A cute small cat held safely in its owner's arms, the owner's hand " +
      "gently stroking the cat's back. The cat looks completely calm and " +
      "peaceful, no signs of distress. Warm family living room atmosphere. " +
      STYLE_SUFFIX,
  },
  {
    id: "cough",
    prompt:
      "A cute cat resting comfortably on a windowsill. Beside the cat is a " +
      "small cute humidifier emitting gentle white mist into the air. " +
      "Peaceful atmosphere, warm cozy indoor light. " +
      STYLE_SUFFIX,
  },
];

const API_URL = "https://api.openai.com/v1/images/generations";
const MODEL_PRIMARY = "gpt-image-2";
const MODEL_FALLBACK = "gpt-image-1"; // 若 gpt-image-2 不可用自动降级

async function generateOne({ id, prompt }, apiKey, model) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    const e = new Error(`${res.status}: ${errBody}`);
    e.status = res.status;
    e.body = errBody;
    throw e;
  }

  const data = await res.json();
  const item = data.data?.[0];
  let buf;
  if (item?.b64_json) {
    buf = Buffer.from(item.b64_json, "base64");
  } else if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error(`download failed ${imgRes.status}`);
    buf = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error(`no image data in response: ${JSON.stringify(data)}`);
  }

  const outPath = join(OUT_DIR, `${id}.png`);
  await writeFile(outPath, buf);
  return outPath;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "缺少 OPENAI_API_KEY。\n" +
        "把 key 加到 .env.local 后重跑:\n" +
        "  node --env-file=.env.local scripts/generate-knowledge-images-openai.mjs",
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`输出目录:${OUT_DIR}`);
  console.log(`模型:首选 ${MODEL_PRIMARY},失败降级 ${MODEL_FALLBACK}\n`);

  const failed = [];
  let ok = 0;
  let skipped = 0;
  for (const img of IMAGES) {
    const outPath = join(OUT_DIR, `${img.id}.png`);
    if (await fileExists(outPath)) {
      console.log(`[${img.id}] 已存在,跳过(要重生先 rm ${outPath})`);
      skipped++;
      continue;
    }
    console.log(`[${img.id}] 提交 ${MODEL_PRIMARY}...`);
    try {
      const p = await generateOne(img, apiKey, MODEL_PRIMARY);
      console.log(`[${img.id}] ✓ ${p}`);
      ok++;
    } catch (e) {
      // gpt-image-2 不可用 → 降级
      const isModelMissing =
        e.body &&
        (e.body.includes("does not exist") ||
          e.body.includes("invalid_model") ||
          e.body.includes("model_not_found"));
      if (isModelMissing) {
        console.warn(
          `[${img.id}] ${MODEL_PRIMARY} 不可用,降级 ${MODEL_FALLBACK}`,
        );
        try {
          const p = await generateOne(img, apiKey, MODEL_FALLBACK);
          console.log(`[${img.id}] ✓ ${p} (fallback)`);
          ok++;
        } catch (e2) {
          console.error(`[${img.id}] 降级也失败:${e2.message}`);
          failed.push({ id: img.id, message: e2.message });
        }
      } else {
        console.error(`[${img.id}] 失败:${e.message}`);
        failed.push({ id: img.id, message: e.message });
      }
    }
  }

  console.log(
    `\n完成:新生成 ${ok} / 跳过 ${skipped} / 失败 ${failed.length} / 共 ${IMAGES.length}`,
  );
  if (failed.length) {
    console.error(
      "失败的:\n" + failed.map((f) => `  - ${f.id}: ${f.message}`).join("\n"),
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
