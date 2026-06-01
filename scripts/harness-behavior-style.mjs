#!/usr/bin/env node
// 问诊回复风格 harness
//
// 验证目标:
// 1. /api/behavior dryRun 暴露 system prompt 预览,便于回归检查。
// 2. 提示词要求标准 Markdown、禁止 emoji/表情符号。
// 3. 提示词要求像朋友一样关心主人和猫,并利用猫咪档案/对话记忆里的细节。
// 4. 前端使用安全 Markdown renderer,不再把回答简单按段落渲染。

import fs from "node:fs";

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

function excludesAll(text, words, label) {
  for (const word of words) {
    assert(!text.includes(word), `${label}:不应出现「${word}」`, text);
  }
}

function hasEmojiLike(text) {
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
}

async function dryRun() {
  const res = await fetch(`${BASE}/api/behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dryRun: true,
      messages: [
        {
          role: "user",
          content: "糯米两岁了,最近偶尔打喷嚏,眼屎有点多,要紧吗?",
        },
      ],
      cat: {
        name: "糯米",
        ageMonths: 24,
        weight: 4.6,
        vaccines: [{ name: "猫三联", date: "2025-12-01" }],
        deworm: "2026-04-20",
        notes: "胆子小,去医院会紧张",
      },
      region: { countryCode: "CN", locale: "zh-CN", timeZone: "Asia/Shanghai" },
    }),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) fail(`/api/behavior ${res.status}`, text);
  return data;
}

async function main() {
  console.log("══ 问诊回复风格 harness ══");
  console.log(`服务:${BASE}\n`);

  const data = await dryRun();
  const prompt = data.systemPromptPreview ?? "";
  assert(typeof prompt === "string" && prompt.length > 0, "dryRun 缺少 systemPromptPreview", JSON.stringify(data, null, 2));

  includesAll(
    prompt,
    [
      "标准 Markdown",
      "禁止使用 emoji",
      "不要使用表情符号",
      "猫咪档案",
      "称呼猫的名字",
      "记住用户补充过的细节",
      "像朋友一样",
    ],
    "system prompt",
  );
  excludesAll(
    prompt,
    ["不用 markdown 符号", "不要打 **、#、-", "每条健康相关回答结尾带一句"],
    "system prompt",
  );
  assert(!hasEmojiLike(prompt), "system prompt 不应包含 emoji/装饰图标,避免模型模仿", prompt);
  console.log("  ✓ system prompt 风格边界正确");

  const page = fs.readFileSync("src/app/behavior/page.tsx", "utf8");
  includesAll(page, ["function MarkdownMessage", "parseMarkdownBlocks", "<ul", "<ol"], "behavior markdown renderer");
  excludesAll(page, ["function paragraphs", "const paras = paragraphs"], "behavior markdown renderer");
  console.log("  ✓ 前端使用安全 Markdown renderer");

  console.log("\n✅ 通过 —— 问诊回复风格和 Markdown 渲染边界符合预期。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
