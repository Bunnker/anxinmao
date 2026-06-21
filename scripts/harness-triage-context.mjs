#!/usr/bin/env node
// AI 分诊 · 证据上下文 harness
//
// 默认走 /api/triage 的 dev-only dryRun,只验证 symptom/tier/claimIds 能映射到
// 正确医学 AI card,不会调用大模型,不消耗额度。
//
// 前置:`npm run dev` 已在跑(默认 :3000)。
// 运行:`npm run harness:triage` 或 `node scripts/harness-triage-context.mjs`

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

const CASES = [
  {
    name: "绿档其它情况:通用分诊 + 低风险精神差上下文",
    body: {
      symptom: "other",
      tier: "green",
      claimIds: ["leth_001", "leth_013"],
      question: "它刚刚有点蔫,但现在精神还可以。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-general-triage", "cat-lethargy"],
    expectClaims: ["leth_001", "leth_013"],
    expectPrompt: ["current_tier: green", "cat-lethargy", "leth_001"],
  },
  {
    name: "红档呼吸异常:通用急症 + 通用分诊 + 精神差",
    body: {
      symptom: "other",
      tier: "red",
      claimIds: ["leth_007", "emg_001"],
      question: "它刚才张口喘,呼吸很费力。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-general-triage", "cat-lethargy"],
    expectClaims: ["leth_007", "emg_001"],
    expectPrompt: ["current_tier: red", "cat-emergency-red-flags", "emg_001"],
  },
  {
    name: "高温风险:通用入口 + 高温卡",
    body: {
      symptom: "other",
      tier: "red",
      claimIds: ["heat_001", "emg_006"],
      question: "它在阳台晒了很久,现在站不稳。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-general-triage", "cat-heatstroke-weather-hazard"],
    expectClaims: ["heat_001", "emg_006"],
    expectPrompt: ["cat-heatstroke-weather-hazard", "heat_001", "current_tier: red"],
  },
  {
    name: "便秘排便用力:通用入口 + 便秘卡",
    body: {
      symptom: "other",
      tier: "yellow",
      claimIds: ["con_001", "uo_001"],
      question: "它一直蹲猫砂盆,不知道是拉不出还是尿不出。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-general-triage", "cat-constipation-straining", "cat-urethral-obstruction"],
    expectClaims: ["con_001", "uo_001"],
    expectPrompt: ["cat-constipation-straining", "con_001"],
  },
  {
    name: "创伤急救:通用入口 + 创伤卡",
    body: {
      symptom: "other",
      tier: "red",
      claimIds: ["tra_003", "emg_005"],
      question: "猫坠楼后站不起来。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-general-triage", "cat-trauma-first-aid"],
    expectClaims: ["tra_003", "emg_005"],
    expectPrompt: ["cat-trauma-first-aid", "tra_003", "current_tier: red"],
  },
  {
    name: "抽搐神经急症:通用入口 + 神经卡",
    body: {
      symptom: "other",
      tier: "red",
      claimIds: ["neu_001", "emg_005"],
      question: "它抽搐超过 5 分钟了。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-general-triage", "cat-seizure-neurologic-emergency"],
    expectClaims: ["neu_001", "emg_005"],
    expectPrompt: ["cat-seizure-neurologic-emergency", "neu_001", "current_tier: red"],
  },
  {
    name: "误食百合:中毒卡 + 急症卡",
    body: {
      symptom: "eat",
      tier: "red",
      claimIds: ["tox_005", "emg_008"],
      question: "它可能舔了百合花粉。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-toxin-ingestion"],
    expectClaims: ["tox_005", "emg_008"],
    expectPrompt: ["cat-toxin-ingestion", "tox_005", "不要向用户展示 claim_id"],
  },
  {
    name: "尿不出:尿道阻塞卡 + 急症卡",
    body: {
      symptom: "pee",
      tier: "red",
      claimIds: ["uo_001", "emg_007"],
      question: "它一直蹲猫砂盆,但尿不出来。",
      dryRun: true,
    },
    expectCards: ["cat-emergency-red-flags", "cat-urethral-obstruction"],
    expectClaims: ["uo_001", "emg_007"],
    expectPrompt: ["cat-urethral-obstruction", "uo_001", "current_tier: red"],
  },
];

function includesAll(haystack, needles) {
  return needles.every((needle) => haystack.includes(needle));
}

async function postDryRun(body) {
  const res = await fetch(`${BASE}/api/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`/api/triage returned non-JSON ${res.status}: ${text.slice(0, 160)}`);
  }
  if (!res.ok) {
    throw new Error(`/api/triage ${res.status}: ${data.error || text.slice(0, 160)}`);
  }
  return data;
}

async function main() {
  console.log("══ AI 分诊 · 证据上下文 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用大模型,不消耗额度)\n");

  let allPass = true;
  for (const c of CASES) {
    const data = await postDryRun(c.body);
    const cards = data.evidence?.cardIds ?? [];
    const claims = data.evidence?.claimIds ?? [];
    const prompt = data.promptPreview ?? "";

    const checks = [
      ["返回 dryRun=true", data.dryRun === true],
      ["cardIds 覆盖预期卡", c.expectCards.every((id) => cards.includes(id))],
      ["claimIds 覆盖预期 claim", c.expectClaims.every((id) => claims.includes(id))],
      ["promptPreview 含关键上下文", includesAll(prompt, c.expectPrompt)],
      ["没有意外调用模型返回 reply", typeof data.reply === "undefined"],
    ];

    console.log(`  ${c.name}`);
    for (const [name, ok] of checks) {
      console.log(`    ${ok ? "✓" : "✗"} ${name}`);
      if (!ok) allPass = false;
    }
    console.log(`    cards: ${cards.join(", ")}`);
    console.log(`    claims: ${claims.join(", ")}\n`);
  }

  console.log(
    allPass
      ? "✅ 全部通过 —— 分诊 claim 能正确注入 AI 医学资料上下文。"
      : "❌ 有未通过项 —— 见上方 case 输出。",
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("\n❌ HARNESS 运行失败:", e.message);
  console.error("   排查:npm run dev 是否在跑,且 NODE_ENV 不是 production。");
  process.exit(1);
});
