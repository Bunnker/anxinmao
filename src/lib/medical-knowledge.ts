// 服务端医学资料索引 —— 把分诊命中的 claim_id 映射回 docs/medical/ai-cards。
// 仅供 route handler / 服务端 LLM prompt 使用,不要从客户端组件 import。
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RiskTier } from "@/types/cat";

const CARD_DIR = path.join(process.cwd(), "docs/medical/ai-cards");
const CLAIM_ID_RE = /^[a-z]+_\d{3}$/;

const CARD_BY_SYMPTOM: Record<string, string> = {
  vomit: "cat-vomiting",
  diarrhea: "cat-diarrhea",
  noeat: "cat-anorexia",
  lethargy: "cat-lethargy",
  sneeze: "cat-uri",
  ear: "cat-ear-problem",
  skin: "cat-skin-problem",
  eye: "cat-eye-problem",
  mouth: "cat-oral-problem",
  behavior: "cat-behavior-change",
  limp: "cat-limping",
  eat: "cat-toxin-ingestion",
  breath: "cat-dyspnea",
  blood: "cat-bleeding",
  pee: "cat-urethral-obstruction",
  urine: "cat-urethral-obstruction",
  other: "cat-general-triage",
};

const CARD_BY_CLAIM_PREFIX: Record<string, string> = {
  emg: "cat-emergency-red-flags",
  vom: "cat-vomiting",
  dia: "cat-diarrhea",
  ano: "cat-anorexia",
  leth: "cat-lethargy",
  uri: "cat-uri",
  ear: "cat-ear-problem",
  skin: "cat-skin-problem",
  eye: "cat-eye-problem",
  oral: "cat-oral-problem",
  beh: "cat-behavior-change",
  limp: "cat-limping",
  tox: "cat-toxin-ingestion",
  bre: "cat-dyspnea",
  bld: "cat-bleeding",
  uo: "cat-urethral-obstruction",
  gen: "cat-general-triage",
  heat: "cat-heatstroke-weather-hazard",
  con: "cat-constipation-straining",
  tra: "cat-trauma-first-aid",
  neu: "cat-seizure-neurologic-emergency",
};

export type MedicalKnowledgeInput = {
  symptom?: string;
  tier?: RiskTier;
  claimIds?: string[] | string | null;
  maxChars?: number;
};

export type MedicalKnowledgeContext = {
  prompt: string;
  claimIds: string[];
  cardIds: string[];
};

const cardCache = new Map<string, Promise<string>>();

export function normalizeClaimIds(raw: unknown): string[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (!CLAIM_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= 32) break;
  }
  return ids;
}

export function parseRiskTier(raw: unknown): RiskTier | undefined {
  return raw === "red" || raw === "yellow" || raw === "green" ? raw : undefined;
}

function claimPrefix(id: string): string {
  return id.replace(/_\d{3}$/, "");
}

function knownSymptom(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const symptom = raw.trim();
  return CARD_BY_SYMPTOM[symptom] ? symptom : undefined;
}

function cardPath(cardId: string): string {
  return path.join(CARD_DIR, `${cardId}.ai-card.md`);
}

function readCard(cardId: string): Promise<string> {
  const cached = cardCache.get(cardId);
  if (cached) return cached;
  const task = readFile(cardPath(cardId), "utf8");
  cardCache.set(cardId, task);
  return task;
}

function cardIdsFor(symptom: string | undefined, claimIds: string[]): string[] {
  const ids = new Set<string>();
  const add = (cardId: string | undefined) => {
    if (cardId) ids.add(cardId);
  };

  if (symptom || claimIds.length > 0) add("cat-emergency-red-flags");
  for (const id of claimIds) add(CARD_BY_CLAIM_PREFIX[claimPrefix(id)]);
  if (symptom) add(CARD_BY_SYMPTOM[symptom]);
  return [...ids];
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1] + 1) {
      merged.push([start, end]);
    } else {
      last[1] = Math.max(last[1], end);
    }
  }
  return merged;
}

function excerptCard(text: string, claimIds: string[], maxChars: number): string {
  const lines = text.split("\n");
  const ranges: [number, number][] = [[0, Math.min(70, lines.length - 1)]];

  if (claimIds.length > 0) {
    lines.forEach((line, i) => {
      if (!claimIds.some((id) => line.includes(id))) return;
      ranges.push([Math.max(0, i - 8), Math.min(lines.length - 1, i + 12)]);
    });
  }

  const chunks = mergeRanges(ranges).map(([start, end], index) => {
    const prefix = index === 0 ? "" : "\n...\n";
    return prefix + lines.slice(start, end + 1).join("\n");
  });
  const excerpt = chunks.join("\n");
  return excerpt.length > maxChars
    ? excerpt.slice(0, maxChars).trimEnd() + "\n..."
    : excerpt;
}

export async function buildMedicalKnowledgeContext(
  input: MedicalKnowledgeInput,
): Promise<MedicalKnowledgeContext> {
  const claimIds = normalizeClaimIds(input.claimIds);
  const symptom = knownSymptom(input.symptom);
  const cardIds = cardIdsFor(symptom, claimIds);
  if (cardIds.length === 0) return { prompt: "", claimIds, cardIds };

  const maxChars = input.maxChars ?? 14000;
  const perCardMax = Math.max(2200, Math.floor(maxChars / cardIds.length));
  const sections: string[] = [];

  for (const cardId of cardIds) {
    const text = await readCard(cardId);
    const relevantClaims = claimIds.filter((id) => {
      const prefix = claimPrefix(id);
      return CARD_BY_CLAIM_PREFIX[prefix] === cardId;
    });
    sections.push(
      [
        `## ${cardId}`,
        `path: docs/medical/ai-cards/${cardId}.ai-card.md`,
        `matched_claim_ids: ${relevantClaims.length ? relevantClaims.join(", ") : "(symptom context)"}`,
        excerptCard(text, relevantClaims, perCardMax),
      ].join("\n"),
    );
  }

  const header = [
    "【医学资料库上下文】",
    `symptom: ${symptom ?? "(unknown)"}`,
    `current_tier: ${input.tier ?? "(unknown)"}`,
    `selected_claim_ids: ${claimIds.length ? claimIds.join(", ") : "(none)"}`,
    "",
    "使用边界:",
    "- 这些内容只用于分诊、追问、护理边界和风险解释;不要向用户展示 claim_id。",
    "- 不诊断具体疾病,不把推测说成确诊。",
    "- 默认不推荐具体药品商品名或剂量;只有资料卡 medicine_policy 明确允许时,才可解释“兽医可能会考虑的处理类别”,仍不得给剂量或引导自行买药。",
    "- 非药品护理用品不是药品;只有资料卡和商品边界明确允许、且用户是在问日常护理/购买时,才可基于专业来源给候选或选购标准。",
    "- 命中 red_flags 或 current_tier=red 时,停止常规追问,优先给立即联系动物医院/急诊和路上安全处理。",
    "- 达到 questioning_boundary 的停止条件或已能区分 red/yellow/green 时,就应该分析,不要为了凑轮数继续问。",
  ].join("\n");

  const prompt = [header, ...sections].join("\n\n").slice(0, maxChars);
  return { prompt, claimIds, cardIds };
}
