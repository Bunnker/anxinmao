// 行为问答 · 上下文压缩 harness
//
// 验证目标(对应「增加体验、避免关键信息丢失」):长对话超过阈值被压缩成
// 摘要后,早期埋入的关键信息(猫名、喝水怪癖)依然没丢 —— 摘要里留着,
// 压缩后的回答也还记得。
//
// 前置:`npm run dev` 已在跑(默认 :3000),且 .env.local 配好大模型 key。
// 运行:`npm run harness`  或  `node scripts/harness-behavior.mjs`
// 退出码:全部通过 0,有未过项 1。

const BASE = process.env.HARNESS_BASE || "http://localhost:3000";

// 与 src/app/behavior/page.tsx 保持一致 —— harness 复刻前端的压缩策略。
const COMPRESS_AT = 20;
const KEEP_VERBATIM = 8;

// ① 第 1 轮埋入两个「猜不出来」的关键信息:猫名 + 喝水怪癖。
const PLANT =
  "先跟你说说我家猫的情况:它叫年糕,3 个月大,是只公猫。它有个很特别的怪癖 —— 只肯喝流动的水,放在碗里不动的水它一口都不碰。";

// ② 10 轮无关填充,把对话撑过 20 条触发压缩;刻意不再提猫名和喝水。
const FILLERS = [
  "幼猫一天大概喂几次比较合适?",
  "猫为什么总爱抓沙发?能怎么引导?",
  "白天上班没人陪,猫会觉得无聊吗?",
  "猫为什么那么喜欢钻纸箱?",
  "怎么让猫慢慢习惯剪指甲?",
  "猫半夜特别精神、到处跑,正常吗?",
  "以后想再养一只猫,怎么让它们处好?",
  "换季掉毛厉害,平时怎么打理毛发?",
  "用什么玩具陪猫玩比较好?",
  "猫总爱往高处爬,要给它准备点什么?",
];

// ③ 压缩之后的探针:直接考关键信息的回忆。
const PROBE =
  "先别急着答养猫问题,我考考你:还记得我家猫叫什么名字吗?它在喝水上有什么特别的怪癖?";

// 复刻前端的流式读取:发一轮,把流读完,返回完整回答文本。
async function chatTurn(tail, memo) {
  const res = await fetch(`${BASE}/api/behavior`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: tail, memo }),
  });
  if (!res.ok) {
    let d = {};
    try {
      d = await res.json();
    } catch {}
    throw new Error(`/api/behavior ${res.status} —— ${d.error || "(无错误信息)"}`);
  }
  if (!res.body) throw new Error("/api/behavior 没有返回数据流");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  out += dec.decode();
  return out.trim();
}

// 调摘要接口:把较早的对话 + 旧摘要压成新摘要。
async function summarize(memo, msgs) {
  const res = await fetch(`${BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memo, messages: msgs }),
  });
  if (!res.ok) {
    let d = {};
    try {
      d = await res.json();
    } catch {}
    throw new Error(`/api/summarize ${res.status} —— ${d.error || "(无错误信息)"}`);
  }
  const d = await res.json();
  if (typeof d.memo !== "string" || !d.memo.trim()) {
    throw new Error("/api/summarize 没有返回有效摘要");
  }
  return d.memo.trim();
}

const oneLine = (s, n = 42) => s.replace(/\s+/g, " ").slice(0, n);

async function main() {
  console.log("══ 行为问答 · 上下文压缩 harness ══");
  console.log("目标:长对话压缩后,早期关键信息(猫名、喝水怪癖)不丢。");
  console.log(
    `服务:${BASE}  策略:超过 ${COMPRESS_AT} 条压缩,保留最近 ${KEEP_VERBATIM} 条原文\n`,
  );

  const messages = [];
  let memo = "";
  let memoCount = 0;
  let compressions = 0;
  let foldedThePlant = false;

  // 走一轮:发问 → 收回答 → 复刻前端 compressIfNeeded。
  async function turn(text, label) {
    messages.push({ role: "user", content: text });
    const tail = messages.slice(memoCount);
    const reply = await chatTurn(tail, memo);
    messages.push({ role: "assistant", content: reply });
    console.log(`  [${label}] 问:${oneLine(text, 24)}  →  答:${oneLine(reply)}`);
    if (messages.length - memoCount > COMPRESS_AT) {
      const foldEnd = messages.length - KEEP_VERBATIM;
      const toFold = messages.slice(memoCount, foldEnd);
      if (memoCount === 0) foldedThePlant = true; // 首次压缩,plant 在折叠区间内
      memo = await summarize(memo, toFold);
      memoCount = foldEnd;
      compressions++;
      console.log(
        `  ╰─ 压缩 #${compressions}:折叠 ${toFold.length} 条 → memoCount=${memoCount}`,
      );
    }
  }

  console.log("① 埋入关键信息(猫名「年糕」+ 怪癖「只喝流动水」)");
  await turn(PLANT, "plant");

  console.log(`\n② ${FILLERS.length} 轮无关填充(不再提猫名 / 喝水),撑过阈值`);
  for (let i = 0; i < FILLERS.length; i++) await turn(FILLERS[i], `fill${i + 1}`);

  console.log("\n③ 压缩后探针:直接考关键信息的回忆");
  await turn(PROBE, "probe");
  const answer = messages[messages.length - 1].content;

  console.log("\n══ 生成的摘要(memo)══");
  console.log(memo || "(空)");
  console.log("\n══ 探针回答全文 ══");
  console.log(answer);

  const checks = [
    ["压缩已触发(memoCount > 0)", compressions > 0 && memoCount > 0],
    ["埋入信息所在的早期对话已被折叠进摘要", foldedThePlant],
    ["摘要保留了猫名「年糕」", memo.includes("年糕")],
    ["摘要保留了「只喝流动水」的怪癖", /流动|活水|循环/.test(memo)],
    ["压缩后回答仍叫得出「年糕」", answer.includes("年糕")],
    ["压缩后回答仍记得「流动水」怪癖", /流动|活水|循环/.test(answer)],
  ];

  console.log("\n══ 结果 ══");
  let allPass = true;
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? "✓" : "✗"}  ${name}`);
    if (!ok) allPass = false;
  }
  console.log(
    allPass
      ? "\n✅ 全部通过 —— 长对话压缩后,关键信息没丢。"
      : "\n❌ 有未通过项 —— 见上方摘要 / 回答全文核对。",
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error("\n❌ HARNESS 运行失败:", e.message);
  console.error("   排查:dev server 是否在跑、.env.local 的大模型 key 是否有效。");
  process.exit(1);
});
