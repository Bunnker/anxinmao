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

async function main() {
  const res = await fetch(`${BASE}/api/behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "它最近突然乱尿,还总去猫砂盆,这可能是行为问题还是泌尿问题?",
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

  const tools = data.agentTools ?? [];
  const local = tools.find((t) => t.name === "local_medical_recall");
  const web = tools.find((t) => t.name === "authority_web_search");
  const preview = data.agentRetrievalPreview ?? "";

  console.log("══ AI Agent · 资料召回 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用大模型,不消耗额度;不实际联网)\n");
  console.log(preview || "(未返回 agentRetrievalPreview)");
  console.log("");

  if (!local) fail("缺少 local_medical_recall 工具调用记录");
  if (local.status !== "used") fail("local_medical_recall 没有被使用", JSON.stringify(local));
  if ((local.results ?? []).length === 0)
    fail("local_medical_recall 没有召回任何本地资料", JSON.stringify(local));

  const paths = (local.results ?? []).map((r) => r.path).join("\n");
  if (!paths.includes("docs/medical/ai-cards/cat-behavior-change.ai-card.md")) {
    fail("本地召回没有命中行为突变资料卡", paths);
  }
  if (
    !paths.includes("docs/medical/ai-cards/cat-urethral-obstruction.ai-card.md") &&
    !preview.includes("cat-urethral-obstruction")
  ) {
    fail("本地召回没有命中泌尿/尿道阻塞资料卡", paths);
  }

  if (!web) fail("缺少 authority_web_search 工具状态");
  if (!Array.isArray(web.allowedDomains) || web.allowedDomains.length < 5) {
    fail("authority_web_search 没有暴露权威白名单域名", JSON.stringify(web));
  }
  if (web.status !== "skipped") {
    fail("dryRun 下 authority_web_search 不应实际联网", JSON.stringify(web));
  }

  console.log("✅ 通过 —— Agent 能主动召回本地医学资料,并具备受控权威网页搜索工具。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
