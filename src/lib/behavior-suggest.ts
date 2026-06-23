// 问答发现页「个性化推荐」引擎 —— 纯函数,0 次 LLM 调用。
// 从已有数据派生推荐:① 既往问答话题跟进 ② 猫资料触发(月龄/驱虫/绝育)
// ③ CatMemory 蒸馏记忆触发 ④ curated 兜底。候选问题【全部预设】(规则只负责「选」,
// 不「生成」)→ 措辞可控、不诊断、不制造焦虑(怕→安心)。急性症状随访不在此(留首页跟进卡)。
// 设计:docs/superpowers/specs(brainstorming 2026-06-23)。
import type { Cat, CatRecord, MemoryItem } from "@/types/cat";

export type SuggestTopic = "health" | "feed" | "behave" | "daily";
export type Suggestion = { q: string; topic: SuggestTopic; related: boolean };

// 每类 curated 问题池 —— 话题跟进挑「同类未问过的下一条」,也作兜底。全部安全措辞。
export const QUESTION_POOL: Record<SuggestTopic, string[]> = {
  health: [
    "打喷嚏好几天了,会自己好吗?",
    "猫不太爱吃饭,要不要去医院?",
    "猫一直打喷嚏,要紧吗?",
  ],
  feed: [
    "成猫一天喂几顿合适?",
    "猫挑食、想换粮,怎么换不容易软便?",
    "幼猫一天喂几次、喂多少?",
    "幼猫能不能喝牛奶?",
  ],
  behave: [
    "怎么让猫慢慢接受剪指甲?",
    "猫总抓沙发怎么办?",
    "怎么让猫不那么怕生人?",
  ],
  daily: ["多久给猫梳一次毛?", "猫砂多久彻底换一次?", "需要给猫刷牙吗?"],
};

// 既往记录命中的话题关键词 → 推同类下一条(P1 话题跟进)。
const TOPIC_KEYWORDS: { topic: SuggestTopic; words: string[] }[] = [
  {
    topic: "health",
    words: ["打喷嚏", "喷嚏", "吃饭", "食欲", "没精神", "呕吐", "吐", "拉稀", "尿"],
  },
  { topic: "feed", words: ["喂", "粮", "牛奶", "挑食", "换粮", "零食", "罐头"] },
  { topic: "behave", words: ["剪指甲", "指甲", "抓", "咬", "怕", "躲", "应激", "打架"] },
  { topic: "daily", words: ["梳毛", "毛球", "猫砂", "刷牙", "洗澡"] },
];

// 记忆关键词 → 问题(P3 记忆触发)。CatMemory 红线已排除病名/诊断,天然安全。
const MEMORY_RULES: { words: string[]; q: string; topic: SuggestTopic }[] = [
  { words: ["怕生", "怕人", "胆小", "躲", "应激", "敏感"], q: "怎么让猫不那么怕生人?", topic: "behave" },
  { words: ["挑食", "换粮", "不爱吃", "挑嘴"], q: "猫挑食、想换粮,怎么换不容易软便?", topic: "feed" },
  { words: ["瘦", "偏瘦", "太瘦", "胖", "肥", "体重"], q: "怎么判断猫的体重正不正常?", topic: "feed" },
  { words: ["抓", "沙发", "家具"], q: "猫总抓沙发怎么办?", topic: "behave" },
  { words: ["猫砂", "厕所", "乱尿"], q: "猫砂多久彻底换一次?", topic: "daily" },
];

const MAX_PER_TOPIC = 2;

function normalize(q: string): string {
  return q.replace(/[？?。.,，、\s]/g, "");
}

function ageMonths(cat: Cat, now: Date): number | null {
  if (cat.birthday) {
    const b = new Date(cat.birthday);
    if (!Number.isNaN(b.getTime())) {
      return (
        (now.getFullYear() - b.getFullYear()) * 12 +
        (now.getMonth() - b.getMonth())
      );
    }
  }
  return typeof cat.ageMonths === "number" ? cat.ageMonths : null;
}

function dewormOverdue(cat: Cat, now: Date): boolean {
  if (!cat.deworm) return true; // 从没记 → 提示一次
  const d = new Date(cat.deworm);
  if (Number.isNaN(d.getTime())) return true;
  return (now.getTime() - d.getTime()) / 86_400_000 > 90;
}

// 资料触发:确定性规则。topic 仅用于打散/上限。
function profileTriggers(cat: Cat, now: Date): Suggestion[] {
  const out: Suggestion[] = [];
  const age = ageMonths(cat, now);
  const isKitten = age != null && age < 12;
  if (isKitten) {
    out.push({ q: "幼猫一天喂几次、喂多少?", topic: "feed", related: true });
    out.push({ q: "幼猫疫苗怎么安排?", topic: "health", related: true });
  }
  if (dewormOverdue(cat, now)) {
    out.push({ q: "该给猫驱虫了吗?多久一次?", topic: "daily", related: true });
  }
  if (cat.neutered === "否" && (age == null || age >= 5)) {
    out.push({ q: "什么时候适合给猫绝育?", topic: "health", related: true });
  }
  return out;
}

/**
 * 为发现页「推荐」生成个性化问题列表(0 LLM,纯本地派生)。
 * 优先级:话题跟进 > 资料触发 > 记忆触发 > curated 兜底。永远凑满 count 条。
 * 派生项 related=true(显示「和X有关」),兜底 related=false(无标)。
 */
export function recommendQuestions(
  cat: Cat,
  records: CatRecord[],
  memory: MemoryItem[],
  count = 4,
  now: Date = new Date(),
): Suggestion[] {
  const result: Suggestion[] = [];
  const seen = new Set<string>();
  const topicCount: Record<SuggestTopic, number> = {
    health: 0,
    feed: 0,
    behave: 0,
    daily: 0,
  };

  // 刚问过的(behavior 记录)→ 不再推
  const askedNorm = new Set(
    records
      .filter((r) => r.kind === "behavior" && r.question)
      .map((r) => normalize(r.question as string)),
  );

  function tryAdd(q: string, topic: SuggestTopic, related: boolean): boolean {
    const n = normalize(q);
    if (seen.has(n) || askedNorm.has(n)) return false;
    if (topicCount[topic] >= MAX_PER_TOPIC) return false;
    seen.add(n);
    topicCount[topic] += 1;
    result.push({ q, topic, related });
    return true;
  }

  const done = () => result.length >= count;

  // P1 话题跟进:命中既往记录关键词的话题,各推一条「同类未问过的」
  const hay = records
    .slice(0, 8)
    .map((r) => `${r.question ?? ""} ${r.summary ?? ""} ${r.symptom ?? ""}`)
    .join(" ");
  for (const t of TOPIC_KEYWORDS) {
    if (!t.words.some((w) => hay.includes(w))) continue;
    for (const q of QUESTION_POOL[t.topic]) {
      if (tryAdd(q, t.topic, true)) break;
    }
    if (done()) return result.slice(0, count);
  }

  // P2 资料触发
  for (const s of profileTriggers(cat, now)) {
    tryAdd(s.q, s.topic, true);
    if (done()) return result.slice(0, count);
  }

  // P3 记忆触发
  const memHay = memory.map((m) => m.text).join(" ");
  for (const rule of MEMORY_RULES) {
    if (rule.words.some((w) => memHay.includes(w))) {
      tryAdd(rule.q, rule.topic, true);
      if (done()) return result.slice(0, count);
    }
  }

  // P4 curated 兜底:四类轮流填(无标)
  const order: SuggestTopic[] = ["health", "feed", "behave", "daily"];
  let added = true;
  while (!done() && added) {
    added = false;
    for (const topic of order) {
      if (done()) break;
      for (const q of QUESTION_POOL[topic]) {
        if (tryAdd(q, topic, false)) {
          added = true;
          break;
        }
      }
    }
  }

  return result.slice(0, count);
}
