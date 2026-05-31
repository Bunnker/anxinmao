// 受控 Agent 工具层 —— 服务端在调用大模型前先检索资料。
//
// 医疗场景不让模型自由上网:本地召回和联网搜索都由这里限制范围、裁剪长度、
// 记录 trace,再作为 system context 交给模型阅读。
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { UserRegionContext } from "@/lib/request-region";
import type { RiskTier } from "@/types/cat";

const MEDICAL_ROOT = path.join(process.cwd(), "docs/medical");
const LOCAL_DIRS = ["ai-cards", "source"];
const MAX_QUERY_CHARS = 240;
const WEB_TIMEOUT_MS = 4500;

export const AUTHORITY_WEB_DOMAINS = [
  "vohc.org",
  "aaha.org",
  "wsava.org",
  "vet.cornell.edu",
  "merckvetmanual.com",
  "msdvetmanual.com",
  "vcahospitals.com",
  "icatcare.org",
  "aspca.org",
  "avma.org",
  "anicira.org",
  "petmd.com",
  "petplan.co.uk",
  "ivdc.org.cn",
  "moa.gov.cn",
  "xmsyj.moa.gov.cn",
];

type LocalDoc = {
  path: string;
  title: string;
  text: string;
};

export type AgentRetrievalResult = {
  path?: string;
  url?: string;
  title: string;
  score?: number;
  excerpt: string;
};

export type AgentToolTrace = {
  name: "local_medical_recall" | "authority_web_search";
  status: "used" | "skipped" | "failed";
  reason?: string;
  allowedDomains?: string[];
  query?: string;
  results?: AgentRetrievalResult[];
};

export type AgentRetrievalInput = {
  query: string;
  symptom?: string;
  tier?: RiskTier;
  claimIds?: string[];
  dryRun?: boolean;
  maxChars?: number;
  region?: UserRegionContext;
};

export type AgentRetrievalContext = {
  prompt: string;
  tools: AgentToolTrace[];
};

const localDocsCache = new Map<string, Promise<LocalDoc[]>>();

function compact(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function titleFrom(text: string, fallback: string): string {
  const firstHeading = text.match(/^#\s+(.+)$/m)?.[1];
  return compact(firstHeading ?? fallback).slice(0, 100);
}

async function loadLocalDocs(): Promise<LocalDoc[]> {
  const cached = localDocsCache.get("default");
  if (cached) return cached;
  const task = (async () => {
    const docs: LocalDoc[] = [];
    for (const dir of LOCAL_DIRS) {
      const fullDir = path.join(MEDICAL_ROOT, dir);
      const names = await readdir(fullDir);
      for (const name of names) {
        if (!name.endsWith(".md")) continue;
        const filePath = path.join(fullDir, name);
        const text = await readFile(filePath, "utf8");
        docs.push({
          path: `docs/medical/${dir}/${name}`,
          title: titleFrom(text, name),
          text,
        });
      }
    }
    return docs;
  })();
  localDocsCache.set("default", task);
  return task;
}

function queryTerms(query: string): string[] {
  const q = query.toLowerCase();
  const terms = new Set<string>();
  const stopwords = new Set([
    "猫",
    "它",
    "这",
    "那",
    "要",
    "吗",
    "的",
    "了",
    "和",
    "是",
    "有",
    "没",
    "我",
    "怎么",
    "需要",
    "可以",
  ]);
  for (const token of q.match(/[a-z0-9_]{2,}|[\u4e00-\u9fff]{2,8}/g) ?? []) {
    if (!stopwords.has(token)) terms.add(token);
  }

  const expansions: [RegExp, string[]][] = [
    [/乱尿|乱排|猫砂盆|尿不|尿少|尿频|尿血|排尿|小便|泌尿|膀胱/, ["乱尿", "猫砂盆", "尿不出", "尿道", "泌尿", "膀胱", "uo_", "urination", "housesoiling"]],
    [/行为|攻击|咬|躲|焦虑|应激|叫|乱尿|乱排/, ["行为", "攻击", "焦虑", "应激", "乱排泄", "beh_", "behavior", "aggression"]],
    [/吐|呕吐|反胃|吐毛/, ["呕吐", "vom_", "vomiting"]],
    [/拉稀|腹泻|软便|便血|黑便/, ["腹泻", "软便", "便血", "dia_", "diarrhea"]],
    [/不吃|食欲|厌食|拒食/, ["不吃", "食欲", "厌食", "ano_", "anorexia"]],
    [/打喷嚏|鼻涕|流鼻|上呼吸|感冒/, ["打喷嚏", "鼻涕", "uri_", "respiratory"]],
    [/耳朵|挠耳|甩头|咖啡渣|耳螨|外耳/, ["耳朵", "挠耳", "甩头", "咖啡渣", "耳螨", "ear_"]],
    [/眼睛|流泪|眼泪|分泌物|结膜|眯眼/, ["眼睛", "流泪", "分泌物", "eye_"]],
    [
      /牙|牙龈|牙齿|牙黄|牙膏|牙刷|刷牙|口腔|口臭|牙结石|流口水|抓嘴|挠嘴|掉食|牙齿打颤|下巴肿|脸肿|口水带血|白斑|白膜|咂嘴|伸舌|口干/,
      ["牙龈", "牙齿", "牙膏", "牙刷", "刷牙", "口腔", "牙病", "牙结石", "口炎", "oral_"],
    ],
    [/呼吸|喘|张口喘|急诊|咳|胸口/, ["呼吸", "张口喘", "bre_", "dyspnea", "cat-emergency-red-flags", "emg_"]],
    [/百合|中毒|误食|巧克力|葡萄|洋葱|人药|药|花粉/, ["中毒", "误食", "百合", "tox_", "toxin", "poison", "cat-emergency-red-flags", "emg_"]],
    [/疫苗|免疫|猫三联|狂犬/, ["疫苗", "免疫", "未免疫", "vaccine"]],
    [/驱虫|寄生虫|跳蚤|耳螨/, ["驱虫", "寄生虫", "跳蚤", "耳螨", "parasite"]],
  ];
  for (const [pattern, words] of expansions) {
    if (pattern.test(q)) words.forEach((word) => terms.add(word.toLowerCase()));
  }
  return [...terms].slice(0, 40);
}

function isProductQuery(query: string): boolean {
  return /牌子|品牌|哪款|买|购买|哪里|牙膏|牙刷|洁齿|漱口|喷剂|凝胶|用品|产品/.test(
    query,
  );
}

function isOralCareProductQuery(query: string): boolean {
  return /牙|牙龈|牙齿|牙黄|牙膏|牙刷|刷牙|口腔|口臭|洁齿|牙结石|抓嘴|挠嘴|掉食|下巴肿|脸肿|白斑|白膜|咂嘴|口干/.test(query);
}

function cardHint(symptom?: string): string | undefined {
  const map: Record<string, string> = {
    behavior: "cat-behavior-change",
    pee: "cat-urethral-obstruction",
    diarrhea: "cat-diarrhea",
    vomit: "cat-vomiting",
    noeat: "cat-anorexia",
    breath: "cat-dyspnea",
    eat: "cat-toxin-ingestion",
    sneeze: "cat-uri",
    ear: "cat-ear-problem",
    eye: "cat-eye-problem",
    skin: "cat-skin-problem",
    mouth: "cat-oral-problem",
    limp: "cat-limping",
    blood: "cat-bleeding",
    other: "cat-lethargy",
  };
  return symptom ? map[symptom] : undefined;
}

function scoreDoc(doc: LocalDoc, terms: string[], input: AgentRetrievalInput): number {
  const haystack = `${doc.path}\n${doc.title}\n${doc.text}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const low = term.toLowerCase();
    if (doc.path.toLowerCase().includes(low)) score += 8;
    if (doc.title.toLowerCase().includes(low)) score += 6;
    const matches = haystack.split(low).length - 1;
    score += Math.min(matches, 8);
  }
  const hint = cardHint(input.symptom);
  if (hint && doc.path.includes(hint)) score += 24;
  if (
    terms.includes("cat-emergency-red-flags") &&
    doc.path.includes("cat-emergency-red-flags")
  ) {
    score += 40;
  }
  for (const claim of input.claimIds ?? []) {
    if (doc.text.includes(claim)) score += 18;
  }
  if (input.tier === "red" && doc.path.includes("cat-emergency-red-flags")) score += 10;
  return score;
}

function firstHit(lower: string, terms: string[]): number | undefined {
  return terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
}

function preferredExcerptTerms(input: AgentRetrievalInput): string[] {
  if (isProductQuery(input.query) && isOralCareProductQuery(input.query)) {
    return [
      "product_recommendation_policy",
      "examples_from_vohc",
      "VOHC 猫用候选示例",
      "oral_023",
      "Healthymouth",
      "Feline Greenies",
      "Purina DentaLife",
    ];
  }
  return [];
}

function excerptAround(
  text: string,
  terms: string[],
  maxChars: number,
  preferredTerms: string[] = [],
): string {
  const lower = text.toLowerCase();
  const hit = firstHit(lower, preferredTerms) ?? firstHit(lower, terms);
  const start =
    typeof hit === "number" ? Math.max(0, hit - Math.floor(maxChars / 3)) : 0;
  const excerpt = text.slice(start, start + maxChars);
  return compact(`${start > 0 ? "..." : ""}${excerpt}${start + maxChars < text.length ? "..." : ""}`);
}

export async function localMedicalRecall(
  input: AgentRetrievalInput,
): Promise<AgentToolTrace> {
  const docs = await loadLocalDocs();
  const terms = queryTerms(input.query);
  const preferredTerms = preferredExcerptTerms(input);
  const results = docs
    .map((doc) => ({
      doc,
      score: scoreDoc(doc, terms, input),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ doc, score }) => ({
      path: doc.path,
      title: doc.title,
      score,
      excerpt: excerptAround(doc.text, terms, 900, preferredTerms),
    }));

  return {
    name: "local_medical_recall",
    status: results.length > 0 ? "used" : "skipped",
    reason: results.length > 0 ? "query_matched_local_medical_docs" : "no_local_match",
    query: input.query.slice(0, MAX_QUERY_CHARS),
    results,
  };
}

function isAllowedAuthorityUrl(raw: string, domains = AUTHORITY_WEB_DOMAINS): boolean {
  try {
    const url = new URL(raw);
    return domains.some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

function decodeDuckDuckGoHref(raw: string): string | null {
  const unescaped = raw.replace(/&amp;/g, "&");
  try {
    const url = new URL(unescaped, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeURIComponent(redirected) : url.href;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  );
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AnxinMaoMedicalBot/0.1; +https://example.invalid)",
        Accept: "text/html,text/plain,application/xhtml+xml",
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function authoritySearchPlan(
  input: AgentRetrievalInput,
  needsProfessionalProductSource: boolean,
): { domains: string[]; query: string } {
  let domains = AUTHORITY_WEB_DOMAINS;
  if (needsProfessionalProductSource) {
    domains = [
      "vohc.org",
      "aaha.org",
      "wsava.org",
      "vet.cornell.edu",
      "vcahospitals.com",
      "merckvetmanual.com",
      "msdvetmanual.com",
      "ivdc.org.cn",
      "moa.gov.cn",
      "xmsyj.moa.gov.cn",
    ];
  } else if (input.region?.countryCode === "CN") {
    const cnDomains = ["ivdc.org.cn", "moa.gov.cn", "xmsyj.moa.gov.cn"];
    domains = [
      ...cnDomains,
      ...AUTHORITY_WEB_DOMAINS.filter((domain) => !cnDomains.includes(domain)),
    ];
  }

  const productHint = needsProfessionalProductSource
    ? " VOHC accepted products cats toothpaste toothbrush"
    : "";
  const regionHint = input.region?.countryCode === "CN" ? " 中国 国内" : "";
  const siteClause = domains
    .slice(0, 8)
    .map((domain) => `site:${domain}`)
    .join(" OR ");
  return {
    domains,
    query: `${input.query.slice(0, MAX_QUERY_CHARS)}${regionHint}${productHint} cat veterinary ${siteClause}`,
  };
}

async function authorityWebSearch(
  input: AgentRetrievalInput,
  localTrace: AgentToolTrace,
): Promise<AgentToolTrace> {
  const topScore = localTrace.results?.[0]?.score ?? 0;
  const needsProfessionalProductSource =
    isProductQuery(input.query) && isOralCareProductQuery(input.query);
  const plan = authoritySearchPlan(input, needsProfessionalProductSource);
  const enabled = process.env.AUTHORITY_WEB_SEARCH !== "off";
  if (input.dryRun) {
    return {
      name: "authority_web_search",
      status: "skipped",
      reason: "dry_run_no_network",
      allowedDomains: plan.domains,
      query: plan.query,
      results: [],
    };
  }
  if (!enabled) {
    return {
      name: "authority_web_search",
      status: "skipped",
      reason: "disabled_by_AUTHORITY_WEB_SEARCH=off",
      allowedDomains: plan.domains,
      query: plan.query,
      results: [],
    };
  }
  if (topScore >= 18 && !needsProfessionalProductSource) {
    return {
      name: "authority_web_search",
      status: "skipped",
      reason: "local_context_sufficient",
      allowedDomains: plan.domains,
      query: plan.query,
      results: [],
    };
  }

  try {
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(plan.query)}`;
    const res = await fetchWithTimeout(searchUrl, WEB_TIMEOUT_MS);
    if (!res.ok) throw new Error(`search ${res.status}`);
    const html = await res.text();
    const links = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/g)]
      .map((match) => decodeDuckDuckGoHref(match[1] ?? ""))
      .filter((url): url is string => !!url && isAllowedAuthorityUrl(url, plan.domains))
      .filter((url, index, arr) => arr.indexOf(url) === index)
      .slice(0, 2);

    const results: AgentRetrievalResult[] = [];
    for (const url of links) {
      const page = await fetchWithTimeout(url, WEB_TIMEOUT_MS);
      if (!page.ok) continue;
      const htmlText = await page.text();
      const title =
        stripHtml(htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url) ||
        url;
      results.push({
        url,
        title: title.slice(0, 120),
        excerpt: stripHtml(htmlText).slice(0, 1000),
      });
    }

    return {
      name: "authority_web_search",
      status: results.length > 0 ? "used" : "skipped",
      reason:
        results.length > 0
          ? needsProfessionalProductSource
            ? "product_query_needs_professional_source"
            : "local_context_low_confidence"
          : "no_allowed_result",
      allowedDomains: plan.domains,
      query: plan.query,
      results,
    };
  } catch (e) {
    return {
      name: "authority_web_search",
      status: "failed",
      reason: e instanceof Error ? e.message.slice(0, 120) : "unknown_error",
      allowedDomains: plan.domains,
      query: plan.query,
      results: [],
    };
  }
}

function traceToPrompt(trace: AgentToolTrace): string {
  const header = [
    `## tool: ${trace.name}`,
    `status: ${trace.status}`,
    trace.reason ? `reason: ${trace.reason}` : "",
    trace.query ? `query: ${trace.query}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const results = (trace.results ?? [])
    .map((r, i) =>
      [
        `### result ${i + 1}: ${r.title}`,
        r.path ? `path: ${r.path}` : "",
        r.url ? `url: ${r.url}` : "",
        typeof r.score === "number" ? `score: ${r.score}` : "",
        r.excerpt,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  return results ? `${header}\n${results}` : header;
}

export async function buildAgentRetrievalContext(
  input: AgentRetrievalInput,
): Promise<AgentRetrievalContext> {
  const query = input.query.trim().slice(0, MAX_QUERY_CHARS);
  if (!query) return { prompt: "", tools: [] };

  const localTrace = await localMedicalRecall({ ...input, query });
  const webTrace = await authorityWebSearch({ ...input, query }, localTrace);
  const tools = [localTrace, webTrace];
  const useful = tools.filter((tool) => (tool.results?.length ?? 0) > 0);
  if (useful.length === 0) return { prompt: "", tools };

  const prompt = [
    "【Agent 工具召回上下文】",
    "使用边界:",
    "- 这些是服务端受控工具召回的补充资料,优先使用本地 docs/medical;联网结果仅来自白名单权威域名。",
    "- 工具结果用于补充分诊追问、风险解释和护理边界;不要向用户暴露内部工具名、文件路径或搜索细节。",
    "- 若工具结果与正式医学资料卡冲突,以正式医学资料卡和红旗规则为准。",
    "- 不诊断具体疾病,不推荐具体药品商品名或剂量。",
    "",
    ...useful.map(traceToPrompt),
  ]
    .join("\n\n")
    .slice(0, input.maxChars ?? 9000);

  return { prompt, tools };
}
