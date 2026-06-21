#!/usr/bin/env node
// 问诊 / 养育问答 · 意图分流 harness
//
// 验证目标:
// 1. 日常行为/喂养问题走 care_knowledge,不再默认走医学 RAG。
// 2. 健康症状问题走本地医学资料,但默认不阻塞联网搜索。
// 3. 产品/品牌问题进入商品/药品边界,可暴露白名单联网搜索计划。
// 4. 红旗急症问题优先急停,不走慢速联网搜索。

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
        ageMonths: 7,
        weight: 4.2,
        vaccines: [{ name: "猫三联", date: "2026-02-01" }],
        deworm: "2026-04-20",
        notes: "胆子小,晚上听到声音会紧张",
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

function tool(data, name) {
  return (data.agentTools ?? []).find((t) => t.name === name);
}

function expectIntent(data, intent, name) {
  assert(data.intentPreview?.intent === intent, `${name}:意图应为 ${intent}`, JSON.stringify(data.intentPreview, null, 2));
}

function expectNoMedicalRecall(data, name) {
  const local = tool(data, "local_medical_recall");
  assert(!local || local.status === "skipped", `${name}:不应走医学本地召回`, JSON.stringify(local, null, 2));
  assert(!(data.agentRetrievalPreview ?? ""), `${name}:不应注入 Agent 医学召回上下文`, data.agentRetrievalPreview);
  assert(!(data.medicalKnowledgePreview ?? ""), `${name}:不应注入医学资料卡上下文`, data.medicalKnowledgePreview);
}

function expectNoWebSearch(data, name) {
  const web = tool(data, "authority_web_search");
  assert(!web || web.status === "skipped", `${name}:不应实际联网`, JSON.stringify(web, null, 2));
  if (web) {
    assert(
      ["web_search_not_allowed_for_intent", "dry_run_no_network", "local_context_sufficient"].includes(web.reason),
      `${name}:联网跳过原因不符合预期`,
      JSON.stringify(web, null, 2),
    );
  }
}

async function main() {
  console.log("══ 问诊 / 养育问答 · 意图分流 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用大模型,不实际联网)\n");

  {
    const data = await dryRun("半夜叫", "糯米最近半夜一直叫,还扒门,怎么让它安静一点?");
    expectIntent(data, "daily_care", "半夜叫");
    expectNoMedicalRecall(data, "半夜叫");
    assert((data.careKnowledgePreview ?? "").includes("care-night-vocalization"), "半夜叫:缺少夜间叫日常资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("互动游戏"), "半夜叫:日常资料没有给出可执行护理方法", data.careKnowledgePreview);
    console.log("  ✓ 半夜叫:daily_care + care-night-vocalization");
  }

  {
    const data = await dryRun("幼猫喂养", "幼猫一天喂几次,每次喂多少比较合适?");
    expectIntent(data, "daily_care", "幼猫喂养");
    expectNoMedicalRecall(data, "幼猫喂养");
    assert((data.careKnowledgePreview ?? "").includes("care-kitten-feeding"), "幼猫喂养:缺少幼猫喂养资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("按年龄阶段"), "幼猫喂养:资料没有年龄阶段边界", data.careKnowledgePreview);
    console.log("  ✓ 幼猫喂养:daily_care + care-kitten-feeding");
  }

  {
    const data = await dryRun("咬手扑腿", "糯米最近总是咬我的手,还会突然扑腿,怎么改?");
    expectIntent(data, "daily_care", "咬手扑腿");
    expectNoMedicalRecall(data, "咬手扑腿");
    assert((data.careKnowledgePreview ?? "").includes("care-play-biting"), "咬手扑腿:缺少咬手/扑腿资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("不要用手逗猫"), "咬手扑腿:资料没有咬手边界", data.careKnowledgePreview);
    console.log("  ✓ 咬手扑腿:daily_care + care-play-biting");
  }

  {
    const data = await dryRun("新猫躲藏", "新猫到家两天一直躲床底,不肯出来也不亲人怎么办?");
    expectIntent(data, "daily_care", "新猫躲藏");
    expectNoMedicalRecall(data, "新猫躲藏");
    assert((data.careKnowledgePreview ?? "").includes("care-new-home-hiding"), "新猫躲藏:缺少新猫到家资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("安全屋"), "新猫躲藏:资料没有安全屋建议", data.careKnowledgePreview);
    console.log("  ✓ 新猫躲藏:daily_care + care-new-home-hiding");
  }

  {
    const data = await dryRun("挑食换粮", "猫有点挑食,想换粮,怎么换不容易软便?");
    expectIntent(data, "daily_care", "挑食换粮");
    expectNoMedicalRecall(data, "挑食换粮");
    assert((data.careKnowledgePreview ?? "").includes("care-food-transition-picky-eating"), "挑食换粮:缺少换粮资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("5-7 天"), "挑食换粮:资料没有换粮过渡窗口", data.careKnowledgePreview);
    console.log("  ✓ 挑食换粮:daily_care + care-food-transition-picky-eating");
  }

  {
    const data = await dryRun("猫砂盆习惯", "猫不埋屎,还老把猫砂带出来,猫砂盆怎么调整?");
    expectIntent(data, "daily_care", "猫砂盆习惯");
    expectNoMedicalRecall(data, "猫砂盆习惯");
    assert((data.careKnowledgePreview ?? "").includes("care-litter-box-habits"), "猫砂盆习惯:缺少猫砂盆资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("每天铲"), "猫砂盆习惯:资料没有清洁频率", data.careKnowledgePreview);
    console.log("  ✓ 猫砂盆习惯:daily_care + care-litter-box-habits");
  }

  {
    const data = await dryRun("普通猫砂购买", "新手猫砂怎么买,膨润土和豆腐砂怎么选?");
    expectIntent(data, "daily_care", "普通猫砂购买");
    expectNoMedicalRecall(data, "普通猫砂购买");
    assert(!(data.productBoundaryPreview ?? ""), "普通猫砂购买:不应触发药品/用品边界", data.productBoundaryPreview);
    assert(!(data.medicinePolicyPreview ?? ""), "普通猫砂购买:不应触发药品资料库", data.medicinePolicyPreview);
    console.log("  ✓ 普通猫砂购买:daily_care + 不进入药品流程");
  }

  {
    const data = await dryRun("梳毛毛球", "长毛猫掉毛多,怎么梳毛减少毛球?");
    expectIntent(data, "daily_care", "梳毛毛球");
    expectNoMedicalRecall(data, "梳毛毛球");
    assert((data.careKnowledgePreview ?? "").includes("care-grooming-hairballs"), "梳毛毛球:缺少梳毛毛球资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("逆毛"), "梳毛毛球:资料没有低压力梳毛边界", data.careKnowledgePreview);
    console.log("  ✓ 梳毛毛球:daily_care + care-grooming-hairballs");
  }

  {
    const data = await dryRun("疫苗补打", "猫三联上次打完快一年了,加强针和狂犬要怎么安排?");
    expectIntent(data, "daily_care", "疫苗补打");
    expectNoMedicalRecall(data, "疫苗补打");
    assert((data.careKnowledgePreview ?? "").includes("care-vaccine-schedule-reactions"), "疫苗补打:缺少疫苗资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("风险评估"), "疫苗补打:资料没有风险评估边界", data.careKnowledgePreview);
    console.log("  ✓ 疫苗补打:daily_care + care-vaccine-schedule-reactions");
  }

  {
    const data = await dryRun("抓沙发", "猫一直抓沙发和抓墙,抓板不怎么用怎么办?");
    expectIntent(data, "daily_care", "抓沙发");
    expectNoMedicalRecall(data, "抓沙发");
    assert((data.careKnowledgePreview ?? "").includes("care-scratching-furniture"), "抓沙发:缺少抓家具资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("正常需求"), "抓沙发:资料没有抓挠正常需求边界", data.careKnowledgePreview);
    console.log("  ✓ 抓沙发:daily_care + care-scratching-furniture");
  }

  {
    const data = await dryRun("多猫哈气", "新猫和原住民一见面就哈气追咬,怎么慢慢介绍?");
    expectIntent(data, "daily_care", "多猫哈气");
    expectNoMedicalRecall(data, "多猫哈气");
    assert((data.careKnowledgePreview ?? "").includes("care-intercat-introduction-tension"), "多猫哈气:缺少多猫关系资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("安全房"), "多猫哈气:资料没有分步引入建议", data.careKnowledgePreview);
    console.log("  ✓ 多猫哈气:daily_care + care-intercat-introduction-tension");
  }

  {
    const data = await dryRun("慢病复查", "老年猫肾病和高血压,平时在家要记录哪些东西方便复查?");
    expectIntent(data, "daily_care", "慢病复查");
    expectNoMedicalRecall(data, "慢病复查");
    assert((data.careKnowledgePreview ?? "").includes("care-chronic-kidney-endocrine-monitoring"), "慢病复查:缺少慢病专项资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("复诊准备"), "慢病复查:资料没有复诊准备边界", data.careKnowledgePreview);
    console.log("  ✓ 慢病复查:daily_care + care-chronic-kidney-endocrine-monitoring");
  }

  {
    const data = await dryRun("关节行动", "老猫最近跳不上沙发,猫砂盆也不太愿意进去,家里怎么调整?");
    expectIntent(data, "daily_care", "关节行动");
    expectNoMedicalRecall(data, "关节行动");
    assert((data.careKnowledgePreview ?? "").includes("care-mobility-arthritis-home"), "关节行动:缺少行动能力资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("低入口"), "关节行动:资料没有环境改造建议", data.careKnowledgePreview);
    console.log("  ✓ 关节行动:daily_care + care-mobility-arthritis-home");
  }

  {
    const data = await dryRun("新生奶猫", "捡到一只新生奶猫,不会吃奶,手养需要注意什么?");
    expectIntent(data, "daily_care", "新生奶猫");
    expectNoMedicalRecall(data, "新生奶猫");
    assert((data.careKnowledgePreview ?? "").includes("care-reproduction-neonatal-kitten"), "新生奶猫:缺少繁殖/新生幼猫资料", data.careKnowledgePreview);
    assert((data.careKnowledgePreview ?? "").includes("体重"), "新生奶猫:资料没有体重记录边界", data.careKnowledgePreview);
    console.log("  ✓ 新生奶猫:daily_care + care-reproduction-neonatal-kitten");
  }

  {
    const data = await dryRun("打喷嚏", "猫一直打喷嚏,眼屎有点多,要紧吗?");
    expectIntent(data, "medical_general", "打喷嚏");
    const local = tool(data, "local_medical_recall");
    assert(local?.status === "used", "打喷嚏:应走医学本地召回", JSON.stringify(local, null, 2));
    assert((data.agentRetrievalPreview ?? "").includes("cat-uri"), "打喷嚏:应命中 URI 医学资料", data.agentRetrievalPreview);
    expectNoWebSearch(data, "打喷嚏");
    console.log("  ✓ 打喷嚏:medical_general + 本地医学资料");
  }

  {
    const data = await dryRun("不爱吃饭去医院", "猫不太爱吃饭,要不要去医院?");
    expectIntent(data, "medical_general", "不爱吃饭去医院");
    const local = tool(data, "local_medical_recall");
    assert(local?.status === "used", "不爱吃饭去医院:应走医学本地召回", JSON.stringify(local, null, 2));
    assert((data.agentRetrievalPreview ?? "").includes("cat-anorexia"), "不爱吃饭去医院:应命中食欲下降医学资料", data.agentRetrievalPreview);
    assert(data.posterAttachmentPreview?.id === "cat-anorexia", "不爱吃饭去医院:图解应命中 cat-anorexia", JSON.stringify(data.posterAttachmentPreview, null, 2));
    assert(!(data.careCardIds ?? []).includes("care-carrier-vet-visit"), "不爱吃饭去医院:不应被去医院带偏到猫包训练", JSON.stringify(data.careCardIds));
    console.log("  ✓ 不爱吃饭去医院:medical_general + cat-anorexia poster");
  }

  {
    const data = await dryRun("口腔品牌", "猫牙龈红肿牙齿发黄,推荐什么牙膏牙刷品牌?");
    expectIntent(data, "product_or_medicine", "口腔品牌");
    assert((data.medicinePolicyPreview ?? "").includes("猫专用牙膏"), "口腔品牌:缺少本地用品边界", data.medicinePolicyPreview);
    assert((data.productBoundaryPreview ?? "").includes("detected_country: CN"), "口腔品牌:缺少地区化商品边界", data.productBoundaryPreview);
    const web = tool(data, "authority_web_search");
    assert(web?.allowedDomains?.includes("vohc.org"), "口腔品牌:应暴露 VOHC 白名单搜索计划", JSON.stringify(web, null, 2));
    console.log("  ✓ 口腔品牌:product_or_medicine + 商品/药品边界");
  }

  {
    const data = await dryRun("化毛膏购买", "猫吐毛球,可以买化毛膏或者猫草吗?国内怎么选?");
    expectIntent(data, "product_or_medicine", "化毛膏购买");
    assert((data.medicinePolicyPreview ?? "").includes("猫用化毛产品"), "化毛膏购买:缺少化毛用品边界", data.medicinePolicyPreview);
    assert((data.productBoundaryPreview ?? "").includes("detected_country: CN"), "化毛膏购买:缺少地区化商品边界", data.productBoundaryPreview);
    console.log("  ✓ 化毛膏购买:product_or_medicine + 本地用品边界");
  }

  {
    const data = await dryRun("张口喘", "猫突然张口喘,趴着不动,我可以先观察吗?");
    expectIntent(data, "emergency", "张口喘");
    expectNoWebSearch(data, "张口喘");
    assert((data.intentPreview?.instruction ?? "").includes("立刻"), "张口喘:急症意图缺少急停指令", JSON.stringify(data.intentPreview, null, 2));
    console.log("  ✓ 张口喘:emergency + 不联网");
  }

  {
    const data = await dryRun("车撞外伤", "猫被车撞了,现在站不起来还有出血,我可以先包扎观察吗?");
    expectIntent(data, "emergency", "车撞外伤");
    expectNoWebSearch(data, "车撞外伤");
    assert((data.intentPreview?.instruction ?? "").includes("立刻"), "车撞外伤:急症意图缺少急停指令", JSON.stringify(data.intentPreview, null, 2));
    console.log("  ✓ 车撞外伤:emergency + 不联网");
  }

  {
    const data = await dryRun("抽搐发作", "猫刚刚抽搐三分钟,现在有点叫不醒,怎么办?");
    expectIntent(data, "emergency", "抽搐发作");
    expectNoWebSearch(data, "抽搐发作");
    assert((data.intentPreview?.instruction ?? "").includes("立刻"), "抽搐发作:急症意图缺少急停指令", JSON.stringify(data.intentPreview, null, 2));
    console.log("  ✓ 抽搐发作:emergency + 不联网");
  }

  console.log("\n✅ 通过 —— 行为问答已按意图分流到日常资料 / 医学资料 / 产品边界 / 急症急停。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
