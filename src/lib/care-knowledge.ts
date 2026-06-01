// 服务端日常养育资料索引 —— 用于行为、喂养、训练、环境等非医疗问题。
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const CARE_DIR = path.join(process.cwd(), "docs/care/ai-cards");
const MAX_QUERY_CHARS = 240;

type CareDoc = {
  id: string;
  path: string;
  title: string;
  text: string;
};

export type CareKnowledgeContext = {
  prompt: string;
  cardIds: string[];
};

const docsCache = new Map<string, Promise<CareDoc[]>>();

function compact(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function titleFrom(text: string, fallback: string): string {
  return compact(text.match(/^#\s+(.+)$/m)?.[1] ?? fallback).slice(0, 100);
}

async function loadCareDocs(): Promise<CareDoc[]> {
  const cached = docsCache.get("default");
  if (cached) return cached;
  const task = (async () => {
    const names = await readdir(CARE_DIR);
    const docs: CareDoc[] = [];
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      const filePath = path.join(CARE_DIR, name);
      const text = await readFile(filePath, "utf8");
      docs.push({
        id: name.replace(/\.care-card\.md$/, ""),
        path: `docs/care/ai-cards/${name}`,
        title: titleFrom(text, name),
        text,
      });
    }
    return docs;
  })();
  docsCache.set("default", task);
  return task;
}

function queryTerms(query: string): string[] {
  const q = query.toLowerCase().slice(0, MAX_QUERY_CHARS);
  const terms = new Set<string>();
  const stopwords = new Set(["猫", "小猫", "它", "怎么", "可以", "需要", "是不是", "一直"]);
  for (const token of q.match(/[a-z0-9_]{2,}|[\u4e00-\u9fff]{2,8}/g) ?? []) {
    if (!stopwords.has(token)) terms.add(token);
  }

  const expansions: [RegExp, string[]][] = [
    [/半夜|晚上|夜里|凌晨|扒门|叫|跑酷|吵/, ["半夜叫", "夜间叫", "扒门", "跑酷", "睡前互动游戏", "care_night_vocalization"]],
    [/幼猫|小猫|喂几次|喂多少|断奶|换粮|奶猫|吃多少/, ["幼猫", "喂养", "少量多餐", "按年龄阶段", "care_kitten_feeding"]],
    [/咬手|扑腿|抱脚|咬人玩|扑人/, ["咬手", "扑腿", "不要用手逗猫", "互动游戏", "care_play_biting"]],
    [/新猫|到家|躲床底|不亲人|怕人|不肯出来|躲起来/, ["新猫到家", "躲床底", "安全屋", "不强抱", "care_new_home_hiding"]],
    [/挑食|换粮|拌粮|不爱吃|软便/, ["挑食", "换粮", "5-7 天", "过渡", "care_food_transition_picky_eating"]],
    [/不埋屎|带砂|猫砂盆|猫砂|铲屎|盆臭/, ["不埋屎", "带砂", "每天铲", "猫数 + 1", "care_litter_box_habits"]],
    [/梳毛|掉毛|毛球|长毛|毛结|打结/, ["梳毛", "掉毛", "毛球", "逆毛", "care_grooming_hairballs"]],
    [/剪指甲|指甲|爪子|挣扎|血线/, ["剪指甲", "摸爪", "血线", "care_nail_trimming"]],
    [/刷牙训练|接受刷牙|不让刷牙|口腔护理习惯/, ["刷牙训练", "牙刷", "猫专用牙膏", "care_toothbrushing_training"]],
    [/陪玩|玩耍|无聊|精力|咬手|环境|丰容|逗猫棒|抓板/, ["陪玩", "环境丰容", "逗猫棒", "抓板", "care_enrichment_play"]],
  ];
  for (const [pattern, words] of expansions) {
    if (pattern.test(q)) words.forEach((word) => terms.add(word.toLowerCase()));
  }

  return [...terms].slice(0, 32);
}

function scoreDoc(doc: CareDoc, terms: string[]): number {
  const haystack = `${doc.id}\n${doc.path}\n${doc.title}\n${doc.text}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const low = term.toLowerCase();
    if (doc.id.toLowerCase().includes(low)) score += 12;
    if (doc.path.toLowerCase().includes(low)) score += 8;
    if (doc.title.toLowerCase().includes(low)) score += 6;
    score += Math.min(haystack.split(low).length - 1, 8);
  }
  return score;
}

function firstHit(lower: string, terms: string[]): number | undefined {
  return terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
}

function excerptAround(text: string, terms: string[], maxChars: number): string {
  const lower = text.toLowerCase();
  const hit = firstHit(lower, terms);
  const start =
    typeof hit === "number" ? Math.max(0, hit - Math.floor(maxChars / 4)) : 0;
  const excerpt = text.slice(start, start + maxChars);
  return compact(`${start > 0 ? "..." : ""}${excerpt}${start + maxChars < text.length ? "..." : ""}`);
}

export async function buildCareKnowledgeContext(
  query: string,
  maxChars = 6000,
): Promise<CareKnowledgeContext> {
  const terms = queryTerms(query);
  if (terms.length === 0) return { prompt: "", cardIds: [] };

  const matches = (await loadCareDocs())
    .map((doc) => ({ doc, score: scoreDoc(doc, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (matches.length === 0) return { prompt: "", cardIds: [] };

  const perCardMax = Math.max(900, Math.floor(maxChars / matches.length));
  const sections = matches.map(({ doc, score }) =>
    [
      `## ${doc.id}`,
      `path: ${doc.path}`,
      `score: ${score}`,
      excerptAround(doc.text, terms, perCardMax),
    ].join("\n"),
  );

  const header = [
    "【日常养育资料库上下文】",
    "使用边界:",
    "- 这些内容只用于行为、喂养、训练、环境和日常护理建议。",
    "- 如果用户描述疼痛、精神食欲异常、呕吐腹泻、排尿异常、呼吸异常、出血或误食,切回医学分诊规则。",
    "- 回答要像朋友一样具体,给主人今天就能做的一两步。",
  ].join("\n");

  return {
    prompt: [header, ...sections].join("\n\n").slice(0, maxChars),
    cardIds: matches.map(({ doc }) => doc.id),
  };
}
