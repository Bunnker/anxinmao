import type { RiskTier } from "@/types/cat";

export type TriageHandoff = {
  symptom?: string;
  tier?: RiskTier;
  claimIds?: string[];
  report?: string;
  qa?: string;
  createdAt?: number;
};

const HANDOFF_PREFIX = "catTriage:handoff:";
const MAX_HANDOFF_AGE_MS = 60 * 60 * 1000;

function storageKey(id: string): string {
  return `${HANDOFF_PREFIX}${id}`;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function createTriageHandoffId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHandoff(raw: TriageHandoff): TriageHandoff {
  return {
    symptom: raw.symptom,
    tier: raw.tier,
    claimIds: raw.claimIds?.filter((id) => /^[a-z]+_\d{3}$/.test(id)).slice(0, 32),
    report: raw.report?.slice(0, 600),
    qa: raw.qa?.slice(0, 800),
    createdAt: raw.createdAt ?? Date.now(),
  };
}

export function saveTriageHandoff(id: string, handoff: TriageHandoff): void {
  if (!id || !canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(
      storageKey(id),
      JSON.stringify(normalizeHandoff({ ...handoff, createdAt: Date.now() })),
    );
  } catch {
    // sessionStorage 不可用时静默降级:URL 里仍有 symptom/tier/claims 可兜底。
  }
}

export function loadTriageHandoff(id: string | null | undefined): TriageHandoff | null {
  if (!id || !canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TriageHandoff;
    if (
      typeof parsed.createdAt === "number" &&
      Date.now() - parsed.createdAt > MAX_HANDOFF_AGE_MS
    ) {
      window.sessionStorage.removeItem(storageKey(id));
      return null;
    }
    return normalizeHandoff(parsed);
  } catch {
    return null;
  }
}
