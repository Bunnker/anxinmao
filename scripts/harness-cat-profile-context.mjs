#!/usr/bin/env node
// AI 上下文 · 猫咪档案 harness
//
// 默认走 /api/triage 的 dev-only dryRun,只验证服务端能把完整猫档案压进
// LLM system context,不会调用大模型,不消耗额度。
//
// 前置:`npm run dev` 已在跑(默认 :3000)。
// 运行:`npm run harness:cat-context`

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

const CAT = {
  name: "糯米",
  ageMonths: 7,
  sex: "雄",
  coat: "长毛",
  weight: 4.2,
  neutered: "否",
  homeDate: "2026-01-12",
  vaccines: [
    { name: "猫三联第 1 针", date: "2026-02-01" },
    { name: "狂犬疫苗", date: "2026-03-01" },
  ],
  deworm: "2026-04-20",
  notes: "曾经换粮后软便,对陌生人比较紧张。",
};

const EXPECTED = [
  "名字「糯米」",
  "约 7 月龄",
  "性别雄",
  "体重 4.2 kg",
  "毛发长毛",
  "绝育情况:否",
  "到家日期 2026-01-12",
  "疫苗记录:猫三联第 1 针(2026-02-01)、狂犬疫苗(2026-03-01)",
  "最近驱虫日期 2026-04-20",
  "备注:曾经换粮后软便,对陌生人比较紧张。",
];

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${data.error || "non-json error"}`);
  }
  return data;
}

function assertProfile(label, profile) {
  const missing = EXPECTED.filter((text) => !profile.includes(text));

  console.log(`  ${label}`);
  console.log(profile || "  (未返回 catProfilePreview)");
  console.log("");

  if (missing.length > 0) {
    console.error(`❌ ${label} 缺少字段:`);
    for (const text of missing) console.error(`  - ${text}`);
    return false;
  }

  console.log(`  ✓ ${label} 已包含完整档案字段\n`);
  return true;
}

async function main() {
  console.log("══ AI 上下文 · 猫咪档案 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用大模型,不消耗额度)\n");

  const triage = await post("/api/triage", {
    symptom: "diarrhea",
    tier: "yellow",
    claimIds: ["dia_003"],
    question: "它今天有点软便。",
    cat: CAT,
    dryRun: true,
  });

  const behavior = await post("/api/behavior", {
    messages: [{ role: "user", content: "它最近比较怕生,怎么引导?" }],
    cat: CAT,
    dryRun: true,
  });

  const ok =
    assertProfile("/api/triage 分诊追问上下文", triage.catProfilePreview ?? "") &&
    assertProfile("/api/behavior 直接问 AI 上下文", behavior.catProfilePreview ?? "");

  if (!ok) {
    process.exit(1);
  }

  console.log("✅ 通过 —— 猫咪完整档案已进入 AI system context。");
}

main().catch((e) => {
  console.error("\n❌ HARNESS 运行失败:", e.message);
  console.error("   排查:npm run dev 是否在跑,且 NODE_ENV 不是 production。");
  process.exit(1);
});
