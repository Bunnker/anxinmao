// 服务端知识海报选择器 —— 读取 public manifest 和本地文件系统,不要从客户端组件 import。
import fs from "node:fs";
import path from "node:path";

import type { BehaviorIntent } from "@/lib/behavior-intent";
import type { RiskTier } from "@/types/cat";
import {
  isKnowledgePosterAttachment,
  type KnowledgePosterAttachment,
  type KnowledgePosterDisplayMode,
  type KnowledgePosterRiskTone,
} from "@/types/knowledge-poster";
import { posterPassesQueryGate } from "@/lib/poster-query-rules";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "public/knowledge-posters/generated-style/manifest.json",
);
const PUBLIC_DIR = path.join(process.cwd(), "public");
const HEADER_LIMIT = 2048;
const EMERGENCY_CARD_ID = "cat-emergency-red-flags";
const PRODUCTION_GENERATION_MODE = "ai-imagegen";

const RED_PRIORITY = [
  "cat-emergency-red-flags",
  "cat-dyspnea",
  "cat-urethral-obstruction",
  "cat-toxin-ingestion",
  "cat-seizure-neurologic-emergency",
  "cat-bleeding",
  "cat-trauma-first-aid",
  "cat-heatstroke-weather-hazard",
];

export type KnowledgePosterManifestItem = {
  id: string;
  title: string;
  image: string;
  kind?: string;
  priority?: number;
  sourceDocs?: string[];
  generationMode?: string;
};

type IntentLike =
  | BehaviorIntent
  | string
  | {
      intent?: BehaviorIntent | string;
    };

export type KnowledgePosterSelectionInput = {
  medicalCardIds?: readonly string[] | null;
  careCardIds?: readonly string[] | null;
  medical?: {
    cardIds?: readonly string[] | null;
  } | null;
  agent?: {
    careCardIds?: readonly string[] | null;
  } | null;
  tier?: RiskTier;
  intent?: IntentLike | null;
  /** 用户原始提问 —— 召回精确率闸门用(意图歧义/不相干则弃权,不召回) */
  query?: string | null;
};

type Candidate = {
  item: KnowledgePosterManifestItem;
  index: number;
};

let manifestCache: KnowledgePosterManifestItem[] | undefined;

export function resetKnowledgePosterManifestCacheForTests(): void {
  manifestCache = undefined;
}

function normalizePosterItem(raw: unknown): KnowledgePosterManifestItem | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as {
    id?: unknown;
    title?: unknown;
    image?: unknown;
    kind?: unknown;
    priority?: unknown;
    sourceDocs?: unknown;
    generationMode?: unknown;
  };
  if (
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.title !== "string" ||
    !value.title ||
    typeof value.image !== "string" ||
    !value.image.startsWith("/") ||
    !safePublicFilePath(value.image)
  ) {
    return null;
  }
  const sourceDocs = Array.isArray(value.sourceDocs)
    ? value.sourceDocs.filter((doc): doc is string => typeof doc === "string")
    : undefined;
  return {
    id: value.id,
    title: value.title,
    image: value.image,
    kind: typeof value.kind === "string" ? value.kind : undefined,
    priority: typeof value.priority === "number" ? value.priority : undefined,
    sourceDocs,
    generationMode:
      typeof value.generationMode === "string" ? value.generationMode : undefined,
  };
}

function isDisplayablePosterItem(item: KnowledgePosterManifestItem): boolean {
  return (
    item.generationMode === undefined ||
    item.generationMode === PRODUCTION_GENERATION_MODE
  );
}

function safePublicFilePath(publicPath: string): string | null {
  if (
    !publicPath.startsWith("/") ||
    publicPath.startsWith("//") ||
    publicPath.includes("\\") ||
    publicPath.includes("\0")
  ) {
    return null;
  }
  let decoded = publicPath;
  try {
    decoded = decodeURIComponent(publicPath);
  } catch {
    return null;
  }
  if (
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    return null;
  }

  const relativePath = decoded.replace(/^\/+/, "");
  const fullPath = path.resolve(PUBLIC_DIR, relativePath);
  const publicRelativePath = path.relative(PUBLIC_DIR, fullPath);
  if (
    !publicRelativePath ||
    publicRelativePath.startsWith("..") ||
    path.isAbsolute(publicRelativePath)
  ) {
    return null;
  }
  return fullPath;
}

function imageExistsUnderPublic(image: string): boolean {
  const fullPath = safePublicFilePath(image);
  if (!fullPath) return false;
  try {
    const publicRoot = fs.realpathSync(PUBLIC_DIR);
    const filePath = fs.realpathSync(fullPath);
    const relativePath = path.relative(publicRoot, filePath);
    return (
      Boolean(relativePath) &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath) &&
      fs.statSync(filePath).isFile()
    );
  } catch {
    return false;
  }
}

function loadPosterManifest(): KnowledgePosterManifestItem[] {
  if (manifestCache) return manifestCache;
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
      items?: unknown;
    };
    const items = Array.isArray(manifest.items) ? manifest.items : [];
    manifestCache = items
      .map(normalizePosterItem)
      .filter((item): item is KnowledgePosterManifestItem => Boolean(item))
      .filter(isDisplayablePosterItem)
      .filter((item) => imageExistsUnderPublic(item.image));
  } catch {
    manifestCache = [];
  }
  return manifestCache;
}

function intentValue(intent: IntentLike | null | undefined): string | undefined {
  if (typeof intent === "string") return intent;
  if (intent && typeof intent === "object" && typeof intent.intent === "string") {
    return intent.intent;
  }
  return undefined;
}

function collectIds(
  ...sources: Array<readonly string[] | null | undefined>
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const source of sources) {
    for (const raw of source ?? []) {
      if (typeof raw !== "string") continue;
      const id = raw.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function candidatesFor(
  itemsById: Map<string, KnowledgePosterManifestItem>,
  ids: string[],
): Candidate[] {
  const candidates: Candidate[] = [];
  ids.forEach((id, index) => {
    const item = itemsById.get(id);
    if (item) candidates.push({ item, index });
  });
  return candidates;
}

function redRank(id: string): number {
  const index = RED_PRIORITY.indexOf(id);
  return index >= 0 ? index : RED_PRIORITY.length;
}

function selectRedCandidate(candidates: Candidate[]): Candidate | undefined {
  return [...candidates].sort((a, b) => {
    const priorityDiff = redRank(a.item.id) - redRank(b.item.id);
    return priorityDiff || a.index - b.index;
  })[0];
}

function selectNonRedMedicalCandidate(
  candidates: Candidate[],
): Candidate | undefined {
  return candidates.find((candidate) => candidate.item.id !== EMERGENCY_CARD_ID);
}

function isMedicalPosterIntent(intent: string | undefined): boolean {
  return intent === "medical_general" || intent === "triage_followup";
}

function attachmentFromItem(
  item: KnowledgePosterManifestItem,
  displayMode: KnowledgePosterDisplayMode,
  riskTone: KnowledgePosterRiskTone,
  reason: string,
): KnowledgePosterAttachment {
  const attachment: KnowledgePosterAttachment = {
    id: item.id,
    title: item.title,
    image: item.image,
    displayMode,
    riskTone,
  };
  if (item.sourceDocs && item.sourceDocs.length > 0) {
    attachment.sourceDocs = item.sourceDocs;
  }
  if (reason) attachment.reason = reason;
  return attachment;
}

export function selectKnowledgePosterFromItems(
  items: readonly unknown[],
  input: KnowledgePosterSelectionInput,
): KnowledgePosterAttachment | undefined {
  const normalizedItems = items
    .map(normalizePosterItem)
    .filter((item): item is KnowledgePosterManifestItem => Boolean(item))
    .filter(isDisplayablePosterItem);
  const itemsById = new Map(normalizedItems.map((item) => [item.id, item]));
  const medicalCardIds = collectIds(
    input.medicalCardIds,
    input.medical?.cardIds,
  );
  const careCardIds = collectIds(input.careCardIds, input.agent?.careCardIds);
  const medicalCandidates = candidatesFor(itemsById, medicalCardIds);
  const careCandidates = candidatesFor(itemsById, careCardIds);
  const intent = intentValue(input.intent);

  // 召回精确率闸门:意图分支用「过闸后」的候选(命中 negativeKeywords 或无 keyword 命中即弃权);
  // tier 分支(红/黄/绿)不过闸 —— 真分诊场景的图解保安全、永远展示。
  const gatedMedical = medicalCandidates.filter((c) =>
    posterPassesQueryGate(c.item.id, input.query),
  );
  const gatedCare = careCandidates.filter((c) =>
    posterPassesQueryGate(c.item.id, input.query),
  );

  if (input.tier === "red" || intent === "emergency") {
    const candidate =
      selectRedCandidate(medicalCandidates) ?? careCandidates[0];
    return candidate
      ? attachmentFromItem(candidate.item, "inline", "red", "red_priority")
      : undefined;
  }

  if (input.tier === "yellow") {
    const candidate =
      selectNonRedMedicalCandidate(medicalCandidates) ?? careCandidates[0];
    return candidate
      ? attachmentFromItem(candidate.item, "preview", "yellow", "yellow_tier")
      : undefined;
  }

  if (input.tier === "green") {
    const candidate =
      selectNonRedMedicalCandidate(medicalCandidates) ?? careCandidates[0];
    return candidate
      ? attachmentFromItem(candidate.item, "collapsed", "green", "green_tier")
      : undefined;
  }

  if (isMedicalPosterIntent(intent)) {
    const candidate =
      selectNonRedMedicalCandidate(gatedMedical) ?? gatedMedical[0];
    return candidate
      ? attachmentFromItem(candidate.item, "preview", "yellow", "medical_recall")
      : undefined;
  }

  if (intent === "daily_care") {
    const candidate = gatedCare[0];
    return candidate
      ? attachmentFromItem(candidate.item, "collapsed", "care", "daily_care")
      : undefined;
  }

  if (
    gatedMedical.length === 1 &&
    gatedMedical[0]?.item.id !== EMERGENCY_CARD_ID
  ) {
    return attachmentFromItem(
      gatedMedical[0].item,
      "preview",
      "yellow",
      "single_medical_candidate",
    );
  }

  return undefined;
}

export function selectKnowledgePosterAttachment(
  input: KnowledgePosterSelectionInput,
): KnowledgePosterAttachment | undefined {
  try {
    return selectKnowledgePosterFromItems(loadPosterManifest(), input);
  } catch {
    return undefined;
  }
}

function encodeAttachment(
  attachment: KnowledgePosterAttachment,
): string | undefined {
  try {
    return encodeURIComponent(JSON.stringify(attachment));
  } catch {
    return undefined;
  }
}

export function encodeKnowledgePosterHeader(
  attachment: KnowledgePosterAttachment | undefined,
): string | undefined {
  if (!attachment || !isKnowledgePosterAttachment(attachment)) return undefined;
  const encoded = encodeAttachment(attachment);
  if (encoded && encoded.length <= HEADER_LIMIT) return encoded;

  const compact: KnowledgePosterAttachment = {
    id: attachment.id,
    title: attachment.title,
    image: attachment.image,
    displayMode: attachment.displayMode,
    riskTone: attachment.riskTone,
  };
  const compactEncoded = encodeAttachment(compact);
  return compactEncoded && compactEncoded.length <= HEADER_LIMIT
    ? compactEncoded
    : undefined;
}
