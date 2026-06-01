#!/usr/bin/env node
// 病情说明小抄 harness
//
// 验证 /api/case-note 的 P0 边界:
// 1. 只允许 red / yellow 生成。
// 2. 最多追问 1 次:extraAnswer 或 finalizeNow 必须直接出 note。
// 3. 输出不出现诊断式病原名、不软化红档。
// 4. dryRun 不调用大模型,不消耗额度。
//
// 前置:`npm run dev` 已在跑(默认 :3000)。
// 运行:`npm run harness:case-note`

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

const FORBIDDEN_DIAGNOSIS = [
  "FCV/FHV",
  "FHV/FCV",
  "支原体感染",
  "衣原体感染",
  "高度怀疑",
  "确诊",
];

const FORBIDDEN_RED_DOWNGRADE = [
  "不是急诊",
  "黄色预警",
  "黄色信号",
  "先观察",
];

function fail(message, detail) {
  console.error(`❌ ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function assert(condition, message, detail) {
  if (!condition) fail(message, detail);
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

async function post(body) {
  const res = await fetch(`${BASE}/api/case-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dryRun: true, ...body }),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { res, data, text };
}

const baseCat = {
  name: "糯米",
  ageMonths: 18,
  sex: "雄",
  weight: 5.1,
  neutered: "否",
  vaccines: [{ name: "猫三联", date: "2026-03-01" }],
  deworm: "2026-04-20",
};

const CASES = [
  {
    name: "红档呼吸:缺时间时最多追问 1 个问题",
    body: {
      symptom: "breath",
      tier: "red",
      claimIds: ["bre_001", "emg_001"],
      handoff: {
        report: "红档 · 呼吸怪。需要立刻联系动物医院。",
        qa: "症状:张口喘,趴着不动。精神:差。",
      },
      cat: baseCat,
    },
    expectStatus: 200,
    expectMode: "follow_up",
    expectQuestion: ["兽医", "什么时候"],
  },
  {
    name: "红档呼吸:extraAnswer 后必须生成 note",
    body: {
      symptom: "breath",
      tier: "red",
      claimIds: ["bre_001", "emg_001"],
      handoff: {
        report: "红档 · 呼吸怪。需要立刻联系动物医院。",
        qa: "症状:张口喘,趴着不动。精神:差。",
      },
      extraAnswer: "大概 20 分钟前开始,现在比刚才更明显。",
      cat: baseCat,
    },
    expectStatus: 200,
    expectMode: "note",
    expectNote: ["正在准备联系", "动物医院", "糯米", "20 分钟前"],
    forbidInNote: [...FORBIDDEN_RED_DOWNGRADE, ...FORBIDDEN_DIAGNOSIS],
  },
  {
    name: "黄档口腔:finalizeNow 直接生成 note",
    body: {
      symptom: "mouth",
      tier: "yellow",
      claimIds: ["oral_018", "oral_022", "oral_030"],
      handoff: {
        report: "黄档 · 口腔问题。建议尽快看兽医。",
        qa: "牙龈红肿、牙齿发黄,吃硬粮会掉食,没有呼吸困难。",
      },
      finalizeNow: true,
      cat: baseCat,
    },
    expectStatus: 200,
    expectMode: "note",
    expectNote: ["牙龈红肿", "牙齿发黄", "口腔检查", "暂未说明"],
    forbidInNote: FORBIDDEN_DIAGNOSIS,
  },
  {
    name: "黄档口腔:extraAnswer 后不会再追问",
    body: {
      symptom: "mouth",
      tier: "yellow",
      claimIds: ["oral_018", "oral_030"],
      handoff: {
        report: "黄档 · 口腔问题。建议尽快看兽医。",
        qa: "牙龈红肿、牙齿发黄,吃硬粮会掉食。",
      },
      extraAnswer: "已经 2 天,今天比昨天更红,暂时没用药。",
      cat: baseCat,
    },
    expectStatus: 200,
    expectMode: "note",
    expectNote: ["已经 2 天", "暂时没用药", "兽医"],
    forbidInNote: FORBIDDEN_DIAGNOSIS,
  },
  {
    name: "绿档不可生成",
    body: {
      symptom: "mouth",
      tier: "green",
      handoff: { report: "绿档 · 先观察。" },
      finalizeNow: true,
      cat: baseCat,
    },
    expectStatus: 400,
    expectErrorCode: "UNSUPPORTED_TIER",
  },
  {
    name: "缺 tier 不可生成",
    body: {
      symptom: "mouth",
      handoff: { report: "没有档位。" },
      finalizeNow: true,
      cat: baseCat,
    },
    expectStatus: 400,
    expectErrorCode: "UNSUPPORTED_TIER",
  },
  {
    name: "非法 tier 不可生成",
    body: {
      symptom: "mouth",
      tier: "blue",
      handoff: { report: "非法档位。" },
      finalizeNow: true,
      cat: baseCat,
    },
    expectStatus: 400,
    expectErrorCode: "UNSUPPORTED_TIER",
  },
  {
    name: "误食红档:finalizeNow 不出现诊断和降级词",
    body: {
      symptom: "eat",
      tier: "red",
      claimIds: ["tox_005", "emg_008"],
      handoff: {
        report: "红档 · 误食。可能舔了百合花粉。",
        qa: "主人说猫可能舔到百合花粉,现在还没吐。",
      },
      finalizeNow: true,
      cat: baseCat,
    },
    expectStatus: 200,
    expectMode: "note",
    expectNote: ["百合", "动物医院", "正在准备联系"],
    forbidInNote: [...FORBIDDEN_RED_DOWNGRADE, ...FORBIDDEN_DIAGNOSIS],
  },
];

function assertCase(c, status, data) {
  console.log(`  ${c.name}`);
  assert(status === c.expectStatus, `${c.name}:HTTP 状态不符合预期`, JSON.stringify(data, null, 2));

  if (c.expectErrorCode) {
    assert(data.code === c.expectErrorCode, `${c.name}:错误码不符合预期`, JSON.stringify(data, null, 2));
    console.log(`    ✓ rejected:${data.code}`);
    return;
  }

  assert(data.dryRun === true, `${c.name}:dryRun 应为 true`, JSON.stringify(data, null, 2));
  assert(data.mode === c.expectMode, `${c.name}:mode 应为 ${c.expectMode}`, JSON.stringify(data, null, 2));
  assert(Array.isArray(data.evidence?.cardIds), `${c.name}:缺少 evidence.cardIds`, JSON.stringify(data, null, 2));

  if (c.expectQuestion) {
    const question = data.question ?? "";
    for (const text of c.expectQuestion) {
      assert(question.includes(text), `${c.name}:追问缺少「${text}」`, question);
    }
    console.log(`    ✓ follow_up:${question}`);
  }

  if (c.expectNote) {
    const note = data.note ?? "";
    for (const text of c.expectNote) {
      assert(note.includes(text), `${c.name}:note 缺少「${text}」`, note);
    }
    if (c.forbidInNote) {
      assert(
        !includesAny(note, c.forbidInNote),
        `${c.name}:note 出现禁词`,
        note,
      );
    }
    assert(!data.noteFooter, `${c.name}:免责声明不应由 API/LLM 生成`, JSON.stringify(data, null, 2));
    console.log(`    ✓ note:${note.replace(/\s+/g, " ").slice(0, 80)}`);
  }
}

async function main() {
  console.log("══ 病情说明小抄 harness ══");
  console.log(`服务:${BASE}`);
  console.log("模式:dryRun(不调用大模型,不消耗额度)\n");

  for (const c of CASES) {
    const { res, data, text } = await post(c.body);
    if (!res.ok && !c.expectErrorCode) {
      fail(`${c.name}:请求失败 ${res.status}`, text);
    }
    assertCase(c, res.status, data);
  }

  console.log("\n✅ 通过 —— case-note 边界、追问上限和禁词规则都符合预期。");
}

main().catch((e) => fail("HARNESS 运行失败", e.message));
