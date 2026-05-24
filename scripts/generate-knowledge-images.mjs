#!/usr/bin/env node
// 生成 /knowledge 知识页 6 张「不必慌」配图。
//
// 边界与策略详见 docs/product/AI生成形象-实施说明.md。
// 一次性资产生成 —— 出图存 public/knowledge/*.png,运行时不走 API。
//
// 用法(任选其一):
//   node --env-file=.env.local scripts/generate-knowledge-images.mjs
//   DASHSCOPE_API_KEY=xxx node scripts/generate-knowledge-images.mjs

import { writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "knowledge");

// 所有 prompt 共用的风格收尾 —— 保证 6 张图风格尽量一致(同一模型多次调用
// 不保证完全一致,但相同 style token 能拉近)。
const STYLE_SUFFIX =
  "暖米色背景,扁平卡通插画风格,温柔治愈,极简构图,儿童绘本质感,柔和光线,留白克制,无文字,无水印";

// 6 张图的主体描述 —— 全部画「放松状态的猫」,通过场景元素 / 关联物件锚定话题,
// 绝不画症状细节(医学准确度护栏,见实施说明 §二)。
// 第二版:每张都加入 symptom-relevant 的关联物件(体温计 / 猫砂盆 / 创可贴 /
// 月光 / 主人怀抱 / 加湿器),让图本身具备话题识别度。
const IMAGES = [
  {
    id: "fever",
    prompt: `一只猫舒服地趴在凉爽的地板上,主人温柔的手轻轻搭在它的额头上感受体温,旁边放着一支可爱的卡通体温计,猫神态平静放松。${STYLE_SUFFIX}`,
  },
  {
    id: "bloodInStool",
    prompt: `一只灰白色短毛猫刚从猫砂盆中走出来,姿态健康自然,神态轻松,猫砂盆清晰可见在画面一侧,温馨家居场景。${STYLE_SUFFIX}`,
  },
  {
    id: "fightAbscess",
    // 强化 prompt —— 创可贴提到前面 + 加 "特别醒目"/"大" 修饰词 + 猫静态(坐着)
    // 避免动作描述抢 attention。第一版"缓步走着"导致创可贴细节丢失。
    prompt: `一只可爱的橘色短毛猫坐在阳光下,**耳朵上贴着一个特别醒目的粉色十字形大创可贴**,猫精神十足,神态愉快,温馨家中场景。${STYLE_SUFFIX}`,
  },
  {
    id: "femaleHeat",
    prompt: `一只母猫在地毯上扭动着身体,高高抬起尾巴,姿态有点夸张但放松,窗外能看到温柔的月光,室内温馨氛围。${STYLE_SUFFIX}`,
  },
  {
    id: "singleSeizure",
    prompt: `一只猫安心地依偎在主人怀里,主人温柔的手轻轻抚摸着它的背,猫看起来已经完全平静放松,温馨家庭氛围。${STYLE_SUFFIX}`,
  },
  {
    id: "cough",
    prompt: `一只猫舒服地趴在窗台上,旁边放着一台可爱的小加湿器正在喷出柔和的白色水雾,氛围安宁,室内温暖。${STYLE_SUFFIX}`,
  },
];

const API_BASE = "https://dashscope.aliyuncs.com/api/v1";
const MODEL = "wanx2.1-t2i-turbo"; // 速度+成本最优,品质足够 MVP

async function submitTask(apiKey, prompt) {
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
          size: "1024*1024",
          n: 1,
          prompt_extend: true,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`submit failed ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.output.task_id;
}

async function pollTask(apiKey, taskId, { intervalMs = 2000, maxMs = 180000 } = {}) {
  const start = Date.now();
  while (true) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`poll failed ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const status = data.output.task_status;
    if (status === "SUCCEEDED") {
      const results = data.output.results || [];
      if (!results[0]?.url) {
        throw new Error(`succeeded but no url: ${JSON.stringify(data.output)}`);
      }
      return results[0].url;
    }
    if (status === "FAILED" || status === "UNKNOWN" || status === "CANCELED") {
      throw new Error(`task ${status}: ${JSON.stringify(data.output)}`);
    }
    if (Date.now() - start > maxMs) {
      throw new Error(`timeout after ${maxMs}ms,task 仍是 ${status}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function downloadAndSave(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

async function generateOne({ id, prompt }, apiKey) {
  console.log(`[${id}] 提交任务...`);
  const taskId = await submitTask(apiKey, prompt);
  console.log(`[${id}] task_id=${taskId},轮询中...`);
  const url = await pollTask(apiKey, taskId);
  const outPath = join(OUT_DIR, `${id}.png`);
  console.log(`[${id}] 出图,下载到 ${outPath}`);
  await downloadAndSave(url, outPath);
  console.log(`[${id}] ✓`);
  return { id, ok: true };
}

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error(
      "缺少 DASHSCOPE_API_KEY。试试 `node --env-file=.env.local scripts/generate-knowledge-images.mjs`",
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`输出目录:${OUT_DIR}\n`);

  // 串行提交 —— DashScope wanx 单账号有 RPS 限流(并行容易 429)。
  // 跑完一张再提下一张,稳。已存在的图跳过(脚本可重跑,补失败的)。
  const failed = [];
  let ok = 0;
  let skipped = 0;
  for (const img of IMAGES) {
    const outPath = join(OUT_DIR, `${img.id}.png`);
    if (await fileExists(outPath)) {
      console.log(`[${img.id}] 已存在,跳过`);
      skipped++;
      continue;
    }
    try {
      await generateOne(img, apiKey);
      ok++;
    } catch (e) {
      console.error(`[${img.id}] 失败:${e.message}`);
      failed.push({ id: img.id, message: e.message });
    }
  }

  console.log(
    `\n完成:新生成 ${ok} / 跳过 ${skipped} / 失败 ${failed.length} / 共 ${IMAGES.length}`,
  );
  if (failed.length) {
    console.error("失败的:\n" + failed.map((f) => `  - ${f.id}: ${f.message}`).join("\n"));
    process.exit(1);
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
