#!/usr/bin/env node
// 行为问答 · Agent 工具循环 harness
//
// 验证目标:
// 1. /api/behavior 不只是服务端预召回,而是有 live 模型工具规划器。
// 2. dryRun 不调用模型,但暴露 live planner 模式和策略预览。
// 3. 不同意图会得到不同工具计划:日常资料、医学本地召回、用品问题白名单联网、急症不查。

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

function fail(message, detail) {
  console.error(`❌ ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function assert(condition, message, detail) {
  if (!condition) fail(message, detail);
}

async function dryRun(name, content, extra = {}) {
  const res = await fetch(`${BASE}/api/behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dryRun: true,
      messages: [{ role: "user", content }],
      cat: {
        name: "糯米",
        ageMonths: 24,
        weight: 4.6,
        notes: "胆子小,去医院会紧张",
      },
      region: { countryCode: "CN", locale: "zh-CN", timeZone: "Asia/Shanghai" },
      ...extra,
    }),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) fail(`${name}: /api/behavior ${res.status}`, text);
  return data;
}

function toolNames(data) {
  return (data.agentPlanPreview?.toolCalls ?? []).map((call) => call.name);
}

function expectPlan(data, name, expected) {
  const preview = data.agentPlanPreview ?? {};
  assert(preview.mode === "model_tool_planner_live", `${name}:缺少 live model planner 模式`, JSON.stringify(preview, null, 2));
  assert(preview.source === "dry_run_policy_preview", `${name}:dryRun 应只暴露策略预览,不调用模型`, JSON.stringify(preview, null, 2));
  const names = toolNames(data);
  for (const tool of expected) {
    assert(names.includes(tool), `${name}:工具计划缺少 ${tool}`, JSON.stringify(preview, null, 2));
  }
}

async function main() {
  console.log("══ 行为问答 · Agent 工具循环 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用模型 planner、不实际联网)\n");

  {
    const data = await dryRun("日常咬手", "糯米总是咬我的手还扑腿怎么办?");
    expectPlan(data, "日常咬手", ["care_recall"]);
    assert((data.agentTools ?? []).some((t) => t.name === "care_recall" && t.status === "used"), "日常咬手:care_recall 应执行", JSON.stringify(data.agentTools, null, 2));
    assert((data.careKnowledgePreview ?? "").includes("care-play-biting"), "日常咬手:应召回日常咬手资料", data.careKnowledgePreview);
    console.log("  ✓ 日常咬手:planner -> care_recall");
  }

  {
    const data = await dryRun("健康打喷嚏", "猫一直打喷嚏,眼屎有点多,要紧吗?");
    expectPlan(data, "健康打喷嚏", ["local_medical_recall"]);
    assert((data.agentRetrievalPreview ?? "").includes("cat-uri"), "健康打喷嚏:应召回本地 URI 医学资料", data.agentRetrievalPreview);
    console.log("  ✓ 健康打喷嚏:planner -> local_medical_recall");
  }

  {
    const data = await dryRun("口腔用品品牌", "猫牙龈红肿牙齿发黄,推荐什么牙膏牙刷品牌?");
    expectPlan(data, "口腔用品品牌", ["local_medical_recall", "authority_web_search"]);
    const web = (data.agentTools ?? []).find((t) => t.name === "authority_web_search");
    assert(web?.allowedDomains?.includes("vohc.org"), "口腔用品品牌:联网工具应限制 VOHC 等白名单", JSON.stringify(web, null, 2));
    console.log("  ✓ 口腔用品品牌:planner -> local_medical_recall + authority_web_search");
  }

  {
    const data = await dryRun("急症张口喘", "猫突然张口喘,趴着不动,我可以先观察吗?");
    expectPlan(data, "急症张口喘", []);
    assert(toolNames(data).length === 0, "急症张口喘:不应规划慢速工具", JSON.stringify(data.agentPlanPreview, null, 2));
    console.log("  ✓ 急症张口喘:planner -> no tools");
  }

  console.log("\n✅ 通过 —— 行为问答已具备模型工具规划 + 受控工具执行的 Agent 循环。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
