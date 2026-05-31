#!/usr/bin/env node
// AI Agent · 资料召回 harness
//
// 验证 /api/behavior 的 dryRun 会主动调用受控工具:
// 1. local_medical_recall:从 docs/medical 本地资料库召回相关资料。
// 2. authority_web_search:暴露白名单联网搜索工具状态;默认 dryRun 不实际联网。
//
// 前置:`npm run dev` 已在跑(默认 :3000)。
// 运行:`npm run harness:agent-retrieval`

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

function fail(message, detail) {
  console.error(`❌ ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

const CASES = [
  {
    name: "乱尿 vs 泌尿",
    content: "它最近突然乱尿,还总去猫砂盆,这可能是行为问题还是泌尿问题?",
    expect: ["cat-behavior-change", "cat-urethral-obstruction"],
  },
  {
    name: "百合误食",
    content: "猫舔了百合花粉,现在还没吐,需要马上去医院吗?",
    expect: ["cat-toxin-ingestion", "cat-emergency-red-flags"],
  },
  {
    name: "张口喘",
    content: "它刚才张口喘,趴着不太动,我要观察还是急诊?",
    expect: ["cat-dyspnea", "cat-emergency-red-flags"],
  },
  {
    name: "耳朵甩头",
    content: "猫一直甩头挠耳朵,耳朵里有黑色咖啡渣一样的东西",
    expect: ["cat-ear-problem"],
  },
  {
    name: "幼猫喂养",
    content: "幼猫一天喂几次,每次喂多少?",
    expect: [],
    expectNoLocal: true,
  },
];

async function postDryRun(content) {
  const res = await fetch(`${BASE}/api/behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content,
        },
      ],
      cat: {
        name: "糯米",
        ageMonths: 18,
        sex: "雄",
        weight: 5.1,
        neutered: "否",
      },
      dryRun: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(`/api/behavior ${res.status}`, JSON.stringify(data));
  return data;
}

function assertCase(c, data) {
  const tools = data.agentTools ?? [];
  const local = tools.find((t) => t.name === "local_medical_recall");
  const web = tools.find((t) => t.name === "authority_web_search");
  const preview = data.agentRetrievalPreview ?? "";

  console.log(`  ${c.name}`);
  const paths = (local?.results ?? []).map((r) => r.path ?? "");
  console.log(`    local: ${local?.status ?? "(missing)"} · ${paths.slice(0, 3).join(" | ") || "(none)"}`);

  if (!local) fail(`${c.name}: 缺少 local_medical_recall 工具调用记录`);
  if (c.expectNoLocal) {
    if (local.status !== "skipped" || (local.results ?? []).length > 0) {
      fail(`${c.name}: 不应召回医疗资料`, JSON.stringify(local, null, 2));
    }
  } else {
    if (local.status !== "used") fail(`${c.name}: local_medical_recall 没有被使用`, JSON.stringify(local));
    if ((local.results ?? []).length === 0)
      fail(`${c.name}: local_medical_recall 没有召回任何本地资料`, JSON.stringify(local));
    for (const expected of c.expect) {
      if (!paths.some((p) => p.includes(expected)) && !preview.includes(expected)) {
        fail(`${c.name}: 没有命中 ${expected}`, paths.join("\n"));
      }
    }
  }

  if (!web) fail(`${c.name}: 缺少 authority_web_search 工具状态`);
  if (!Array.isArray(web.allowedDomains) || web.allowedDomains.length < 5) {
    fail(`${c.name}: authority_web_search 没有暴露权威白名单域名`, JSON.stringify(web));
  }
  if (web.status !== "skipped") {
    fail(`${c.name}: dryRun 下 authority_web_search 不应实际联网`, JSON.stringify(web));
  }
}

async function main() {
  console.log("══ AI Agent · 资料召回 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用大模型,不消耗额度;不实际联网)\n");

  for (const c of CASES) {
    const data = await postDryRun(c.content);
    assertCase(c, data);
  }

  console.log("");
  console.log("✅ 通过 —— Agent 能主动召回本地医学资料,并具备受控权威网页搜索工具。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
